import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LiquidityPoolClient, PoolState } from '@/lib/liquidityPool';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { getAssociatedTokenAddress } from '@solana/spl-token';

interface MyPositionsTabProps {
  liquidityPoolClient: LiquidityPoolClient | null;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  poolState: PoolState | null;
  updatePoolState: () => void;
}

const MyPositionsTab: React.FC<MyPositionsTabProps> = ({
  liquidityPoolClient,
  tokenAMint,
  tokenBMint,
  poolState,
  updatePoolState, // Keep for consistency, though not directly used here yet
}) => {
  const { publicKey } = useWallet();
  const [userLpBalance, setUserLpBalance] = useState<number>(0);
  const [userTokenABalance, setUserTokenABalance] = useState<number>(0);
  const [userTokenBBalance, setUserTokenBBalance] = useState<number>(0);

  const reserveA = poolState?.token_a_reserve || 0;
  const reserveB = poolState?.token_b_reserve || 0;
  const totalLiquidityShares = poolState?.lp_supply || 0;
  const lpMint = poolState?.lp_mint;

  const fetchUserBalances = useCallback(async () => {
    if (!publicKey || !liquidityPoolClient || !poolState) {
      setUserLpBalance(0);
      setUserTokenABalance(0);
      setUserTokenBBalance(0);
      return;
    }

    try {
      // Fetch user's LP token balance
      const userLpTokenAccount = await getAssociatedTokenAddress(lpMint!, publicKey);
      const lpBalance = await liquidityPoolClient.getTokenAccountBalance(userLpTokenAccount);
      setUserLpBalance(lpBalance);

      // Fetch user's Token A balance
      const userTokenAAccount = await getAssociatedTokenAddress(tokenAMint, publicKey);
      const tokenABalance = await liquidityPoolClient.getTokenAccountBalance(userTokenAAccount);
      setUserTokenABalance(tokenABalance);

      // Fetch user's Token B balance
      const userTokenBAccount = await getAssociatedTokenAddress(tokenBMint, publicKey);
      const tokenBBalance = await liquidityPoolClient.getTokenAccountBalance(userTokenBAccount);
      setUserTokenBBalance(tokenBBalance);

    } catch (error) {
      console.error("Error fetching user balances:", error);
      setUserLpBalance(0);
      setUserTokenABalance(0);
      setUserTokenBBalance(0);
    }
  }, [publicKey, liquidityPoolClient, poolState, lpMint, tokenAMint, tokenBMint]);

  useEffect(() => {
    fetchUserBalances();
  }, [fetchUserBalances]);

  const hasPositions = userLpBalance > 0;

  let depositedA = 0;
  let depositedB = 0;
  let shareOfPool = 0;

  if (hasPositions && totalLiquidityShares > 0) {
    const ratio = userLpBalance / totalLiquidityShares;
    depositedA = reserveA * ratio;
    depositedB = reserveB * ratio;
    shareOfPool = ratio * 100;
  }

  if (!publicKey) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 text-center text-muted-foreground"
      >
        Please connect your wallet to view your liquidity positions.
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6"
    >
      {!hasPositions ? (
        <p className="text-center text-muted-foreground">No liquidity positions found for your wallet.</p>
      ) : (
        <div className="grid gap-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Your Liquidity Position</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">LP Shares:</span>
                <span>{userLpBalance.toFixed(2)} LP</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Deposited:</span>
                <span>{depositedA.toFixed(2)} TOKEN_A + {depositedB.toFixed(2)} TOKEN_B</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Share of Pool:</span>
                <span>{shareOfPool.toFixed(2)}%</span>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Your Token Balances</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TOKEN_A Balance:</span>
                <span>{userTokenABalance.toFixed(2)} TOKEN_A</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TOKEN_B Balance:</span>
                <span>{userTokenBBalance.toFixed(2)} TOKEN_B</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  );
};

export default MyPositionsTab;
