import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, Settings, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LiquidityPoolClient, PoolState } from '@/lib/liquidityPool'; // Import the LiquidityPoolClient and PoolState
import { useToast } from "@/components/ui/use-toast";
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

interface SwapTabProps {
  liquidityPoolClient: LiquidityPoolClient | null;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  poolState: PoolState | null;
  updatePoolState: () => void;
}

const SwapTab: React.FC<SwapTabProps> = ({
  liquidityPoolClient,
  tokenAMint,
  tokenBMint,
  poolState,
  updatePoolState,
}) => {
  const { publicKey } = useWallet();
  const [fromAmount, setFromAmount] = useState<string>("");
  const [toAmount, setToAmount] = useState<string>("");
  const [isSwappingAtoB, setIsSwappingAtoB] = useState<boolean>(true); // True for A -> B, false for B -> A
  const { toast } = useToast();

  const fromTokenSymbol = isSwappingAtoB ? "TOKEN_A" : "TOKEN_B";
  const toTokenSymbol = isSwappingAtoB ? "TOKEN_B" : "TOKEN_A";

  // Derived state from poolState
  const reserveA = poolState?.token_a_reserve || 0;
  const reserveB = poolState?.token_b_reserve || 0;
  const fromTokenReserve = isSwappingAtoB ? reserveA : reserveB;
  const toTokenReserve = isSwappingAtoB ? reserveB : reserveA;
  const currentPrice = fromTokenReserve > 0 ? toTokenReserve / fromTokenReserve : 0;

  // Effect to recalculate toAmount when fromAmount, swap direction, or pool reserves change
  useEffect(() => {
    const numFromAmount = Number(fromAmount);
    if (isNaN(numFromAmount) || numFromAmount <= 0 || !poolState) {
      setToAmount("");
      return;
    }

    try {
      let receivedAmount: number;
      // Estimate output using the constant product formula (x * y = k)
      const k = reserveA * reserveB;
      if (isSwappingAtoB) {
        const newReserveA = reserveA + numFromAmount;
        const newReserveB = k / newReserveA;
        receivedAmount = reserveB - newReserveB;
      } else {
        const newReserveB = reserveB + numFromAmount;
        const newReserveA = k / newReserveB;
        receivedAmount = reserveA - newReserveA;
      }
      setToAmount(receivedAmount.toFixed(6));
    } catch (error: unknown) {
      if (error instanceof Error) {
        setToAmount("Error");
        console.error("Swap calculation error:", error.message);
      }
    }
  }, [fromAmount, isSwappingAtoB, poolState, reserveA, reserveB]);

  const handleSwapTokens = () => {
    setIsSwappingAtoB(prev => !prev);
    // Clear amounts when swapping token direction
    setFromAmount("");
    setToAmount("");
  };

  const executeSwap = async () => {
    if (!publicKey || !liquidityPoolClient || !poolState) {
      toast({
        title: "Wallet Not Connected or Pool Not Initialized",
        description: "Please connect your wallet and ensure the pool is initialized.",
        variant: "destructive",
      });
      return;
    }

    const numFromAmount = Number(fromAmount);
    if (isNaN(numFromAmount) || numFromAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to swap.",
        variant: "destructive",
      });
      return;
    }

    try {
      let transactionSignature: string;
      if (isSwappingAtoB) {
        transactionSignature = await liquidityPoolClient.swapAforB(
          publicKey,
          tokenAMint,
          tokenBMint,
          numFromAmount
        );
      } else {
        transactionSignature = await liquidityPoolClient.swapBforA(
          publicKey,
          tokenAMint,
          tokenBMint,
          numFromAmount
        );
      }
      toast({
        title: "Swap Successful",
        description: `Transaction: ${transactionSignature}`,
      });
      setFromAmount("");
      setToAmount("");
      updatePoolState(); // Update the parent component's pool state
    } catch (error: unknown) {
      toast({
        title: "Swap Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred during the swap.",
        variant: "destructive",
      });
    }
  };

  const isSwapDisabled = !publicKey || !fromAmount || !toAmount || Number(fromAmount) <= 0 || toAmount === "Error";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">Swap</h3>
        <Button variant="ghost" size="icon">
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* From Token */}
      <div className="space-y-4">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm text-muted-foreground">From</Label>
            <span className="text-sm text-muted-foreground">
              Reserve: {fromTokenReserve.toFixed(2)} {fromTokenSymbol}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)} // Simplified to just setFromAmount
                className="text-2xl font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0"
                type="number"
              />
            </div>

            <Button variant="glass" className="flex items-center space-x-2 px-4">
              <span className="text-lg">{isSwappingAtoB ? "🅰️" : "🅱️"}</span>
              <div className="text-left">
                <div className="font-semibold">{fromTokenSymbol}</div>
                <div className="text-xs text-muted-foreground"></div>
              </div>
            </Button>
          </div>
        </div>

        {/* Swap button */}
        <div className="flex justify-center">
          <Button
            variant="glass-primary"
            size="icon"
            onClick={handleSwapTokens}
            className="rounded-full"
          >
            <ArrowUpDown className="w-4 h-4" />
          </Button>
        </div>

        {/* To Token */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm text-muted-foreground">To</Label>
            <span className="text-sm text-muted-foreground">
              Reserve: {toTokenReserve.toFixed(2)} {toTokenSymbol}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="0.0"
                value={toAmount}
                readOnly
                className="text-2xl font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0"
              />
            </div>

            <Button variant="glass" className="flex items-center space-x-2 px-4">
              <span className="text-lg">{isSwappingAtoB ? "🅱️" : "🅰️"}</span>
              <div className="text-left">
                <div className="font-semibold">{toTokenSymbol}</div>
                <div className="text-xs text-muted-foreground"></div>
              </div>
            </Button>
          </div>
        </div>
      </div>

      {/* Swap info */}
      {fromAmount && toAmount && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 glass-card p-4 space-y-2"
        >
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center space-x-1">
              <Info className="w-3 h-3" />
              <span>Rate</span>
            </span>
            <span>
              1 {fromTokenSymbol} = {currentPrice.toFixed(6)} {toTokenSymbol}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Network Fee</span>
            <span className="text-secondary">~0.0005 SOL</span>
          </div>
        </motion.div>
      )}

      {/* Execute swap */}
      <Button
        variant="neon"
        size="lg"
        className="w-full mt-6"
        onClick={executeSwap}
        disabled={isSwapDisabled}
      >
        {isSwapDisabled ? "Enter amount" : "Swap Tokens"}
      </Button>
    </motion.div>
  );
};

export default SwapTab;
