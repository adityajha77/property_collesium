import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SwapTab from '@/components/SwapTab';
import AddLiquidityTab from '@/components/AddLiquidityTab';
import RemoveLiquidityTab from '@/components/RemoveLiquidityTab';
import MyPositionsTab from '@/components/MyPositionsTab';
import ExplorePoolsTab from '@/components/ExplorePoolsTab';
import { LiquidityPoolClient, PoolState } from '@/lib/liquidityPool'; // Import the LiquidityPoolClient and PoolState
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Navbar from "@/components/Navbar"; // Import Navbar

// --- CRITICAL FIX ---
// Moved Mints OUTSIDE the component.
// Using .unique() inside the component creates a new key on every render,
// causing an infinite loop in your useEffect hooks.
//
// !!! REPLACE THESE WITH YOUR ACTUAL TOKEN MINTS !!!
const TOKEN_A_MINT = new PublicKey("58JjDcAMCpZCJEu9fSfSpUZN5Qp3q3ETWsNsWPFD3Pc9");
const TOKEN_B_MINT = new PublicKey("Ddt1N1khKUqK6X7mtYotP15bnp1yfGaRSBK9mEJmhivJ");

const LiquidityPoolPage: React.FC = () => {
  const { connection } = useConnection();
  const walletContext = useWallet(); // Get the entire wallet context
  const { publicKey } = walletContext;
  const [liquidityPoolClient, setLiquidityPoolClient] = useState<LiquidityPoolClient | null>(null);
  const [poolState, setPoolState] = useState<PoolState | null>(null);
  const [totalPools, setTotalPools] = useState<number>(0); // New state for total pools
  const [loading, setLoading] = useState(true);
  const [poolError, setPoolError] = useState<string | null>(null); // Specific error for the main pool
  const [allPoolsError, setAllPoolsError] = useState<string | null>(null); // Specific error for fetching all pools

  const fetchPoolData = useCallback(async () => {
    if (!liquidityPoolClient) return;
    setLoading(true);
    setPoolError(null);
    setAllPoolsError(null);

    try {
      const fetchedPoolState = await liquidityPoolClient.fetchPoolState(TOKEN_A_MINT, TOKEN_B_MINT);
      setPoolState(fetchedPoolState);
      if (!fetchedPoolState) {
        setPoolError("The specified liquidity pool does not exist or is not initialized.");
      }
    } catch (err: unknown) {
      console.error("Error fetching specific pool state:", err);
      setPoolError(`Failed to fetch the specific liquidity pool state: ${(err as Error).message}`);
      setPoolState(null);
    }

    try {
      const allPools = await liquidityPoolClient.fetchAllPoolStates();
      setTotalPools(allPools.length);
    } catch (err: unknown) {
      console.error("Error fetching all pool states:", err);
      if ((err as Error).message && (err as Error).message.includes("getProgramAccounts is not available on the Free tier")) {
        setAllPoolsError("Cannot fetch all pools: getProgramAccounts is not available on the Free tier RPC. Upgrade your RPC or use a different endpoint to enable 'Explore Pools' functionality.");
      } else {
        setAllPoolsError(`Failed to fetch all pools: ${(err as Error).message}`);
      }
      setTotalPools(0);
    } finally {
      setLoading(false);
    }
  }, [liquidityPoolClient]);

  useEffect(() => {
    if (connection && walletContext.wallet) { // Check if wallet is connected
      setLiquidityPoolClient(new LiquidityPoolClient(connection, walletContext));
    }
  }, [connection, walletContext]);

  useEffect(() => {
    if (liquidityPoolClient) {
      fetchPoolData();
    }
  }, [liquidityPoolClient, fetchPoolData]);

  // Function to update pool state and trigger re-renders
  const updatePoolState = () => {
    fetchPoolData();
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading Liquidity Pool Data...</div>;
  }

  if (!publicKey) {
    return (
      <div className="container mx-auto p-6 text-center relative">
        <Navbar />
        <h1 className="text-3xl font-bold mb-8 pt-20">Real Estate Liquidity Pool</h1>
        <p className="mb-4">Please connect your Solana wallet to interact with the liquidity pool.</p>
        <WalletMultiButton />
      </div>
    );
  }

  // Calculate derived values for display, converting BN to number
  const reserveA = poolState?.token_a_reserve?.toNumber() || 0;
  const reserveB = poolState?.token_b_reserve?.toNumber() || 0;
  const totalLiquidityShares = poolState?.lp_supply?.toNumber() || 0;
  const priceA_per_B = reserveA > 0 ? reserveB / reserveA : 0;
  const priceB_per_A = reserveB > 0 ? reserveA / reserveB : 0;
  const tvl = reserveA + reserveB; // Assuming 1:1 value for simplicity in TVL display

  return (
    <div className="container mx-auto p-6 pt-24 relative"> {/* Increased pt for spacing */}
      <Navbar />
      <h1 className="text-3xl font-bold mb-8">Real Estate Liquidity Pool</h1>

      {allPoolsError && (
        <div className="mb-4 p-4 bg-yellow-100 text-yellow-700 border border-yellow-400 rounded">
          Warning: {allPoolsError}
        </div>
      )}

      {/* Top Section - Overview Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Value Locked (TVL)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${tvl.toFixed(2)}</p>
          </CardContent>
        </Card>
        {!allPoolsError && ( // Conditionally render Total Pools card
          <Card>
            <CardHeader>
              <CardTitle>Total Pools</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalPools} active property pool{totalPools !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Price A/B</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{priceA_per_B.toFixed(4)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Your Liquidity</CardTitle>
          </CardHeader>
          <CardContent>
            {/* This will need to fetch actual LP token balance for the connected user */}
            <p className="text-2xl font-bold">{(0).toFixed(2)} Shares</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Shares</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalLiquidityShares.toFixed(2)}</p>
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
          <TabsTrigger value="explore-pools" disabled={!!allPoolsError}>Explore Pools</TabsTrigger>
        </TabsList>
        <TabsContent value="swap">
          <Card>
            <CardHeader>
              <CardTitle>Swap Tokens</CardTitle>
            </CardHeader>
            <CardContent>
              <SwapTab
                liquidityPoolClient={liquidityPoolClient}
                tokenAMint={TOKEN_A_MINT}
                tokenBMint={TOKEN_B_MINT}
                poolState={poolState}
                updatePoolState={updatePoolState}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="add-liquidity">
          <Card>
            <CardHeader>
              <CardTitle>Add Liquidity</CardTitle>
            </CardHeader>
            <CardContent>
              <AddLiquidityTab
                liquidityPoolClient={liquidityPoolClient}
                tokenAMint={TOKEN_A_MINT}
                tokenBMint={TOKEN_B_MINT}
                poolState={poolState}
                updatePoolState={updatePoolState}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="remove-liquidity">
          <Card>
            <CardHeader>
              <CardTitle>Remove Liquidity</CardTitle>
            </CardHeader>
            <CardContent>
              <RemoveLiquidityTab
                liquidityPoolClient={liquidityPoolClient}
                tokenAMint={TOKEN_A_MINT}
                tokenBMint={TOKEN_B_MINT}
                poolState={poolState}
                updatePoolState={updatePoolState}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="my-positions">
          <Card>
            <CardHeader>
              <CardTitle>My Liquidity Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <MyPositionsTab
                liquidityPoolClient={liquidityPoolClient}
                tokenAMint={TOKEN_A_MINT}
                tokenBMint={TOKEN_B_MINT}
                poolState={poolState}
                updatePoolState={updatePoolState}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="explore-pools">
          <Card>
            <CardHeader>
              <CardTitle>Explore Liquidity Pools</CardTitle>
            </CardHeader>
            <CardContent>
              <ExplorePoolsTab
                liquidityPoolClient={liquidityPoolClient}
                tokenAMint={TOKEN_A_MINT}
                tokenBMint={TOKEN_B_MINT}
                poolState={poolState}
                updatePoolState={updatePoolState}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LiquidityPoolPage;
