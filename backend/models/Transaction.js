const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    propertyId: {
        type: String,
        required: true
    },
    tokenMintAddress: {
        type: String,
        required: true
    },
    buyer: {
        type: String, // Wallet address of the buyer
        required: true
    },
    seller: {
        type: String, // Wallet address of the seller (property owner or secondary seller)
        required: true
    },
    tokenAmount: {
        type: Number,
        required: true,
        min: 0 // Changed min to 0 to allow 0 tokens for bids
    },
    priceSOL: {
        type: Number,
        required: true,
        min: 0
    },
    solanaTxSignature: { // Changed field name from txSignature to solanaTxSignature
        type: String, // Solana transaction signature for SOL transfer
        required: false, // Made optional as some transactions might not have a direct SOL transfer
        unique: false // Removed unique constraint
    },
    propertyTokenTxSignature: { // New field for smart contract interaction signature (e.g., bid on-chain)
        type: String,
        required: false,
        unique: false
    },
    transactionType: {
        type: String,
        enum: ['buy', 'sell', 'start_auction', 'bid', 'auction_end'], // Added 'bid', 'start_auction', 'auction_end'
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
