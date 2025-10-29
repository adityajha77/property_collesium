const bs58 = require("bs58");
const {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram, // Add SystemProgram here
    Transaction, // Add Transaction
    sendAndConfirmTransaction // Add sendAndConfirmTransaction
    // Removed getMinimumBalanceForRentExemption as it's now a method of Connection
} = require('@solana/web3.js');

const {
    getOrCreateAssociatedTokenAccount,
    mintTo,
    transfer,
    createMint, // Keep createMint for now, but we'll replace its usage
    MINT_SIZE, // Add MINT_SIZE
    TOKEN_PROGRAM_ID, // Add TOKEN_PROGRAM_ID
    createInitializeMintInstruction // Add createInitializeMintInstruction
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

    const secretKey = bs58.default.decode(backendWalletSecretKey);
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

        // Log backend wallet balance before proceeding
        const backendWalletBalance = await connection.getBalance(backendWallet.publicKey);
        console.log(`Backend wallet (${backendWallet.publicKey.toBase58()}) balance: ${backendWalletBalance / 10**9} SOL`);

        // 2️⃣ Create the SPL token mint with backendWallet as the mint authority
        const mintKeypair = Keypair.generate(); // Generate a new keypair for the mint
        const mintPublicKey = mintKeypair.publicKey;

        // Create the transaction to create the mint account and initialize it
        const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
        const createAccountInstruction = SystemProgram.createAccount({
            fromPubkey: backendWallet.publicKey,
            newAccountPubkey: mintPublicKey,
            space: MINT_SIZE,
            lamports,
            programId: TOKEN_PROGRAM_ID,
        });

        const initializeMintInstruction = createInitializeMintInstruction(
            mintPublicKey,
            0, // Decimals (0 for non-divisible tokens, adjust if needed)
            backendWallet.publicKey, // Mint Authority
            null, // Freeze Authority (null for no freeze authority)
            TOKEN_PROGRAM_ID
        );

        const transaction = new Transaction().add(createAccountInstruction, initializeMintInstruction);

        const createMintSignature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [backendWallet, mintKeypair] // Signers: backendWallet for payer, mintKeypair for new mint account
        );

        console.log("✅ SPL Token Mint created:", mintPublicKey.toBase58(), "Tx:", createMintSignature);

        // 3️⃣ Generate a UMI signer for the new mint's metadata
        // The `mint` variable from `Keypair.generate()` is used here.
        const umiMintSigner = createSignerFromKeypair(umi, umi.eddsa.createKeypairFromSecretKey(mintKeypair.secretKey));
        console.log("✅ Generated UMI Mint Signer for metadata:", umiMintSigner.publicKey);

        // 4️⃣ Create the metadata for the token using UMI
        await createV1(umi, {
            mint: umiMintSigner, // Use the UMI signer for the mint
            authority: backendSigner, // The backend wallet is the authority for the metadata
            name: property.title,
            symbol: "PROP",
            uri: uri,
            sellerFeeBasisPoints: 0,
            isMutable: true,
            tokenStandard: TokenStandard.Fungible,
        }).sendAndConfirm(umi);

        console.log("✅ Metadata linked to mint:", mintPublicKey.toBase58());

        // No need for an extra delay here, as mint creation is confirmed and metadata is linked.

        // 5️⃣ Mint tokens to backend wallet (initial holder)
        // The mintPublicKey is already defined above
        console.log("Mint Public Key:", mintPublicKey.toBase58());
        const backendTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
            connection,
            backendWallet,
            mintPublicKey,
            backendWallet.publicKey
        );
        console.log("Backend Token Account Address:", backendTokenAccountInfo.address.toBase58());

        // If a new associated token account was created, wait for its transaction to be confirmed
        if (backendTokenAccountInfo.transaction) {
            console.log("Waiting for Associated Token Account creation transaction to finalize...");
            await connection.confirmTransaction(backendTokenAccountInfo.transaction, 'finalized');
            console.log("✅ Associated Token Account creation transaction finalized.");
        }

        // Explicitly fetch the token account info to ensure it's recognized by the connection
        let tokenAccountExists = false;
        for (let i = 0; i < 5; i++) { // Retry a few times
            const accountInfo = await connection.getAccountInfo(backendTokenAccountInfo.address);
            if (accountInfo) {
                tokenAccountExists = true;
                console.log("✅ Associated Token Account found on chain.");
                break;
            }
            console.warn(`⚠️ Associated Token Account not yet found. Retrying in 1 second... (Attempt ${i + 1}/5)`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        }

        if (!tokenAccountExists) {
            throw new Error("Associated Token Account could not be confirmed on chain after multiple retries.");
        }

        await mintTo(
            connection,
            backendWallet,
            mintPublicKey,
            backendTokenAccountInfo.address,
            backendWallet,
            property.totalTokens
        );

        console.log(`✅ Minted ${property.totalTokens} tokens to backend wallet: ${backendWallet.publicKey.toBase58()}`);

        return {
            mintAddress: mintPublicKey, // Use mintPublicKey instead of mint.publicKey
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
const endAuctionOnChain = async (auction) => { // Accept the full auction object
    console.log(`Processing: Ending auction ${auction.auctionId}.`);

    let finalStatus = 'ended';
    let winner = null;
    let finalPrice = auction.currentBidSOL;
    let endTxSignature = 'NoTransferNeeded'; // Default if no winner or transfer fails

    if (auction.highestBidder && auction.currentBidSOL > 0) {
        winner = auction.highestBidder;
        finalPrice = auction.currentBidSOL;

        try {
            // Transfer 1 token of the property to the highest bidder
            console.log(`Attempting to transfer 1 token of mint ${auction.tokenMintAddress} to winner ${winner}`);
            endTxSignature = await transferTokens(
                auction.tokenMintAddress,
                backendWallet, // Sender is the backend wallet (current holder of the token)
                new PublicKey(winner), // Recipient is the highest bidder
                1 // Transfer 1 token
            );
            console.log(`✅ Token transferred to winner ${winner}. Tx: ${endTxSignature}`);
            finalStatus = 'ended'; // Confirm status if transfer is successful
        } catch (error) {
            console.error(`❌ Error transferring token to winner ${winner}:`, error);
            finalStatus = 'failed_transfer'; // Indicate transfer failure
            winner = null; // No winner if transfer failed
            finalPrice = 0; // No final price if transfer failed
            endTxSignature = 'TransferFailed';
        }
    } else {
        console.log(`Auction ${auction.auctionId} ended with no valid highest bidder or bids.`);
        finalStatus = 'ended_no_winner'; // Or 'cancelled' if that's a valid state
        winner = null;
        finalPrice = 0;
    }

    console.log(`Auction ${auction.auctionId} ended. Status: ${finalStatus}, Winner: ${winner}, Price: ${finalPrice} SOL, Tx: ${endTxSignature}`);
    return { finalStatus, winner, finalPrice, txSignature: endTxSignature };
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
