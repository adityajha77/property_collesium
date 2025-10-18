use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
    program_error::ProgramError,
    sysvar::{rent::Rent, Sysvar},
    program::{invoke, invoke_signed},
    program_pack::{IsInitialized, Pack, Sealed},
};
use spl_token::{
    error::TokenError,
    instruction as spl_token_instruction,
    state::Mint,
};
use borsh::{BorshDeserialize, BorshSerialize};
use thiserror::Error;

// Declare and export the program's id
solana_program::declare_id!("LQDPo11111111111111111111111111111111111111"); // Placeholder

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct PoolState {
    pub is_initialized: bool,
    pub token_a_mint: Pubkey,
    pub token_b_mint: Pubkey,
    pub token_a_reserve: u64,
    pub token_b_reserve: u64,
    pub lp_mint: Pubkey, // Mint for Liquidity Provider tokens
    pub lp_supply: u64,  // Total supply of LP tokens
    pub bump_seed: u8,
}

impl Sealed for PoolState {}
impl IsInitialized for PoolState {
    fn is_initialized(&self) -> bool {
        self.is_initialized
    }
}

impl Pack for PoolState {
    const LEN: usize = 1 + 32 + 32 + 8 + 8 + 32 + 8 + 1; // is_initialized + 2 Pubkeys + 2 u64 + Pubkey + u64 + u8

    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        Self::try_from_slice(src).map_err(|_| ProgramError::InvalidAccountData)
    }

    fn pack_into_slice(&self, dst: &mut [u8]) {
        self.serialize(&mut &mut dst[..]).expect("Failed to serialize PoolState");
    }
}

#[derive(BorshSerialize, BorshDeserialize, Debug, PartialEq)]
pub enum LiquidityPoolInstruction {
    /// Initializes a new liquidity pool.
    ///
    /// Accounts:
    /// 0. `[signer]` The initializer of the pool.
    /// 1. `[writable]` The pool state account (PDA).
    /// 2. `[]` The mint account for Token A.
    /// 3. `[]` The mint account for Token B.
    /// 4. `[writable]` The token account for Token A owned by the pool PDA.
    /// 5. `[writable]` The token account for Token B owned by the pool PDA.
    /// 6. `[writable]` The mint account for LP tokens, owned by the pool PDA.
    /// 7. `[writable]` The initializer's token account for Token A.
    /// 8. `[writable]` The initializer's token account for Token B.
    /// 9. `[writable]` The initializer's token account for LP tokens.
    /// 10. `[]` The SPL Token program.
    /// 11. `[]` The Rent sysvar.
    /// 12. `[]` The System program.
    InitializePool {
        initial_amount_a: u64,
        initial_amount_b: u64,
    },
    /// Adds liquidity to an existing pool.
    ///
    /// Accounts:
    /// 0. `[signer]` The liquidity provider.
    /// 1. `[writable]` The pool state account (PDA).
    /// 2. `[writable]` The token account for Token A owned by the pool PDA.
    /// 3. `[writable]` The token account for Token B owned by the pool PDA.
    /// 4. `[writable]` The mint account for LP tokens.
    /// 5. `[writable]` The provider's token account for Token A.
    /// 6. `[writable]` The provider's token account for Token B.
    /// 7. `[writable]` The provider's token account for LP tokens.
    /// 8. `[]` The SPL Token program.
    AddLiquidity {
        amount_a: u64,
        amount_b: u64,
    },
    /// Removes liquidity from an existing pool.
    ///
    /// Accounts:
    /// 0. `[signer]` The liquidity provider.
    /// 1. `[writable]` The pool state account (PDA).
    /// 2. `[writable]` The token account for Token A owned by the pool PDA.
    /// 3. `[writable]` The token account for Token B owned by the pool PDA.
    /// 4. `[writable]` The mint account for LP tokens.
    /// 5. `[writable]` The provider's token account for Token A.
    /// 6. `[writable]` The provider's token account for Token B.
    /// 7. `[writable]` The provider's token account for LP tokens.
    /// 8. `[]` The SPL Token program.
    RemoveLiquidity {
        lp_token_amount: u64,
    },
    /// Swaps Token A for Token B.
    ///
    /// Accounts:
    /// 0. `[signer]` The swapper.
    /// 1. `[writable]` The pool state account (PDA).
    /// 2. `[writable]` The token account for Token A owned by the pool PDA.
    /// 3. `[writable]` The token account for Token B owned by the pool PDA.
    /// 4. `[writable]` The swapper's token account for Token A.
    /// 5. `[writable]` The swapper's token account for Token B.
    /// 6. `[]` The SPL Token program.
    SwapAforB {
        amount_a_in: u64,
    },
    /// Swaps Token B for Token A.
    ///
    /// Accounts:
    /// 0. `[signer]` The swapper.
    /// 1. `[writable]` The pool state account (PDA).
    /// 2. `[writable]` The token account for Token A owned by the pool PDA.
    /// 3. `[writable]` The token account for Token B owned by the pool PDA.
    /// 4. `[writable]` The swapper's token account for Token B.
    /// 5. `[writable]` The swapper's token account for Token A.
    /// 6. `[]` The SPL Token program.
    SwapBforA {
        amount_b_in: u64,
    },
}

#[derive(Error, Debug, Copy, Clone)]
pub enum LiquidityPoolError {
    #[error("Invalid Instruction")]
    InvalidInstruction,
    #[error("Not Rent Exempt")]
    NotRentExempt,
    #[error("Already Initialized")]
    AlreadyInitialized,
    #[error("Not Initialized")]
    NotInitialized,
    #[error("Invalid Token A Amount")]
    InvalidTokenAAmount,
    #[error("Invalid Token B Amount")]
    InvalidTokenBAmount,
    #[error("Insufficient Liquidity")]
    InsufficientLiquidity,
    #[error("Invalid LP Token Amount")]
    InvalidLpTokenAmount,
    #[error("Invalid Pool State Account")]
    InvalidPoolStateAccount,
    #[error("Invalid Mint Account")]
    InvalidMintAccount,
    #[error("Invalid Token Account")]
    InvalidTokenAccount,
    #[error("Invalid Owner")]
    InvalidOwner,
    #[error("Zero Reserves")]
    ZeroReserves,
    #[error("Slippage Tolerance Exceeded")]
    SlippageToleranceExceeded,
}

impl From<LiquidityPoolError> for ProgramError {
    fn from(e: LiquidityPoolError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

impl From<TokenError> for LiquidityPoolError {
    fn from(e: TokenError) -> Self {
        match e {
            TokenError::InsufficientFunds => LiquidityPoolError::InsufficientLiquidity,
            _ => LiquidityPoolError::InvalidInstruction, // Generic error for other token errors
        }
    }
}

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

fn process_initialize_pool(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    initial_amount_a: u64,
    initial_amount_b: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let initializer_account = next_account_info(account_info_iter)?;
    let pool_state_account = next_account_info(account_info_iter)?;
    let token_a_mint_account = next_account_info(account_info_iter)?;
    let token_b_mint_account = next_account_info(account_info_iter)?;
    let pool_token_a_account = next_account_info(account_info_iter)?;
    let pool_token_b_account = next_account_info(account_info_iter)?;
    let lp_mint_account = next_account_info(account_info_iter)?;
    let initializer_token_a_account = next_account_info(account_info_iter)?;
    let initializer_token_b_account = next_account_info(account_info_iter)?;
    let initializer_lp_token_account = next_account_info(account_info_iter)?;
    let token_program_account = next_account_info(account_info_iter)?;
    let rent_account = next_account_info(account_info_iter)?;
    let _system_program_account = next_account_info(account_info_iter)?;

    if !initializer_account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let (pool_pda, bump_seed) = Pubkey::find_program_address(
        &[b"liquidity_pool", token_a_mint_account.key.as_ref(), token_b_mint_account.key.as_ref()],
        program_id,
    );

    if pool_pda != *pool_state_account.key {
        return Err(ProgramError::InvalidSeeds);
    }

    let mut pool_state = PoolState::unpack_unchecked(&pool_state_account.data.borrow())?;
    if pool_state.is_initialized {
        return Err(LiquidityPoolError::AlreadyInitialized.into());
    }

    if !Rent::get()?.is_exempt(pool_state_account.lamports(), PoolState::LEN) {
        return Err(LiquidityPoolError::NotRentExempt.into());
    }

    if initial_amount_a == 0 || initial_amount_b == 0 {
        return Err(LiquidityPoolError::ZeroReserves.into());
    }

    // Initialize LP token mint
    invoke(
        &spl_token_instruction::initialize_mint(
            token_program_account.key,
            lp_mint_account.key,
            &pool_pda, // Pool PDA is the mint authority for LP tokens
            Option::None, // Freeze authority
            6, // Decimals for LP tokens (adjust as needed)
        )?,
        &[
            lp_mint_account.clone(),
            rent_account.clone(),
            token_program_account.clone(),
        ],
    )?;

    // Transfer initial liquidity from initializer to pool's token accounts
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

    // Mint initial LP tokens to the initializer
    let initial_lp_shares = (initial_amount_a as f64 * initial_amount_b as f64).sqrt() as u64; // Simplified calculation
    let signer_seeds: &[&[u8]] = &[
        b"liquidity_pool",
        token_a_mint_account.key.as_ref(),
        token_b_mint_account.key.as_ref(),
        &[bump_seed],
    ];
    invoke_signed(
        &spl_token_instruction::mint_to(
            token_program_account.key,
            lp_mint_account.key,
            initializer_lp_token_account.key,
            &pool_pda, // Pool PDA is the mint authority
            &[&pool_pda],
            initial_lp_shares,
        )?,
        &[
            lp_mint_account.clone(),
            initializer_lp_token_account.clone(),
            pool_state_account.clone(), // Pool PDA as signer
            token_program_account.clone(),
        ],
        &[&signer_seeds],
    )?;

    pool_state.is_initialized = true;
    pool_state.token_a_mint = *token_a_mint_account.key;
    pool_state.token_b_mint = *token_b_mint_account.key;
    pool_state.token_a_reserve = initial_amount_a;
    pool_state.token_b_reserve = initial_amount_b;
    pool_state.lp_mint = *lp_mint_account.key;
    pool_state.lp_supply = initial_lp_shares;
    pool_state.bump_seed = bump_seed;

    PoolState::pack(pool_state, &mut pool_state_account.data.borrow_mut())?;

    msg!("Liquidity pool initialized for Token A: {} and Token B: {}", token_a_mint_account.key, token_b_mint_account.key);
    Ok(())
}

fn process_add_liquidity(
    _program_id: &Pubkey,
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

    let mut pool_state = PoolState::unpack(&pool_state_account.data.borrow())?;
    if !pool_state.is_initialized {
        return Err(LiquidityPoolError::NotInitialized.into());
    }

    if amount_a == 0 || amount_b == 0 {
        return Err(LiquidityPoolError::ZeroReserves.into());
    }

    // Calculate LP tokens to mint
    let lp_mint_info = Mint::unpack(&lp_mint_account.data.borrow())?;
    let lp_supply = lp_mint_info.supply;

    let minted_shares: u64;
    if lp_supply == 0 {
        // This case should ideally be handled by InitializePool, but as a fallback
        minted_shares = (amount_a as f64 * amount_b as f64).sqrt() as u64;
    } else {
        let shares_from_a = (amount_a as u128 * lp_supply as u128) / pool_state.token_a_reserve as u128;
        let shares_from_b = (amount_b as u128 * lp_supply as u128) / pool_state.token_b_reserve as u128;
        minted_shares = std::cmp::min(shares_from_a, shares_from_b) as u64;
    }

    if minted_shares == 0 {
        return Err(LiquidityPoolError::InvalidLpTokenAmount.into());
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

    // Mint LP tokens to provider
    let signer_seeds: &[&[u8]] = &[
        b"liquidity_pool",
        pool_state.token_a_mint.as_ref(),
        pool_state.token_b_mint.as_ref(),
        &[pool_state.bump_seed],
    ];
    invoke_signed(
        &spl_token_instruction::mint_to(
            token_program_account.key,
            lp_mint_account.key,
            provider_lp_token_account.key,
            pool_state_account.key, // Pool PDA is the mint authority
            &[pool_state_account.key],
            minted_shares,
        )?,
        &[
            lp_mint_account.clone(),
            provider_lp_token_account.clone(),
            pool_state_account.clone(), // Pool PDA as signer
            token_program_account.clone(),
        ],
        &[&signer_seeds],
    )?;

    pool_state.token_a_reserve += amount_a;
    pool_state.token_b_reserve += amount_b;
    pool_state.lp_supply += minted_shares;

    PoolState::pack(pool_state, &mut pool_state_account.data.borrow_mut())?;

    msg!("Added liquidity: {} Token A, {} Token B. Minted {} LP tokens.", amount_a, amount_b, minted_shares);
    Ok(())
}

fn process_remove_liquidity(
    _program_id: &Pubkey,
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

    let mut pool_state = PoolState::unpack(&pool_state_account.data.borrow())?;
    if !pool_state.is_initialized {
        return Err(LiquidityPoolError::NotInitialized.into());
    }

    if lp_token_amount == 0 {
        return Err(LiquidityPoolError::InvalidLpTokenAmount.into());
    }

    let lp_mint_info = Mint::unpack(&lp_mint_account.data.borrow())?;
    let lp_supply = lp_mint_info.supply;

    if lp_supply == 0 {
        return Err(LiquidityPoolError::InsufficientLiquidity.into());
    }

    // Calculate amounts of Token A and B to return
    let amount_a_out = (lp_token_amount as u128 * pool_state.token_a_reserve as u128 / lp_supply as u128) as u64;
    let amount_b_out = (lp_token_amount as u128 * pool_state.token_b_reserve as u128 / lp_supply as u128) as u64;

    if amount_a_out == 0 || amount_b_out == 0 {
        return Err(LiquidityPoolError::InsufficientLiquidity.into());
    }

    // Burn LP tokens from provider
    invoke(
        &spl_token_instruction::burn(
            token_program_account.key,
            provider_lp_token_account.key,
            lp_mint_account.key,
            provider_account.key,
            &[],
            lp_token_amount,
        )?,
        &[
            provider_lp_token_account.clone(),
            lp_mint_account.clone(),
            provider_account.clone(),
            token_program_account.clone(),
        ],
    )?;

    // Transfer tokens from pool to provider
    let signer_seeds: &[&[u8]] = &[
        b"liquidity_pool",
        pool_state.token_a_mint.as_ref(),
        pool_state.token_b_mint.as_ref(),
        &[pool_state.bump_seed],
    ];
    invoke_signed(
        &spl_token_instruction::transfer(
            token_program_account.key,
            pool_token_a_account.key,
            provider_token_a_account.key,
            pool_state_account.key, // Pool PDA is the authority
            &[pool_state_account.key],
            amount_a_out,
        )?,
        &[
            pool_token_a_account.clone(),
            provider_token_a_account.clone(),
            pool_state_account.clone(), // Pool PDA as signer
            token_program_account.clone(),
        ],
        &[&signer_seeds],
    )?;

    invoke_signed(
        &spl_token_instruction::transfer(
            token_program_account.key,
            pool_token_b_account.key,
            provider_token_b_account.key,
            pool_state_account.key, // Pool PDA is the authority
            &[pool_state_account.key],
            amount_b_out,
        )?,
        &[
            pool_token_b_account.clone(),
            provider_token_b_account.clone(),
            pool_state_account.clone(), // Pool PDA as signer
            token_program_account.clone(),
        ],
        &[&signer_seeds],
    )?;

    pool_state.token_a_reserve -= amount_a_out;
    pool_state.token_b_reserve -= amount_b_out;
    pool_state.lp_supply -= lp_token_amount;

    PoolState::pack(pool_state, &mut pool_state_account.data.borrow_mut())?;

    msg!("Removed liquidity: {} LP tokens. Received {} Token A, {} Token B.", lp_token_amount, amount_a_out, amount_b_out);
    Ok(())
}

fn process_swap_a_for_b(
    _program_id: &Pubkey,
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

    let mut pool_state = PoolState::unpack(&pool_state_account.data.borrow())?;
    if !pool_state.is_initialized {
        return Err(LiquidityPoolError::NotInitialized.into());
    }

    if amount_a_in == 0 {
        return Err(LiquidityPoolError::InvalidTokenAAmount.into());
    }

    if pool_state.token_a_reserve == 0 || pool_state.token_b_reserve == 0 {
        return Err(LiquidityPoolError::ZeroReserves.into());
    }

    // Constant product formula: (reserveA + amountAIn) * (reserveB - amountBOut) = k
    // k = reserveA * reserveB
    // amountBOut = reserveB - (k / (reserveA + amountAIn))
    let k = pool_state.token_a_reserve as u128 * pool_state.token_b_reserve as u128;
    let new_reserve_a = pool_state.token_a_reserve as u128 + amount_a_in as u128;
    let amount_b_out = pool_state.token_b_reserve as u128 - (k / new_reserve_a);

    if amount_b_out == 0 {
        return Err(LiquidityPoolError::InsufficientLiquidity.into());
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

    // Transfer Token B from pool to swapper
    let signer_seeds: &[&[u8]] = &[
        b"liquidity_pool",
        pool_state.token_a_mint.as_ref(),
        pool_state.token_b_mint.as_ref(),
        &[pool_state.bump_seed],
    ];
    invoke_signed(
        &spl_token_instruction::transfer(
            token_program_account.key,
            pool_token_b_account.key,
            swapper_token_b_account.key,
            pool_state_account.key, // Pool PDA is the authority
            &[pool_state_account.key],
            amount_b_out as u64,
        )?,
        &[
            pool_token_b_account.clone(),
            swapper_token_b_account.clone(),
            pool_state_account.clone(), // Pool PDA as signer
            token_program_account.clone(),
        ],
        &[&signer_seeds],
    )?;

    pool_state.token_a_reserve += amount_a_in;
    pool_state.token_b_reserve -= amount_b_out as u64;

    PoolState::pack(pool_state, &mut pool_state_account.data.borrow_mut())?;

    msg!("Swapped {} Token A for {} Token B.", amount_a_in, amount_b_out);
    Ok(())
}

fn process_swap_b_for_a(
    _program_id: &Pubkey,
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

    let mut pool_state = PoolState::unpack(&pool_state_account.data.borrow())?;
    if !pool_state.is_initialized {
        return Err(LiquidityPoolError::NotInitialized.into());
    }

    if amount_b_in == 0 {
        return Err(LiquidityPoolError::InvalidTokenBAmount.into());
    }

    if pool_state.token_a_reserve == 0 || pool_state.token_b_reserve == 0 {
        return Err(LiquidityPoolError::ZeroReserves.into());
    }

    // Constant product formula: (reserveB + amountBIn) * (reserveA - amountAOut) = k
    // k = reserveA * reserveB
    // amountAOut = reserveA - (k / (reserveB + amountBIn))
    let k = pool_state.token_a_reserve as u128 * pool_state.token_b_reserve as u128;
    let new_reserve_b = pool_state.token_b_reserve as u128 + amount_b_in as u128;
    let amount_a_out = pool_state.token_a_reserve as u128 - (k / new_reserve_b);

    if amount_a_out == 0 {
        return Err(LiquidityPoolError::InsufficientLiquidity.into());
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

    // Transfer Token A from pool to swapper
    let signer_seeds: &[&[u8]] = &[
        b"liquidity_pool",
        pool_state.token_a_mint.as_ref(),
        pool_state.token_b_mint.as_ref(),
        &[pool_state.bump_seed],
    ];
    invoke_signed(
        &spl_token_instruction::transfer(
            token_program_account.key,
            pool_token_a_account.key,
            swapper_token_a_account.key,
            pool_state_account.key, // Pool PDA is the authority
            &[pool_state_account.key],
            amount_a_out as u64,
        )?,
        &[
            pool_token_a_account.clone(),
            swapper_token_a_account.clone(),
            pool_state_account.clone(), // Pool PDA as signer
            token_program_account.clone(),
        ],
        &[&signer_seeds],
    )?;

    pool_state.token_b_reserve += amount_b_in;
    pool_state.token_a_reserve -= amount_a_out as u64;

    PoolState::pack(pool_state, &mut pool_state_account.data.borrow_mut())?;

    msg!("Swapped {} Token B for {} Token A.", amount_b_in, amount_a_out);
    Ok(())
}
