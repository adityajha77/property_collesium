const {
    Connection,
    Keypair,
    PublicKey
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
    connection = new Connection(solanaRpcUrl, 'confirmed');

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

        console.log(`✅ Transferred ${amount} tokens: ${signature}`);
        return signature;
    } catch (error) {
        console.error("❌ Error transferring tokens:", error);
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

module.exports = {
    initializeSolana,
    createPropertyToken,
    transferTokens,
    verifyTransaction
};
