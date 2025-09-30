import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, MapPin, TrendingUp, Users, Eye, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

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

interface PropertyGridProps {
  properties?: Property[]; // Make properties prop optional
}

const PropertyGrid = ({ properties: propProperties }: PropertyGridProps) => {
  const [internalProperties, setInternalProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (propProperties) {
      setInternalProperties(propProperties);
      setLoading(false);
      return;
    }

    const fetchProperties = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/properties");
        if (!response.ok) {
          throw new Error("Failed to fetch properties");
        }
        const data: Property[] = await response.json();
        setInternalProperties(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [propProperties]);

  const toggleFavorite = (propertyId: string) => {
    setFavorites(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const viewProperty = (propertyId: string) => {
    navigate(`/property/${propertyId}`);
  };

  // Placeholder for sold percentage - needs real data from transactions
  const soldPercentage = (sold: number, total: number) => (sold / total) * 100;

  if (loading) {
    return (
      <section id="marketplace" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Skeleton className="h-16 w-3/4 mx-auto mb-6" />
            <Skeleton className="h-6 w-1/2 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
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
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="marketplace" className="py-20 px-4 text-center">
        <h2 className="text-2xl text-destructive">{error}</h2>
      </section>
    );
  }

  const propertiesToRender = propProperties || internalProperties;

  return (
    <section id="marketplace" className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        {!propProperties && ( // Only show marketplace header if not used as a prop
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
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {propertiesToRender.map((property, index) => (
            <motion.div
              key={property.propertyId}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="glass-card p-6 hover-lift group"
            >
              {/* Property Image */}
              <div className="relative mb-6">
                <img
                  src={property.imageURLs[0]}
                  alt={property.title}
                  className="w-full h-48 object-cover bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl mb-4"
                />
                
                {/* Favorite button */}
                <Button
                  variant="glass"
                  size="icon"
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => toggleFavorite(property.propertyId)}
                >
                  <Heart 
                    className={`w-4 h-4 ${
                      favorites.includes(property.propertyId) 
                        ? "fill-accent text-accent" 
                        : "text-muted-foreground"
                    }`} 
                  />
                </Button>

                {/* Status badge */}
                {property.status === 'tokenized' && (
                  <div className="absolute top-4 left-4 px-2 py-1 bg-secondary/90 backdrop-blur-sm rounded-full text-xs font-medium text-secondary-foreground">
                    ✓ Tokenized
                  </div>
                )}
                {property.status === 'pending_verification' && (
                  <div className="absolute top-4 left-4 px-2 py-1 bg-primary/90 backdrop-blur-sm rounded-full text-xs font-medium text-primary-foreground">
                    ⏳ Under Verification
                  </div>
                )}
                {property.status === 'rejected' && (
                  <div className="absolute top-4 left-4 px-2 py-1 bg-destructive/90 backdrop-blur-sm rounded-full text-xs font-medium text-destructive-foreground">
                    ❌ Rejected
                  </div>
                )}
              </div>

              {/* Property Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold mb-2 group-hover:gradient-text transition-all">
                    {property.title}
                  </h3>
                  <div className="flex items-center text-muted-foreground text-sm">
                    <MapPin className="w-4 h-4 mr-1" />
                    {property.location}
                  </div>
                </div>

                {/* Price and ROI */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-secondary">
                      {property.priceSOL} SOL
                    </div>
                    <div className="text-sm text-muted-foreground">Total Value</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-accent font-semibold">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      {/* ROI needs to be calculated or stored */}
                      10% ROI
                    </div>
                    <div className="text-sm text-muted-foreground">Est. Annual</div>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {/* Sold tokens need to be tracked */}
                      {property.status === 'tokenized' ? `0 / ${property.totalTokens.toLocaleString()} tokens` : 'N/A'}
                    </span>
                    <span className="font-semibold">
                      {property.status === 'tokenized' ? soldPercentage(0, property.totalTokens).toFixed(1) + '% sold' : 'N/A'}
                    </span>
                  </div>
                  <Progress 
                    value={property.status === 'tokenized' ? soldPercentage(0, property.totalTokens) : 0} 
                    className="h-2"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex space-x-2 pt-4">
                  <Button variant="glass" className="flex-1 flex items-center justify-center space-x-2" onClick={() => viewProperty(property.propertyId)}>
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </Button>
                  <Button 
                    variant="neon-secondary" 
                    className="flex-1 flex items-center justify-center space-x-2"
                    disabled={property.status !== 'tokenized'}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Buy Tokens</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Load more button */}
        {!propProperties && ( // Only show load more button if not used as a prop
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Button variant="glass-primary" size="lg" className="px-8">
              Load More Properties
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default PropertyGrid;
