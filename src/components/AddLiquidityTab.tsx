import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LiquidityPool } from '@/lib/liquidityPool';
import { useToast } from "@/components/ui/use-toast";

interface AddLiquidityTabProps {
  pool: LiquidityPool;
  providerAddress: string;
  updatePoolState: () => void;
}

const AddLiquidityTab: React.FC<AddLiquidityTabProps> = ({ pool, providerAddress, updatePoolState }) => {
  const [amountA, setAmountA] = useState<string>("");
  const [amountB, setAmountB] = useState<string>("");
  const [expectedLPTokens, setExpectedLPTokens] = useState<number>(0);
  const { toast } = useToast();

  const poolState = pool.getPoolState();
  const currentProviderShares = pool.getProviderShares(providerAddress);

  useEffect(() => {
    const numAmountA = Number(amountA);
    const numAmountB = Number(amountB);

    if (isNaN(numAmountA) || isNaN(numAmountB) || numAmountA <= 0 || numAmountB <= 0) {
      setExpectedLPTokens(0);
      return;
    }

    // Simulate adding liquidity to calculate expected LP tokens
    try {
      const tempPool = new LiquidityPool(poolState.reserveA, poolState.reserveB);
      const simulatedShares = tempPool.addLiquidity(numAmountA, numAmountB, providerAddress);
      setExpectedLPTokens(simulatedShares);
    } catch (error) {
      setExpectedLPTokens(0);
      console.error("Error simulating liquidity addition:", error);
    }
  }, [amountA, amountB, poolState.reserveA, poolState.reserveB]);

  const handleAddLiquidity = () => {
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

    try {
      const mintedShares = pool.addLiquidity(numAmountA, numAmountB, providerAddress);
      toast({
        title: "Liquidity Added",
        description: `Added ${numAmountA} TOKEN_A and ${numAmountB} TOKEN_B. Minted ${mintedShares.toFixed(2)} LP shares.`,
      });
      setAmountA("");
      setAmountB("");
      updatePoolState();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: "Failed to Add Liquidity",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to Add Liquidity",
          description: "An unknown error occurred.",
          variant: "destructive",
        });
      }
    }
  };

  const shareOfPool = poolState.totalLiquidityShares > 0
    ? ((currentProviderShares + expectedLPTokens) / (poolState.totalLiquidityShares + expectedLPTokens)) * 100
    : (expectedLPTokens > 0 ? 100 : 0);

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
            <span className="text-sm text-muted-foreground">Reserve: {poolState.reserveA.toFixed(2)}</span>
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
            <span className="text-sm text-muted-foreground">Reserve: {poolState.reserveB.toFixed(2)}</span>
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
          {/* Removed Approve Tokens button as it's not part of this simulation */}
          <Button
            variant="neon"
            size="lg"
            className="w-full"
            onClick={handleAddLiquidity}
            disabled={!amountA || !amountB || Number(amountA) <= 0 || Number(amountB) <= 0}
          >
            Add Liquidity
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default AddLiquidityTab;
