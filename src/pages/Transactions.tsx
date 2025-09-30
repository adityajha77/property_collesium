import { motion } from "framer-motion";
import { Calendar, TrendingUp, TrendingDown, Filter, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Transactions = () => {
  const transactions = [
    {
      id: "tx-001",
      type: "Buy",
      property: "Luxury Villa Miami Beach",
      location: "Miami, Florida",
      image: "🏖️",
      amount: 150,
      price: 12.75,
      total: 1912.50,
      timestamp: "2024-01-15T10:30:00Z",
      status: "Completed",
      hash: "5K8h7j9kL3mN2pQ4rS6tU8vW1xY3zA5bC7dE9fG2hI4j",
    },
    {
      id: "tx-002",
      type: "Sell",
      property: "NYC Penthouse Suite",
      location: "Manhattan, New York",
      image: "🏙️",
      amount: 75,
      price: 8.67,
      total: 650.25,
      timestamp: "2024-01-14T15:45:00Z",
      status: "Completed",
      hash: "2A3b4C5d6E7f8G9h1I2j3K4l5M6n7O8p9Q0r1S2t3U4v",
    },
    {
      id: "tx-003",
      type: "Buy",
      property: "Tokyo Tower View Apartment",
      location: "Shibuya, Tokyo",
      image: "🗼",
      amount: 200,
      price: 2.60,
      total: 520.80,
      timestamp: "2024-01-13T09:15:00Z",
      status: "Completed",
      hash: "8V9w1X2y3Z4a5B6c7D8e9F0g1H2i3J4k5L6m7N8o9P0",
    },
    {
      id: "tx-004",
      type: "Buy",
      property: "Dubai Marina Residence",
      location: "Dubai Marina, UAE",
      image: "🏗️",
      amount: 100,
      price: 4.29,
      total: 429.20,
      timestamp: "2024-01-12T14:22:00Z",
      status: "Pending",
      hash: "6Q7r8S9t1U2v3W4x5Y6z7A8b9C0d1E2f3G4h5I6j7K8",
    },
    {
      id: "tx-005",
      type: "Sell",
      property: "London Financial District Office",
      location: "City of London, UK",
      image: "🏢",
      amount: 50,
      price: 19.60,
      total: 980.25,
      timestamp: "2024-01-11T11:30:00Z",
      status: "Completed",
      hash: "4L5m6N7o8P9q1R2s3T4u5V6w7X8y9Z0a1B2c3D4e5F6",
    },
  ];

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
                    {transaction.image}
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
                      {transaction.hash.slice(0, 8)}...{transaction.hash.slice(-8)}
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
      </div>
    </div>
  );
};

export default Transactions;