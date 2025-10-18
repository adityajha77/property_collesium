import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SwapTab from '@/components/SwapTab';
import AddLiquidityTab from '@/components/AddLiquidityTab';
import RemoveLiquidityTab from '@/components/RemoveLiquidityTab';
import MyPositionsTab from '@/components/MyPositionsTab';
import ExplorePoolsTab from '@/components/ExplorePoolsTab';
import { LiquidityPool } from '@/lib/liquidityPool'; // Import the LiquidityPool class

const LiquidityPoolPage: React.FC = () => {
  const [pool, setPool] = useState<LiquidityPool | null>(null);
  const [poolState, setPoolState] = useState<ReturnType<LiquidityPool['getPoolState']> | null>(null);
  const providerAddress = "0xUserWallet"; // A dummy user address for now

  useEffect(() => {
    // Initialize the pool when the component mounts
    const initialPool = new LiquidityPool(10000, 10000); // Start with some initial liquidity
    setPool(initialPool);
    setPoolState(initialPool.getPoolState());
  }, []);

  // Function to update pool state and trigger re-renders
  const updatePoolState = () => {
    if (pool) {
      setPoolState(pool.getPoolState());
    }
  };

  if (!pool || !poolState) {
    return <div>Loading Liquidity Pool...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Real Estate Liquidity Pool</h1>

      {/* Top Section - Overview Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Value Locked (TVL)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${(poolState.reserveA + poolState.reserveB).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Pools</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">1 active property pool</p> {/* We are simulating one pool */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Price A/B</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{poolState.priceA_per_B.toFixed(4)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Your Liquidity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pool.getProviderShares(providerAddress).toFixed(2)} Shares</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Shares</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{poolState.totalLiquidityShares.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section - Tabs */}
      <Tabs defaultValue="swap" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="swap">Swap</TabsTrigger>
          <TabsTrigger value="add-liquidity">Add Liquidity</TabsTrigger>
          <TabsTrigger value="remove-liquidity">Remove Liquidity</TabsTrigger>
          <TabsTrigger value="my-positions">My Positions</TabsTrigger>
          <TabsTrigger value="explore-pools">Explore Pools</TabsTrigger>
        </TabsList>
        <TabsContent value="swap">
          <Card>
            <CardHeader>
              <CardTitle>Swap Tokens</CardTitle>
            </CardHeader>
            <CardContent>
              <SwapTab pool={pool} updatePoolState={updatePoolState} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="add-liquidity">
          <Card>
            <CardHeader>
              <CardTitle>Add Liquidity</CardTitle>
            </CardHeader>
            <CardContent>
              <AddLiquidityTab pool={pool} providerAddress={providerAddress} updatePoolState={updatePoolState} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="remove-liquidity">
          <Card>
            <CardHeader>
              <CardTitle>Remove Liquidity</CardTitle>
            </CardHeader>
            <CardContent>
              <RemoveLiquidityTab pool={pool} providerAddress={providerAddress} updatePoolState={updatePoolState} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="my-positions">
          <Card>
            <CardHeader>
              <CardTitle>My Liquidity Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <MyPositionsTab pool={pool} providerAddress={providerAddress} updatePoolState={updatePoolState} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="explore-pools">
          <Card>
            <CardHeader>
              <CardTitle>Explore Liquidity Pools</CardTitle>
            </CardHeader>
            <CardContent>
              <ExplorePoolsTab pool={pool} updatePoolState={updatePoolState} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LiquidityPoolPage;
