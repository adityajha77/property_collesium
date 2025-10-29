import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import BackButton from "@/components/BackButton";

interface Property {
  _id: string;
  propertyId: string;
  title: string;
  location: string;
  description: string;
  imageURLs: string[];
  priceSOL: number;
  totalTokens: number;
  tokenMintAddress: string;
  status: 'pending_verification' | 'verified' | 'tokenized' | 'bidding' | 'sold_out' | 'rejected';
  owner: string;
}

interface ActiveAuction {
  propertyId: {
    propertyId: string;
  };
}

const SelectPropertyForAuctionPage: React.FC = () => {
  const [eligibleProperties, setEligibleProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { publicKey } = useWallet();
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchEligibleProperties = useCallback(async () => {
    if (!publicKey) {
      setEligibleProperties([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/properties/owner/${publicKey.toBase58()}`);
      if (Array.isArray(response.data)) {
        // Filter properties that are 'verified' or 'tokenized' and not currently in an active auction
        const properties = response.data.filter((p: Property) =>
          p.status === 'verified' || p.status === 'tokenized'
        );
        // Further filter out properties that are already in an active auction
        // This would ideally be done on the backend or by fetching active auctions separately
        // For now, a simple client-side filter (less efficient but works)
        const activeAuctionsResponse = await axios.get<ActiveAuction[]>(`${import.meta.env.VITE_BACKEND_URL}/api/auctions`);
        const activeAuctionPropertyIds = new Set(activeAuctionsResponse.data.map((a) => a.propertyId.propertyId));

        const finalEligibleProperties = properties.filter(p => !activeAuctionPropertyIds.has(p.propertyId));

        setEligibleProperties(finalEligibleProperties);
      } else {
        console.warn('API response for owner properties is not an array:', response.data);
        setEligibleProperties([]);
      }
    } catch (err) {
      console.error('Error fetching eligible properties:', err);
      setError('Failed to fetch your eligible properties.');
      toast({
        title: 'Error',
        description: 'Failed to fetch your eligible properties.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [publicKey, toast]);

  useEffect(() => {
    fetchEligibleProperties();
  }, [fetchEligibleProperties]);

  const handleSelectProperty = (propertyId: string) => {
    navigate(`/start-auction/${propertyId}`);
  };

  if (!publicKey) {
    return (
      <div className="container mx-auto py-8 text-center relative">
        <BackButton />
        <p className="text-red-500">Please connect your wallet to select a property for auction.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 text-center relative">
        <BackButton />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading your properties...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-center text-red-500 relative">
        <BackButton />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 relative">
      <BackButton />
      <h1 className="text-4xl font-bold mb-8 text-center gradient-text">Select Property for Auction</h1>

      {eligibleProperties.length === 0 ? (
        <div className="text-center">
          <p className="text-muted-foreground mb-4">You don't have any properties eligible for auction (must be verified/tokenized and not already in an active auction).</p>
          <Link to="/create">
            <Button className="gradient-button">Create a New Property</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {eligibleProperties.map((property) => (
            <Card key={property.propertyId} className="glass-card flex flex-col">
              <CardHeader>
                <CardTitle className="text-primary">{property.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{property.location}</p>
              </CardHeader>
              <CardContent className="flex-grow">
                {property.imageURLs?.length > 0 && (
                  <img
                    src={property.imageURLs[0]}
                    alt={property.title}
                    className="w-full h-48 object-cover rounded-md mb-4"
                  />
                )}
                <p className="text-muted-foreground mb-2">
                  {property.description.substring(0, 100)}...
                </p>
                <p className="text-lg font-semibold mb-1">Price: {property.priceSOL} SOL</p>
                <p className="text-sm text-muted-foreground">Status: <span className="font-semibold capitalize">{property.status.replace('_', ' ')}</span></p>
                <Button onClick={() => handleSelectProperty(property.propertyId)} className="gradient-button w-full mt-4">
                  Select for Auction
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SelectPropertyForAuctionPage;
