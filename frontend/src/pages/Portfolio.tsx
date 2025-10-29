import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Plus, BarChart3, PieChart, DollarSign, Wallet, Landmark, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import PropertyGrid from "@/components/PropertyGrid";
import { useConnection, useWallet } from '@solana/wallet-adapter-react'; // Import useConnection and useWallet
import { LAMPORTS_PER_SOL } from '@solana/web3.js'; // Import LAMPORTS_PER_SOL
import Navbar from "@/components/Navbar"; // Import Navbar

// Interface matching the backend Property model
interface Property {
  _id: string; // Add _id for MongoDB
  propertyId: string;
  title: string;
  location: string;
  description: string;
  priceSOL: number;
  totalTokens: number;
  propertyType: 'house' | 'apartment' | 'condo' | 'land' | 'commercial' | 'other';
  imageURLs: string[];
  status: 'pending_verification' | 'verified' | 'tokenized' | 'bidding' | 'sold_out' | 'rejected'; // Updated status enum
  tokenMintAddress: string;
  owner: string;
  createdAt: string;
}

// Interface for enriched transaction data, tailored for portfolio display
interface EnrichedTransaction {
  type: 'Buy' | 'Sell';
  amount: string;
  property: string;
  value: string;
  time: string;
}

// Interface for raw transaction data from the backend
interface RawTransaction {
  propertyId: string;
  transactionType: 'buy' | 'sell';
  tokenAmount: number;
  priceSOL: number;
  createdAt: string;
}

const Portfolio = () => {
  const navigate = useNavigate();
  const { connection } = useConnection(); // Get Solana connection
  const { publicKey, connected, connecting } = useWallet(); // Get connected wallet's public key and connection status
  const [userProperties, setUserProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableTokenBalance, setAvailableTokenBalance] = useState<number>(0);
  const [rentalIncome, setRentalIncome] = useState<{ monthly: number; total: number }>({ monthly: 0, total: 0 });

  useEffect(() => {
    const fetchUserProperties = async () => {
      // If still connecting, do nothing and keep loading state
      if (connecting) {
        setLoading(true);
        return;
      }

      // If not connected after attempting, show error
      if (!connected || !publicKey) {
        setError("Please connect your wallet to view your portfolio.");
        setLoading(false);
        return;
      }

      // If connected, proceed to fetch properties
      try {
        const response = await fetch(`https://tokenestate.onrender.com/api/properties/owner/${publicKey.toBase58()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch user properties");
        }
        const data: Property[] = await response.json();
        setUserProperties(data);
        setError(null); // Clear any previous errors
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true); // Set loading to true at the start of the effect
    fetchUserProperties();
  }, [publicKey, connected, connecting]); // Depend on publicKey, connected, and connecting

  // Calculate portfolio stats based on fetched properties
  const portfolioStats = userProperties.reduce(
    (acc, property) => {
      // Only consider tokenized properties for total value and ROI calculation
      if (property.status === 'tokenized') {
        acc.totalPortfolioValue += property.priceSOL; // Sum of all property tokens owned * current token price (placeholder for now)
        acc.totalPropertiesOwned += 1; // Count unique property tokens
        // For ROI, we'd need to track individual token purchase prices and current market prices
        // For now, using a placeholder for ROI calculation
        acc.totalROI = 5.25; // Placeholder percentage gain or loss
      }
      return acc;
    },
    {
      totalPortfolioValue: 0,
      totalPropertiesOwned: 0,
      totalROI: 0,
    }
  );

  // Fetch available token balance (SOL balance)
  useEffect(() => {
    const fetchSolBalance = async () => {
      if (publicKey) {
        try {
          const balance = await connection.getBalance(publicKey);
          setAvailableTokenBalance(balance / LAMPORTS_PER_SOL);
        } catch (err) {
          console.error("Failed to fetch SOL balance:", err);
          // Optionally set an error state for balance fetching
        }
      } else {
        setAvailableTokenBalance(0); // Reset if wallet is disconnected
      }
    };

    fetchSolBalance();
    // For now, using mock data for rental income
    setRentalIncome({ monthly: 25.50, total: 1200.00 });
  }, [publicKey, connection]); // Depend on publicKey and connection

  // State for recent transactions
  const [recentTransactions, setRecentTransactions] = useState<EnrichedTransaction[]>([]);

  // Fetch recent transactions
  useEffect(() => {
    const fetchRecentTransactions = async () => {
      if (publicKey) {
        try {
          const response = await fetch(`https://tokenestate.onrender.com/api/properties/transactions/buyer/${publicKey.toBase58()}`);
          if (response.ok) {
            const data = await response.json();
            // Enrich transactions with property titles (optional, for better display)
            const enriched: EnrichedTransaction[] = await Promise.all(data.slice(0, 5).map(async (tx: RawTransaction) => {
              const propResponse = await fetch(`https://tokenestate.onrender.com/api/properties/${tx.propertyId}`);
              const propData = propResponse.ok ? await propResponse.json() : { title: `Property ${tx.propertyId}` };
              return {
                type: tx.transactionType === 'buy' ? 'Buy' : 'Sell',
                amount: `${tx.tokenAmount} tokens`,
                property: propData.title,
                value: tx.priceSOL.toFixed(2),
                time: new Date(tx.createdAt).toLocaleDateString(),
              };
            }));
            setRecentTransactions(enriched);
          }
        } catch (err) {
          console.error("Failed to fetch recent transactions:", err);
        }
      }
    };

    fetchRecentTransactions();
  }, [publicKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background relative pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4">
          <Skeleton className="h-16 w-3/4 mx-auto mb-12" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12"
        >
          <Wallet className="w-16 h-16 mx-auto mb-6 text-primary" />
          <h2 className="text-3xl font-bold text-destructive mb-4">Error Loading Portfolio</h2>
          <p className="text-muted-foreground mb-8 max-w-md">{error}</p>
          <Button onClick={() => navigate('/')}>Go to Home</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative pt-24 pb-16">
      <div className="fixed inset-0 parallax-bg -z-10" />
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-4">
            Portfolio Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Track your tokenized real estate investments
          </p>
        </motion.div>

        {/* Portfolio Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12"
        >
          {/* Total Portfolio Value */}
          <Card className="glass-card p-6 text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-3 text-primary" />
            <div className="text-2xl font-bold text-foreground mb-1">
              {portfolioStats.totalPortfolioValue.toFixed(2)} SOL
            </div>
            <div className="text-sm text-muted-foreground">Total Portfolio Value</div>
          </Card>

          {/* Total Properties Owned */}
          <Card className="glass-card p-6 text-center">
            <Landmark className="w-8 h-8 mx-auto mb-3 text-accent" />
            <div className="text-2xl font-bold text-accent mb-1">
              {portfolioStats.totalPropertiesOwned}
            </div>
            <div className="text-sm text-muted-foreground">Total Properties Owned</div>
          </Card>

          {/* Total ROI / Growth % */}
          <Card className="glass-card p-6 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-3 text-secondary" />
            <div className="text-2xl font-bold mb-1">
              +{portfolioStats.totalROI.toFixed(2)}%
            </div>
            <div className="text-sm text-muted-foreground">Total ROI / Growth %</div>
          </Card>

          {/* Available Token Balance / Wallet Balance */}
          <Card className="glass-card p-6 text-center">
            <Wallet className="w-8 h-8 mx-auto mb-3 text-primary" />
            <div className="text-2xl font-bold text-foreground mb-1">
              {availableTokenBalance.toFixed(2)} SOL
            </div>
            <div className="text-sm text-muted-foreground">Available Token Balance</div>
          </Card>

          {/* Rental Income Earned (Monthly / Total) */}
          <Card className="glass-card p-6 text-center">
            <PiggyBank className="w-8 h-8 mx-auto mb-3 text-accent" />
            <div className="text-2xl font-bold text-accent mb-1">
              {rentalIncome.monthly.toFixed(2)} SOL <span className="text-base text-muted-foreground">/ {rentalIncome.total.toFixed(2)} SOL</span>
            </div>
            <div className="text-sm text-muted-foreground">Rental Income (Monthly / Total)</div>
          </Card>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-8">
          {/* Holdings */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">My Properties</h2>
                <Button variant="glass-primary" onClick={() => navigate('/create-property')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Property
                </Button>
              </div>

              {userProperties.length > 0 ? (
                <PropertyGrid 
                  properties={userProperties} 
                  onStartBidding={(propertyId) => navigate(`/start-auction/${propertyId}`)} // Pass the handler
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-lg">You don't have any properties yet.</p>
                  <Button variant="link" onClick={() => navigate('/create-property')}>
                    Create your first property
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Recent Transactions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="glass-card p-6">
              <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentTransactions.length > 0 ? recentTransactions.map((tx, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/10">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        tx.type === 'Buy' ? 'bg-secondary' : 'bg-accent'
                      }`} />
                      <div>
                        <div className="text-sm font-medium">{tx.type} {tx.amount}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {tx.property}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{tx.value} SOL</div>
                      <div className="text-xs text-muted-foreground">{tx.time}</div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">No recent transactions.</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Performance Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.0 }}
          >
            <Card className="glass-card p-6">
              <h3 className="text-lg font-bold mb-4">Portfolio Performance</h3>
              <div className="h-32 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl mb-1">📊</div>
                  <div className="text-xs text-muted-foreground">Chart Coming Soon</div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
