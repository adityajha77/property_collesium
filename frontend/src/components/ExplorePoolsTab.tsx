import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LiquidityPoolClient, PoolState } from '@/lib/liquidityPool';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useToast } from "@/components/ui/use-toast";

interface ExplorePoolsTabProps {
  liquidityPoolClient: LiquidityPoolClient | null;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  poolState: PoolState | null;
  updatePoolState: () => void;
}

const ExplorePoolsTab: React.FC<ExplorePoolsTabProps> = ({
  liquidityPoolClient,
  tokenAMint,
  tokenBMint,
  poolState,
  updatePoolState,
}) => {
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const [initialAmountA, setInitialAmountA] = useState<string>("");
  const [initialAmountB, setInitialAmountB] = useState<string>("");

  const isPoolInitialized = poolState?.is_initialized;

  const totalValueLocked = (poolState?.token_a_reserve || 0) + (poolState?.token_b_reserve || 0);
  const liquidityRatio = `${(poolState?.token_a_reserve || 0).toFixed(2)} / ${(poolState?.token_b_reserve || 0).toFixed(2)}`;
  const priceA_per_B = (poolState?.token_a_reserve && poolState?.token_b_reserve) > 0
    ? (poolState.token_b_reserve / poolState.token_a_reserve).toFixed(4)
    : "0.0000";
  const priceB_per_A = (poolState?.token_a_reserve && poolState?.token_b_reserve) > 0
    ? (poolState.token_a_reserve / poolState.token_b_reserve).toFixed(4)
    : "0.0000";
  const totalLiquidityShares = (poolState?.lp_supply || 0).toFixed(2);

  const handleInitializePool = async () => {
    if (!publicKey || !liquidityPoolClient) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to initialize the pool.",
        variant: "destructive",
      });
      return;
    }

    const numAmountA = Number(initialAmountA);
    const numAmountB = Number(initialAmountB);

    if (isNaN(numAmountA) || isNaN(numAmountB) || numAmountA <= 0 || numAmountB <= 0) {
      toast({
        title: "Invalid Amounts",
        description: "Please enter valid initial amounts for both tokens.",
        variant: "destructive",
      });
      return;
    }

    try {
      const transactionSignature = await liquidityPoolClient.initializePool(
        publicKey,
        tokenAMint,
        tokenBMint,
        numAmountA,
        numAmountB
      );
      toast({
        title: "Pool Initialized",
        description: `Transaction: ${transactionSignature}`,
      });
      setInitialAmountA("");
      setInitialAmountB("");
      updatePoolState(); // Refresh pool state after initialization
    } catch (error: unknown) {
      toast({
        title: "Failed to Initialize Pool",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    }
  };

  const isInitializeDisabled = !publicKey || isPoolInitialized || !initialAmountA || !initialAmountB || Number(initialAmountA) <= 0 || Number(initialAmountB) <= 0;

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
            {isPoolInitialized ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Value Locked (TVL):</span>
                  <span>${totalValueLocked.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reserve TOKEN_A:</span>
                  <span>{(poolState?.token_a_reserve || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reserve TOKEN_B:</span>
                  <span>{(poolState?.token_b_reserve || 0).toFixed(2)}</span>
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
                  <span>{totalLiquidityShares}</span>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-center text-muted-foreground">
                  No liquidity pool found. Initialize a new pool.
                </p>
                <div className="flex flex-col space-y-2">
                  <Label htmlFor="initial-amount-a">Initial TOKEN_A Amount</Label>
                  <Input
                    id="initial-amount-a"
                    placeholder="0.0"
                    value={initialAmountA}
                    onChange={(e) => setInitialAmountA(e.target.value)}
                    type="number"
                  />
                  <Label htmlFor="initial-amount-b">Initial TOKEN_B Amount</Label>
                  <Input
                    id="initial-amount-b"
                    placeholder="0.0"
                    value={initialAmountB}
                    onChange={(e) => setInitialAmountB(e.target.value)}
                    type="number"
                  />
                  <Button
                    variant="neon"
                    size="lg"
                    className="w-full mt-4"
                    onClick={handleInitializePool}
                    disabled={isInitializeDisabled}
                  >
                    Initialize Pool
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default ExplorePoolsTab;
