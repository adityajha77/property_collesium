const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs'); // Import fs for file system operations
const Property = require('../models/Property');
const Transaction = require('../models/Transaction'); // Import Transaction model
const { uploadFileToIPFS } = require('../utils/ipfs');
const { PublicKey, Connection, SystemProgram } = require('@solana/web3.js'); // Import PublicKey, Connection, and SystemProgram

// This module will now export a function that takes solanaUtils as an argument
module.exports = (solanaUtils) => {
    // Destructure functions, but access backendWallet and connection via getters/properties later
    const { createPropertyToken, transferTokens, verifyTransaction, getBackendWallet, getConnection } = solanaUtils;

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
        const {
            location,
            minPrice,
            maxPrice,
            minTokens,
            maxTokens,
            propertyType,
            sortBy = 'createdAt', // Default sort by creation date
            sortOrder = 'desc'    // Default sort order descending
        } = req.query;

        let query = { status: 'tokenized' }; // Only show tokenized properties for the general marketplace

        // Filtering
        if (location) {
            query.location = { $regex: location, $options: 'i' }; // Case-insensitive search
        }
        if (minPrice) {
            query.priceSOL = { ...query.priceSOL, $gte: parseFloat(minPrice) };
        }
        if (maxPrice) {
            query.priceSOL = { ...query.priceSOL, $lte: parseFloat(maxPrice) };
        }
        if (minTokens) {
            query.totalTokens = { ...query.totalTokens, $gte: parseInt(minTokens) };
        }
        if (maxTokens) {
            query.totalTokens = { ...query.totalTokens, $lte: parseInt(maxTokens) };
        }
        if (propertyType && propertyType !== 'all') { // Only apply filter if propertyType is not 'all'
            query.propertyType = propertyType;
        }

        // Sorting
        const sortOptions = {};
        if (sortBy) {
            sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
        }

        const properties = await Property.find(query).sort(sortOptions);
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

// @route   GET /api/properties/my-properties/:ownerPublicKey
// @desc    Get all properties for a specific owner, regardless of status (alias for /owner/:ownerAddress)
// @access  Public (will add authentication later)
router.get('/my-properties/:ownerPublicKey', async (req, res) => {
    try {
        const properties = await Property.find({ owner: req.params.ownerPublicKey });
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

// @route   PUT /api/properties/:id/status
// @desc    Update property status (e.g., for admin verification)
// @access  Private (Admin only)
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body; // Expected status: 'verified', 'tokenized', 'rejected'

        // Basic validation for allowed statuses
        const allowedStatuses = ['verified', 'tokenized', 'rejected'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ msg: 'Invalid status provided' });
        }

        const property = await Property.findOne({ propertyId: req.params.id });

        if (!property) {
            return res.status(404).json({ msg: 'Property not found' });
        }

        property.status = status;
        await property.save();

        res.json(property);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: 'Invalid Property ID format' });
        }
        res.status(500).send('Server Error');
    }
});


// @route   POST /api/properties/:id/buy
// @desc    User buys tokens for a property
// @access  Public (for now, will add authentication later)
router.post('/:id/buy', async (req, res) => {
    try {
        const { buyerPublicKey, tokensToBuy, solanaTxSignature } = req.body;

        const property = await Property.findOne({ propertyId: req.params.id });

        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        if (property.status !== 'tokenized') {
            return res.status(400).json({ message: 'Property is not tokenized or available for sale' });
        }

        if (!property.tokenMintAddress) {
            return res.status(400).json({ message: 'Property token mint address not found' });
        }

        if (tokensToBuy <= 0) {
            return res.status(400).json({ message: 'Token amount must be greater than 0' });
        }

        if (!solanaTxSignature) {
            return res.status(400).json({ message: 'SOL payment transaction signature is required.' });
        }

        // Verify the SOL payment transaction on the Solana blockchain
        const isSolPaymentVerified = await verifyTransaction(solanaTxSignature);
        if (!isSolPaymentVerified) {
            return res.status(400).json({ message: 'Invalid or unconfirmed SOL payment transaction signature.' });
        }

        // Calculate the SOL amount expected for the tokens
        const tokenPricePerSOL = property.priceSOL / property.totalTokens;
        const expectedSOLAmount = tokensToBuy * tokenPricePerSOL;
        const expectedLamports = Math.round(expectedSOLAmount * 1_000_000_000);

        // Verify the actual SOL amount transferred in solanaTxSignature
        // Need to get the connection object from solana.js
        const connection = solanaUtils.getConnection(); // Access via getter
        const transactionDetails = await connection.getParsedTransaction(solanaTxSignature, { commitment: 'finalized' });

        if (!transactionDetails) {
            return res.status(400).json({ message: 'Could not retrieve details for SOL payment transaction.' });
        }

        let actualTransferredLamports = 0;
        const backendWallet = getBackendWallet(); // Get the initialized backend wallet
        console.log("backendWallet (from getter):", backendWallet); // Debugging log
        const backendWalletAddress = backendWallet.publicKey.toBase58(); // Access publicKey from the retrieved wallet

        // Iterate through instructions to find the SystemProgram.transfer
        for (const instruction of transactionDetails.transaction.message.instructions) {
            if (instruction.programId.toBase58() === SystemProgram.programId.toBase58() && instruction.parsed?.type === 'transfer') {
                const { info } = instruction.parsed;
                if (info.source === buyerPublicKey && info.destination === backendWalletAddress) {
                    actualTransferredLamports = info.lamports;
                    break;
                }
            }
        }

        if (actualTransferredLamports < expectedLamports) {
            return res.status(400).json({ message: `Insufficient SOL payment. Expected at least ${expectedSOLAmount} SOL, but received ${actualTransferredLamports / 1_000_000_000} SOL.` });
        }

        // Transfer property tokens from backend wallet to buyer
        const transferTxSignature = await transferTokens(
            property.tokenMintAddress,
            getBackendWallet(), // Sender is the backend wallet (initial minter/owner)
            new PublicKey(buyerPublicKey), // Recipient is the buyer
            tokensToBuy
        );

        // Record the transaction
        const newTransaction = new Transaction({
            propertyId: property.propertyId,
            tokenMintAddress: property.tokenMintAddress,
            buyer: buyerPublicKey,
            seller: getBackendWallet().publicKey.toBase58(), // Backend wallet is the seller for initial sale
            tokenAmount: tokensToBuy,
            priceSOL: expectedSOLAmount, // Record the actual SOL price for this transaction
            solanaTxSignature: solanaTxSignature, // Store the SOL payment transaction signature
            propertyTokenTxSignature: transferTxSignature, // Store the property token transfer signature
            txSignature: solanaTxSignature, // Use the SOL payment signature as the primary transaction signature
            transactionType: 'buy',
            status: 'success' // Assuming success if we reach here
        });

        await newTransaction.save();

        res.status(200).json({
            message: `Successfully bought ${tokensToBuy} tokens for property ${property.title}`,
            transactionId: newTransaction._id,
            propertyTokenTxSignature: transferTxSignature
        });
    } catch (err) {
        console.error("Error in buy tokens route:", err.message);
        res.status(500).json({ message: 'Server Error during token purchase', error: err.message });
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

// @route   GET /api/transactions/buyer/:buyerPublicKey
// @desc    Get all transactions for a specific buyer
// @access  Public (will add authentication later)
router.get('/transactions/buyer/:buyerPublicKey', async (req, res) => {
    try {
        const transactions = await Transaction.find({ buyer: req.params.buyerPublicKey }).sort({ createdAt: -1 });
        res.json(transactions);
    } catch (err) {
        console.error("Error fetching buyer transactions:", err.message);
        res.status(500).json({ message: 'Server Error fetching transactions', error: err.message });
    }
});

// @route   GET /api/properties/transactions/user/:userPublicKey
// @desc    Get all transactions for a specific user (as buyer or seller)
// @access  Public (will add authentication later)
router.get('/transactions/user/:userPublicKey', async (req, res) => {
    try {
        const userPublicKey = req.params.userPublicKey;
        console.log(`Fetching transactions for user: ${userPublicKey}`);
        const transactions = await Transaction.find({
            $or: [{ buyer: userPublicKey }, { seller: userPublicKey }]
        }).sort({ createdAt: -1 });
        console.log(`Found ${transactions.length} transactions for user ${userPublicKey}`);
        res.json(transactions);
    } catch (err) {
        console.error("Error fetching user transactions:", err.message);
        res.status(500).json({ message: 'Server Error fetching transactions', error: err.message });
    }
});

    return router;
};
