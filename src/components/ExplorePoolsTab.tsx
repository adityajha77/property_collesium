import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LiquidityPool } from '@/lib/liquidityPool';

interface ExplorePoolsTabProps {
  pool: LiquidityPool;
  updatePoolState: () => void; // Not directly used here, but good for consistency
}

const ExplorePoolsTab: React.FC<ExplorePoolsTabProps> = ({ pool }) => {
  const poolState = pool.getPoolState();

  const totalValueLocked = poolState.reserveA + poolState.reserveB;
  const liquidityRatio = `${poolState.reserveA.toFixed(2)} / ${poolState.reserveB.toFixed(2)}`;
  const priceA_per_B = poolState.priceA_per_B.toFixed(4);
  const priceB_per_A = poolState.priceB_per_A.toFixed(4);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6"
    >
      <div className="grid grid-cols-1 gap-4">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>TOKEN_A / TOKEN_B Pool</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Value Locked (TVL):</span>
              <span>${totalValueLocked.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reserve TOKEN_A:</span>
              <span>{poolState.reserveA.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reserve TOKEN_B:</span>
              <span>{poolState.reserveB.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Liquidity Ratio (A/B):</span>
              <span>{liquidityRatio}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price TOKEN_A per TOKEN_B:</span>
              <span>1 TOKEN_A = {priceA_per_B} TOKEN_B</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price TOKEN_B per TOKEN_A:</span>
              <span>1 TOKEN_B = {priceB_per_A} TOKEN_A</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total LP Shares:</span>
              <span>{poolState.totalLiquidityShares.toFixed(2)}</span>
            </div>
            {/* APY and 24h Volume are not part of this simple simulation */}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default ExplorePoolsTab;
