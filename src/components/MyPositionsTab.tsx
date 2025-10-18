import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LiquidityPool } from '@/lib/liquidityPool';

interface MyPositionsTabProps {
  pool: LiquidityPool;
  providerAddress: string;
  updatePoolState: () => void; // Although not directly used here, it's good practice to pass it down
}

const MyPositionsTab: React.FC<MyPositionsTabProps> = ({ pool, providerAddress }) => {
  const poolState = pool.getPoolState();
  const providerShares = pool.getProviderShares(providerAddress);

  const hasPositions = providerShares > 0;

  let depositedA = 0;
  let depositedB = 0;
  let shareOfPool = 0;

  if (hasPositions) {
    const ratio = providerShares / poolState.totalLiquidityShares;
    depositedA = poolState.reserveA * ratio;
    depositedB = poolState.reserveB * ratio;
    shareOfPool = ratio * 100;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6"
    >
      {!hasPositions ? (
        <p className="text-center text-muted-foreground">No liquidity positions found for {providerAddress}.</p>
      ) : (
        <div className="grid gap-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Your Liquidity Position</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">LP Shares:</span>
                <span>{providerShares.toFixed(2)} LP</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Deposited:</span>
                <span>{depositedA.toFixed(2)} TOKEN_A + {depositedB.toFixed(2)} TOKEN_B</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Share of Pool:</span>
                <span>{shareOfPool.toFixed(2)}%</span>
              </div>
              {/* Rewards Earned is not part of this simple simulation */}
              {/* <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Earned:</span>
                <span>0.00 PROP</span>
              </div> */}
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  );
};

export default MyPositionsTab;
