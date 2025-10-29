import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import PropertyDetail from "./pages/PropertyDetail";
import Portfolio from "./pages/Portfolio";
import CreateProperty from "./pages/CreateProperty";
import Transactions from "./pages/Transactions";
import NotFound from "./pages/NotFound";
import LiquidityPoolPage from "./pages/LiquidityPoolPage";
import MarketplacePage from "./pages/MarketplacePage";
import AuctionPage from "./pages/AuctionPage";
import AuctionDetailPage from "./pages/AuctionDetailPage";
import MyAuctionsPage from "./pages/MyAuctionsPage";
import SelectPropertyForAuctionPage from "./pages/SelectPropertyForAuctionPage";
import StartAuctionPage from "./pages/StartAuctionPage";
import AdminDashboard from "./pages/AdminDashboard"; // Import AdminDashboard
import Contact from "./pages/Contact"; // Import Contact page

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/property/:id" element={<PropertyDetail />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/create" element={<CreateProperty />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/liquidity-pool" element={<LiquidityPoolPage />} />
          <Route path="/auction" element={<AuctionPage />} /> {/* Route for listing all auctions */}
          <Route path="/auction/:auctionId" element={<AuctionDetailPage />} /> {/* Route for a single auction detail */}
          <Route path="/my-auctions" element={<MyAuctionsPage />} /> {/* New route for MyAuctionsPage */}
          <Route path="/select-property-for-auction" element={<SelectPropertyForAuctionPage />} /> {/* New route for property selection */}
          <Route path="/start-auction/:propertyId" element={<StartAuctionPage />} /> {/* New route for StartAuctionPage */}
          <Route path="/admin" element={<AdminDashboard />} /> {/* New route for Admin Dashboard */}
          <Route path="/contact" element={<Contact />} /> {/* New route for Contact page */}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
