import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';
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
  tokenMintAddress?: string;
  owner: string;
  createdAt: string;
}

const AdminDashboard = () => {
  const [pendingProperties, setPendingProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPendingProperties = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_API_URL}/api/properties?status=pending_verification`);
      setPendingProperties(response.data);
    } catch (err) {
      console.error("Error fetching pending properties:", err);
      setError("Failed to fetch pending properties.");
      toast({
        title: "Error",
        description: "Failed to load pending properties.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingProperties();

    const socket = io(import.meta.env.VITE_BACKEND_API_URL as string);

    socket.on('connect', () => {
      console.log('Connected to WebSocket server from AdminDashboard');
    });

    socket.on('propertyUpdate', (updatedProperty: Property) => {
      console.log('Received propertyUpdate:', updatedProperty);
      setPendingProperties(prevProperties =>
        prevProperties.filter(p => p.propertyId !== updatedProperty.propertyId)
      );
      // If the updated property is still pending verification, add it back (e.g., if status changed but still pending)
      // For this dashboard, we primarily care about removing approved/rejected properties.
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server from AdminDashboard');
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchPendingProperties]);

  const handleApprove = async (propertyId: string) => {
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_API_URL}/api/admin/properties/${propertyId}/approve`);
      toast({
        title: "Property Approved",
        description: `Property ${propertyId} has been approved and tokenized.`,
      });
      fetchPendingProperties(); // Refresh the list
    } catch (err) {
      console.error("Error approving property:", err);
      toast({
        title: "Approval Failed",
        description: "There was an error approving the property. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (propertyId: string) => {
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_API_URL}/api/admin/properties/${propertyId}/reject`);
      toast({
        title: "Property Rejected",
        description: `Property ${propertyId} has been rejected.`,
      });
      fetchPendingProperties(); // Refresh the list
    } catch (err) {
      console.error("Error rejecting property:", err);
      toast({
        title: "Rejection Failed",
        description: "There was an error rejecting the property. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background relative pt-24 pb-16 flex items-center justify-center">
        <BackButton /> {/* Add BackButton */}
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading pending properties...</p>
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
          <Button onClick={fetchPendingProperties}>Try Again</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative pt-24 pb-16">
      <div className="fixed inset-0 parallax-bg -z-10" />
      <BackButton /> {/* Add BackButton */}
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-4">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Manage pending property verifications and approvals.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card p-8">
            <CardHeader>
              <CardTitle className="text-primary text-3xl">Properties Pending Verification</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingProperties.length === 0 ? (
                <p className="text-muted-foreground text-center text-lg py-8">
                  No properties currently pending verification.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingProperties.map((property) => (
                    <Card key={property._id} className="glass-card overflow-hidden">
                      <img
                        src={property.imageURLs[0] || '/placeholder.svg'}
                        alt={property.title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-4">
                        <h3 className="text-xl font-bold mb-2">{property.title}</h3>
                        <p className="text-muted-foreground text-sm mb-4">{property.location}</p>
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-lg font-semibold text-primary">{property.priceSOL} SOL</span>
                          <span className="text-sm text-muted-foreground">{property.totalTokens} Tokens</span>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="default"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleApprove(property.propertyId)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" /> Approve
                          </Button>
                          <Button
                            variant="destructive"
                            className="flex-1"
                            onClick={() => handleReject(property.propertyId)}
                          >
                            <XCircle className="w-4 h-4 mr-2" /> Reject
                          </Button>
                        </div>
                        <Link to={`/property/${property.propertyId}`} className="block mt-4 text-center text-sm text-primary hover:underline">
                          View Details
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
