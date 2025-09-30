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
        min: 1
    },
    priceSOL: {
        type: Number,
        required: true,
        min: 0
    },
    txSignature: {
        type: String, // Solana transaction signature
        required: true,
        unique: true
    },
    transactionType: {
        type: String,
        enum: ['buy', 'sell'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
