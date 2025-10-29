import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useWallet } from '@solana/wallet-adapter-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import io from 'socket.io-client';
import Countdown from 'react-countdown';
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
  status: 'pending_verification' | 'verified' | 'tokenized' | 'bidding' | 'sold_out' | 'rejected'; // Add status
  owner: string; // Add owner
}

interface Auction {
  _id: string;
  auctionId: string;
  propertyId: Property;
  seller: string;
  startTime: string;
  endTime: string;
  startPriceSOL: number;
  currentBidSOL: number;
  highestBidder: string | null;
  status: 'active' | 'ended' | 'cancelled';
  tokenMintAddress: string;
  auctionType: 'standard' | 'dutch';
  bids: { bidder: string; amount: number; timestamp: string }[];
}

const MyAuctionsPage: React.FC = () => {
  const [myAuctions, setMyAuctions] = useState<Auction[]>([]);
  const [myProperties, setMyProperties] = useState<Property[]>([]); // New state for user's properties
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { publicKey } = useWallet();
  const { toast } = useToast();

  const socket = useMemo(() => io('https://tokenestate.onrender.com'), []);

  const fetchMyAuctions = useCallback(async () => {
    if (!publicKey) {
      setMyAuctions([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/auctions/my-auctions/${publicKey.toBase58()}`);
      if (Array.isArray(response.data)) {
        setMyAuctions(response.data);
      } else {
        console.warn('API response for my auctions is not an array:', response.data);
        setMyAuctions([]);
      }
    } catch (err) {
      console.error('Error fetching my auctions:', err);
      setError('Failed to fetch your auctions.');
      toast({
        title: 'Error',
        description: 'Failed to fetch your auctions.',
        variant: 'destructive',
      });
    } finally {
      // setLoading(false); // Will be set to false after both fetches complete
    }
  }, [publicKey, toast]);

  const fetchMyProperties = useCallback(async () => {
    if (!publicKey) {
      setMyProperties([]);
      // setLoading(false); // Will be set to false after both fetches complete
      return;
    }
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/properties/my-properties/${publicKey.toBase58()}`);
      if (Array.isArray(response.data)) {
        setMyProperties(response.data);
      } else {
        console.warn('API response for my properties is not an array:', response.data);
        setMyProperties([]);
      }
    } catch (err) {
      console.error('Error fetching my properties:', err);
      setError('Failed to fetch your properties.');
      toast({
        title: 'Error',
        description: 'Failed to fetch your properties.',
        variant: 'destructive',
      });
    } finally {
      // setLoading(false); // Will be set to false after both fetches complete
    }
  }, [publicKey, toast]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMyAuctions(), fetchMyProperties()]);
      setLoading(false);
    };

    loadData();

    socket.on('auctionUpdate', () => {
      console.log('WebSocket auction update received');
      fetchMyAuctions();
      fetchMyProperties(); // Also refetch properties on auction update
    });

    return () => {
      socket.off('auctionUpdate');
    };
  }, [fetchMyAuctions, fetchMyProperties, socket]);

  if (!publicKey) {
    return (
      <div className="container mx-auto py-8 text-center relative">
        <BackButton />
        <p className="text-red-500">Please connect your wallet to view your auctions.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 text-center relative">
        <BackButton />
        <p>Loading your auctions...</p>
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
      <h1 className="text-4xl font-bold mb-8 text-center gradient-text">My Auctions</h1>

      <div className="flex justify-center mb-8">
        {myProperties.length === 0 ? (
          <div className="text-center">
            <p className="text-muted-foreground mb-4">You don't have any properties yet. Create one to start an auction!</p>
            <Link to="/create">
              <Button className="gradient-button">Create a Property</Button>
            </Link>
          </div>
        ) : (
          <div className="text-center">
            {myAuctions.length === 0 && (
              <p className="text-muted-foreground mb-4">You have properties! Create your first auction.</p>
            )}
            <Link to="/select-property-for-auction"> {/* New route for property selection */}
              <Button className="gradient-button">Create New Auction</Button>
            </Link>
          </div>
        )}
      </div>

      {myAuctions.length === 0 ? (
        myProperties.length > 0 && (
          <p className="text-center text-muted-foreground mt-8">No active auctions found for your properties.</p>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myAuctions.map((auction) => (
            <Card key={auction.auctionId} className="glass-card flex flex-col">
              <CardHeader>
                <CardTitle className="text-primary">{auction.propertyId.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{auction.propertyId.location}</p>
                <p className="text-xs text-muted-foreground">Type: <span className="font-semibold capitalize">{auction.auctionType} Auction</span></p>
              </CardHeader>
              <CardContent className="flex-grow">
                {auction.propertyId.imageURLs?.length > 0 && (
                  <img
                    src={auction.propertyId.imageURLs[0]}
                    alt={auction.propertyId.title}
                    className="w-full h-48 object-cover rounded-md mb-4"
                  />
                )}
                <p className="text-muted-foreground mb-2">
                  {auction.propertyId.description.substring(0, 100)}...
                </p>
                <p className="text-lg font-semibold mb-1">Starting Bid: {auction.startPriceSOL} SOL</p>
                <p className="text-xl font-bold text-green-500 mb-4">Current Bid: {auction.currentBidSOL} SOL</p>
                {auction.highestBidder && (
                  <p className="text-sm text-muted-foreground mb-4">
                    Highest Bidder: {auction.highestBidder.substring(0, 6)}...
                    {auction.highestBidder.substring(auction.highestBidder.length - 6)}
                  </p>
                )}
                <div className="text-sm text-muted-foreground mb-4">
                  Ends in:{' '}
                  <Countdown
                    date={new Date(auction.endTime)}
                    renderer={({ hours, minutes, seconds, completed }) =>
                      completed ? (
                        <span className="text-red-500 font-semibold">Auction Ended!</span>
                      ) : (
                        <span className="font-semibold">
                          {hours}h {minutes}m {seconds}s
                        </span>
                      )
                    }
                  />
                </div>
                <div className="flex items-center space-x-2 mt-4">
                  <Link to={`/auction/${auction.auctionId}`}>
                    <Button variant="outline" className="w-full">
                      View Auction Details
                    </Button>
                  </Link>
                </div>
                <Link to={`/property/${auction.propertyId.propertyId}`}>
                  <Button variant="outline" className="w-full mt-2">
                    View Property Details
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyAuctionsPage;
