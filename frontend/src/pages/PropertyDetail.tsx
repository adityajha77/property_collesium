import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, Share2, MapPin, Building, Calendar, Clock, ShieldCheck, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input"; // Import Input component
import { useToast } from "@/components/ui/use-toast"; // Import useToast hook
import { useWallet, useConnection } from "@solana/wallet-adapter-react"; // Import useWallet and useConnection hooks
import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js"; // Import Solana web3 components
import BackButton from "@/components/BackButton"; // Import BackButton

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokensToBuy, setTokensToBuy] = useState(1); // State for tokens to buy
  const [isBuying, setIsBuying] = useState(false); // State for loading during purchase
  const [backendWalletPublicKey, setBackendWalletPublicKey] = useState(null); // State for backend wallet public key
  const { toast } = useToast(); // Initialize toast
  const { publicKey, sendTransaction, connected } = useWallet(); // Solana wallet hook
  const { connection } = useConnection(); // Use the connection from the WalletProvider

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch backend wallet public key first (direct call to backend port 5000)
        const backendWalletRes = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/properties/backend-wallet-public-key`);
        if (!backendWalletRes.ok) {
          throw new Error('Failed to fetch backend wallet public key');
        }
        const backendWalletData = await backendWalletRes.json();
        setBackendWalletPublicKey(new PublicKey(backendWalletData.publicKey));

        // Then fetch property details (direct call to backend port 5000)
        const propertyRes = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/properties/${id}`);
        if (!propertyRes.ok) {
          throw new Error('Property not found');
        }
        const propertyData = await propertyRes.json();
        setProperty(propertyData);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background relative pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4">
          <Skeleton className="h-8 w-24 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Skeleton className="h-96 w-full" />
              <Skeleton className="h-12 w-1/2" />
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center">
        <div>
          <h2 className="text-3xl font-bold text-destructive mb-4">Property Not Found</h2>
          <p className="text-muted-foreground mb-8">{error}</p>
          <Button onClick={() => navigate('/marketplace')}>Back to Marketplace</Button>
        </div>
      </div>
    );
  }

  if (property.status === 'pending_verification') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12"
        >
          <Clock className="w-16 h-16 mx-auto mb-6 text-primary" />
          <h2 className="text-3xl font-bold mb-4">Under Verification</h2>
          <p className="text-muted-foreground mb-8 max-w-md">
            This property is currently undergoing our verification process to ensure its authenticity and quality.
            Please check back soon!
          </p>
          <Button onClick={() => navigate('/marketplace')}>Back to Marketplace</Button>
        </motion.div>
      </div>
    );
  }

  if (property.status === 'rejected') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12"
        >
          <ShieldX className="w-16 h-16 mx-auto mb-6 text-destructive" />
          <h2 className="text-3xl font-bold text-destructive mb-4">Property Rejected</h2>
          <p className="text-muted-foreground mb-8 max-w-md">
            This property did not meet our listing criteria and has been rejected.
          </p>
          <Button onClick={() => navigate('/marketplace')}>Back to Marketplace</Button>
        </motion.div>
      </div>
    );
  }

  const handleBuyTokens = async () => {
    if (!publicKey || !connected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your Solana wallet to buy tokens.",
        variant: "destructive",
      });
      return;
    }

    if (!property || !property.tokenMintAddress) {
      toast({
        title: "Error",
        description: "Property or token information is missing.",
        variant: "destructive",
      });
      return;
    }

    if (!backendWalletPublicKey) {
      toast({
        title: "Error",
        description: "Backend wallet public key not loaded. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsBuying(true);
    try {
      const tokenPrice = property.priceSOL / property.totalTokens;
      const totalSOLCost = tokensToBuy * tokenPrice;
      const lamports = Math.round(totalSOLCost * 1_000_000_000); // Ensure lamports is an integer

      // Get the latest blockhash first
      const { blockhash } = await connection.getLatestBlockhash({ commitment: 'finalized' });

      // 1. Create the transaction with the blockhash and fee payer
      const transaction = new Transaction({
        feePayer: publicKey,
        recentBlockhash: blockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: backendWalletPublicKey, // Use the dynamically fetched public key
          lamports: lamports, // Use the rounded value
        })
      );

      // 2. Send the transaction for the user to approve
      console.log("Sending transaction...");
      const signature = await sendTransaction(transaction, connection);
      console.log("Transaction sent, signature:", signature);

      toast({
        title: "SOL Payment Sent",
        description: `Transaction signature: ${signature}. Waiting for confirmation...`,
      });

      // Wait for the transaction to be finalized on the frontend as well
      await connection.confirmTransaction(signature, "finalized");
      console.log("Transaction confirmed as finalized:", signature);

      toast({
        title: "SOL Payment Successful",
        description: `Transaction finalized: ${signature}`,
      });

      // 3. Call backend API to transfer property tokens to the user (direct call to backend port 5000)
      const backendRes = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/properties/${property.propertyId}/buy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buyerPublicKey: publicKey.toBase58(),
          tokensToBuy: tokensToBuy,
          solanaTxSignature: signature, // Pass the SOL payment transaction signature
        }),
      });

      if (!backendRes.ok) {
        const errorData = await backendRes.json();
        throw new Error(errorData.message || "Failed to complete token purchase on backend.");
      }

      const backendData = await backendRes.json();
      toast({
        title: "Token Purchase Successful",
        description: `You have successfully bought ${tokensToBuy} tokens. Transaction ID: ${backendData.transactionId}`,
      });

      // Optionally, refresh property data or navigate to portfolio
      // navigate('/portfolio');

    } catch (err) {
      console.error("Error buying tokens:", err);
      toast({
        title: "Token Purchase Failed",
        description: err.message || "An unexpected error occurred during purchase.",
        variant: "destructive",
      });
    } finally {
      setIsBuying(false);
    }
  };

  // Mock data for now
  const transactions = []; 
  const soldPercentage = 0;

  return (
    <div className="min-h-screen bg-background relative pt-24 pb-16">
      <div className="fixed inset-0 parallax-bg -z-10" />
      
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <BackButton /> {/* Replaced existing back button with custom BackButton */}
          
          <div className="flex items-center space-x-2">
            <Button variant="glass" size="icon">
              <Heart className="w-4 h-4" />
            </Button>
            <Button variant="glass" size="icon">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8"
            >
              {/* Property Images */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {property.imageURLs.map((img, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    className="aspect-square bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center text-4xl cursor-pointer hover:shadow-glow-primary transition-all"
                  >
                    <img src={img} alt={`Property image ${index + 1}`} className="w-full h-full object-cover rounded-xl" />
                  </motion.div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">
                      {property.title}
                    </h1>
                    <div className="flex items-center text-muted-foreground mb-4">
                      <MapPin className="w-5 h-5 mr-2" />
                      {property.location}
                    </div>
                  </div>
                  
                  {property.status === 'tokenized' && (
                    <div className="flex items-center px-3 py-1 bg-secondary/90 backdrop-blur-sm rounded-full text-sm font-medium text-secondary-foreground">
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Tokenized
                    </div>
                  )}
                </div>

                <p className="text-lg text-muted-foreground leading-relaxed">
                  {property.description}
                </p>

                {/* Property Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                  <div className="text-center">
                    <Building className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="text-lg font-bold">{property.propertyDetails.sqft}</div>
                    <div className="text-sm text-muted-foreground">Sq Ft</div>
                  </div>
                  <div className="text-center">
                    <Calendar className="w-6 h-6 mx-auto mb-2 text-secondary" />
                    <div className="text-lg font-bold">{property.propertyDetails.yearBuilt}</div>
                    <div className="text-sm text-muted-foreground">Year Built</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-2">🛏️</div>
                    <div className="text-lg font-bold">{property.propertyDetails.bedrooms}</div>
                    <div className="text-sm text-muted-foreground">Bedrooms</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-2">🚿</div>
                    <div className="text-lg font-bold">{property.propertyDetails.bathrooms}</div>
                    <div className="text-sm text-muted-foreground">Bathrooms</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Tabs defaultValue="transactions" className="space-y-6">
                <TabsList className="glass-card p-1">
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="transactions" className="space-y-4">
                  {transactions.length > 0 ? transactions.map((tx, index) => (
                    <Card key={index} className="glass-card p-4">
                      {/* ... transaction item ... */}
                    </Card>
                  )) : (
                    <Card className="glass-card p-6 text-center">
                      <p className="text-muted-foreground">No transactions yet.</p>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="analytics">
                  <Card className="glass-card p-6">
                    <h3 className="text-xl font-bold mb-4">Performance Analytics</h3>
                    <div className="h-64 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-2">📈</div>
                        <div className="text-muted-foreground">Price Chart Coming Soon</div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trading Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="glass-card p-6 sticky top-28">
                <div className="space-y-6">
                  {/* Price Info */}
                  <div className="text-center">
                    <div className="text-3xl font-bold text-secondary mb-2">
                      {property.priceSOL / property.totalTokens} SOL
                    </div>
                    <div className="text-sm text-muted-foreground">per token</div>
                  </div>

                  {/* Key Metrics */}
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Market Cap</span>
                      <span className="font-semibold">{property.priceSOL} SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Tokens</span>
                      <span className="font-semibold">{property.totalTokens}</span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tokenization Progress</span>
                      <span className="font-semibold">{soldPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={soldPercentage} className="h-3" />
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        placeholder="Tokens"
                        value={tokensToBuy}
                        onChange={(e) => setTokensToBuy(Math.max(1, parseInt(e.target.value) || 1))}
                        min="1"
                        className="w-full"
                      />
                      <Button
                        variant="neon"
                        className="w-full"
                        onClick={handleBuyTokens}
                        disabled={!connected || isBuying || tokensToBuy <= 0}
                      >
                        {isBuying ? "Buying..." : "Buy Tokens"}
                      </Button>
                    </div>
                    <Button variant="glass-primary" className="w-full">
                      Add to Watchlist
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;
