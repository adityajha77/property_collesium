const express = require('express');
const router = express.Router();
const Auction = require('../models/Auction');
const Property = require('../models/Property'); // Needed to link property details
const Transaction = require('../models/Transaction'); // To record auction transactions
const { PublicKey, SystemProgram } = require('@solana/web3.js'); // Import SystemProgram

module.exports = (solanaUtils, io) => { // Accept io as an argument
    const { transferTokens, verifyTransaction, getBackendWallet, getConnection, verifySolTransfer, initializeAuctionOnChain, placeBidOnChain, endAuctionOnChain, getAuctionState } = solanaUtils; // Destructure all relevant solanaUtils functions

    // @route   POST /api/auctions
    // @desc    Create a new auction (Start Bidding)
    // @access  Private (property owner only)
    router.post('/', async (req, res) => {
        try {
            const { propertyId, seller, auctionDurationSeconds, startPriceSOL, auctionType } = req.body;

            // Basic validation
            if (!propertyId || !seller || startPriceSOL === undefined || !auctionDurationSeconds || !auctionType) {
                return res.status(400).json({ message: 'Missing required auction fields: propertyId, seller, startPriceSOL, auctionDurationSeconds, auctionType' });
            }

            const property = await Property.findOne({ propertyId: propertyId });
            if (!property) {
                return res.status(404).json({ message: 'Property not found' });
            }

            // Security & Permissions: Only property owners can start bids.
            if (property.owner !== seller) {
                return res.status(403).json({ message: 'Seller does not own this property' });
            }

            // Security & Permissions: Only verified or tokenized properties can be listed for bidding.
            if (property.status !== 'verified' && property.status !== 'tokenized') {
                return res.status(400).json({ message: 'Property must be in "verified" or "tokenized" status to start an auction' });
            }

            if (!property.tokenMintAddress) {
                return res.status(400).json({ message: 'Property does not have a token mint address' });
            }

            // Check if property is already in an active auction
            const existingAuction = await Auction.findOne({ propertyId: property._id, status: 'active' });
            if (existingAuction) {
                return res.status(400).json({ message: 'Property is already in an active auction' });
            }

            const startTime = new Date();
            const endTime = new Date(startTime.getTime() + auctionDurationSeconds * 1000); // Convert seconds to milliseconds

            // 1. Initialize auction on Solana Smart Contract
            const { auctionAccountPublicKey, txSignature: initTxSignature } = await initializeAuctionOnChain(
                property.tokenMintAddress,
                new PublicKey(seller),
                startPriceSOL,
                auctionDurationSeconds
            );

            // 2. Create auction record in database
            const newAuction = new Auction({
                propertyId: property._id, // Use MongoDB ObjectId for linking
                seller,
                startTime,
                endTime,
                startPriceSOL,
                currentBidSOL: startPriceSOL,
                tokenMintAddress: property.tokenMintAddress,
                auctionAccountPublicKey: auctionAccountPublicKey, // Store the on-chain auction account
                status: 'active',
                auctionType: auctionType // Store the auction type
            });

            const auction = await newAuction.save();

            // 3. Update property status to 'bidding'
            property.status = 'bidding';
            await property.save();

            // 4. Record the transaction for starting the auction
            const startAuctionTransaction = new Transaction({
                propertyId: property.propertyId,
                tokenMintAddress: property.tokenMintAddress,
                seller: seller,
                transactionType: 'start_auction',
                priceSOL: startPriceSOL,
                solanaTxSignature: initTxSignature,
                status: 'success'
            });
            await startAuctionTransaction.save();

            // Emit WebSocket event for new auction
            io.emit('auctionUpdate', { type: 'auctionStarted', auction: auction.toObject(), propertyStatus: property.status });

            res.status(201).json({ message: 'Auction started successfully', auction });
        } catch (err) {
            console.error("Error in start auction route:", err.message);
            res.status(500).json({ message: 'Server Error during auction creation', error: err.message });
        }
    });

    // @route   GET /api/auctions
    // @desc    Get all active auctions
    // @access  Public
    router.get('/', async (req, res) => {
        try {
            const auctions = await Auction.find({ status: 'active', endTime: { $gt: new Date() } })
                                          .populate('propertyId'); // Populate property details
            res.json(auctions);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    // @route   GET /api/auctions/my-auctions/:sellerPublicKey
    // @desc    Get all auctions created by a specific seller
    // @access  Public (or Private if authentication is added)
    router.get('/my-auctions/:sellerPublicKey', async (req, res) => {
        try {
            const { sellerPublicKey } = req.params;
            const myAuctions = await Auction.find({ seller: sellerPublicKey })
                                            .populate('propertyId')
                                            .sort({ startTime: -1 }); // Sort by most recent first
            res.json(myAuctions);
        } catch (err) {
            console.error("Error fetching my auctions:", err.message);
            res.status(500).send('Server Error');
        }
    });

    // @route   GET /api/auctions/:id
    // @desc    Get details of a specific auction
    // @access  Public
    router.get('/:id', async (req, res) => {
        try {
            const auction = await Auction.findOne({ auctionId: req.params.id })
                                         .populate('propertyId'); // Populate property details

            if (!auction) {
                return res.status(404).json({ message: 'Auction not found' });
            }
            res.json(auction);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    // @route   POST /api/auctions/:id/bid
    // @desc    Place a bid on an auction
    // @access  Private (bidder only)
    router.post('/:id/bid', async (req, res) => {
        try {
            const { bidderPublicKey, bidAmountSOL, solanaTxSignature } = req.body;

            console.log('Received bid request:');
            console.log('  Auction ID:', req.params.id);
            console.log('  Bidder Public Key:', bidderPublicKey);
            console.log('  Bid Amount SOL:', bidAmountSOL);
            console.log('  Solana Tx Signature:', solanaTxSignature);

            const auction = await Auction.findOne({ auctionId: req.params.id });

            if (!auction) {
                console.log('Auction not found for ID:', req.params.id);
                return res.status(404).json({ message: 'Auction not found' });
            }
            console.log('Found auction:', auction.auctionId, 'Status:', auction.status, 'End Time:', auction.endTime);


            if (auction.status !== 'active' || auction.endTime <= new Date()) {
                console.log('Auction not active or ended. Status:', auction.status, 'End Time:', auction.endTime);
                return res.status(400).json({ message: 'Auction is not active or has ended' });
            }

            if (bidAmountSOL <= auction.currentBidSOL) {
                console.log('Invalid bid amount. Bid:', bidAmountSOL, 'Current Bid:', auction.currentBidSOL);
                return res.status(400).json({ message: `Bid must be higher than the current bid of ${auction.currentBidSOL} SOL` });
            }

            if (!solanaTxSignature) {
                console.log('Missing Solana transaction signature.');
                return res.status(400).json({ message: 'SOL payment transaction signature is required.' });
            }

            // Convert SOL bid amount to lamports
            const bidAmountLamports = Math.round(bidAmountSOL * 1_000_000_000);
            console.log('Bid amount in lamports:', bidAmountLamports);
            console.log('Backend Wallet Public Key:', getBackendWallet().publicKey.toBase58());


            // Verify the SOL payment transaction on the Solana blockchain
            const isSolPaymentVerified = await verifySolTransfer(
                solanaTxSignature,
                bidderPublicKey,
                getBackendWallet().publicKey.toBase58(), // Bids go to the backend wallet
                bidAmountLamports
            );

            console.log('Solana payment verification result:', isSolPaymentVerified);

            if (!isSolPaymentVerified) {
                return res.status(400).json({ message: 'Invalid or unconfirmed SOL payment transaction, or incorrect amount/sender/recipient.' });
            }

            // 2. Place bid on Solana Smart Contract
            const { newHighestBid, newHighestBidder, txSignature: bidTxSignature } = await placeBidOnChain(
                auction.auctionAccountPublicKey,
                new PublicKey(bidderPublicKey),
                bidAmountSOL
            );

            // 3. Update auction with new bid from on-chain state and add to bids array
            auction.currentBidSOL = newHighestBid;
            auction.highestBidder = newHighestBidder;
            auction.bids.push({
                bidder: bidderPublicKey,
                amount: bidAmountSOL,
                timestamp: new Date()
            });
            await auction.save();

            // 4. Record the bid as a transaction
            const newTransaction = new Transaction({
                propertyId: auction.propertyId,
                tokenMintAddress: auction.tokenMintAddress,
                buyer: bidderPublicKey,
                seller: auction.seller, // Seller of the property
                tokenAmount: 0, // No tokens transferred yet, just a bid
                priceSOL: bidAmountSOL,
                solanaTxSignature: solanaTxSignature, // SOL payment signature
                propertyTokenTxSignature: bidTxSignature, // Smart contract interaction signature
                transactionType: 'bid',
                status: 'pending' // Status pending until auction ends
            });
            await newTransaction.save();

            // Emit WebSocket event for new bid
            io.emit('auctionUpdate', { type: 'bidPlaced', auction: auction.toObject(), newBidder: newHighestBidder, newBid: newHighestBid });

            res.status(200).json({ message: 'Bid placed successfully', auction });
        } catch (err) {
            console.error("Error in place bid route:", err.message);
            res.status(500).json({ message: 'Server Error during bid placement', error: err.message });
        }
    });

    // @route   POST /api/auctions/:id/end
    // @desc    End an auction and transfer token to highest bidder
    // @access  Private (admin/system only)
    router.post('/:id/end', async (req, res) => {
        try {
            const auction = await Auction.findOne({ auctionId: req.params.id });

            if (!auction) {
                return res.status(404).json({ message: 'Auction not found' });
            }

            if (auction.status === 'ended') {
                return res.status(400).json({ message: 'Auction has already ended' });
            }

            // 1. End auction on Solana Smart Contract (now passing the full auction object)
            const { finalStatus, winner, finalPrice, txSignature: endTxSignature } = await endAuctionOnChain(
                auction // Pass the entire auction object
            );

            // 2. Update auction status in database based on smart contract outcome
            auction.status = finalStatus;
            auction.highestBidder = winner; // Update with actual winner from contract
            auction.currentBidSOL = finalPrice; // Update with actual final price from contract
            await auction.save();

            const property = await Property.findById(auction.propertyId);
            if (property) {
                property.status = (finalStatus === 'ended' && winner) ? 'sold_out' : 'tokenized'; // If ended with winner, sold_out, else back to tokenized
                await property.save();
            }

            // 3. Record the final transaction
            const finalAuctionTransaction = new Transaction({
                propertyId: auction.propertyId,
                tokenMintAddress: auction.tokenMintAddress,
                buyer: winner, // Highest bidder is the buyer
                seller: auction.seller,
                tokenAmount: (finalStatus === 'ended' && winner) ? 1 : 0, // 1 token if sold, 0 otherwise
                priceSOL: finalPrice,
                solanaTxSignature: endTxSignature, // Smart contract interaction signature
                transactionType: 'auction_end',
                status: 'success'
            });
            await finalAuctionTransaction.save();

            // Update the transaction status for the winning bid if applicable
            if (winner && finalStatus === 'ended') {
                await Transaction.findOneAndUpdate(
                    { propertyId: auction.propertyId, buyer: winner, transactionType: 'bid', status: 'pending' },
                    { $set: { status: 'success', propertyTokenTxSignature: endTxSignature, tokenAmount: 1 } }
                );
            }

            // Emit WebSocket event for auction end
            io.emit('auctionUpdate', { type: 'auctionEnded', auction: auction.toObject(), finalTransaction: finalAuctionTransaction.toObject(), propertyStatus: property ? property.status : null });

            res.status(200).json({
                message: `Auction ended with status: ${finalStatus}`,
                auction,
                finalAuctionTransaction
            });
        } catch (err) {
            console.error("Error in end auction route:", err.message);
            res.status(500).json({ message: 'Server Error during auction ending', error: err.message });
        }
    });

    return router;
};
