#![allow(unused_variables)]
#![allow(unexpected_cfgs)]

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
    program_error::ProgramError,
    program::invoke_signed,
    system_instruction,
    sysvar::{clock::Clock, rent::Rent, Sysvar},
};
use spl_token::instruction as spl_token_instruction;
use borsh::{BorshDeserialize, BorshSerialize};
use thiserror::Error;

// ------------------ Program ID ------------------
// Replace this with your actual deployed program ID (32-byte base58)
solana_program::declare_id!("3W5ebjB6bQkwSNNmK4amLwY47nEfmLztQwgMpa75ZPUt");

// ------------------ Auction Struct ------------------
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Auction {
    pub property_mint: Pubkey,
    pub seller: Pubkey,
    pub start_price: u64,
    pub current_bid: u64,
    pub highest_bidder: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
    pub ended: bool,
    pub bump_seed: u8,
}

impl Auction {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 32 + 8 + 8 + 1 + 1;
}

// ------------------ Auction Instructions ------------------
#[derive(BorshSerialize, BorshDeserialize, Debug, PartialEq)]
pub enum AuctionInstruction {
    InitializeAuction {
        start_price: u64,
        end_time: i64,
    },
    PlaceBid {
        bid_amount: u64,
    },
    EndAuction,
}

// ------------------ Auction Errors ------------------
#[derive(Error, Debug, Copy, Clone)]
pub enum AuctionError {
    #[error("Invalid Instruction")]
    InvalidInstruction,
    #[error("Not Rent Exempt")]
    NotRentExempt,
    #[error("Auction already ended")]
    AuctionAlreadyEnded,
    #[error("Auction not ended")]
    AuctionNotEnded,
    #[error("Bid too low")]
    BidTooLow,
    #[error("Auction not active")]
    AuctionNotActive,
    #[error("Invalid bidder")]
    InvalidBidder,
    #[error("Auction has not started yet")]
    AuctionNotStarted,
    #[error("Auction has already ended")]
    AuctionEnded,
    #[error("Invalid end time")]
    InvalidEndTime,
}

impl From<AuctionError> for ProgramError {
    fn from(e: AuctionError) -> Self {
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
    msg!("Auction Program Entrypoint");

    let instruction = AuctionInstruction::try_from_slice(instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    match instruction {
        AuctionInstruction::InitializeAuction { start_price, end_time } => {
            msg!("Instruction: InitializeAuction");
            process_initialize_auction(program_id, accounts, start_price, end_time)
        }
        AuctionInstruction::PlaceBid { bid_amount } => {
            msg!("Instruction: PlaceBid");
            process_place_bid(program_id, accounts, bid_amount)
        }
        AuctionInstruction::EndAuction => {
            msg!("Instruction: EndAuction");
            process_end_auction(program_id, accounts)
        }
    }
}

// ------------------ Initialize Auction ------------------
fn process_initialize_auction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    start_price: u64,
    end_time: i64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let seller_account = next_account_info(account_info_iter)?;
    let auction_account = next_account_info(account_info_iter)?;
    let property_mint_account = next_account_info(account_info_iter)?;
    let _system_program_account = next_account_info(account_info_iter)?; // unused

    if !seller_account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let (pda, bump_seed) = Pubkey::find_program_address(
        &[b"auction", property_mint_account.key.as_ref()],
        program_id,
    );

    if pda != *auction_account.key {
        return Err(ProgramError::InvalidSeeds);
    }

    if auction_account.data_len() > 0 {
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    if !Rent::get()?.is_exempt(auction_account.lamports(), Auction::LEN) {
        return Err(AuctionError::NotRentExempt.into());
    }

    let current_timestamp = Clock::get()?.unix_timestamp;
    if end_time <= current_timestamp {
        return Err(AuctionError::InvalidEndTime.into());
    }

    let auction_data = Auction {
        property_mint: *property_mint_account.key,
        seller: *seller_account.key,
        start_price,
        current_bid: start_price,
        highest_bidder: Pubkey::default(),
        start_time: current_timestamp,
        end_time,
        ended: false,
        bump_seed,
    };

    auction_data.serialize(&mut &mut auction_account.data.borrow_mut()[..])?;
    msg!("Auction initialized for property: {}", property_mint_account.key);
    Ok(())
}

// ------------------ Place Bid ------------------
fn process_place_bid(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    bid_amount: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let bidder_account = next_account_info(account_info_iter)?;
    let auction_account = next_account_info(account_info_iter)?;
    let previous_bidder_sol_account = next_account_info(account_info_iter)?;
    let _system_program_account = next_account_info(account_info_iter)?; // unused

    if !bidder_account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut auction_data = Auction::try_from_slice(&auction_account.data.borrow())?;

    if auction_data.ended {
        return Err(AuctionError::AuctionAlreadyEnded.into());
    }

    let current_timestamp = Clock::get()?.unix_timestamp;
    if current_timestamp < auction_data.start_time {
        return Err(AuctionError::AuctionNotStarted.into());
    }
    if current_timestamp >= auction_data.end_time {
        return Err(AuctionError::AuctionEnded.into());
    }

    if bid_amount <= auction_data.current_bid {
        return Err(AuctionError::BidTooLow.into());
    }

    // Transfer new bid to auction PDA
    solana_program::program::invoke(
        &system_instruction::transfer(
            bidder_account.key,
            auction_account.key,
            bid_amount,
        ),
        &[bidder_account.clone(), auction_account.clone(), _system_program_account.clone()],
    )?;

    // Refund previous highest bidder
    if auction_data.highest_bidder != Pubkey::default() {
        **auction_account.try_borrow_mut_lamports()? -= auction_data.current_bid;
        **previous_bidder_sol_account.try_borrow_mut_lamports()? += auction_data.current_bid;
        msg!("Refunded previous bidder: {}", auction_data.highest_bidder);
    }

    auction_data.current_bid = bid_amount;
    auction_data.highest_bidder = *bidder_account.key;
    auction_data.serialize(&mut &mut auction_account.data.borrow_mut()[..])?;

    msg!("Bid of {} placed on auction for property: {}", bid_amount, auction_data.property_mint);
    Ok(())
}

// ------------------ End Auction ------------------
fn process_end_auction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let seller_account = next_account_info(account_info_iter)?;
    let auction_account = next_account_info(account_info_iter)?;
    let seller_sol_account = next_account_info(account_info_iter)?;
    let _highest_bidder_sol_account = next_account_info(account_info_iter)?; // unused
    let highest_bidder_token_account = next_account_info(account_info_iter)?;
    let auction_property_token_account = next_account_info(account_info_iter)?;
    let seller_property_token_account = next_account_info(account_info_iter)?;
    let token_program_account = next_account_info(account_info_iter)?;

    let mut auction_data = Auction::try_from_slice(&auction_account.data.borrow())?;

    if auction_data.ended {
        return Err(AuctionError::AuctionAlreadyEnded.into());
    }

    let current_timestamp = Clock::get()?.unix_timestamp;
    if current_timestamp < auction_data.end_time {
        return Err(AuctionError::AuctionNotEnded.into());
    }

    if *seller_account.key != auction_data.seller {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if auction_data.highest_bidder != Pubkey::default() {
        // Transfer SOL to seller
        **auction_account.try_borrow_mut_lamports()? -= auction_data.current_bid;
        **seller_sol_account.try_borrow_mut_lamports()? += auction_data.current_bid;

        // Transfer property token to highest bidder
        let transfer_ix = spl_token_instruction::transfer(
            token_program_account.key,
            auction_property_token_account.key,
            highest_bidder_token_account.key,
            auction_account.key,
            &[auction_account.key],
            1,
        )?;

        invoke_signed(
            &transfer_ix,
            &[
                auction_property_token_account.clone(),
                highest_bidder_token_account.clone(),
                auction_account.clone(),
                token_program_account.clone(),
            ],
            &[&[b"auction", auction_data.property_mint.as_ref(), &[auction_data.bump_seed]]],
        )?;
    } else {
        // No bids, return property token to seller
        let transfer_ix = spl_token_instruction::transfer(
            token_program_account.key,
            auction_property_token_account.key,
            seller_property_token_account.key,
            auction_account.key,
            &[auction_account.key],
            1,
        )?;

        invoke_signed(
            &transfer_ix,
            &[
                auction_property_token_account.clone(),
                seller_property_token_account.clone(),
                auction_account.clone(),
                token_program_account.clone(),
            ],
            &[&[b"auction", auction_data.property_mint.as_ref(), &[auction_data.bump_seed]]],
        )?;
    }

    auction_data.ended = true;
    auction_data.serialize(&mut &mut auction_account.data.borrow_mut()[..])?;
    msg!("Auction ended for property: {}", auction_data.property_mint);
    Ok(())
}
