import { Connection, PublicKey, Transaction, TransactionInstruction, Keypair, SystemProgram,VersionedTransaction,
    MessageV0 } from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createInitializeMintInstruction,
    TOKEN_PROGRAM_ID,
    MintLayout,
    AccountLayout, // Added AccountLayout
} from '@solana/spl-token';
import { SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import {
    deserialize,
    serialize,
    type Schema,
    BinaryReader,
    BinaryWriter
} from 'borsh';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { BN } from 'bn.js';

// --- FIX: Custom Borsh Serializer for PublicKey ---
// This extends borsh's functionality to handle Solana's PublicKey objects directly.
// This allows us to use the string 'pubkey' in schemas and have borsh automatically
// convert to/from PublicKey objects.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BinaryReader.prototype as any).readPubkey = function () {
    const reader = this as unknown as BinaryReader;
    const array = reader.readFixedArray(32);
    return new PublicKey(array);
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BinaryWriter.prototype as any).writePubkey = function (value: PublicKey) {
    const writer = this as unknown as BinaryWriter;
    writer.writeFixedArray(value.toBuffer());
};


// Program ID for the deployed liquidity pool program
const PROGRAM_ID = new PublicKey("64Kd3NVVfKLcfxXsNLEvriNSiuzGpeTaBqSLwk4vXx2Y");

// Borsh schema for PoolState (must match Rust program)
export class PoolState {
    is_initialized: number = 0; // Rust `bool` is treated as `u8` by borsh
    token_a_mint: PublicKey = PublicKey.default;
    token_b_mint: PublicKey = PublicKey.default;
    token_a_reserve: BN = new BN(0);
    token_b_reserve: BN = new BN(0);
    lp_mint: PublicKey = PublicKey.default;
    lp_supply: BN = new BN(0);
    bump_seed: number = 0;

    static LEN: number = 1 + 32 + 32 + 8 + 8 + 32 + 8 + 1;

    constructor(fields?: {
        is_initialized: number;
        token_a_mint: PublicKey;
        token_b_mint: PublicKey;
        token_a_reserve: BN;
        token_b_reserve: BN;
        lp_mint: PublicKey;
        lp_supply: BN;
        bump_seed: number;
    }) {
        if (fields) {
            this.is_initialized = fields.is_initialized;
            this.token_a_mint = fields.token_a_mint;
            this.token_b_mint = fields.token_b_mint;
            this.token_a_reserve = fields.token_a_reserve;
            this.token_b_reserve = fields.token_b_reserve;
            this.lp_mint = fields.lp_mint;
            this.lp_supply = fields.lp_supply;
            this.bump_seed = fields.bump_seed;
        }
    }
}

enum LiquidityPoolInstruction {
    InitializePool = 0,
    AddLiquidity = 1,
    RemoveLiquidity = 2,
    SwapAforB = 3,
    SwapBforA = 4,
}

// This is the structure for the instruction data, matching the Rust enum variants.
// The first field 'instruction' will hold the enum variant index.
// Instruction data classes
class InitializePoolInstructionData {
    instruction: number = LiquidityPoolInstruction.InitializePool;
    initial_amount_a: BN; // MUST match Rust struct field
    initial_amount_b: BN; // MUST match Rust struct field

    constructor(props: { initial_amount_a: BN; initial_amount_b: BN }) {
        this.initial_amount_a = props.initial_amount_a;
        this.initial_amount_b = props.initial_amount_b;
    }
}

class AddLiquidityInstructionData {
    instruction: number = LiquidityPoolInstruction.AddLiquidity;
    amount_a: BN; // MUST match Rust struct field
    amount_b: BN; // MUST match Rust struct field

    constructor(props: { amount_a: BN; amount_b: BN }) {
        this.amount_a = props.amount_a;
        this.amount_b = props.amount_b;
    }
}

class RemoveLiquidityInstructionData {
    instruction: number = LiquidityPoolInstruction.RemoveLiquidity;
    lp_token_amount: BN; // MUST match Rust struct field

    constructor(props: { lp_token_amount: BN }) {
        this.lp_token_amount = props.lp_token_amount;
    }
}

class SwapAforBInstructionData {
    instruction: number = LiquidityPoolInstruction.SwapAforB;
    amount_a_in: BN; // MUST match Rust struct field

    constructor(props: { amount_a_in: BN }) {
        this.amount_a_in = props.amount_a_in;
    }
}

class SwapBforAInstructionData {
    instruction: number = LiquidityPoolInstruction.SwapBforA;
    amount_b_in: BN; // MUST match Rust struct field

    constructor(props: { amount_b_in: BN }) {
        this.amount_b_in = props.amount_b_in;
    }
}

// Combined schema for all data structures
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LIQUIDITY_POOL_SCHEMA: Schema = new Map<any, any>([ // <-- Use Map<any, any> to fix TS error
    [
        PoolState,
        {
            kind: 'struct',
            fields: [
                ['is_initialized', 'u8'],
                ['token_a_mint', 'pubkey'],
                ['token_b_mint', 'pubkey'],
                ['token_a_reserve', 'u64'],
                ['token_b_reserve', 'u64'],
                ['lp_mint', 'pubkey'],
                ['lp_supply', 'u64'],
                ['bump_seed', 'u8'],
            ],
        },
    ],
[InitializePoolInstructionData, {
    kind: 'struct',
    fields: [
        ['instruction', 'u8'],
        ['initial_amount_a', 'u64'],
        ['initial_amount_b', 'u64'],
    ]
}],
    [AddLiquidityInstructionData, {
        kind: 'struct',
        fields: [
            ['instruction', 'u8'],
            ['amount_a', 'u64'], // Use snake_case
            ['amount_b', 'u64'], // Use snake_case
        ]
    }],
    [RemoveLiquidityInstructionData, {
        kind: 'struct',
        fields: [
            ['instruction', 'u8'],
            ['lp_token_amount', 'u64'], // Use snake_case
        ]
    }],
    [SwapAforBInstructionData, {
        kind: 'struct',
        fields: [
            ['instruction', 'u8'],
            ['amount_a_in', 'u64'], // Use snake_case
        ]
    }],
    [SwapBforAInstructionData, {
        kind: 'struct',
        fields: [
            ['instruction', 'u8'],
            ['amount_b_in', 'u64'], // Use snake_case
        ]
    }],
]);



export class LiquidityPoolClient {
    private connection: Connection;
    private wallet: WalletContextState;
    private programId: PublicKey;
    private poolStatePda: PublicKey | null = null;
    private poolStateBump: number | null = null;

    constructor(connection: Connection, wallet: WalletContextState) {
        this.connection = connection;
        this.wallet = wallet;
        this.programId = PROGRAM_ID;
    }

    async getPoolStatePda(tokenAMint: PublicKey, tokenBMint: PublicKey): Promise<[PublicKey, number]> {
        if (this.poolStatePda && this.poolStateBump) {
            return [this.poolStatePda, this.poolStateBump];
        }
        const [pda, bump] = await PublicKey.findProgramAddress(
            [Buffer.from("liquidity_pool"), tokenAMint.toBuffer(), tokenBMint.toBuffer()],
            this.programId
        );
        this.poolStatePda = pda;
        this.poolStateBump = bump;
        return [pda, bump];
    }

    async fetchPoolState(tokenAMint: PublicKey, tokenBMint: PublicKey): Promise<PoolState | null> {
        const [poolStatePda] = await this.getPoolStatePda(tokenAMint, tokenBMint);
        const accountInfo = await this.connection.getAccountInfo(poolStatePda);

        if (!accountInfo) {
            return null;
        }

        const deserializedPoolState: PoolState = deserialize(LIQUIDITY_POOL_SCHEMA, PoolState, accountInfo.data);
        return deserializedPoolState;
    }

    async fetchAllPoolStates(): Promise<PoolState[]> {
        const accounts = await this.connection.getProgramAccounts(this.programId, {
            filters: [
                {
                    dataSize: PoolState.LEN,
                },
            ],
        });

        const poolStates: PoolState[] = [];
        for (const account of accounts) {
            try {
                const deserializedPoolState: PoolState = deserialize(LIQUIDITY_POOL_SCHEMA, PoolState, account.account.data);
                if (deserializedPoolState.is_initialized) {
                    poolStates.push(deserializedPoolState);
                }
            } catch (error) {
                console.error("Error deserializing pool state for account:", account.pubkey.toBase58(), error);
            }
        }
        return poolStates;
    }

    async initializePool(
        initializer: PublicKey,
        tokenAMint: PublicKey,
        tokenBMint: PublicKey,
        initialAmountA: number,
        initialAmountB: number
    ): Promise<string> {
        // --- CHECK WALLET ---
        // We need 'signTransaction' for the 2-tx flow
        if (!this.wallet.publicKey || !this.wallet.signTransaction) { 
            throw new Error("Wallet not connected or does not support signing transactions");
        }

        const [poolStatePda, bumpSeed] = await this.getPoolStatePda(tokenAMint, tokenBMint);

        // --- Debugging PDA Derivation ---
        console.log("--- PDA Derivation Details ---");
        console.log("Derived Pool State PDA:", poolStatePda.toBase58());
        console.log("------------------------------");

        const lpMintAccount = Keypair.generate(); // This is the keypair for the NEW LP MINT

        // --- Derive All Account Addresses ---
        const initializerTokenAAccount = await getAssociatedTokenAddress(tokenAMint, initializer);
        const initializerTokenBAccount = await getAssociatedTokenAddress(tokenBMint, initializer);
        const initializerLpTokenAccount = await getAssociatedTokenAddress(lpMintAccount.publicKey, initializer);
        const poolTokenAAccount = await getAssociatedTokenAddress(tokenAMint, poolStatePda, true);
        const poolTokenBAccount = await getAssociatedTokenAddress(tokenBMint, poolStatePda, true);

        // Check if Pool State PDA already exists
        const existingPoolStateAccountInfo = await this.connection.getAccountInfo(poolStatePda);
        if (existingPoolStateAccountInfo) {
            console.error("Error: Pool State PDA already exists!");
            console.error("Existing Pool State PDA Owner:", existingPoolStateAccountInfo.owner.toBase58());
            throw new Error("Pool already exists at this PDA. Please use a different pair of token mints or ensure the pool is not already initialized.");
        }

        // --- Get lamport values ---
        const poolStateAccountLamports = await this.connection.getMinimumBalanceForRentExemption(PoolState.LEN);
        const lpMintAccountLamports = await this.connection.getMinimumBalanceForRentExemption(MintLayout.span);
        const ataRentExemption = await this.connection.getMinimumBalanceForRentExemption(AccountLayout.span);

        let totalRentRequired = poolStateAccountLamports + lpMintAccountLamports;

        // We check for the user's ATAs first (optional but good)
        const accountInfoA = await this.connection.getAccountInfo(initializerTokenAAccount);
        const accountInfoB = await this.connection.getAccountInfo(initializerTokenBAccount);

        // Add rent for ATAs if they are being created
        if (!accountInfoA) totalRentRequired += ataRentExemption;
        if (!accountInfoB) totalRentRequired += ataRentExemption;
        // Initializer LP ATA is always created
        totalRentRequired += ataRentExemption;
        // Pool Token A/B ATAs are always created
        totalRentRequired += ataRentExemption * 2;

        console.log("Required lamports for Pool State Account:", poolStateAccountLamports);
        console.log("Required lamports for LP Mint Account:", lpMintAccountLamports);
        console.log("Required lamports for ATA rent exemption:", ataRentExemption);
        console.log("Total estimated rent required for new accounts:", totalRentRequired);

        const initializerBalance = await this.connection.getBalance(initializer);
        console.log("Initializer SOL balance:", initializerBalance);

        if (initializerBalance < totalRentRequired) {
            throw new Error(`Insufficient SOL. Required: ${totalRentRequired} lamports, Available: ${initializerBalance} lamports.`);
        }

        // ====================================================================
        // --- TRANSACTION 1a: Create Core Accounts (Pool State & LP Mint) ---
        // ====================================================================
        console.log("--- Building Transaction 1a: Create Core Accounts ---");
        const createCoreAccountsTx = new Transaction();

        // 1. Create Pool State Account (PDA)
        console.log("Adding: Create Pool State Account (PDA)");
        createCoreAccountsTx.add(
            SystemProgram.createAccount({
                fromPubkey: initializer,
                newAccountPubkey: poolStatePda,
                lamports: poolStateAccountLamports,
                space: PoolState.LEN,
                programId: this.programId,
            })
        );

        // 2. Create LP Mint Account
        console.log("Adding: Create LP Mint Account");
        createCoreAccountsTx.add(
            SystemProgram.createAccount({
                fromPubkey: initializer,
                newAccountPubkey: lpMintAccount.publicKey,
                lamports: lpMintAccountLamports,
                space: MintLayout.span,
                programId: TOKEN_PROGRAM_ID,
            })
        );

        // --- Sign and Send Transaction 1a ---
        console.log("Sending Transaction 1a to wallet...");
        const latestBlockhash1a = await this.connection.getLatestBlockhash();
        createCoreAccountsTx.feePayer = this.wallet.publicKey;
        createCoreAccountsTx.recentBlockhash = latestBlockhash1a.blockhash;
        const messageV0_1a = createCoreAccountsTx.compileMessage();
        const v0CreateCoreAccountsTx = new VersionedTransaction(messageV0_1a);
        v0CreateCoreAccountsTx.sign([lpMintAccount]); // lpMintAccount needs to pre-sign its creation
        const createCoreTxSignature = await this.wallet.sendTransaction(v0CreateCoreAccountsTx, this.connection, {
            preflightCommitment: 'confirmed',
        });
        console.log("--- Transaction 1a Confirmed ---");
        console.log("Signature:", createCoreTxSignature);
        await this.connection.confirmTransaction({
            ...latestBlockhash1a,
            signature: createCoreTxSignature,
        }, 'confirmed');
        console.log("Core accounts created successfully.");

        // ====================================================================
        // --- TRANSACTION 1b: Create Associated Token Accounts ---
        // ====================================================================
        console.log("--- Building Transaction 1b: Create ATAs ---");
        const createATAsTx = new Transaction();

        // We check for the user's ATAs first (optional but good)
        if (!accountInfoA) {
            console.log("Adding: Create Initializer Token A ATA");
            createATAsTx.add(createAssociatedTokenAccountInstruction(
                initializer, initializerTokenAAccount, initializer, tokenAMint, TOKEN_PROGRAM_ID
            ));
        }

        if (!accountInfoB) {
            console.log("Adding: Create Initializer Token B ATA");
            createATAsTx.add(createAssociatedTokenAccountInstruction(
                initializer, initializerTokenBAccount, initializer, tokenBMint, TOKEN_PROGRAM_ID
            ));
        }

        // 1. Create Initializer's LP Token ATA
        console.log("Adding: Create Initializer LP ATA");
        createATAsTx.add(createAssociatedTokenAccountInstruction(
            initializer, initializerLpTokenAccount, initializer, lpMintAccount.publicKey, TOKEN_PROGRAM_ID
        ));

        // 2. Create Pool's Token A ATA
        console.log("Adding: Create Pool Token A ATA");
        createATAsTx.add(createAssociatedTokenAccountInstruction(
            initializer, poolTokenAAccount, poolStatePda, tokenAMint, TOKEN_PROGRAM_ID
        ));

        // 3. Create Pool's Token B ATA
        console.log("Adding: Create Pool Token B ATA");
        createATAsTx.add(createAssociatedTokenAccountInstruction(
            initializer, poolTokenBAccount, poolStatePda, tokenBMint, TOKEN_PROGRAM_ID
        ));

        // --- Sign and Send Transaction 1b ---
        console.log("Sending Transaction 1b to wallet...");
        const latestBlockhash1b = await this.connection.getLatestBlockhash();
        createATAsTx.feePayer = this.wallet.publicKey;
        createATAsTx.recentBlockhash = latestBlockhash1b.blockhash;
        const messageV0_1b = createATAsTx.compileMessage();
        const v0CreateATAsTx = new VersionedTransaction(messageV0_1b);
        // No additional signers needed for ATAs if initializer is payer
        const createATAsTxSignature = await this.wallet.sendTransaction(v0CreateATAsTx, this.connection, {
            preflightCommitment: 'confirmed',
        });
        console.log("--- Transaction 1b Confirmed ---");
        console.log("Signature:", createATAsTxSignature);
        await this.connection.confirmTransaction({
            ...latestBlockhash1b,
            signature: createATAsTxSignature,
        }, 'confirmed');
        console.log("Associated Token Accounts created successfully.");

        // ====================================================================
        // --- TRANSACTION 2: Initialize The Pool ---
        // ====================================================================
        console.log("--- Building Transaction 2: Initialize Pool ---");
        
        const instructionData = new InitializePoolInstructionData({
            initial_amount_a: new BN(initialAmountA),
            initial_amount_b: new BN(initialAmountB),
        });
        const data = serialize(LIQUIDITY_POOL_SCHEMA, instructionData);

        const initializePoolInstructionKeys = [
            { pubkey: initializer, isSigner: true, isWritable: false }, // 0. Initializer
            { pubkey: poolStatePda, isSigner: false, isWritable: true }, // 1. Pool State Account (PDA)
            { pubkey: tokenAMint, isSigner: false, isWritable: false }, // 2. Token A Mint
            { pubkey: tokenBMint, isSigner: false, isWritable: false }, // 3. Token B Mint
            { pubkey: poolTokenAAccount, isSigner: false, isWritable: true }, // 4. Pool Token A Account
            { pubkey: poolTokenBAccount, isSigner: false, isWritable: true }, // 5. Pool Token B Account
            { pubkey: lpMintAccount.publicKey, isSigner: false, isWritable: true }, // 6. LP Mint Account
            { pubkey: initializerTokenAAccount, isSigner: false, isWritable: true }, // 7. Initializer Token A Account
            { pubkey: initializerTokenBAccount, isSigner: false, isWritable: true }, // 8. Initializer Token B Account
            { pubkey: initializerLpTokenAccount, isSigner: false, isWritable: true }, // 9. Initializer LP Token Account
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // 10. SPL Token Program
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }, // 11. Rent Sysvar
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // 12. System Program
        ];

        const initializeTx = new Transaction().add(
            new TransactionInstruction({
                keys: initializePoolInstructionKeys,
                programId: this.programId,
                data: Buffer.from(data),
            })
        );

        // --- Sign and Send Transaction 2 ---
        console.log("Sending Transaction 2 to wallet...");
        
        const initLatestBlockhash = await this.connection.getLatestBlockhash();
        initializeTx.feePayer = this.wallet.publicKey;
        initializeTx.recentBlockhash = initLatestBlockhash.blockhash;
        
        // This is a simple 1-instruction tx, a v0 tx is good practice
        const initMessageV0 = initializeTx.compileMessage();
        const v0InitTx = new VersionedTransaction(initMessageV0);

        // No additional signers needed for this one
        const initTxSignature = await this.wallet.sendTransaction(v0InitTx, this.connection, {
            preflightCommitment: 'confirmed',
        });
        
        console.log("--- Transaction 2 Confirmed ---");
        console.log("Signature:", initTxSignature);
        await this.connection.confirmTransaction({
            ...initLatestBlockhash,
            signature: initTxSignature,
        }, 'confirmed');
        
        console.log("--- POOL INITIALIZED SUCCESSFULLY ---");
        
        // Return the signature of the *second* transaction as the result
        return initTxSignature;
    }

    async addLiquidity(
        provider: PublicKey,
        tokenAMint: PublicKey,
        tokenBMint: PublicKey,
        amountA: number,
        amountB: number
    ): Promise<string> {
        const [poolStatePda] = await this.getPoolStatePda(tokenAMint, tokenBMint);
        const poolState = await this.fetchPoolState(tokenAMint, tokenBMint);

        if (!poolState) {
            throw new Error("Pool not initialized.");
        }

        const poolTokenAAccount = await getAssociatedTokenAddress(tokenAMint, poolStatePda, true);
        const poolTokenBAccount = await getAssociatedTokenAddress(tokenBMint, poolStatePda, true);
        const providerTokenAAccount = await getAssociatedTokenAddress(tokenAMint, provider);
        const providerTokenBAccount = await getAssociatedTokenAddress(tokenBMint, provider);
        const providerLpTokenAccount = await getAssociatedTokenAddress(poolState.lp_mint, provider);

        const instructionData = new AddLiquidityInstructionData({
            amount_a: new BN(amountA),
            amount_b: new BN(amountB)
        });
        const data = serialize(LIQUIDITY_POOL_SCHEMA, instructionData);

        const transaction = new Transaction().add(
            new TransactionInstruction({
                keys: [
                    { pubkey: provider, isSigner: true, isWritable: false },
                    { pubkey: poolStatePda, isSigner: false, isWritable: true },
                    { pubkey: poolTokenAAccount, isSigner: false, isWritable: true },
                    { pubkey: poolTokenBAccount, isSigner: false, isWritable: true },
                    { pubkey: poolState.lp_mint, isSigner: false, isWritable: true },
                    { pubkey: providerTokenAAccount, isSigner: false, isWritable: true },
                    { pubkey: providerTokenBAccount, isSigner: false, isWritable: true },
                    { pubkey: providerLpTokenAccount, isSigner: false, isWritable: true },
                    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                ],
                programId: this.programId,
                data: Buffer.from(data),
            })
        );
        return this.wallet.sendTransaction(transaction, this.connection);
    }

    async removeLiquidity(
        provider: PublicKey,
        tokenAMint: PublicKey,
        tokenBMint: PublicKey,
        lpTokenAmount: number
    ): Promise<string> {
        const [poolStatePda] = await this.getPoolStatePda(tokenAMint, tokenBMint);
        const poolState = await this.fetchPoolState(tokenAMint, tokenBMint);

        if (!poolState) {
            throw new Error("Pool not initialized.");
        }

        const poolTokenAAccount = await getAssociatedTokenAddress(tokenAMint, poolStatePda, true);
        const poolTokenBAccount = await getAssociatedTokenAddress(tokenBMint, poolStatePda, true);
        const providerTokenAAccount = await getAssociatedTokenAddress(tokenAMint, provider);
        const providerTokenBAccount = await getAssociatedTokenAddress(tokenBMint, provider);
        const providerLpTokenAccount = await getAssociatedTokenAddress(poolState.lp_mint, provider);

        const instructionData = new RemoveLiquidityInstructionData({
            lp_token_amount: new BN(lpTokenAmount)
        });
        const data = serialize(LIQUIDITY_POOL_SCHEMA, instructionData);

        const transaction = new Transaction().add(
            new TransactionInstruction({
                keys: [
                    { pubkey: provider, isSigner: true, isWritable: false },
                    { pubkey: poolStatePda, isSigner: false, isWritable: true },
                    { pubkey: poolTokenAAccount, isSigner: false, isWritable: true },
                    { pubkey: poolTokenBAccount, isSigner: false, isWritable: true },
                    { pubkey: poolState.lp_mint, isSigner: false, isWritable: true },
                    { pubkey: providerTokenAAccount, isSigner: false, isWritable: true },
                    { pubkey: providerTokenBAccount, isSigner: false, isWritable: true },
                    { pubkey: providerLpTokenAccount, isSigner: false, isWritable: true },
                    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                ],
                programId: this.programId,
                data: Buffer.from(data),
            })
        );

        return this.wallet.sendTransaction(transaction, this.connection);
    }

    async swapAforB(
        swapper: PublicKey,
        tokenAMint: PublicKey,
        tokenBMint: PublicKey,
        amountAIn: number
    ): Promise<string> {
        const [poolStatePda] = await this.getPoolStatePda(tokenAMint, tokenBMint);
        const poolState = await this.fetchPoolState(tokenAMint, tokenBMint);

        if (!poolState) {
            throw new Error("Pool not initialized.");
        }

        const poolTokenAAccount = await getAssociatedTokenAddress(tokenAMint, poolStatePda, true);
        const poolTokenBAccount = await getAssociatedTokenAddress(tokenBMint, poolStatePda, true);
        const swapperTokenAAccount = await getAssociatedTokenAddress(tokenAMint, swapper);
        const swapperTokenBAccount = await getAssociatedTokenAddress(tokenBMint, swapper);

        const instructionData = new SwapAforBInstructionData({
            amount_a_in: new BN(amountAIn)
        });
        const data = serialize(LIQUIDITY_POOL_SCHEMA, instructionData);

        const transaction = new Transaction().add(
            new TransactionInstruction({
                keys: [
                    { pubkey: swapper, isSigner: true, isWritable: false },
                    { pubkey: poolStatePda, isSigner: false, isWritable: true },
                    { pubkey: poolTokenAAccount, isSigner: false, isWritable: true },
                    { pubkey: poolTokenBAccount, isSigner: false, isWritable: true },
                    { pubkey: swapperTokenAAccount, isSigner: false, isWritable: true },
                    { pubkey: swapperTokenBAccount, isSigner: false, isWritable: true },
                    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                ],
                programId: this.programId,
                data: Buffer.from(data),
            })
        );

        return this.wallet.sendTransaction(transaction, this.connection);
    }

    async swapBforA(
        swapper: PublicKey,
        tokenAMint: PublicKey,
        tokenBMint: PublicKey,
        amountBIn: number
    ): Promise<string> {
        const [poolStatePda] = await this.getPoolStatePda(tokenAMint, tokenBMint);
        const poolState = await this.fetchPoolState(tokenAMint, tokenBMint);

        if (!poolState) {
            throw new Error("Pool not initialized.");
        }

        const poolTokenAAccount = await getAssociatedTokenAddress(tokenAMint, poolStatePda, true);
        const poolTokenBAccount = await getAssociatedTokenAddress(tokenBMint, poolStatePda, true);
        const swapperTokenAAccount = await getAssociatedTokenAddress(tokenAMint, swapper);
        const swapperTokenBAccount = await getAssociatedTokenAddress(tokenBMint, swapper);

        const instructionData = new SwapBforAInstructionData({
            amount_b_in: new BN(amountBIn)
        });
        const data = serialize(LIQUIDITY_POOL_SCHEMA, instructionData);

        const transaction = new Transaction().add(
            new TransactionInstruction({
                keys: [
                    { pubkey: swapper, isSigner: true, isWritable: false },
                    { pubkey: poolStatePda, isSigner: false, isWritable: true },
                    { pubkey: poolTokenAAccount, isSigner: false, isWritable: true },
                    { pubkey: poolTokenBAccount, isSigner: false, isWritable: true },
                    { pubkey: swapperTokenBAccount, isSigner: false, isWritable: true },
                    { pubkey: swapperTokenAAccount, isSigner: false, isWritable: true },
                    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                ],
                programId: this.programId,
                data: Buffer.from(data),
            })
        );

        return this.wallet.sendTransaction(transaction, this.connection);
    }

    async getTokenAccountBalance(tokenAccount: PublicKey): Promise<number> {
        try {
            const accountInfo = await this.connection.getTokenAccountBalance(tokenAccount);
            return accountInfo.value.uiAmount || 0;
        } catch (error: unknown) {
            console.error("Error fetching token account balance:", error);
            return 0;
        }
    }
}
