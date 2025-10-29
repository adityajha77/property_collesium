#![allow(unused_variables)]
#![allow(unexpected_cfgs)]

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
    program_error::ProgramError,
    program::{invoke, invoke_signed},
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
    borsh::try_from_slice_unchecked,
};
use spl_token::{
    instruction as spl_token_instruction,
    state::{Mint, Account},
};
use borsh::{BorshDeserialize, BorshSerialize};
use thiserror::Error;

// ------------------ Program ID ------------------
solana_program::declare_id!("64Kd3NVVfKLcfxXsNLEvriNSiuzGpeTaBqSLwk4vXx2Y"); // This should be the deployed program ID

// ------------------ PoolState Struct ------------------
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct PoolState {
    pub is_initialized: u8,
    pub token_a_mint: Pubkey,
    pub token_b_mint: Pubkey,
    pub token_a_reserve: u64,
    pub token_b_reserve: u64,
    pub lp_mint: Pubkey,
    pub lp_supply: u64,
    pub bump_seed: u8,
}

impl PoolState {
    pub const LEN: usize = 1 + 32 + 32 + 8 + 8 + 32 + 8 + 1;
}

// ------------------ LiquidityPool Instructions ------------------
#[derive(BorshSerialize, BorshDeserialize, Debug, PartialEq)]
pub enum LiquidityPoolInstruction {
    InitializePool {
        initial_amount_a: u64,
        initial_amount_b: u64,
    },
    AddLiquidity {
        amount_a: u64,
        amount_b: u64,
    },
    RemoveLiquidity {
        lp_token_amount: u64,
    },
    SwapAforB {
        amount_a_in: u64,
    },
    SwapBforA {
        amount_b_in: u64,
    },
}

// ------------------ LiquidityPool Errors ------------------
#[derive(Error, Debug, Copy, Clone)]
pub enum LiquidityPoolError {
    #[error("Invalid Instruction")]
    InvalidInstruction,
    #[error("Not Rent Exempt")]
    NotRentExempt,
    #[error("Pool already initialized")]
    PoolAlreadyInitialized,
    #[error("Pool not initialized")]
    PoolNotInitialized,
    #[error("Insufficient funds")]
    InsufficientFunds,
    #[error("Invalid amount")]
    InvalidAmount,
    #[error("Zero amount not allowed")]
    ZeroAmountNotAllowed,
    #[error("Invalid token mint")]
    InvalidTokenMint,
    #[error("Invalid token account")]
    InvalidTokenAccount,
    #[error("Invalid owner")]
    InvalidOwner,
    #[error("Invalid PDA account")]
    InvalidPdaAccount,
    #[error("Token A and B mints cannot be the same")]
    SameTokenMints,
}

impl From<LiquidityPoolError> for ProgramError {
    fn from(e: LiquidityPoolError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

// ------------------ Entrypoint ------------------
entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("Liquidity Pool Program Entrypoint");

    let instruction = LiquidityPoolInstruction::try_from_slice(instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    match instruction {
        LiquidityPoolInstruction::InitializePool { initial_amount_a, initial_amount_b } => {
            msg!("Instruction: InitializePool");
            process_initialize_pool(program_id, accounts, initial_amount_a, initial_amount_b)
        }
        LiquidityPoolInstruction::AddLiquidity { amount_a, amount_b } => {
            msg!("Instruction: AddLiquidity");
            process_add_liquidity(program_id, accounts, amount_a, amount_b)
        }
        LiquidityPoolInstruction::RemoveLiquidity { lp_token_amount } => {
            msg!("Instruction: RemoveLiquidity");
            process_remove_liquidity(program_id, accounts, lp_token_amount)
        }
        LiquidityPoolInstruction::SwapAforB { amount_a_in } => {
            msg!("Instruction: SwapAforB");
            process_swap_a_for_b(program_id, accounts, amount_a_in)
        }
        LiquidityPoolInstruction::SwapBforA { amount_b_in } => {
            msg!("Instruction: SwapBforA");
            process_swap_b_for_a(program_id, accounts, amount_b_in)
        }
    }
}

// ------------------ Initialize Pool ------------------
fn process_initialize_pool(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    initial_amount_a: u64,
    initial_amount_b: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let initializer_account = next_account_info(account_info_iter)?; // 0
    let pool_state_account = next_account_info(account_info_iter)?; // 1
    let token_a_mint_account = next_account_info(account_info_iter)?; // 2
    let token_b_mint_account = next_account_info(account_info_iter)?; // 3
    let pool_token_a_account = next_account_info(account_info_iter)?; // 4
    let pool_token_b_account = next_account_info(account_info_iter)?; // 5
    let lp_mint_account = next_account_info(account_info_iter)?; // 6
    let initializer_token_a_account = next_account_info(account_info_iter)?; // 7
    let initializer_token_b_account = next_account_info(account_info_iter)?; // 8
    let initializer_lp_token_account = next_account_info(account_info_iter)?; // 9
    let token_program_account = next_account_info(account_info_iter)?; // 10
    let rent_sysvar_account = next_account_info(account_info_iter)?; // 11
    let system_program_account = next_account_info(account_info_iter)?; // 12

    // Validate accounts
    if !initializer_account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if token_a_mint_account.key == token_b_mint_account.key {
        return Err(LiquidityPoolError::SameTokenMints.into());
    }

    // Derive PDA and check against provided pool_state_account
    let (pda, bump_seed) = Pubkey::find_program_address(
        &[
            b"liquidity_pool",
            token_a_mint_account.key.as_ref(),
            token_b_mint_account.key.as_ref(),
        ],
        program_id,
    );

    if pda != *pool_state_account.key {
        return Err(ProgramError::InvalidSeeds);
    }

    // Check if pool_state_account is already initialized
    let mut pool_state_data = try_from_slice_unchecked::<PoolState>(&pool_state_account.data.borrow()).unwrap_or_else(|_| PoolState {
        is_initialized: 0,
        token_a_mint: Pubkey::default(),
        token_b_mint: Pubkey::default(),
        token_a_reserve: 0,
        token_b_reserve: 0,
        lp_mint: Pubkey::default(),
        lp_supply: 0,
        bump_seed: 0,
    });

    if pool_state_data.is_initialized != 0 {
        return Err(LiquidityPoolError::PoolAlreadyInitialized.into());
    }

    // Check rent exemption for pool_state_account
    if !Rent::get()?.is_exempt(pool_state_account.lamports(), PoolState::LEN) {
        return Err(LiquidityPoolError::NotRentExempt.into());
    }

    // Initialize LP Mint
    invoke(
        &spl_token_instruction::initialize_mint(
            token_program_account.key,
            lp_mint_account.key,
            pool_state_account.key, // LP mint authority is the PDA
            Some(pool_state_account.key), // Freeze authority is also the PDA
            6, // Decimals (assuming 6 for now, client doesn't specify)
        )?,
        &[
            lp_mint_account.clone(),
            rent_sysvar_account.clone(),
            token_program_account.clone(),
        ],
    )?;

    // Transfer initial liquidity from initializer to pool
    // Token A
    invoke(
        &spl_token_instruction::transfer(
            token_program_account.key,
            initializer_token_a_account.key,
            pool_token_a_account.key,
            initializer_account.key,
            &[],
            initial_amount_a,
        )?,
        &[
            initializer_token_a_account.clone(),
            pool_token_a_account.clone(),
            initializer_account.clone(),
            token_program_account.clone(),
        ],
    )?;

    // Token B
    invoke(
        &spl_token_instruction::transfer(
            token_program_account.key,
            initializer_token_b_account.key,
            pool_token_b_account.key,
            initializer_account.key,
            &[],
            initial_amount_b,
        )?,
        &[
            initializer_token_b_account.clone(),
            pool_token_b_account.clone(),
            initializer_account.clone(),
            token_program_account.clone(),
        ],
    )?;

    // Mint initial LP tokens to initializer
    let mint_lp_ix = spl_token_instruction::mint_to(
        token_program_account.key,
        lp_mint_account.key,
        initializer_lp_token_account.key,
        pool_state_account.key, // PDA is the mint authority
        &[&pda], // Signer for PDA
        initial_amount_a + initial_amount_b, // Simple initial LP calculation
    )?;

    invoke_signed(
        &mint_lp_ix,
        &[
            lp_mint_account.clone(),
            initializer_lp_token_account.clone(),
            pool_state_account.clone(),
            token_program_account.clone(),
        ],
        &[&[
            b"liquidity_pool",
            token_a_mint_account.key.as_ref(),
            token_b_mint_account.key.as_ref(),
            &[bump_seed],
        ]],
    )?;

    // Update PoolState
    pool_state_data.is_initialized = 1;
    pool_state_data.token_a_mint = *token_a_mint_account.key;
    pool_state_data.token_b_mint = *token_b_mint_account.key;
    pool_state_data.token_a_reserve = initial_amount_a;
    pool_state_data.token_b_reserve = initial_amount_b;
    pool_state_data.lp_mint = *lp_mint_account.key;
    pool_state_data.lp_supply = initial_amount_a + initial_amount_b; // Initial LP supply
    pool_state_data.bump_seed = bump_seed;

    pool_state_data.serialize(&mut &mut pool_state_account.data.borrow_mut()[..])?;

    msg!("Liquidity Pool initialized for Token A: {} and Token B: {}", token_a_mint_account.key, token_b_mint_account.key);
    Ok(())
}

// ------------------ Add Liquidity ------------------
fn process_add_liquidity(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount_a: u64,
    amount_b: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let provider_account = next_account_info(account_info_iter)?;
    let pool_state_account = next_account_info(account_info_iter)?;
    let pool_token_a_account = next_account_info(account_info_iter)?;
    let pool_token_b_account = next_account_info(account_info_iter)?;
    let lp_mint_account = next_account_info(account_info_iter)?;
    let provider_token_a_account = next_account_info(account_info_iter)?;
    let provider_token_b_account = next_account_info(account_info_iter)?;
    let provider_lp_token_account = next_account_info(account_info_iter)?;
    let token_program_account = next_account_info(account_info_iter)?;

    if !provider_account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut pool_state_data = PoolState::try_from_slice(&pool_state_account.data.borrow())?;
    if pool_state_data.is_initialized == 0 {
        return Err(LiquidityPoolError::PoolNotInitialized.into());
    }

    if amount_a == 0 || amount_b == 0 {
        return Err(LiquidityPoolError::ZeroAmountNotAllowed.into());
    }

    // Check PDA
    let (pda, _bump_seed) = Pubkey::find_program_address(
        &[
            b"liquidity_pool",
            pool_state_data.token_a_mint.as_ref(),
            pool_state_data.token_b_mint.as_ref(),
        ],
        program_id,
    );
    if pda != *pool_state_account.key {
        return Err(ProgramError::InvalidSeeds);
    }

    // Transfer tokens from provider to pool
    invoke(
        &spl_token_instruction::transfer(
            token_program_account.key,
            provider_token_a_account.key,
            pool_token_a_account.key,
            provider_account.key,
            &[],
            amount_a,
        )?,
        &[
            provider_token_a_account.clone(),
            pool_token_a_account.clone(),
            provider_account.clone(),
            token_program_account.clone(),
        ],
    )?;

    invoke(
        &spl_token_instruction::transfer(
            token_program_account.key,
            provider_token_b_account.key,
            pool_token_b_account.key,
            provider_account.key,
            &[],
            amount_b,
        )?,
        &[
            provider_token_b_account.clone(),
            pool_token_b_account.clone(),
            provider_account.clone(),
            token_program_account.clone(),
        ],
    )?;

    // Calculate LP tokens to mint (simple 1:1 for now, can be improved)
    let lp_tokens_to_mint = amount_a + amount_b;

    // Mint LP tokens to provider
    let mint_lp_ix = spl_token_instruction::mint_to(
        token_program_account.key,
        lp_mint_account.key,
        provider_lp_token_account.key,
        pool_state_account.key, // PDA is the mint authority
        &[&pda], // Signer for PDA
        lp_tokens_to_mint,
    )?;

    invoke_signed(
        &mint_lp_ix,
        &[
            lp_mint_account.clone(),
            provider_lp_token_account.clone(),
            pool_state_account.clone(),
            token_program_account.clone(),
        ],
        &[&[
            b"liquidity_pool",
            pool_state_data.token_a_mint.as_ref(),
            pool_state_data.token_b_mint.as_ref(),
            &[pool_state_data.bump_seed],
        ]],
    )?;

    // Update PoolState
    pool_state_data.token_a_reserve += amount_a;
    pool_state_data.token_b_reserve += amount_b;
    pool_state_data.lp_supply += lp_tokens_to_mint;
    pool_state_data.serialize(&mut &mut pool_state_account.data.borrow_mut()[..])?;

    msg!("Added liquidity: {} Token A, {} Token B. Minted {} LP tokens.", amount_a, amount_b, lp_tokens_to_mint);
    Ok(())
}

// ------------------ Remove Liquidity ------------------
fn process_remove_liquidity(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    lp_token_amount: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let provider_account = next_account_info(account_info_iter)?;
    let pool_state_account = next_account_info(account_info_iter)?;
    let pool_token_a_account = next_account_info(account_info_iter)?;
    let pool_token_b_account = next_account_info(account_info_iter)?;
    let lp_mint_account = next_account_info(account_info_iter)?;
    let provider_token_a_account = next_account_info(account_info_iter)?;
    let provider_token_b_account = next_account_info(account_info_iter)?;
    let provider_lp_token_account = next_account_info(account_info_iter)?;
    let token_program_account = next_account_info(account_info_iter)?;

    if !provider_account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut pool_state_data = PoolState::try_from_slice(&pool_state_account.data.borrow())?;
    if pool_state_data.is_initialized == 0 {
        return Err(LiquidityPoolError::PoolNotInitialized.into());
    }

    if lp_token_amount == 0 {
        return Err(LiquidityPoolError::ZeroAmountNotAllowed.into());
    }

    // Check PDA
    let (pda, _bump_seed) = Pubkey::find_program_address(
        &[
            b"liquidity_pool",
            pool_state_data.token_a_mint.as_ref(),
            pool_state_data.token_b_mint.as_ref(),
        ],
        program_id,
    );
    if pda != *pool_state_account.key {
        return Err(ProgramError::InvalidSeeds);
    }

    // Burn LP tokens from provider
    let burn_lp_ix = spl_token_instruction::burn(
        token_program_account.key,
        provider_lp_token_account.key,
        lp_mint_account.key,
        provider_account.key,
        &[],
        lp_token_amount,
    )?;

    invoke(
        &burn_lp_ix,
        &[
            provider_lp_token_account.clone(),
            lp_mint_account.clone(),
            provider_account.clone(),
            token_program_account.clone(),
        ],
    )?;

    // Calculate tokens to return (simple proportional for now)
    let amount_a_to_return = (lp_token_amount as u128 * pool_state_data.token_a_reserve as u128 / pool_state_data.lp_supply as u128) as u64;
    let amount_b_to_return = (lp_token_amount as u128 * pool_state_data.token_b_reserve as u128 / pool_state_data.lp_supply as u128) as u64;

    // Transfer tokens from pool to provider
    // Token A
    let transfer_a_ix = spl_token_instruction::transfer(
        token_program_account.key,
        pool_token_a_account.key,
        provider_token_a_account.key,
        pool_state_account.key, // PDA is the authority
        &[&pda], // Signer for PDA
        amount_a_to_return,
    )?;

    invoke_signed(
        &transfer_a_ix,
        &[
            pool_token_a_account.clone(),
            provider_token_a_account.clone(),
            pool_state_account.clone(),
            token_program_account.clone(),
        ],
        &[&[
            b"liquidity_pool",
            pool_state_data.token_a_mint.as_ref(),
            pool_state_data.token_b_mint.as_ref(),
            &[pool_state_data.bump_seed],
        ]],
    )?;

    // Token B
    let transfer_b_ix = spl_token_instruction::transfer(
        token_program_account.key,
        pool_token_b_account.key,
        provider_token_b_account.key,
        pool_state_account.key, // PDA is the authority
        &[&pda], // Signer for PDA
        amount_b_to_return,
    )?;

    invoke_signed(
        &transfer_b_ix,
        &[
            pool_token_b_account.clone(),
            provider_token_b_account.clone(),
            pool_state_account.clone(),
            token_program_account.clone(),
        ],
        &[&[
            b"liquidity_pool",
            pool_state_data.token_a_mint.as_ref(),
            pool_state_data.token_b_mint.as_ref(),
            &[pool_state_data.bump_seed],
        ]],
    )?;

    // Update PoolState
    pool_state_data.token_a_reserve -= amount_a_to_return;
    pool_state_data.token_b_reserve -= amount_b_to_return;
    pool_state_data.lp_supply -= lp_token_amount;
    pool_state_data.serialize(&mut &mut pool_state_account.data.borrow_mut()[..])?;

    msg!("Removed liquidity: Burned {} LP tokens. Returned {} Token A, {} Token B.", lp_token_amount, amount_a_to_return, amount_b_to_return);
    Ok(())
}

// ------------------ Swap A for B ------------------
fn process_swap_a_for_b(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount_a_in: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let swapper_account = next_account_info(account_info_iter)?;
    let pool_state_account = next_account_info(account_info_iter)?;
    let pool_token_a_account = next_account_info(account_info_iter)?;
    let pool_token_b_account = next_account_info(account_info_iter)?;
    let swapper_token_a_account = next_account_info(account_info_iter)?;
    let swapper_token_b_account = next_account_info(account_info_iter)?;
    let token_program_account = next_account_info(account_info_iter)?;

    if !swapper_account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut pool_state_data = PoolState::try_from_slice(&pool_state_account.data.borrow())?;
    if pool_state_data.is_initialized == 0 {
        return Err(LiquidityPoolError::PoolNotInitialized.into());
    }

    if amount_a_in == 0 {
        return Err(LiquidityPoolError::ZeroAmountNotAllowed.into());
    }

    // Check PDA
    let (pda, _bump_seed) = Pubkey::find_program_address(
        &[
            b"liquidity_pool",
            pool_state_data.token_a_mint.as_ref(),
            pool_state_data.token_b_mint.as_ref(),
        ],
        program_id,
    );
    if pda != *pool_state_account.key {
        return Err(ProgramError::InvalidSeeds);
    }

    // Transfer Token A from swapper to pool
    invoke(
        &spl_token_instruction::transfer(
            token_program_account.key,
            swapper_token_a_account.key,
            pool_token_a_account.key,
            swapper_account.key,
            &[],
            amount_a_in,
        )?,
        &[
            swapper_token_a_account.clone(),
            pool_token_a_account.clone(),
            swapper_account.clone(),
            token_program_account.clone(),
        ],
    )?;

    // Calculate amount of Token B to send to swapper (simple constant product formula)
    let amount_b_out = (pool_state_data.token_b_reserve as u128 * amount_a_in as u128 / (pool_state_data.token_a_reserve as u128 + amount_a_in as u128)) as u64;

    if amount_b_out == 0 {
        return Err(LiquidityPoolError::InvalidAmount.into());
    }

    // Transfer Token B from pool to swapper
    let transfer_b_ix = spl_token_instruction::transfer(
        token_program_account.key,
        pool_token_b_account.key,
        swapper_token_b_account.key,
        pool_state_account.key, // PDA is the authority
        &[&pda], // Signer for PDA
        amount_b_out,
    )?;

    invoke_signed(
        &transfer_b_ix,
        &[
            pool_token_b_account.clone(),
            swapper_token_b_account.clone(),
            pool_state_account.clone(),
            token_program_account.clone(),
        ],
        &[&[
            b"liquidity_pool",
            pool_state_data.token_a_mint.as_ref(),
            pool_state_data.token_b_mint.as_ref(),
            &[pool_state_data.bump_seed],
        ]],
    )?;

    // Update PoolState
    pool_state_data.token_a_reserve += amount_a_in;
    pool_state_data.token_b_reserve -= amount_b_out;
    pool_state_data.serialize(&mut &mut pool_state_account.data.borrow_mut()[..])?;

    msg!("Swapped {} Token A for {} Token B.", amount_a_in, amount_b_out);
    Ok(())
}

// ------------------ Swap B for A ------------------
fn process_swap_b_for_a(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount_b_in: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let swapper_account = next_account_info(account_info_iter)?;
    let pool_state_account = next_account_info(account_info_iter)?;
    let pool_token_a_account = next_account_info(account_info_iter)?;
    let pool_token_b_account = next_account_info(account_info_iter)?;
    let swapper_token_b_account = next_account_info(account_info_iter)?;
    let swapper_token_a_account = next_account_info(account_info_iter)?;
    let token_program_account = next_account_info(account_info_iter)?;

    if !swapper_account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut pool_state_data = PoolState::try_from_slice(&pool_state_account.data.borrow())?;
    if pool_state_data.is_initialized == 0 {
        return Err(LiquidityPoolError::PoolNotInitialized.into());
    }

    if amount_b_in == 0 {
        return Err(LiquidityPoolError::ZeroAmountNotAllowed.into());
    }

    // Check PDA
    let (pda, _bump_seed) = Pubkey::find_program_address(
        &[
            b"liquidity_pool",
            pool_state_data.token_a_mint.as_ref(),
            pool_state_data.token_b_mint.as_ref(),
        ],
        program_id,
    );
    if pda != *pool_state_account.key {
        return Err(ProgramError::InvalidSeeds);
    }

    // Transfer Token B from swapper to pool
    invoke(
        &spl_token_instruction::transfer(
            token_program_account.key,
            swapper_token_b_account.key,
            pool_token_b_account.key,
            swapper_account.key,
            &[],
            amount_b_in,
        )?,
        &[
            swapper_token_b_account.clone(),
            pool_token_b_account.clone(),
            swapper_account.clone(),
            token_program_account.clone(),
        ],
    )?;

    // Calculate amount of Token A to send to swapper (simple constant product formula)
    let amount_a_out = (pool_state_data.token_a_reserve as u128 * amount_b_in as u128 / (pool_state_data.token_b_reserve as u128 + amount_b_in as u128)) as u64;

    if amount_a_out == 0 {
        return Err(LiquidityPoolError::InvalidAmount.into());
    }

    // Transfer Token A from pool to swapper
    let transfer_a_ix = spl_token_instruction::transfer(
        token_program_account.key,
        pool_token_a_account.key,
        swapper_token_a_account.key,
        pool_state_account.key, // PDA is the authority
        &[&pda], // Signer for PDA
        amount_a_out,
    )?;

    invoke_signed(
        &transfer_a_ix,
        &[
            pool_token_a_account.clone(),
            swapper_token_a_account.clone(),
            pool_state_account.clone(),
            token_program_account.clone(),
        ],
        &[&[
            b"liquidity_pool",
            pool_state_data.token_a_mint.as_ref(),
            pool_state_data.token_b_mint.as_ref(),
            &[pool_state_data.bump_seed],
        ]],
    )?;

    // Update PoolState
    pool_state_data.token_b_reserve += amount_b_in;
    pool_state_data.token_a_reserve -= amount_a_out;
    pool_state_data.serialize(&mut &mut pool_state_account.data.borrow_mut()[..])?;

    msg!("Swapped {} Token B for {} Token A.", amount_b_in, amount_a_out);
    Ok(())
}
