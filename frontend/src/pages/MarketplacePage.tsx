import { useState, useEffect, useCallback } from "react";
import PropertyGrid from "@/components/PropertyGrid";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { ChevronDown, Search, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components
import io from 'socket.io-client'; // Import socket.io-client
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
  // Optional fields for auction properties, as PropertyGrid expects them
  auctionId?: string;
  endTime?: string;
  currentBidSOL?: number;
}

// Interface matching the backend Auction model
interface Auction {
  _id: string;
  auctionId: string;
  propertyId: Property; // Populate with Property object
  seller: string;
  startTime: string;
  endTime: string;
  startPriceSOL: number;
  currentBidSOL: number;
  highestBidder: string | null;
  status: 'active' | 'ended' | 'cancelled';
  tokenMintAddress: string;
  auctionAccountPublicKey: string; // On-chain auction account
  createdAt: string;
  updatedAt: string;
}

const socket = io('https://tokenestate.onrender.com'); // Connect to your backend socket.io server

const MarketplacePage = () => {
  const [activeTab, setActiveTab] = useState("verified"); // State for active tab
  const [verifiedProperties, setVerifiedProperties] = useState<Property[]>([]);
  const [liveAuctions, setLiveAuctions] = useState<Auction[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]); // For 'All Properties' tab
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Filter states
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [priceRangeFilter, setPriceRangeFilter] = useState<[number, number]>([0, 1000]);
  const [tokensRangeFilter, setTokensRangeFilter] = useState<[number, number]>([0, 10000]);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>("all");

  // Sort states
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Debounce for search input
  const [debouncedLocationFilter, setDebouncedLocationFilter] = useState<string>("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedLocationFilter(locationFilter);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [locationFilter]);

  const fetchProperties = useCallback(async (status?: string) => {
    setLoading(true);
    setError(null);
    try {
      let url = "https://tokenestate.onrender.com/api/properties?";
      const params = new URLSearchParams();

      if (status) {
        params.append('status', status); // Add status filter
      }

      if (debouncedLocationFilter) params.append("location", debouncedLocationFilter);
      params.append("minPrice", priceRangeFilter[0].toString());
      params.append("maxPrice", priceRangeFilter[1].toString());
      params.append("minTokens", tokensRangeFilter[0].toString());
      params.append("maxTokens", tokensRangeFilter[1].toString());
      if (propertyTypeFilter !== "all") params.append("propertyType", propertyTypeFilter);
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);

      url += params.toString();

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch properties");
      }
      const data: Property[] = await response.json();
      return data;
    } catch (err) {
      setError((err as Error).message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [debouncedLocationFilter, priceRangeFilter, tokensRangeFilter, propertyTypeFilter, sortBy, sortOrder]);

  const fetchLiveAuctions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("https://tokenestate.onrender.com/api/auctions");
      if (!response.ok) {
        throw new Error("Failed to fetch live auctions");
      }
      const data: Auction[] = await response.json();
      setLiveAuctions(data);
    } catch (err) {
      setError((err as Error).message);
      setLiveAuctions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "verified") {
      fetchProperties('verified').then(setVerifiedProperties);
    } else if (activeTab === "live-bids") {
      fetchLiveAuctions();
    } else if (activeTab === "all-properties") {
      // For 'All Properties', we might fetch all statuses or a combination
      // For now, let's fetch 'tokenized' and 'bidding' properties
      Promise.all([
        fetchProperties('tokenized'),
        fetchProperties('bidding')
      ]).then(([tokenized, bidding]) => {
        setAllProperties([...tokenized, ...bidding]);
      });
    }
  }, [activeTab, fetchProperties, fetchLiveAuctions]);

  // WebSocket effect
  useEffect(() => {
    socket.on('auctionUpdate', (data) => {
      console.log('WebSocket auction update:', data);
      // Re-fetch data for relevant tabs when an update occurs
      if (data.type === 'auctionStarted' || data.type === 'bidPlaced' || data.type === 'auctionEnded') {
        if (activeTab === 'live-bids') {
          fetchLiveAuctions();
        }
        if (activeTab === 'verified' && (data.propertyStatus === 'verified' || data.propertyStatus === 'bidding')) {
          fetchProperties('verified').then(setVerifiedProperties);
        }
        if (activeTab === 'all-properties') {
          Promise.all([
            fetchProperties('tokenized'),
            fetchProperties('bidding')
          ]).then(([tokenized, bidding]) => {
            setAllProperties([...tokenized, ...bidding]);
          });
        }
      }
    });

    return () => {
      socket.off('auctionUpdate');
    };
  }, [activeTab, fetchProperties, fetchLiveAuctions]);

  const handleBuyTokensFromGrid = useCallback((propertyId: string) => {
    navigate(`/property/${propertyId}?action=buy`);
  }, [navigate]);

  const handleClearFilters = useCallback(() => {
    setLocationFilter("");
    setPriceRangeFilter([0, 1000]);
    setTokensRangeFilter([0, 10000]);
    setPropertyTypeFilter("all");
    setSortBy("createdAt");
    setSortOrder("desc");
  }, []);

  return (
    <div className="min-h-screen bg-background relative pt-24 pb-16">
      <div className="fixed inset-0 parallax-bg -z-10" />
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-bold gradient-text mb-6">
            Property Marketplace
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Discover premium tokenized real estate from around the world. 
            Buy fractional ownership and start earning today.
          </p>
        </motion.div>

        {/* Filter and Sort Controls */}
        <div className="glass-card p-6 mb-12 flex flex-wrap items-center justify-between gap-4">
          {/* Location Filter */}
          <div className="flex-1 min-w-[180px] max-w-xs">
            <Label htmlFor="location-filter" className="sr-only">Location</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="location-filter"
                placeholder="Search by location..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="pl-9 pr-8"
              />
              {locationFilter && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setLocationFilter("")}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Property Type Filter */}
          <div className="flex-1 min-w-[150px] max-w-[200px]">
            <Label htmlFor="property-type-filter" className="sr-only">Property Type</Label>
            <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
              <SelectTrigger id="property-type-filter" className="w-full">
                <SelectValue placeholder="Property Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="condo">Condo</SelectItem>
                <SelectItem value="land">Land</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex-1 min-w-[150px] max-w-[200px] justify-between">
                Price: {priceRangeFilter[0]} - {priceRangeFilter[1]} SOL
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Price Range (SOL)</h4>
                  <p className="text-sm text-muted-foreground">
                    Set the desired price range.
                  </p>
                </div>
                <Slider
                  min={0}
                  max={5000}
                  step={10}
                  value={priceRangeFilter}
                  onValueChange={(value: [number, number]) => setPriceRangeFilter(value)}
                  className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                />
                <div className="flex justify-between text-sm">
                  <span>{priceRangeFilter[0]} SOL</span>
                  <span>{priceRangeFilter[1]} SOL</span>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Tokens Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex-1 min-w-[150px] max-w-[200px] justify-between">
                Tokens: {tokensRangeFilter[0]} - {tokensRangeFilter[1]}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Tokens Available</h4>
                  <p className="text-sm text-muted-foreground">
                    Set the desired token range.
                  </p>
                </div>
                <Slider
                  min={0}
                  max={50000}
                  step={100}
                  value={tokensRangeFilter}
                  onValueChange={(value: [number, number]) => setTokensRangeFilter(value)}
                  className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                />
                <div className="flex justify-between text-sm">
                  <span>{tokensRangeFilter[0]}</span>
                  <span>{tokensRangeFilter[1]}</span>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Sort By */}
          <div className="flex-1 min-w-[150px] max-w-[200px]">
            <Label htmlFor="sort-by" className="sr-only">Sort By</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger id="sort-by" className="w-full">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Newest</SelectItem>
                <SelectItem value="priceSOL">Price</SelectItem>
                <SelectItem value="totalTokens">Tokens Available</SelectItem>
                <SelectItem value="location">Location</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <div className="flex-1 min-w-[100px] max-w-[120px]">
            <Label htmlFor="sort-order" className="sr-only">Sort Order</Label>
            <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => setSortOrder(value)}>
              <SelectTrigger id="sort-order" className="w-full">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          <Button variant="ghost" onClick={handleClearFilters} className="flex items-center gap-1">
            <XCircle className="h-4 w-4" />
            Clear Filters
          </Button>
        </div>

        {/* Tabs for Marketplace */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="verified">Verified Properties</TabsTrigger>
            <TabsTrigger value="live-bids">Live Auctions</TabsTrigger>
            <TabsTrigger value="all-properties">All Properties</TabsTrigger>
          </TabsList>

          <TabsContent value="verified">
            {loading && activeTab === "verified" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="glass-card p-6 space-y-4">
                    <Skeleton className="h-48 w-full rounded-xl" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex justify-between">
                      <Skeleton className="h-8 w-1/3" />
                      <Skeleton className="h-8 w-1/4" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                    <div className="flex space-x-2 pt-4">
                      <Skeleton className="h-10 w-1/2" />
                      <Skeleton className="h-10 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error && activeTab === "verified" ? (
              <section className="py-10 px-4 text-center">
                <h2 className="text-2xl text-destructive">{error}</h2>
              </section>
            ) : verifiedProperties.length > 0 ? (
              <PropertyGrid properties={verifiedProperties} onBuyTokens={handleBuyTokensFromGrid} />
            ) : (
              <Card className="glass-card p-8 text-center">
                <h3 className="text-xl font-bold mb-4">No Verified Properties</h3>
                <p className="text-muted-foreground mb-6">
                  Check back later for new verified properties.
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="live-bids">
            {loading && activeTab === "live-bids" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="glass-card p-6 space-y-4">
                    <Skeleton className="h-48 w-full rounded-xl" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex justify-between">
                      <Skeleton className="h-8 w-1/3" />
                      <Skeleton className="h-8 w-1/4" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                    <div className="flex space-x-2 pt-4">
                      <Skeleton className="h-10 w-1/2" />
                      <Skeleton className="h-10 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error && activeTab === "live-bids" ? (
              <section className="py-10 px-4 text-center">
                <h2 className="text-2xl text-destructive">{error}</h2>
              </section>
            ) : liveAuctions.length > 0 ? (
              <PropertyGrid properties={liveAuctions.map(auction => ({
                ...auction.propertyId, // Spread property details
                status: 'bidding', // Override status for display
                priceSOL: auction.currentBidSOL, // Use currentBidSOL as price for display in PropertyGrid
                endTime: auction.endTime, // Add end time for countdown
                auctionId: auction.auctionId, // Add auction ID for linking
              }))} onBuyTokens={handleBuyTokensFromGrid} />
            ) : (
              <Card className="glass-card p-8 text-center">
                <h3 className="text-xl font-bold mb-4">No Live Auctions</h3>
                <p className="text-muted-foreground mb-6">
                  Check back later for new live property auctions.
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="all-properties">
            {loading && activeTab === "all-properties" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="glass-card p-6 space-y-4">
                    <Skeleton className="h-48 w-full rounded-xl" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex justify-between">
                      <Skeleton className="h-8 w-1/3" />
                      <Skeleton className="h-8 w-1/4" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                    <div className="flex space-x-2 pt-4">
                      <Skeleton className="h-10 w-1/2" />
                      <Skeleton className="h-10 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error && activeTab === "all-properties" ? (
              <section className="py-10 px-4 text-center">
                <h2 className="text-2xl text-destructive">{error}</h2>
              </section>
            ) : allProperties.length > 0 ? (
              <PropertyGrid properties={allProperties} onBuyTokens={handleBuyTokensFromGrid} />
            ) : (
              <Card className="glass-card p-8 text-center">
                <h3 className="text-xl font-bold mb-4">No Properties Available</h3>
                <p className="text-muted-foreground mb-6">
                  Check back later for new properties.
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MarketplacePage;
