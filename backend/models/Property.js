const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const PropertySchema = new mongoose.Schema({
    propertyId: {
        type: String,
        default: uuidv4,
        unique: true,
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    propertyType: {
        type: String,
        enum: ['house', 'apartment', 'condo', 'land', 'commercial', 'other'], // Example types
        required: true,
        default: 'house' // Default value
    },
    priceSOL: {
        type: Number,
        required: true,
        min: 0
    },
    totalTokens: {
        type: Number,
        required: true,
        min: 1
    },
    propertyDetails: {
        sqft: { type: Number, min: 0 },
        bedrooms: { type: Number, min: 0 },
        bathrooms: { type: Number, min: 0 },
        yearBuilt: { type: Number, min: 1000, max: new Date().getFullYear() }
    },
    imageURLs: [{
        type: String // IPFS links
    }],
    tokenMintAddress: {
        type: String, // Solana token mint address
        default: null
    },
    owner: {
        type: String, // Wallet address of the property creator
        required: true
    },
    status: {
        type: String,
        enum: ['pending_verification', 'verified', 'tokenized', 'bidding', 'sold_out', 'rejected'],
        default: 'pending_verification'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Property', PropertySchema);
