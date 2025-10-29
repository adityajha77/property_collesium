import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, TrendingUp, TrendingDown, Filter, Search, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { useWallet } from '@solana/wallet-adapter-react';
import Navbar from "@/components/Navbar"; // Import Navbar

// Combined interface for enriched transaction data
interface EnrichedTransaction {
  id: string;
  type: "Buy" | "Sell";
  property: string; // Property Title
  location: string;
  image: string; // First image URL of the property
  amount: number; // tokenAmount
  price: number; // priceSOL
  total: number; // Calculated total
  timestamp: string; // createdAt
  status: "Completed" | "Pending" | "Failed"; // status
  hash: string; // propertyTokenTxSignature
}

// Interface for raw transaction data from the backend
interface RawTransaction {
  _id: string;
  propertyId: string;
  tokenMintAddress: string;
  buyer: string;
  seller: string;
  tokenAmount: number;
  priceSOL: number;
  solanaTxSignature: string;
  propertyTokenTxSignature: string;
  transactionType: 'buy' | 'sell';
  status: 'success' | 'pending' | 'failed';
  createdAt: string;
}

// Interface for property data from the backend
interface Property {
  propertyId: string;
  title: string;
  location: string;
  imageURLs: string[];
}

const Transactions = () => {
  const { publicKey, connecting } = useWallet(); // Destructure 'connecting' state
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      // If not connected and not currently connecting, show error
      if (!publicKey && !connecting) {
        setError("Please connect your wallet to view transactions.");
        setLoading(false);
        return;
      }
      // If connecting, set loading and wait
      if (connecting) {
        setLoading(true);
        setError(null); // Clear any previous error
        return;
      }

      try {
        setLoading(true);
        setError(null); // Clear any previous error
        const response = await fetch(`https://tokenestate.onrender.com/api/properties/transactions/user/${publicKey!.toBase58()}`); // publicKey is guaranteed to be not null here
        if (!response.ok) {
          throw new Error("Failed to fetch transactions");
        }
        const rawTxs: RawTransaction[] = await response.json();

        // Enrich transactions with property details
        const enrichedTxs = await Promise.all(
          rawTxs.map(async (tx) => {
            try {
              const propResponse = await fetch(`https://tokenestate.onrender.com/api/properties/${tx.propertyId}`);
              let property: Property;
              if (propResponse.ok) {
                property = await propResponse.json();
              } else {
                 console.warn(`Failed to fetch details for property ${tx.propertyId}`);
                 property = { propertyId: tx.propertyId, title: `Property ID: ${tx.propertyId}`, location: 'Unknown', imageURLs: [] };
              }

              const statusMap = {
                success: 'Completed',
                pending: 'Pending',
                failed: 'Failed',
              };

              return {
                id: tx._id,
                type: tx.transactionType === 'buy' ? 'Buy' as const : 'Sell' as const,
                property: property.title,
                location: property.location,
                image: property.imageURLs?.[0] || '🏙️', // Use first image or default icon
                amount: tx.tokenAmount,
                price: tx.priceSOL,
                total: tx.tokenAmount * tx.priceSOL,
                timestamp: tx.createdAt,
                status: statusMap[tx.status] as "Completed" | "Pending" | "Failed",
                hash: tx.propertyTokenTxSignature || tx.solanaTxSignature,
              };
            } catch (propErr) {
              console.error(`Error enriching transaction ${tx._id}:`, propErr);
              // Return a default structure on error
              return {
                id: tx._id,
                type: tx.transactionType === 'buy' ? 'Buy' as const : 'Sell' as const,
                property: `Property ID: ${tx.propertyId}`,
                location: 'Error loading details',
                image: '🏙️',
                amount: tx.tokenAmount,
                price: tx.priceSOL,
                total: tx.tokenAmount * tx.priceSOL,
                timestamp: tx.createdAt,
                status: 'Failed' as const,
                hash: tx.propertyTokenTxSignature || tx.solanaTxSignature,
              };
            }
          })
        );

        setTransactions(enrichedTxs);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [publicKey, connecting]);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-secondary/20 text-secondary border-secondary/30';
      case 'Pending':
        return 'bg-accent/20 text-accent border-accent/30';
      case 'Failed':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  const totalBought = transactions
    .filter(tx => tx.type === 'Buy' && tx.status === 'Completed')
    .reduce((sum, tx) => sum + tx.total, 0);

  const totalSold = transactions
    .filter(tx => tx.type === 'Sell' && tx.status === 'Completed')
    .reduce((sum, tx) => sum + tx.total, 0);

  const netProfit = totalSold - totalBought;

  if (loading || connecting) { // Also show loading if wallet is connecting
    return (
      <div className="min-h-screen bg-background relative pt-24 pb-16 flex items-center justify-center">
        <Navbar />
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background relative pt-24 pb-16 flex items-center justify-center text-center">
        <Navbar />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12"
        >
          <h2 className="text-3xl font-bold text-destructive mb-4">Error</h2>
          <p className="text-muted-foreground mb-8 max-w-md">{error}</p>
          <Link to="/">
            <Button variant="glass-primary">Go to Home</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative pt-24 pb-16">
      <div className="fixed inset-0 parallax-bg -z-10" />
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4">
        {transactions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center flex flex-col items-center justify-center min-h-[calc(100vh-150px)]"
          >
            <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
              No Transactions Yet
            </h1>
            <p className="text-muted-foreground text-lg mb-8 max-w-md">
              It looks like you haven't made any transactions. Start your journey by exploring the marketplace!
            </p>
            <Link to="/marketplace">
              <Button variant="glass-primary" size="lg" className="px-8 py-3 text-lg">
                Go to Marketplace
              </Button>
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-4">
                Transaction History
              </h1>
              <p className="text-muted-foreground text-lg">
                Track all your real estate token transactions
              </p>
            </motion.div>
            {/* Summary Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
            >
              <Card className="glass-card p-6 text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-3 text-secondary" />
                <div className="text-2xl font-bold text-secondary mb-1">
                  {totalBought.toFixed(2)} SOL
                </div>
                <div className="text-sm text-muted-foreground">Total Bought</div>
              </Card>
              <Card className="glass-card p-6 text-center">
                <TrendingDown className="w-8 h-8 mx-auto mb-3 text-accent" />
                <div className="text-2xl font-bold text-accent mb-1">
                  {totalSold.toFixed(2)} SOL
                </div>
                <div className="text-sm text-muted-foreground">Total Sold</div>
              </Card>
              <Card className="glass-card p-6 text-center">
                <div className={`w-8 h-8 mx-auto mb-3 ${netProfit >= 0 ? 'text-secondary' : 'text-accent'}`}>
                  {netProfit >= 0 ? '📈' : '📉'}
                </div>
                <div className={`text-2xl font-bold mb-1 ${
                  netProfit >= 0 ? 'text-secondary' : 'text-accent'
                }`}>
                  {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(2)} SOL
                </div>
                <div className="text-sm text-muted-foreground">Net P&L</div>
              </Card>
            </motion.div>
            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-6 mb-8"
            >
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search transactions..."
                      className="pl-10 glass-card border-glass-border"
                    />
                  </div>
                  
                  <Select>
                    <SelectTrigger className="w-[180px] glass-card border-glass-border">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="buy">Buy</SelectItem>
                      <SelectItem value="sell">Sell</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className="w-[180px] glass-card border-glass-border">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="glass-primary" className="flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </Button>
              </div>
            </motion.div>
            {/* Transactions List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-4"
            >
              {transactions.map((transaction, index) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="glass-card p-6 hover-lift cursor-glow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Property Info */}
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center text-2xl">
                        {transaction.image === '🏙️' ? transaction.image : <img src={transaction.image} alt={transaction.property} className="w-full h-full object-cover rounded-xl" />}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-bold text-lg">{transaction.property}</h3>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getStatusColor(transaction.status)}`}
                          >
                            {transaction.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{transaction.location}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {transaction.hash ? `${transaction.hash.slice(0, 8)}...${transaction.hash.slice(-8)}` : 'N/A'}
                        </p>
                      </div>
                    </div>
                    {/* Transaction Details */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-right">
                      <div>
                        <div className="text-sm text-muted-foreground">Type</div>
                        <div className={`font-semibold ${
                          transaction.type === 'Buy' ? 'text-secondary' : 'text-accent'
                        }`}>
                          {transaction.type}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-muted-foreground">Amount</div>
                        <div className="font-semibold">{transaction.amount} tokens</div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-muted-foreground">Price</div>
                        <div className="font-semibold">{transaction.price} SOL</div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-muted-foreground">Total</div>
                        <div className="font-bold text-lg">{transaction.total} SOL</div>
                      </div>
                    </div>
                    {/* Timestamp */}
                    <div className="text-right lg:min-w-[150px]">
                      <div className="flex items-center justify-end space-x-1 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(transaction.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
            {/* Load More */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="text-center mt-12"
            >
              <Button variant="glass-primary" size="lg" className="px-8">
                Load More Transactions
              </Button>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default Transactions;
