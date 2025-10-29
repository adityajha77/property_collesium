import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LiquidityPoolClient, PoolState } from '@/lib/liquidityPool';
import { useToast } from "@/components/ui/use-toast";
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

// --- DEFINE YOUR TOKEN DECIMALS ---
// You created these with 9 decimals in your terminal
const TOKEN_A_DECIMALS = 9;
const TOKEN_B_DECIMALS = 9;

interface AddLiquidityTabProps {
  liquidityPoolClient: LiquidityPoolClient | null;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  poolState: PoolState | null;
  updatePoolState: () => void;
}

const AddLiquidityTab: React.FC<AddLiquidityTabProps> = ({
  liquidityPoolClient,
  tokenAMint,
  tokenBMint,
  poolState,
  updatePoolState,
}) => {
  const { publicKey } = useWallet();
  const [amountA, setAmountA] = useState<string>("");
  const [amountB, setAmountB] = useState<string>("");
  const [expectedLPTokens, setExpectedLPTokens] = useState<number>(0);
  const { toast } = useToast();

  // --- FIX: Convert BN to number ---
  // poolState.token_a_reserve is a BN, not a number.
  // We use .toNumber() to use it in the UI.
  const reserveA = poolState?.token_a_reserve?.toNumber() || 0;
  const reserveB = poolState?.token_b_reserve?.toNumber() || 0;
  const totalLiquidityShares = poolState?.lp_supply?.toNumber() || 0;

  // TODO: Fetch actual currentProviderShares from the blockchain using liquidityPoolClient.getTokenAccountBalance
  const currentProviderShares = 0; // Placeholder for now

  useEffect(() => {
    const numAmountA = Number(amountA);
    const numAmountB = Number(amountB);

    if (isNaN(numAmountA) || isNaN(numAmountB) || numAmountA <= 0 || numAmountB <= 0 || !poolState) {
      setExpectedLPTokens(0);
      return;
    }

    try {
      let mintedShares: number;
      if (totalLiquidityShares === 0) {
        // Initial liquidity provision calculation
        mintedShares = Math.sqrt(numAmountA * numAmountB);
      } else {
        // Subsequent liquidity provision calculation
        const sharesFromA = (numAmountA * totalLiquidityShares) / reserveA;
        const sharesFromB = (numAmountB * totalLiquidityShares) / reserveB;
        mintedShares = Math.min(sharesFromA, sharesFromB);
      }
      setExpectedLPTokens(mintedShares);
    } catch (error: unknown) {
      setExpectedLPTokens(0);
      console.error("Error calculating expected LP tokens:", error);
    }
  }, [amountA, amountB, poolState, reserveA, reserveB, totalLiquidityShares]);

  const handleAddLiquidity = async () => {
    if (!publicKey || !liquidityPoolClient || !poolState) {
      toast({
        title: "Wallet Not Connected or Pool Not Initialized",
        description: "Please connect your wallet and ensure the pool is initialized.",
        variant: "destructive",
      });
      return;
    }

    const numAmountA = Number(amountA);
    const numAmountB = Number(amountB);

    if (isNaN(numAmountA) || isNaN(numAmountB) || numAmountA <= 0 || numAmountB <= 0) {
      toast({
        title: "Invalid Amounts",
        description: "Please enter valid amounts for both tokens.",
        variant: "destructive",
      });
      return;
    }

    // --- FIX: Convert UI number to lamports ---
    const lamportsA = numAmountA * (10 ** TOKEN_A_DECIMALS);
    const lamportsB = numAmountB * (10 ** TOKEN_B_DECIMALS);

    // --- Check for float/invalid numbers ---
    if (!Number.isSafeInteger(lamportsA) || !Number.isSafeInteger(lamportsB)) {
         toast({
           title: "Invalid Amount",
           description: "Amount results in an invalid number. Check your decimals.",
           variant: "destructive",
         });
         return;
    }

    try {
      const transactionSignature = await liquidityPoolClient.addLiquidity(
        publicKey,
        tokenAMint,
        tokenBMint,
        lamportsA, // Pass the lamports value
        lamportsB  // Pass the lamports value
      );
      toast({
        title: "Liquidity Added",
        description: `Transaction: ${transactionSignature}`,
      });
      setAmountA("");
      setAmountB("");
      updatePoolState();
    } catch (error: unknown) {
      toast({
        title: "Failed to Add Liquidity",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleInitializePool = async () => {
    if (!publicKey || !liquidityPoolClient) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to initialize the pool.",
        variant: "destructive",
      });
      return;
    }

    const numAmountA = Number(amountA);
    const numAmountB = Number(amountB);

    if (isNaN(numAmountA) || isNaN(numAmountB) || numAmountA <= 0 || numAmountB <= 0) {
      toast({
        title: "Invalid Initial Amounts",
        description: "Please enter valid initial amounts for both tokens to initialize the pool.",
        variant: "destructive",
      });
      return;
    }
    
    // --- FIX: Convert UI number to lamports ---
    const lamportsA = numAmountA * (10 ** TOKEN_A_DECIMALS);
    const lamportsB = numAmountB * (10 ** TOKEN_B_DECIMALS);

    // --- Check for float/invalid numbers ---
    if (!Number.isSafeInteger(lamportsA) || !Number.isSafeInteger(lamportsB)) {
         toast({
           title: "Invalid Amount",
           description: "Amount results in an invalid number. Check your decimals.",
           variant: "destructive",
         });
         return;
    }

    // --> ADD THESE LOGS <--
    console.log("--- handleInitializePool ---");
    console.log("Initializer publicKey:", publicKey.toBase58());
    console.log("Token A Mint:", tokenAMint.toBase58());
    console.log("Token B Mint:", tokenBMint.toBase58());
    console.log("UI Amount A:", numAmountA);
    console.log("UI Amount B:", numAmountB);
    console.log("Lamports A:", lamportsA);
    console.log("Lamports B:", lamportsB);
    console.log("----------------------------");

    try {
      const transactionSignature = await liquidityPoolClient.initializePool(
        publicKey,
        tokenAMint,
        tokenBMint,
        lamportsA, // Pass the lamports value
        lamportsB  // Pass the lamports value
      );
      toast({
        title: "Pool Initialized Successfully",
        description: `Transaction: ${transactionSignature}`,
      });
      setAmountA("");
      setAmountB("");
      updatePoolState(); // Refresh pool state after initialization
    } catch (error: unknown) {
    // --- THIS IS THE MOST IMPORTANT FIX ---
    console.error("--- TRANSACTION FAILED ---");
    console.error(error); // This will log the full error object!
    
    // This will try to log the program-specific logs
    if (error && typeof error === 'object' && 'logs' in error) {
        console.error("--- PROGRAM LOGS ---");
        (error as { logs: string[] }).logs.forEach(log => console.log(log));
    }
    // --- END OF FIX ---

    toast({
        title: "Failed to Initialize Pool",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
    });
}
  };

  const shareOfPool = totalLiquidityShares > 0
    ? ((currentProviderShares + expectedLPTokens) / (totalLiquidityShares + expectedLPTokens)) * 100
    : (expectedLPTokens > 0 ? 100 : 0);

  const isAddLiquidityDisabled = !publicKey || !amountA || !amountB || Number(amountA) <= 0 || Number(amountB) <= 0;
  const isInitializePoolDisabled = !publicKey || !amountA || !amountB || Number(amountA) <= 0 || Number(amountB) <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6"
    >
      <div className="space-y-6">
        {/* Token A Input */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm text-muted-foreground">TOKEN_A</Label>
            <span className="text-sm text-muted-foreground">Reserve: {reserveA.toFixed(2)}</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="0.0"
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
                className="text-2xl font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0"
                type="number"
              />
            </div>
            <Button variant="glass" className="w-[180px] flex items-center space-x-2 px-4">
              <span className="text-lg">🅰️</span>
              <span>TOKEN_A</span>
            </Button>
          </div>
        </div>

        {/* Token B Input */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm text-muted-foreground">TOKEN_B</Label>
            <span className="text-sm text-muted-foreground">Reserve: {reserveB.toFixed(2)}</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="0.0"
                value={amountB}
                onChange={(e) => setAmountB(e.target.value)}
                className="text-2xl font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0"
                type="number"
              />
            </div>
            <Button variant="glass" className="w-[180px] flex items-center space-x-2 px-4">
              <span className="text-lg">🅱️</span>
              <span>TOKEN_B</span>
            </Button>
          </div>
        </div>

        {/* Pool Details */}
        <div className="glass-card p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Share of Pool</span>
            <span>~{shareOfPool.toFixed(2)}%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Expected LP Tokens</span>
            <span>{expectedLPTokens.toFixed(2)} LP</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-4">
          {poolState && poolState.is_initialized ? (
            <Button
              variant="neon"
              size="lg"
              className="w-full"
              onClick={handleAddLiquidity}
              disabled={isAddLiquidityDisabled}
            >
              Add Liquidity
            </Button>
          ) : (
            <Button
              variant="neon"
              size="lg"
              className="w-full"
              onClick={handleInitializePool}
              disabled={isInitializePoolDisabled}
            >
              Initialize Pool
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AddLiquidityTab;
