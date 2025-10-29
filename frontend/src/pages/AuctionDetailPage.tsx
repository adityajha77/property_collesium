import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import io from 'socket.io-client';
import Countdown from 'react-countdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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

const AuctionDetailPage = () => {
  const { auctionId } = useParams<{ auctionId: string }>();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);
  const [backendWalletPublicKey, setBackendWalletPublicKey] = useState<PublicKey | null>(null);
  const { publicKey, sendTransaction } = useWallet();
  const { toast } = useToast();

  const socket = useMemo(() => io(import.meta.env.VITE_BACKEND_API_URL), []);

  const fetchAuction = useCallback(async () => {
    if (!auctionId) return;
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_API_URL}/api/auctions/${auctionId}`);
      setAuction(response.data);
      setBidAmount(response.data.currentBidSOL + 0.01); // Initialize bid amount
    } catch (err) {
      console.error('Error fetching auction:', err);
      setError('Failed to fetch auction details.');
      toast({
        title: 'Error',
        description: 'Failed to fetch auction details.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [auctionId, toast]);

  useEffect(() => {
    const fetchBackendPublicKey = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_API_URL}/api/properties/backend-wallet-public-key`);
        setBackendWalletPublicKey(new PublicKey(response.data.publicKey));
      } catch (err) {
        console.error('Error fetching backend wallet public key:', err);
        toast({
          title: 'Error',
          description: 'Failed to load backend wallet public key.',
          variant: 'destructive',
        });
      }
    };

    fetchBackendPublicKey();
    fetchAuction();

    socket.on('auctionUpdate', (updatedAuctionId: string) => {
      if (updatedAuctionId === auctionId) {
        console.log(`WebSocket auction update received for auction ${auctionId}`);
        fetchAuction();
      }
    });

    return () => {
      socket.off('auctionUpdate');
    };
  }, [fetchAuction, socket, toast, auctionId]);

  const openBidModal = () => {
    setIsBidModalOpen(true);
  };

  const closeBidModal = () => {
    setIsBidModalOpen(false);
  };

  const handleBidAmountChange = (value: string) => {
    setBidAmount(parseFloat(value));
  };

  const handlePlaceBid = async () => {
    if (!publicKey) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your Solana wallet to place a bid.',
        variant: 'destructive',
      });
      return;
    }

    if (!backendWalletPublicKey) {
      toast({
        title: 'Error',
        description: 'Backend wallet public key not loaded. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    if (!auction || bidAmount <= auction.currentBidSOL) {
      toast({
        title: 'Invalid Bid',
        description: `Your bid must be higher than the current bid of ${auction?.currentBidSOL || 0} SOL.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const connection = new Connection(import.meta.env.VITE_SOLANA_RPC_URL, 'confirmed');

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: backendWalletPublicKey,
          lamports: bidAmount * LAMPORTS_PER_SOL,
        })
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'finalized');

      toast({
        title: 'Transaction Sent',
        description: `SOL transfer transaction sent: ${signature}`,
      });

      await axios.post(`${import.meta.env.VITE_BACKEND_API_URL}/api/auctions/${auction.auctionId}/bid`, {
        bidderPublicKey: publicKey.toBase58(),
        bidAmountSOL: bidAmount,
        solanaTxSignature: signature,
      });

      toast({
        title: 'Bid Placed!',
        description: `Your bid of ${bidAmount} SOL was placed successfully.`,
      });

      toast({
        title: 'Congratulations!',
        description: 'Your bid has been successfully processed.',
      });

      fetchAuction();
      closeBidModal();
    } catch (err: unknown) {
      console.error('Error placing bid:', err);
      let errorMessage = 'An unexpected error occurred.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      toast({
        title: 'Error Placing Bid',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 text-center relative">
        <BackButton />
        <p>Loading auction details...</p>
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

  if (!auction) {
    return (
      <div className="container mx-auto py-8 text-center relative">
        <BackButton />
        <p>Auction not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 relative">
      <BackButton />
      <h1 className="text-4xl font-bold mb-8 text-center gradient-text">{auction.propertyId.title} Auction</h1>
      <Card className="glass-card mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle className="text-primary">{auction.propertyId.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{auction.propertyId.location}</p>
          <p className="text-xs text-muted-foreground">Type: <span className="font-semibold capitalize">{auction.auctionType} Auction</span></p>
        </CardHeader>
        <CardContent>
          {auction.propertyId.imageURLs?.length > 0 && (
            <img
              src={auction.propertyId.imageURLs[0]}
              alt={auction.propertyId.title}
              className="w-full h-64 object-cover rounded-md mb-4"
            />
          )}
          <p className="text-muted-foreground mb-4">{auction.propertyId.description}</p>
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
            <Button onClick={openBidModal} className="gradient-button w-full">
              Place Bid
            </Button>
          </div>
          <Link to={`/property/${auction.propertyId.propertyId}`}>
            <Button variant="outline" className="w-full mt-2">
              View Property Details
            </Button>
          </Link>
          <div className="mt-6 pt-4 border-t border-muted-foreground/20">
            <h3 className="text-lg font-semibold mb-2">Bid History / Leaderboard</h3>
            {auction.bids && auction.bids.length > 0 ? (
              <div className="space-y-1">
                {auction.bids
                  .sort((a, b) => b.amount - a.amount)
                  .map((bid, index) => (
                    <p key={index} className="text-muted-foreground text-sm">
                      <span className="font-semibold">#{index + 1}</span>{' '}
                      {bid.bidder.substring(0, 6)}...
                      {bid.bidder.substring(bid.bidder.length - 6)}:{' '}
                      <span className="font-bold">{bid.amount} SOL</span>
                    </p>
                  ))}
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">
                <p>No bids yet. Be the first!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {auction && (
        <Dialog open={isBidModalOpen} onOpenChange={setIsBidModalOpen}>
          <DialogContent className="sm:max-w-[425px] glass-card">
            <DialogHeader>
              <DialogTitle>Place Bid on {auction.propertyId.title}</DialogTitle>
              <DialogDescription>
                Current Bid:{' '}
                <span className="font-bold text-green-500">{auction.currentBidSOL} SOL</span>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bidAmount" className="text-right">
                  Your Bid
                </Label>
                <Input
                  id="bidAmount"
                  type="number"
                  value={bidAmount}
                  onChange={(e) => handleBidAmountChange(e.target.value)}
                  min={auction.currentBidSOL + 0.01}
                  step="0.01"
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeBidModal}>
                Cancel
              </Button>
              <Button onClick={handlePlaceBid} className="gradient-button">
                Confirm Bid
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AuctionDetailPage;
