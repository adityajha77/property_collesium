const {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram // Add SystemProgram here
} = require('@solana/web3.js');

const {
    getOrCreateAssociatedTokenAccount,
    mintTo,
    transfer
} = require('@solana/spl-token');

const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { createSignerFromKeypair, publicKey, generateSigner } = require('@metaplex-foundation/umi');
const { createV1, TokenStandard } = require('@metaplex-foundation/mpl-token-metadata');
const { uploadJSONToIPFS } = require('./ipfs'); // Import the IPFS uploader

let connection;
let umi;
let backendWallet;
let backendSigner;

const initializeSolana = (solanaRpcUrl, backendWalletSecretKey) => {
    connection = new Connection(solanaRpcUrl, 'finalized');

    const secretKey = Uint8Array.from(JSON.parse(backendWalletSecretKey));
    backendWallet = Keypair.fromSecretKey(secretKey);

    umi = createUmi(solanaRpcUrl);

    // Create a UMI-compatible keypair and signer from the same secret key
    const umiKeypair = umi.eddsa.createKeypairFromSecretKey(backendWallet.secretKey);
    backendSigner = createSignerFromKeypair(umi, umiKeypair);

    // Set the signer for UMI transactions
    umi.use({
        install(context) {
            context.identity = backendSigner;
            context.payer = backendSigner;
        }
    });

    console.log("✅ Solana initialized with backend wallet:", backendWallet.publicKey.toBase58());
    return backendWallet.publicKey; // Return the public key
};

// Create property token (fungible SPL token with metadata)
const createPropertyToken = async (property) => {
    try {
        // 1️⃣ Upload metadata JSON
        const metadata = {
            name: property.title,
            symbol: "PROP",
            description: property.description,
            image: property.imageURLs?.[0] || "",
            attributes: [
                { trait_type: 'Location', value: property.location },
                { trait_type: 'Bedrooms', value: property.propertyDetails?.bedrooms?.toString() || "0" },
                { trait_type: 'Bathrooms', value: property.propertyDetails?.bathrooms?.toString() || "0" }
            ]
        };

        const uri = await uploadJSONToIPFS(metadata);
        console.log("✅ Metadata uploaded to IPFS:", uri);

        // 2️⃣ Generate a signer for the new mint, and create the mint and metadata in one transaction
        const mint = generateSigner(umi);
        console.log("✅ Generated Mint Signer:", mint.publicKey);

        // 3️⃣ Create the token and attach metadata in a single transaction
        await createV1(umi, {
            mint: mint,
            authority: backendSigner, // The backend wallet is the authority for the metadata
            name: property.title,
            symbol: "PROP",
            uri: uri,
            sellerFeeBasisPoints: 0,
            isMutable: true,
            tokenStandard: TokenStandard.Fungible,
        }).sendAndConfirm(umi);

        console.log("✅ Metadata linked to mint:", mint.publicKey);

        // 4️⃣ Mint tokens to backend wallet (initial holder)
        const mintPublicKey = new PublicKey(mint.publicKey);
        const backendTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            backendWallet,
            mintPublicKey,
            backendWallet.publicKey
        );

        await mintTo(
            connection,
            backendWallet,
            mintPublicKey,
            backendTokenAccount.address,
            backendWallet,
            property.totalTokens
        );

        console.log(`✅ Minted ${property.totalTokens} tokens to backend wallet: ${backendWallet.publicKey.toBase58()}`);

        return {
            mintAddress: mint.publicKey,
            metadataUri: uri,
        };
    } catch (error) {
        console.error("❌ Error creating property token:", error);
        throw error;
    }
};

// Transfer tokens
const transferTokens = async (mintAddress, senderKeypair, recipientPublicKey, amount) => {
    try {
        const mintPublicKey = new PublicKey(mintAddress);
        const recipientPubkey = new PublicKey(recipientPublicKey);

        console.log(`Attempting to transfer ${amount} tokens of mint ${mintAddress}`);
        console.log(`Sender: ${senderKeypair.publicKey.toBase58()}, Recipient: ${recipientPubkey.toBase58()}`);

        const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            senderKeypair,
            mintPublicKey,
            senderKeypair.publicKey
        );

        const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            senderKeypair,
            mintPublicKey,
            recipientPubkey
        );

        const signature = await transfer(
            connection,
            senderKeypair,
            senderTokenAccount.address,
            recipientTokenAccount.address,
            senderKeypair.publicKey,
            amount
        );

        // Wait for the transaction to be finalized
        await connection.confirmTransaction(signature, 'finalized');

        console.log(`✅ Transferred ${amount} tokens and confirmed: ${signature}`);
        return signature;
    } catch (error) {
        console.error("❌ Error transferring tokens:", error);
        // Log more details about the error
        if (error.logs) {
            console.error("Solana transaction logs:", error.logs);
        }
        if (error.message) {
            console.error("Error message:", error.message);
        }
        throw error;
    }
};

// Verify transaction
const verifyTransaction = async (signature) => {
    try {
        const status = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
        if (status?.value?.confirmationStatus === 'finalized') {
            console.log(`✅ Transaction ${signature} finalized`);
            return true;
        } else {
            console.warn(`⚠️ Transaction ${signature} not finalized`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error verifying tx ${signature}:`, error);
        return false;
    }
};

// New function to verify SOL transfer details
const verifySolTransfer = async (signature, expectedSender, expectedRecipient, expectedAmountLamports) => {
    try {
        const connection = getConnection();
        const transactionDetails = await connection.getParsedTransaction(signature, { commitment: 'finalized' });

        if (!transactionDetails) {
            console.warn(`⚠️ Transaction ${signature} details not found.`);
            return false;
        }

        if (transactionDetails.meta.err) {
            console.error(`❌ Transaction ${signature} failed on chain:`, transactionDetails.meta.err);
            return false;
        }

        let actualTransferredLamports = 0;
        let transferFound = false;

        for (const instruction of transactionDetails.transaction.message.instructions) {
            if (instruction.programId.toBase58() === SystemProgram.programId.toBase58() && instruction.parsed?.type === 'transfer') {
                const { info } = instruction.parsed;
                if (info.source === expectedSender && info.destination === expectedRecipient) {
                    actualTransferredLamports = info.lamports;
                    transferFound = true;
                    break;
                }
            }
        }

        if (!transferFound) {
            console.warn(`⚠️ No matching SOL transfer found in transaction ${signature}.`);
            return false;
        }

        if (actualTransferredLamports < expectedAmountLamports) {
            console.warn(`⚠️ Insufficient SOL transferred in ${signature}. Expected ${expectedAmountLamports}, got ${actualTransferredLamports}.`);
            return false;
        }

        console.log(`✅ Verified SOL transfer for transaction ${signature}. Amount: ${actualTransferredLamports} lamports.`);
        return true;

    } catch (error) {
        console.error(`❌ Error verifying SOL transfer tx ${signature}:`, error);
        return false;
    }
};

const getConnection = () => {
    if (!connection) {
        console.error("Solana connection not initialized. Call initializeSolana first.");
        throw new Error("Solana connection not initialized.");
    }
    return connection;
};

const getBackendWallet = () => {
    if (!backendWallet) {
        console.error("Backend wallet not initialized. Call initializeSolana first.");
        throw new Error("Backend wallet not initialized.");
    }
    return backendWallet;
};

// Placeholder for interacting with a Solana Auction Smart Contract
// This function would send an instruction to initialize an auction on-chain
const initializeAuctionOnChain = async (propertyMintAddress, sellerPublicKey, startPriceSOL, auctionDurationSeconds) => {
    console.log(`Simulating: Initializing auction for mint ${propertyMintAddress} by ${sellerPublicKey.toBase58()} with start price ${startPriceSOL} SOL for ${auctionDurationSeconds} seconds.`);
    // In a real scenario, this would involve:
    // 1. Building a transaction with the InitializeAuction instruction.
    // 2. Signing it with the seller's wallet (or backend wallet if authorized).
    // 3. Sending and confirming the transaction.
    // 4. Returning the PDA address of the created auction account.

    // For now, return a dummy auction account public key and a dummy transaction signature
    const dummyAuctionAccountPublicKey = Keypair.generate().publicKey.toBase58();
    const dummyTxSignature = 'SimulatedTx_' + Date.now();

    console.log(`Simulated: Auction initialized. Auction Account: ${dummyAuctionAccountPublicKey}, Tx: ${dummyTxSignature}`);
    return { auctionAccountPublicKey: dummyAuctionAccountPublicKey, txSignature: dummyTxSignature };
};

// Placeholder for interacting with a Solana Auction Smart Contract
// This function would send an instruction to place a bid on-chain
const placeBidOnChain = async (auctionAccountPublicKey, bidderPublicKey, bidAmountSOL) => {
    console.log(`Simulating: Placing bid of ${bidAmountSOL} SOL on auction ${auctionAccountPublicKey} by ${bidderPublicKey.toBase58()}.`);
    // In a real scenario, this would involve:
    // 1. Building a transaction with the PlaceBid instruction.
    // 2. Signing it with the bidder's wallet.
    // 3. Sending and confirming the transaction.
    // 4. Returning the new highest bid and bidder.

    // For now, return dummy data
    const dummyTxSignature = 'SimulatedTx_' + Date.now();
    const newHighestBid = bidAmountSOL; // Assume this bid is the new highest
    const newHighestBidder = bidderPublicKey.toBase58();

    console.log(`Simulated: Bid placed. New Highest Bid: ${newHighestBid} SOL, Bidder: ${newHighestBidder}, Tx: ${dummyTxSignature}`);
    return { newHighestBid, newHighestBidder, txSignature: dummyTxSignature };
};

// Placeholder for interacting with a Solana Auction Smart Contract
// This function would send an instruction to end an auction on-chain
const endAuctionOnChain = async (auctionAccountPublicKey) => {
    console.log(`Simulating: Ending auction ${auctionAccountPublicKey}.`);
    // In a real scenario, this would involve:
    // 1. Building a transaction with the EndAuction instruction.
    // 2. Signing it (e.g., by the backend or a designated authority).
    // 3. Sending and confirming the transaction.
    // 4. Returning the final status, winner, and price.

    // For now, return dummy data
    const dummyTxSignature = 'SimulatedTx_' + Date.now();
    const finalStatus = 'ended';
    const winner = 'SimulatedWinnerPublicKey'; // Replace with actual highest bidder from contract state
    const finalPrice = 100; // Replace with actual final bid from contract state

    console.log(`Simulated: Auction ended. Status: ${finalStatus}, Winner: ${winner}, Price: ${finalPrice} SOL, Tx: ${dummyTxSignature}`);
    return { finalStatus, winner, finalPrice, txSignature: dummyTxSignature };
};

// Placeholder to get auction state from the smart contract
const getAuctionState = async (auctionAccountPublicKey) => {
    console.log(`Simulating: Fetching state for auction ${auctionAccountPublicKey}.`);
    // In a real scenario, this would involve:
    // 1. Fetching the account data for the auction PDA.
    // 2. Deserializing the data into a readable format.

    // For now, return dummy state
    const dummyState = {
        propertyMintAddress: 'SimulatedPropertyMintAddress',
        seller: 'SimulatedSellerPublicKey',
        startPriceSOL: 50,
        currentBidSOL: 120,
        highestBidder: 'SimulatedHighestBidderPublicKey',
        startTime: new Date(Date.now() - 3600 * 1000), // 1 hour ago
        endTime: new Date(Date.now() + 23 * 3600 * 1000), // 23 hours from now
        status: 'active',
        platformFeeRecipient: 'SimulatedPlatformFeeRecipient',
        // Add other relevant fields from your conceptual smart contract
    };
    console.log(`Simulated: Fetched auction state for ${auctionAccountPublicKey}:`, dummyState);
    return dummyState;
};


module.exports = {
    initializeSolana,
    createPropertyToken,
    transferTokens,
    verifyTransaction,
    getBackendWallet,
    getConnection,
    verifySolTransfer,
    // New auction-related functions
    initializeAuctionOnChain,
    placeBidOnChain,
    endAuctionOnChain,
    getAuctionState
};
