import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { LiquidityPoolClient, PoolState } from '@/lib/liquidityPool';
import { useToast } from "@/components/ui/use-toast";
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { getAssociatedTokenAddress } from '@solana/spl-token';

interface RemoveLiquidityTabProps {
  liquidityPoolClient: LiquidityPoolClient | null;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  poolState: PoolState | null;
  updatePoolState: () => void;
}

const RemoveLiquidityTab: React.FC<RemoveLiquidityTabProps> = ({
  liquidityPoolClient,
  tokenAMint,
  tokenBMint,
  poolState,
  updatePoolState,
}) => {
  const { publicKey } = useWallet();
  const [withdrawalPercentage, setWithdrawalPercentage] = useState<number[]>([0]); // Default to 0%
  const [expectedAmountA, setExpectedAmountA] = useState<number>(0);
  const [expectedAmountB, setExpectedAmountB] = useState<number>(0);
  const [userLpBalance, setUserLpBalance] = useState<number>(0);
  const { toast } = useToast();

  const reserveA = poolState?.token_a_reserve || 0;
  const reserveB = poolState?.token_b_reserve || 0;
  const totalLiquidityShares = poolState?.lp_supply || 0;
  const lpMint = poolState?.lp_mint;

  // Fetch user's LP token balance
  useEffect(() => {
    const fetchUserLpBalance = async () => {
      if (!publicKey || !liquidityPoolClient || !lpMint) {
        setUserLpBalance(0);
        return;
      }
      try {
        const userLpTokenAccount = await getAssociatedTokenAddress(lpMint, publicKey);
        const balance = await liquidityPoolClient.getTokenAccountBalance(userLpTokenAccount);
        setUserLpBalance(balance);
      } catch (error) {
        console.error("Error fetching user LP balance:", error);
        setUserLpBalance(0);
      }
    };
    fetchUserLpBalance();
  }, [publicKey, liquidityPoolClient, lpMint]);

  useEffect(() => {
    const percentage = withdrawalPercentage[0] / 100;
    if (percentage <= 0 || userLpBalance <= 0 || !poolState || totalLiquidityShares === 0) {
      setExpectedAmountA(0);
      setExpectedAmountB(0);
      return;
    }

    try {
      const lpTokensToRemove = userLpBalance * percentage;
      const amountAOut = (lpTokensToRemove * reserveA) / totalLiquidityShares;
      const amountBOut = (lpTokensToRemove * reserveB) / totalLiquidityShares;
      
      setExpectedAmountA(amountAOut);
      setExpectedAmountB(amountBOut);

    } catch (error) {
      console.error("Error calculating expected amounts for liquidity removal:", error);
      setExpectedAmountA(0);
      setExpectedAmountB(0);
    }
  }, [withdrawalPercentage, userLpBalance, poolState, reserveA, reserveB, totalLiquidityShares]);

  const handleRemoveLiquidity = async () => {
    if (!publicKey || !liquidityPoolClient || !poolState || !lpMint) {
      toast({
        title: "Wallet Not Connected or Pool Not Initialized",
        description: "Please connect your wallet and ensure the pool is initialized.",
        variant: "destructive",
      });
      return;
    }

    const percentage = withdrawalPercentage[0] / 100;
    if (percentage <= 0) {
      toast({
        title: "Invalid Percentage",
        description: "Please select a withdrawal percentage greater than 0.",
        variant: "destructive",
      });
      return;
    }

    const lpTokensToRemove = userLpBalance * percentage;
    if (lpTokensToRemove <= 0) {
        toast({
            title: "Insufficient LP Tokens",
            description: "You do not have enough LP tokens to remove liquidity.",
            variant: "destructive",
        });
        return;
    }

    try {
      const transactionSignature = await liquidityPoolClient.removeLiquidity(
        publicKey,
        tokenAMint,
        tokenBMint,
        lpTokensToRemove
      );
      toast({
        title: "Liquidity Removed",
        description: `Transaction: ${transactionSignature}`,
      });
      setWithdrawalPercentage([0]); // Reset slider
      updatePoolState();
    } catch (error: unknown) {
      toast({
        title: "Failed to Remove Liquidity",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    }
  };

  const isRemoveLiquidityDisabled = withdrawalPercentage[0] === 0 || userLpBalance <= 0 || !publicKey;

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
              <span className="text-lg font-semibold">{userLpBalance.toFixed(2)} LP</span>
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
            disabled={userLpBalance <= 0 || !publicKey}
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
          disabled={isRemoveLiquidityDisabled}
        >
          Remove Liquidity
        </Button>
      </div>
    </motion.div>
  );
};

export default RemoveLiquidityTab;
