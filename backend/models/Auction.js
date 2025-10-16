const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const AuctionSchema = new mongoose.Schema({
    auctionId: {
        type: String,
        default: uuidv4,
        unique: true,
        required: true
    },
    propertyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: true
    },
    seller: {
        type: String, // Wallet address of the property seller
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    startPriceSOL: {
        type: Number,
        required: true,
        min: 0
    },
    currentBidSOL: {
        type: Number,
        default: 0,
        min: 0
    },
    highestBidder: {
        type: String, // Wallet address of the current highest bidder
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'ended', 'cancelled'],
        default: 'active'
    },
    tokenMintAddress: {
        type: String, // Solana token mint address of the property being auctioned
        required: true
    },
    auctionType: {
        type: String,
        enum: ['standard', 'dutch'],
        default: 'standard'
    },
    bids: [
        {
            bidder: {
                type: String,
                required: true
            },
            amount: {
                type: Number,
                required: true,
                min: 0
            },
            timestamp: {
                type: Date,
                default: Date.now
            }
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update `updatedAt` field on save
AuctionSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Auction', AuctionSchema);
