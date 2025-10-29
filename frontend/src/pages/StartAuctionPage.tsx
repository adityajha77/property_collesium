import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import BackButton from "@/components/BackButton"; // Import BackButton

interface Property {
  _id: string;
  propertyId: string;
  title: string;
  location: string;
  description: string;
  priceSOL: number;
  totalTokens: number;
  imageURLs: string[];
  status: 'pending_verification' | 'verified' | 'tokenized' | 'bidding' | 'sold_out' | 'rejected';
  tokenMintAddress: string;
  owner: string;
  createdAt: string;
}

const StartAuctionPage = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const { toast } = useToast();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startPrice, setStartPrice] = useState<number>(0);
  const [auctionDuration, setAuctionDuration] = useState<number>(24); // Default 24 hours
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [auctionType, setAuctionType] = useState<'standard' | 'dutch'>('standard'); // New state for auction type

  useEffect(() => {
    const fetchProperty = async () => {
      if (!propertyId) {
        setError("Property ID is missing.");
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_API_URL}/api/properties/${propertyId}`);
        const fetchedProperty: Property = response.data;

        if (fetchedProperty.owner !== publicKey?.toBase58()) {
          setError("You are not the owner of this property.");
          setLoading(false);
          return;
        }
        // Allow 'verified' or 'tokenized' properties to start an auction
        if (fetchedProperty.status !== 'verified' && fetchedProperty.status !== 'tokenized') {
          setError("Only 'verified' or 'tokenized' properties can start an auction.");
          setLoading(false);
          return;
        }

        setProperty(fetchedProperty);
        setStartPrice(fetchedProperty.priceSOL); // Default start price to property's listed price
      } catch (err) {
        console.error("Error fetching property:", err);
        setError("Failed to fetch property details or property not found.");
      } finally {
        setLoading(false);
      }
    };

    if (publicKey) {
      fetchProperty();
    } else {
      setError("Please connect your wallet to start an auction.");
      setLoading(false);
    }
  }, [propertyId, publicKey]);

  const handleStartAuction = async () => {
    if (!property || !publicKey) {
      toast({
        title: 'Error',
        description: 'Property or wallet not loaded.',
        variant: 'destructive',
      });
      return;
    }

    if (startPrice <= 0) {
      toast({
        title: 'Invalid Price',
        description: 'Starting price must be greater than 0.',
        variant: 'destructive',
      });
      return;
    }

    if (auctionDuration <= 0) {
      toast({
        title: 'Invalid Duration',
        description: 'Auction duration must be greater than 0 hours.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_API_URL}/api/auctions`, {
        propertyId: property.propertyId,
        seller: publicKey.toBase58(),
        startPriceSOL: startPrice,
        auctionDurationSeconds: auctionDuration * 3600, // Convert hours to seconds
        auctionType: auctionType, // Include auction type
      });

      if (response.status === 201) {
        toast({
          title: 'Auction Started!',
          description: `Auction for ${property.title} has started successfully.`,
        });
        navigate('/marketplace?tab=live-bids'); // Redirect to live auctions
      }
    } catch (err: unknown) {
      console.error('Error starting auction:', err);
      let errorMessage = 'An unexpected error occurred.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      toast({
        title: 'Error Starting Auction',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background relative pt-24 pb-16 flex items-center justify-center">
        <BackButton /> {/* Add BackButton */}
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading property details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background relative pt-24 pb-16 flex items-center justify-center text-center">
        <BackButton /> {/* Add BackButton */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12"
        >
          <h2 className="text-3xl font-bold text-destructive mb-4">Error</h2>
          <p className="text-muted-foreground mb-8 max-w-md">{error}</p>
          <Button onClick={() => navigate('/portfolio')}>Return to Portfolio</Button>
        </motion.div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background relative pt-24 pb-16 flex items-center justify-center text-center">
        <BackButton /> {/* Add BackButton */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12"
        >
          <h2 className="text-3xl font-bold text-destructive mb-4">Property Not Found</h2>
          <p className="text-muted-foreground mb-8 max-w-md">The property you are trying to auction could not be found.</p>
          <Button onClick={() => navigate('/portfolio')}>Return to Portfolio</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative pt-24 pb-16">
      <div className="fixed inset-0 parallax-bg -z-10" />
      <BackButton /> {/* Add BackButton */}
      <div className="max-w-3xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
            Start Auction for {property.title}
          </h1>
          <p className="text-muted-foreground text-lg">
            Set the terms for your property's live auction.
          </p>
        </motion.div>

        {currentStep === 1 && (
          <Card className="glass-card p-6">
            <CardHeader>
              <CardTitle className="text-primary">Step 1: Confirm Property & Set Base Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <img
                  src={property.imageURLs[0]}
                  alt={property.title}
                  className="w-24 h-24 object-cover rounded-md"
                />
                <div>
                  <h3 className="text-xl font-bold">{property.title}</h3>
                  <p className="text-muted-foreground">{property.location}</p>
                  <p className="text-sm text-muted-foreground">Current Status: <span className="font-semibold text-green-400">{property.status}</span></p>
                </div>
              </div>

              <div className="grid gap-4">
                <div>
                  <Label htmlFor="startPrice">Starting Price (SOL)</Label>
                  <Input
                    id="startPrice"
                    type="number"
                    value={startPrice}
                    onChange={(e) => setStartPrice(parseFloat(e.target.value))}
                    min={0.01}
                    step="0.01"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="auctionDuration">Auction Duration (Hours)</Label>
                  <Input
                    id="auctionDuration"
                    type="number"
                    value={auctionDuration}
                    onChange={(e) => setAuctionDuration(parseInt(e.target.value))}
                    min={1}
                    step="1"
                    className="mt-1"
                  />
                </div>
              </div>

              <Button onClick={() => setCurrentStep(2)} className="w-full gradient-button">
                Next: Choose Auction Type
              </Button>
              <Button variant="outline" onClick={() => navigate('/portfolio')} className="w-full mt-2">
                Cancel
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card className="glass-card p-6">
            <CardHeader>
              <CardTitle className="text-primary">Step 2: Select Auction Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-lg mb-2 block">Which type of auction do you want to run?</Label>
                <div className="flex space-x-4">
                  <Button
                    variant={auctionType === 'standard' ? 'default' : 'outline'}
                    onClick={() => setAuctionType('standard')}
                    className="flex-1"
                  >
                    Standard Auction (Highest Bidder Wins)
                  </Button>
                  <Button
                    variant={auctionType === 'dutch' ? 'default' : 'outline'}
                    onClick={() => setAuctionType('dutch')}
                    className="flex-1"
                  >
                    Dutch Auction (Price Decreases Over Time)
                  </Button>
                </div>
              </div>

              <div className="flex justify-between space-x-4">
                <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep(3)}
                  className="flex-1 gradient-button"
                >
                  Next: Review & Confirm
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card className="glass-card p-6">
            <CardHeader>
              <CardTitle className="text-primary">Step 3: Review & Confirm Auction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p><strong>Property:</strong> {property.title}</p>
                <p><strong>Location:</strong> {property.location}</p>
                <p><strong>Starting Price:</strong> {startPrice} SOL</p>
                <p><strong>Auction Duration:</strong> {auctionDuration} Hours</p>
                <p><strong>Auction Type:</strong> {auctionType === 'standard' ? 'Standard' : 'Dutch'}</p>
              </div>

              <Button 
                onClick={handleStartAuction} 
                className="w-full gradient-button"
                disabled={isSubmitting || !publicKey || (property.status !== 'verified' && property.status !== 'tokenized')}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Placing Property to Live Auction...
                  </>
                ) : (
                  'Confirm & Place Property to Live Auction'
                )}
              </Button>
              <Button variant="outline" onClick={() => setCurrentStep(2)} className="w-full mt-2">
                Back
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StartAuctionPage;
