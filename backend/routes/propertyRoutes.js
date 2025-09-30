const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs'); // Import fs for file system operations
const Property = require('../models/Property');
const Transaction = require('../models/Transaction'); // Import Transaction model
const { uploadFileToIPFS } = require('../utils/ipfs');
const { createPropertyToken, transferTokens, verifyTransaction } = require('../utils/solana'); // Import transferTokens and verifyTransaction
const { Keypair, PublicKey } = require('@solana/web3.js'); // Import Keypair and PublicKey

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Files will be temporarily stored in the 'uploads' directory
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// @route   POST /api/properties
// @desc    Create a new property and save to DB, handle image uploads to IPFS
// @access  Public (for now, will add authentication later)
// @route   POST /api/properties
// @desc    Create a new property and save to DB, handle image uploads to IPFS
// @access  Public (for now, will add authentication later)
router.post('/', upload.array('images', 10), async (req, res) => { // 'images' is the field name for files, max 10 files
    try {
        const {
            title,
            location,
            description,
            priceSOL,
            totalTokens,
            sqft,
            bedrooms,
            bathrooms,
            yearBuilt,
            owner
        } = req.body;

        const imageURLs = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const ipfsUrl = await uploadFileToIPFS(file.path);
                imageURLs.push(ipfsUrl);
                // Optionally, delete the local file after uploading to IPFS
                fs.unlinkSync(file.path);
            }
        }

        const newProperty = new Property({
            title,
            location,
            description,
            priceSOL,
            totalTokens,
            propertyDetails: {
                sqft,
                bedrooms,
                bathrooms,
                yearBuilt
            },
            imageURLs,
            owner
        });

        const property = await newProperty.save();
        res.status(201).json(property);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/properties
// @desc    Get all available properties (only tokenized for marketplace)
// @access  Public
router.get('/', async (req, res) => {
    try {
        const properties = await Property.find({ status: 'tokenized' }); // Only show tokenized properties for the general marketplace
        res.json(properties);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/properties/owner/:ownerAddress
// @desc    Get all properties for a specific owner, regardless of status
// @access  Public (will add authentication later)
router.get('/owner/:ownerAddress', async (req, res) => {
    try {
        const properties = await Property.find({ owner: req.params.ownerAddress });
        res.json(properties);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/properties/upcoming
// @desc    Get all properties that are pending verification
// @access  Public
router.get('/upcoming', async (req, res) => {
    try {
        const properties = await Property.find({ status: 'pending_verification' });
        res.json(properties);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/properties/:id
// @desc    Get a single property by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const property = await Property.findOne({ propertyId: req.params.id });

        if (!property) {
            return res.status(404).json({ msg: 'Property not found' });
        }

        res.json(property);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') { // For invalid MongoDB ObjectId format
            return res.status(400).json({ msg: 'Invalid Property ID format' });
        }
        res.status(500).send('Server Error');
    }
});


// @route   POST /api/buy/:id
// @desc    User buys tokens for a property
// @access  Public (for now, will add authentication later)
router.post('/buy/:id', async (req, res) => {
    try {
        const { buyerWalletAddress, tokenAmount, txSignature } = req.body;

        const property = await Property.findOne({ propertyId: req.params.id });

        if (!property) {
            return res.status(404).json({ msg: 'Property not found' });
        }

        if (property.status !== 'tokenized') {
            return res.status(400).json({ msg: 'Property is not tokenized or available for sale' });
        }

        if (!property.tokenMintAddress) {
            return res.status(400).json({ msg: 'Property token mint address not found' });
        }

        if (tokenAmount <= 0) {
            return res.status(400).json({ msg: 'Token amount must be greater than 0' });
        }

        if (!txSignature) {
            return res.status(400).json({ msg: 'Transaction signature is required for payment confirmation' });
        }

        // Verify the transaction signature on the Solana blockchain
        const isTxVerified = await verifyTransaction(txSignature);
        if (!isTxVerified) {
            return res.status(400).json({ msg: 'Invalid or unconfirmed transaction signature' });
        }

        // Load backend wallet (which holds the initial minted tokens for the property)
        const backendWalletSecretKey = process.env.BACKEND_WALLET_SECRET_KEY;
        if (!backendWalletSecretKey) {
            throw new Error("BACKEND_WALLET_SECRET_KEY is not set in .env");
        }
        const backendWallet = Keypair.fromSecretKey(
            Uint8Array.from(JSON.parse(backendWalletSecretKey))
        );

        // Transfer tokens from backend wallet (acting as property owner) to buyer
        const transferTxSignature = await transferTokens(
            property.tokenMintAddress,
            backendWallet, // Sender is the backend wallet (initial minter/owner)
            buyerWalletAddress, // Recipient is the buyer
            tokenAmount
        );

        // Record the transaction
        const newTransaction = new Transaction({
            propertyId: property.propertyId,
            tokenMintAddress: property.tokenMintAddress,
            buyer: buyerWalletAddress,
            seller: backendWallet.publicKey.toBase58(), // Backend wallet is the seller for initial sale
            tokenAmount: tokenAmount,
            priceSOL: property.priceSOL * tokenAmount / property.totalTokens, // Calculate price based on fractional ownership
            txSignature: transferTxSignature,
            transactionType: 'buy'
        });

        await newTransaction.save();

        res.json({ msg: `Successfully bought ${tokenAmount} tokens for property ${property.title}`, transaction: newTransaction });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/sell/:id
// @desc    User lists tokens for resale (secondary marketplace)
// @access  Public (for now, will add authentication later)
router.post('/sell/:id', async (req, res) => {
    try {
        const { sellerWalletAddress, tokenAmount, priceSOL } = req.body;

        const property = await Property.findOne({ propertyId: req.params.id });

        if (!property) {
            return res.status(404).json({ msg: 'Property not found' });
        }

        if (property.status !== 'tokenized') {
            return res.status(400).json({ msg: 'Property is not tokenized' });
        }

        if (!property.tokenMintAddress) {
            return res.status(400).json({ msg: 'Property token mint address not found' });
        }

        if (tokenAmount <= 0 || priceSOL <= 0) {
            return res.status(400).json({ msg: 'Token amount and price must be greater than 0' });
        }

        // For a secondary sale, the seller is the user's wallet.
        // The tokens would be transferred from the seller's wallet to the buyer's wallet.
        // This endpoint would primarily be for listing the tokens for sale, not the actual transfer.
        // The actual transfer would happen on the frontend via wallet interaction,
        // and then confirmed by the backend.

        // For simplicity, this endpoint will just log the intent to sell.
        // A more complete implementation would involve a listing mechanism,
        // potentially on-chain or a more complex off-chain order book.

        // Record the intent to sell (this is a simplified representation)
        const newTransaction = new Transaction({
            propertyId: property.propertyId,
            tokenMintAddress: property.tokenMintAddress,
            buyer: 'marketplace_listing', // Placeholder for marketplace
            seller: sellerWalletAddress,
            tokenAmount: tokenAmount,
            priceSOL: priceSOL,
            txSignature: 'pending_marketplace_listing', // Placeholder
            transactionType: 'sell'
        });

        await newTransaction.save();

        res.json({ msg: `Successfully listed ${tokenAmount} tokens for property ${property.title} for resale`, listing: newTransaction });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
