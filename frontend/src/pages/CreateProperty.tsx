import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { Upload, MapPin, DollarSign, Coins, FileText, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import BackButton from "@/components/BackButton"; // Import BackButton

const CreateProperty = () => {
  const { toast } = useToast();
  const navigate = useNavigate(); // Initialize useNavigate
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    description: "",
    priceSOL: "",
    totalTokens: "",
    sqft: "",
    bedrooms: "",
    bathrooms: "",
    yearBuilt: "",
  });
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { publicKey } = useWallet(); // Get connected wallet's public key

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setImages(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!publicKey) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your Solana wallet to create a property.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const data = new FormData();
    // Append all form fields to FormData
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });

    // Append owner wallet address
    data.append("owner", publicKey.toBase58()); // Use connected wallet's public key

    // Append images
    images.forEach(image => {
      data.append("images", image);
    });

    try {
      const response = await fetch("http://localhost:5000/api/properties", {
        method: "POST",
        body: data, // No headers needed, browser sets it for FormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || "Failed to create property");
      }

      toast({
        title: "Property Submitted!",
        description: "Your property has been submitted for verification. You will be notified upon approval.",
      });

      const newProperty = await response.json(); // Get the created property data
      
      // Reset form
      setFormData({
        title: "",
        location: "",
        description: "",
        priceSOL: "",
        totalTokens: "",
        sqft: "",
        bedrooms: "",
        bathrooms: "",
        yearBuilt: "",
      });
      setImages([]);

    } catch (error) {
      console.error("Error creating property:", error);
      toast({
        title: "Submission Failed",
        description: (error as Error).message || "There was an error submitting your property. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.title && formData.location && formData.priceSOL && formData.totalTokens;

  return (
    <div className="min-h-screen bg-background relative pt-24 pb-16">
      <div className="fixed inset-0 parallax-bg -z-10" />
      <BackButton /> {/* Add BackButton */}
      
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-4">
            Tokenize Your Property
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Transform your real estate into tradeable tokens and unlock liquidity
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <h2 className="text-2xl font-bold gradient-text flex items-center">
                  <FileText className="w-6 h-6 mr-2" />
                  Basic Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">
                      Property Title *
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g., Luxury Villa Miami Beach"
                      value={formData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      className="glass-card border-glass-border"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm font-medium flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      Location *
                    </Label>
                    <Input
                      id="location"
                      placeholder="e.g., Miami, Florida"
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      className="glass-card border-glass-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your property's unique features, amenities, and location benefits..."
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="glass-card border-glass-border min-h-[100px]"
                  />
                </div>
              </div>

              {/* Property Details */}
              <div className="space-y-6">
                <h2 className="text-2xl font-bold gradient-text">
                  Property Details
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sqft" className="text-sm font-medium">
                      Square Feet
                    </Label>
                    <Input
                      id="sqft"
                      type="number"
                      placeholder="4500"
                      value={formData.sqft}
                      onChange={(e) => handleInputChange("sqft", e.target.value)}
                      className="glass-card border-glass-border"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bedrooms" className="text-sm font-medium">
                      Bedrooms
                    </Label>
                    <Input
                      id="bedrooms"
                      type="number"
                      placeholder="5"
                      value={formData.bedrooms}
                      onChange={(e) => handleInputChange("bedrooms", e.target.value)}
                      className="glass-card border-glass-border"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bathrooms" className="text-sm font-medium">
                      Bathrooms
                    </Label>
                    <Input
                      id="bathrooms"
                      type="number"
                      placeholder="4"
                      value={formData.bathrooms}
                      onChange={(e) => handleInputChange("bathrooms", e.target.value)}
                      className="glass-card border-glass-border"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="yearBuilt" className="text-sm font-medium">
                      Year Built
                    </Label>
                    <Input
                      id="yearBuilt"
                      type="number"
                      placeholder="2019"
                      value={formData.yearBuilt}
                      onChange={(e) => handleInputChange("yearBuilt", e.target.value)}
                      className="glass-card border-glass-border"
                    />
                  </div>
                </div>
              </div>

              {/* Tokenization Settings */}
              <div className="space-y-6">
                <h2 className="text-2xl font-bold gradient-text flex items-center">
                  <Coins className="w-6 h-6 mr-2" />
                  Tokenization Settings
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="priceSOL" className="text-sm font-medium flex items-center">
                      <DollarSign className="w-4 h-4 mr-1" />
                      Total Value (SOL) *
                    </Label>
                    <Input
                      id="priceSOL"
                      type="number"
                      step="0.01"
                      placeholder="850.5"
                      value={formData.priceSOL}
                      onChange={(e) => handleInputChange("priceSOL", e.target.value)}
                      className="glass-card border-glass-border"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="totalTokens" className="text-sm font-medium flex items-center">
                      <Coins className="w-4 h-4 mr-1" />
                      Total Tokens *
                    </Label>
                    <Input
                      id="totalTokens"
                      type="number"
                      placeholder="10000"
                      value={formData.totalTokens}
                      onChange={(e) => handleInputChange("totalTokens", e.target.value)}
                      className="glass-card border-glass-border"
                    />
                  </div>
                </div>

                {/* Token Price Preview */}
                {formData.priceSOL && formData.totalTokens && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-4 bg-primary/5"
                  >
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Token Price</div>
                      <div className="text-xl font-bold text-secondary">
                        {(Number(formData.priceSOL) / Number(formData.totalTokens)).toFixed(6)} SOL per token
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Images */}
              <div className="space-y-6">
                <h2 className="text-2xl font-bold gradient-text flex items-center">
                  <ImageIcon className="w-6 h-6 mr-2" />
                  Property Images *
                </h2>

                {/* Upload Area */}
                <div {...getRootProps()} className={`border-2 border-dashed border-glass-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer ${isDragActive ? 'border-primary bg-primary/10' : ''}`}>
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <div className="text-lg font-medium mb-2">Upload Property Images</div>
                  <div className="text-sm text-muted-foreground">
                    {isDragActive ? "Drop the files here..." : "Drag and drop files here, or click to select"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Support: JPG, PNG, WebP (Max 10MB each)
                  </div>
                </div>

                {/* Image Previews */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`preview ${index}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-6">
                <Button
                  type="submit"
                  variant="neon"
                  size="lg"
                  disabled={!isFormValid || isSubmitting}
                  className="px-12 py-4 text-lg h-auto"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Property...</span>
                    </div>
                  ) : (
                    "Create Property Token"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12"
        >
          <Card className="glass-card p-6 text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-lg font-bold mb-2">Secure & Verified</h3>
            <p className="text-sm text-muted-foreground">
              All properties undergo thorough verification before tokenization
            </p>
          </Card>
          
          <Card className="glass-card p-6 text-center">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-lg font-bold mb-2">Fast Settlement</h3>
            <p className="text-sm text-muted-foreground">
              Powered by Solana for near-instant transactions and low fees
            </p>
          </Card>
          
          <Card className="glass-card p-6 text-center">
            <div className="text-4xl mb-4">📈</div>
            <h3 className="text-lg font-bold mb-2">Liquidity Unlocked</h3>
            <p className="text-sm text-muted-foreground">
              Enable fractional ownership and trading of your real estate
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateProperty;
