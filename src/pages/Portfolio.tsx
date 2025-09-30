import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Plus, BarChart3, PieChart, DollarSign, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import PropertyGrid from "@/components/PropertyGrid"; // Import PropertyGrid

// Interface matching the backend Property model
interface Property {
  propertyId: string;
  title: string;
  location: string;
  description: string;
  priceSOL: number;
  totalTokens: number;
  imageURLs: string[];
  status: 'pending_verification' | 'tokenized' | 'sold_out' | 'rejected';
  tokenMintAddress: string;
  owner: string;
  createdAt: string;
}

const Portfolio = () => {
  const navigate = useNavigate();
  const [userProperties, setUserProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Placeholder for the connected user's wallet address
  // In a real app, this would come from a wallet connection context
  const currentUserWalletAddress = "YOUR_WALLET_ADDRESS_HERE"; // Replace with actual wallet address

  useEffect(() => {
    const fetchUserProperties = async () => {
      if (!currentUserWalletAddress || currentUserWalletAddress === "YOUR_WALLET_ADDRESS_HERE") {
        setError("Please connect your wallet to view your portfolio.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`http://localhost:5000/api/properties/owner/${currentUserWalletAddress}`);
        if (!response.ok) {
          throw new Error("Failed to fetch user properties");
        }
        const data: Property[] = await response.json();
        setUserProperties(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProperties();
  }, [currentUserWalletAddress]);

  // Calculate portfolio stats based on fetched properties
  const portfolioStats = userProperties.reduce(
    (acc, property) => {
      // Only consider tokenized properties for total value and ROI calculation
      if (property.status === 'tokenized') {
        acc.totalValue += property.priceSOL; // Assuming priceSOL is the total value of the property
        acc.totalInvested += property.priceSOL; // Placeholder, needs actual investment tracking
      }
      return acc;
    },
    {
      totalValue: 0,
      totalInvested: 0,
      totalROI: 0, // This would need more complex calculation based on buy/sell prices
      properties: userProperties.length,
    }
  );

  // Placeholder for recent transactions
  const recentTransactions = [];

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
          <Card className="glass-card p-6 text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-3 text-primary" />
            <div className="text-2xl font-bold text-secondary mb-1">
              {portfolioStats.totalValue.toFixed(2)} SOL
            </div>
            <div className="text-sm text-muted-foreground">Total Value</div>
          </Card>

          <Card className="glass-card p-6 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-3 text-accent" />
            <div className="text-2xl font-bold text-accent mb-1">
              +{portfolioStats.totalROI.toFixed(2)}%
            </div>
            <div className="text-sm text-muted-foreground">Total ROI</div>
          </Card>

          <Card className="glass-card p-6 text-center">
            <BarChart3 className="w-8 h-8 mx-auto mb-3 text-secondary" />
            <div className="text-2xl font-bold mb-1">
              {portfolioStats.properties}
            </div>
            <div className="text-sm text-muted-foreground">Properties</div>
          </Card>

          <Card className="glass-card p-6 text-center">
            <PieChart className="w-8 h-8 mx-auto mb-3 text-primary" />
            <div className="text-2xl font-bold text-secondary mb-1">
              +{(portfolioStats.totalValue - portfolioStats.totalInvested).toFixed(2)} SOL
            </div>
            <div className="text-sm text-muted-foreground">Profit/Loss</div>
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
                <PropertyGrid properties={userProperties} />
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
