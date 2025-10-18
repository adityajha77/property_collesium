import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, Settings, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LiquidityPool } from '@/lib/liquidityPool';
import { useToast } from "@/components/ui/use-toast";

interface SwapTabProps {
  pool: LiquidityPool;
  updatePoolState: () => void;
}

const SwapTab: React.FC<SwapTabProps> = ({ pool, updatePoolState }) => {
  const [fromAmount, setFromAmount] = useState<string>("");
  const [toAmount, setToAmount] = useState<string>("");
  const [isSwappingAtoB, setIsSwappingAtoB] = useState<boolean>(true); // True for A -> B, false for B -> A
  const { toast } = useToast();

  const poolState = pool.getPoolState();

  const fromTokenSymbol = isSwappingAtoB ? "TOKEN_A" : "TOKEN_B";
  const toTokenSymbol = isSwappingAtoB ? "TOKEN_B" : "TOKEN_A";
  const fromTokenBalance = isSwappingAtoB ? poolState.reserveA : poolState.reserveB;
  const toTokenBalance = isSwappingAtoB ? poolState.reserveB : poolState.reserveA;
  const currentPrice = isSwappingAtoB ? poolState.priceA_per_B : poolState.priceB_per_A;

  useEffect(() => {
    // Recalculate toAmount when fromAmount or swap direction changes
    handleFromAmountChange(fromAmount);
  }, [fromAmount, isSwappingAtoB, poolState.reserveA, poolState.reserveB]); // Depend on pool reserves to react to external changes

  const handleSwapTokens = () => {
    setIsSwappingAtoB(prev => !prev);
    // Clear amounts when swapping token direction
    setFromAmount("");
    setToAmount("");
  };

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    const numValue = Number(value);

    if (value === "" || isNaN(numValue) || numValue <= 0) {
      setToAmount("");
      return;
    }

    try {
      let receivedAmount: number;
      if (isSwappingAtoB) {
        // Simulate swap to get estimated output without actually changing pool state
        const tempPool = new LiquidityPool(poolState.reserveA, poolState.reserveB);
        receivedAmount = tempPool.swapAforB(numValue);
      } else {
        const tempPool = new LiquidityPool(poolState.reserveA, poolState.reserveB);
        receivedAmount = tempPool.swapBforA(numValue);
      }
      setToAmount(receivedAmount.toFixed(6));
    } catch (error: unknown) {
      if (error instanceof Error) {
        setToAmount("Error");
        console.error("Swap calculation error:", error.message);
      }
    }
  };

  const executeSwap = () => {
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
      let receivedAmount: number;
      if (isSwappingAtoB) {
        receivedAmount = pool.swapAforB(numFromAmount);
      } else {
        receivedAmount = pool.swapBforA(numFromAmount);
      }
      toast({
        title: "Swap Successful",
        description: `Swapped ${numFromAmount} ${fromTokenSymbol} for ${receivedAmount.toFixed(6)} ${toTokenSymbol}.`,
      });
      setFromAmount("");
      setToAmount("");
      updatePoolState(); // Update the parent component's pool state
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: "Swap Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Swap Failed",
          description: "An unknown error occurred during the swap.",
          variant: "destructive",
        });
      }
    }
  };

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
              Reserve: {fromTokenBalance.toFixed(2)} {fromTokenSymbol}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => handleFromAmountChange(e.target.value)}
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
              Reserve: {toTokenBalance.toFixed(2)} {toTokenSymbol}
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
        disabled={!fromAmount || !toAmount || Number(fromAmount) <= 0 || toAmount === "Error"}
      >
        {!fromAmount || !toAmount || Number(fromAmount) <= 0 || toAmount === "Error" ? "Enter amount" : "Swap Tokens"}
      </Button>
    </motion.div>
  );
};

export default SwapTab;
