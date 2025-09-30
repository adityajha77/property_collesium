import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, Settings, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Token {
  symbol: string;
  name: string;
  balance: number;
  icon: string;
  price: number;
}

const SwapPanel = () => {
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [fromToken, setFromToken] = useState<Token>({
    symbol: "SOL",
    name: "Solana",
    balance: 12.45,
    icon: "⚡",
    price: 98.50,
  });
  const [toToken, setToToken] = useState<Token>({
    symbol: "PROP1",
    name: "Luxury Villa Miami",
    balance: 0,
    icon: "🏖️",
    price: 0.0025,
  });

  const tokens: Token[] = [
    { symbol: "SOL", name: "Solana", balance: 12.45, icon: "⚡", price: 98.50 },
    { symbol: "PROP1", name: "Luxury Villa Miami", balance: 25.5, icon: "🏖️", price: 0.0025 },
    { symbol: "PROP2", name: "NYC Penthouse", balance: 12.0, icon: "🏙️", price: 0.0034 },
    { symbol: "PROP3", name: "Tokyo Tower View", balance: 8.7, icon: "🗼", price: 0.0021 },
  ];

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    if (value && !isNaN(Number(value))) {
      const fromValue = Number(value) * fromToken.price;
      const toValue = fromValue / toToken.price;
      setToAmount(toValue.toFixed(6));
    } else {
      setToAmount("");
    }
  };

  const executeSwap = () => {
    // Mock swap execution
    console.log(`Swapping ${fromAmount} ${fromToken.symbol} for ${toAmount} ${toToken.symbol}`);
  };

  return (
    <section id="swap" className="py-20 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
            Swap Tokens
          </h2>
          <p className="text-muted-foreground text-lg">
            Exchange SOL for property tokens instantly
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-card p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">Swap</h3>
            <Button variant="ghost" size="icon">
              <Settings className="w-4 h-4" />
            </Button>
          </div>

          {/* From Token */}
          <div className="space-y-4">
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm text-muted-foreground">From</Label>
                <span className="text-sm text-muted-foreground">
                  Balance: {fromToken.balance} {fromToken.symbol}
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Input
                    placeholder="0.0"
                    value={fromAmount}
                    onChange={(e) => handleFromAmountChange(e.target.value)}
                    className="text-2xl font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0"
                    type="number"
                  />
                </div>
                
                <Button variant="glass" className="flex items-center space-x-2 px-4">
                  <span className="text-lg">{fromToken.icon}</span>
                  <div className="text-left">
                    <div className="font-semibold">{fromToken.symbol}</div>
                    <div className="text-xs text-muted-foreground">${fromToken.price}</div>
                  </div>
                </Button>
              </div>
            </div>

            {/* Swap button */}
            <div className="flex justify-center">
              <Button
                variant="glass-primary"
                size="icon"
                onClick={handleSwapTokens}
                className="rounded-full"
              >
                <ArrowUpDown className="w-4 h-4" />
              </Button>
            </div>

            {/* To Token */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm text-muted-foreground">To</Label>
                <span className="text-sm text-muted-foreground">
                  Balance: {toToken.balance} {toToken.symbol}
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Input
                    placeholder="0.0"
                    value={toAmount}
                    readOnly
                    className="text-2xl font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0"
                  />
                </div>
                
                <Button variant="glass" className="flex items-center space-x-2 px-4">
                  <span className="text-lg">{toToken.icon}</span>
                  <div className="text-left">
                    <div className="font-semibold">{toToken.symbol}</div>
                    <div className="text-xs text-muted-foreground">${toToken.price}</div>
                  </div>
                </Button>
              </div>
            </div>
          </div>

          {/* Swap info */}
          {fromAmount && toAmount && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 glass-card p-4 space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center space-x-1">
                  <Info className="w-3 h-3" />
                  <span>Rate</span>
                </span>
                <span>
                  1 {fromToken.symbol} = {(fromToken.price / toToken.price).toFixed(6)} {toToken.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Network Fee</span>
                <span className="text-secondary">~0.0005 SOL</span>
              </div>
            </motion.div>
          )}

          {/* Execute swap */}
          <Button
            variant="neon"
            size="lg"
            className="w-full mt-6"
            onClick={executeSwap}
            disabled={!fromAmount || !toAmount}
          >
            {!fromAmount || !toAmount ? "Enter amount" : "Swap Tokens"}
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default SwapPanel;