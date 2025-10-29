import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { ModeToggle } from "./theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const mainNavItems = [
    { name: "Home", href: "/" },
    { name: "Marketplace", href: "/marketplace" },
    { name: "Liquidity Pool", href: "/liquidity-pool" },
    { name: "Portfolio", href: "/portfolio" },
  ];

  const moreNavItems = [
    { name: "Create", href: "/create" },
    { name: "Transactions", href: "/transactions" },
    { name: "Live Auctions", href: "/auction" },
    { name: "My Auctions", href: "/my-auctions" },
    { name: "Contact Us", href: "/contact" },
  ];

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 px-4 py-2" /* Reduced vertical padding */
    >
      <div className="max-w-7xl mx-auto">
        <div className="glass-card px-6 py-2 border border-transparent hover:border-primary/20 transition-all duration-300"> {/* Reduced vertical padding */}
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-2"
            >
              <img src="/logos/logo.png" alt="TokenEstate Logo" className="h-8 w-auto" />
              <span className="text-xl font-bold gradient-text">TokenEstate</span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6"> {/* Reduced horizontal spacing */}
              {mainNavItems.map((item) => {
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-1 text-muted-foreground hover:text-foreground">
                    <span>More</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  {moreNavItems.map((item) => (
                    <DropdownMenuItem key={item.name} asChild>
                      <Link to={item.href} className="block px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground">
                        {item.name}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Wallet Connection */}
            <div className="flex items-center space-x-4">
              <ModeToggle />
              <WalletMultiButton className="!px-3 !py-1 !h-auto !text-sm sm:!px-5 sm:!py-2 sm:!text-base" /> {/* Responsive styling for smaller button */}

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
              {[...mainNavItems, ...moreNavItems].map((item) => { /* Combine all items for mobile */
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
