import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { ModeToggle } from "./theme-toggle";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Marketplace", href: "/marketplace" },
    { name: "Liquidity Pool", href: "/liquidity-pool" },
    { name: "Portfolio", href: "/portfolio" },
    { name: "Create", href: "/create" },
    { name: "Transactions", href: "/transactions" },
    { name: "Live Auctions", href: "/auction" }, // Renamed "BID" to "Live Auctions" for clarity
    { name: "My Auctions", href: "/my-auctions" }, // New "My Auctions" tab
  ];

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 px-4 py-4"
    >
      <div className="max-w-7xl mx-auto">
        <div className="glass-card px-6 py-4 border border-transparent hover:border-primary/20 transition-all duration-300">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-gradient-primary rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className="text-xl font-bold gradient-text">TokenEstate</span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                
                return (
                  <motion.div key={item.name} whileHover={{ y: -2 }} className="relative">
                    <Link
                      to={item.href}
                      className={`transition-colors font-medium ${
                        isActive 
                          ? 'text-primary gradient-text' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {item.name}
                      {isActive && (
                        <motion.div
                          className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary"
                          layoutId="underline"
                        />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Wallet Connection */}
            <div className="flex items-center space-x-4">
              <ModeToggle />
              <WalletMultiButton />

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden mt-2"
          >
            <div className="glass-card p-4 space-y-4">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`block transition-colors font-medium py-2 ${
                      isActive 
                        ? 'text-primary gradient-text' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};

export default Navbar;
