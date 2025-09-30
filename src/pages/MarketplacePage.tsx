import { useState, useEffect } from "react";
import PropertyGrid from "@/components/PropertyGrid";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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

const MarketplacePage = () => {
  const [upcomingProperties, setUpcomingProperties] = useState<Property[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [errorUpcoming, setErrorUpcoming] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUpcomingProperties = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/properties/upcoming");
        if (!response.ok) {
          throw new Error("Failed to fetch upcoming properties");
        }
        const data: Property[] = await response.json();
        setUpcomingProperties(data);
      } catch (err) {
        setErrorUpcoming((err as Error).message);
      } finally {
        setLoadingUpcoming(false);
      }
    };

    fetchUpcomingProperties();
  }, []);

  return (
    <div className="min-h-screen bg-background relative pt-24 pb-16">
      <div className="fixed inset-0 parallax-bg -z-10" />
      
      <div className="max-w-7xl mx-auto px-4">
        {/* Main Marketplace Properties (Tokenized) */}
        <PropertyGrid />

        {/* Upcoming Properties Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-20 mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-bold gradient-text mb-6">
            Upcoming Properties
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Be the first to know about properties currently under verification.
          </p>
        </motion.div>

        {loadingUpcoming ? (
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
        ) : errorUpcoming ? (
          <section className="py-10 px-4 text-center">
            <h2 className="text-2xl text-destructive">{errorUpcoming}</h2>
          </section>
        ) : upcomingProperties.length > 0 ? (
          <PropertyGrid properties={upcomingProperties} />
        ) : (
          <Card className="glass-card p-8 text-center">
            <h3 className="text-xl font-bold mb-4">No Upcoming Properties</h3>
            <p className="text-muted-foreground mb-6">
              Check back later for new properties under verification.
            </p>
            <Button onClick={() => navigate('/create-property')}>
              List Your Property
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MarketplacePage;
