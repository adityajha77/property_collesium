import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { LiquidityPool } from '@/lib/liquidityPool';
import { useToast } from "@/components/ui/use-toast";

interface RemoveLiquidityTabProps {
  pool: LiquidityPool;
  providerAddress: string;
  updatePoolState: () => void;
}

const RemoveLiquidityTab: React.FC<RemoveLiquidityTabProps> = ({ pool, providerAddress, updatePoolState }) => {
  const [withdrawalPercentage, setWithdrawalPercentage] = useState<number[]>([0]); // Default to 0%
  const [expectedAmountA, setExpectedAmountA] = useState<number>(0);
  const [expectedAmountB, setExpectedAmountB] = useState<number>(0);
  const { toast } = useToast();

  const poolState = pool.getPoolState();
  const currentProviderShares = pool.getProviderShares(providerAddress);

  useEffect(() => {
    const percentage = withdrawalPercentage[0] / 100;
    if (percentage <= 0 || currentProviderShares <= 0) {
      setExpectedAmountA(0);
      setExpectedAmountB(0);
      return;
    }

    try {
      // Simulate removal to get expected amounts without actually changing pool state
      const tempPool = new LiquidityPool(poolState.reserveA, poolState.reserveB);
      // To simulate, we need to temporarily add the provider's shares to the temp pool's total shares
      // This is a simplification for calculation, as the actual pool.removeLiquidity handles provider shares internally.
      // A more accurate simulation would involve passing provider shares to the temp pool constructor or a dedicated method.
      // For now, we'll calculate based on the current pool state and the percentage of *total* shares.
      // This assumes the provider is removing a percentage of the *total* pool, not just their own shares.
      // Let's adjust this to calculate based on the provider's shares.

      const sharesToRemove = currentProviderShares * percentage;
      const ratio = sharesToRemove / poolState.totalLiquidityShares;
      
      setExpectedAmountA(poolState.reserveA * ratio);
      setExpectedAmountB(poolState.reserveB * ratio);

    } catch (error) {
      console.error("Error simulating liquidity removal:", error);
      setExpectedAmountA(0);
      setExpectedAmountB(0);
    }
  }, [withdrawalPercentage, currentProviderShares, poolState.reserveA, poolState.reserveB, poolState.totalLiquidityShares]);

  const handleRemoveLiquidity = () => {
    const percentage = withdrawalPercentage[0] / 100;

    if (percentage <= 0) {
      toast({
        title: "Invalid Percentage",
        description: "Please select a withdrawal percentage greater than 0.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { amountA, amountB } = pool.removeLiquidity(percentage, providerAddress);
      toast({
        title: "Liquidity Removed",
        description: `Removed ${percentage * 100}% of your liquidity. Received ${amountA.toFixed(2)} TOKEN_A and ${amountB.toFixed(2)} TOKEN_B.`,
      });
      setWithdrawalPercentage([0]); // Reset slider
      updatePoolState();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: "Failed to Remove Liquidity",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to Remove Liquidity",
          description: "An unknown error occurred.",
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
      <div className="space-y-6">
        {/* Current LP Token Balance */}
        <Card className="glass-card p-4">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Your LP Token Balance</Label>
              <span className="text-lg font-semibold">{currentProviderShares.toFixed(2)} LP</span>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Slider */}
        <div className="glass-card p-4">
          <Label htmlFor="withdrawal-slider" className="mb-4 block">Withdrawal Amount ({withdrawalPercentage[0]}%)</Label>
          <Slider
            id="withdrawal-slider"
            min={0}
            max={100}
            step={1}
            value={withdrawalPercentage}
            onValueChange={setWithdrawalPercentage}
            className="w-full"
            disabled={currentProviderShares <= 0}
          />
        </div>

        {/* Expected Tokens on Withdrawal */}
        <div className="glass-card p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Expected TOKEN_A</span>
            <span>{expectedAmountA.toFixed(2)} TOKEN_A</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Expected TOKEN_B</span>
            <span>{expectedAmountB.toFixed(2)} TOKEN_B</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Withdrawal Fee</span>
            <span>0.00 (0%)</span> {/* Simplified for simulation */}
          </div>
        </div>

        {/* Action Button */}
        <Button
          variant="neon"
          size="lg"
          className="w-full"
          onClick={handleRemoveLiquidity}
          disabled={withdrawalPercentage[0] === 0 || currentProviderShares <= 0}
        >
          Remove Liquidity
        </Button>
      </div>
    </motion.div>
  );
};

export default RemoveLiquidityTab;
