import { motion } from "framer-motion";
import { Coins, TrendingUp, Users, ArrowUpRight, ArrowDownLeft, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useMemo } from "react";

const FloatingLogos = () => {
  const logos = useMemo(() => [
    { src: "https://cryptologos.cc/logos/solana-sol-logo.png", size: "w-16 h-16" },
    { src: "https://cryptologos.cc/logos/ethereum-eth-logo.png", size: "w-20 h-20" },
    { src: "https://cryptologos.cc/logos/bitcoin-btc-logo.png", size: "w-24 h-24" },
    { src: "https://cryptologos.cc/logos/chainlink-link-logo.png", size: "w-12 h-12" },
    { src: "https://cryptologos.cc/logos/polygon-matic-logo.png", size: "w-20 h-20" },
    { src: "https://cryptologos.cc/logos/cardano-ada-logo.png", size: "w-18 h-18" },
    { src: "https://cryptologos.cc/logos/dogecoin-doge-logo.png", size: "w-22 h-22" },
    { src: "https://cryptologos.cc/logos/polkadot-new-dot-logo.png", size: "w-16 h-16" },
    { src: "https://cryptologos.cc/logos/binance-coin-bnb-logo.png", size: "w-20 h-20" },
    { src: "https://cryptologos.cc/logos/ripple-xrp-logo.png", size: "w-14 h-14" },
  ], []);

  return (
    <>
      {logos.map((logo, index) => (
        <motion.img
          key={index}
          src={logo.src}
          alt="Crypto Logo"
          className={`absolute opacity-30 blur-md ${logo.size}`}
          style={{
            top: `${Math.random() * 80 + 10}%`,
            left: `${Math.random() * 80 + 10}%`,
          }}
          animate={{
            x: [0, Math.random() * 100 - 50, 0],
            y: [0, Math.random() * 100 - 50, 0],
            rotate: [0, Math.random() * 360, 0],
          }}
          transition={{
            duration: Math.random() * 20 + 15,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
        />
      ))}
    </>
  );
};

const CryptoWalletScreen = () => (
  <div className="w-full h-full bg-black text-white p-3 flex flex-col font-mono">
    <div className="flex justify-center items-center mb-2">
      <img src="https://cryptologos.cc/logos/solana-sol-logo.png" alt="Solana Logo" className="w-12 h-12" />
    </div>
    <div className="mb-4 text-center">
      <div className="text-2xl font-bold tracking-wider">SOLANA</div>
      <div className="text-md text-gray-400">Real-Time Price</div>
    </div>
    <div className="flex-grow flex items-center justify-center">
      <div className="w-full h-36 bg-gray-900 rounded-lg p-1">
        <img src="https://i.imgur.com/8oMhT5t.png" alt="Crypto Graph" className="w-full h-full object-cover rounded-md" />
      </div>
    </div>
  </div>
);

const PhoneMockup = () => (
  <motion.div
    className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[12px] rounded-[2rem] h-[500px] w-[250px] shadow-xl"
    style={{ perspective: "1000px" }}
    whileHover={{ scale: 1.05 }}
  >
    <motion.div
      className="w-full h-full"
      transition={{ duration: 0.6, ease: "easeInOut" }}
      style={{ transformStyle: "preserve-3d" }}
      whileHover={{ rotateY: 360 }}
    >
      <div className="absolute w-full h-full">
        <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute"></div>
        <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
        <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[178px] rounded-l-lg"></div>
        <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>
        <div className="rounded-[2rem] overflow-hidden w-full h-full bg-black">
          <CryptoWalletScreen />
        </div>
      </div>
    </motion.div>
  </motion.div>
);

const Hero = () => {
  const stats = [
    { icon: Coins, label: "Total Value Locked", value: "$24.8M" },
    { icon: TrendingUp, label: "Properties Tokenized", value: "1,247" },
    { icon: Users, label: "Active Investors", value: "8,934" },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 pt-24 pb-16">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <FloatingLogos />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"
        />
      </div>

      <div className="relative max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className="text-center md:text-left space-y-8">
          {/* Main heading */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-6"
          >
            <h1 className="text-6xl md:text-8xl font-bold">
              <span className="gradient-text-rainbow cursor-glow transition-all duration-500 hover:scale-105 inline-block">
                Tokenized
              </span>
              <br />
              <span className="gradient-text cursor-glow transition-all duration-500 hover:scale-105 inline-block">
                Real Estate
              </span>
            </h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto md:mx-0 leading-relaxed"
            >
              Buy fractional ownership of premium properties with blockchain technology. 
              Trade, earn, and diversify your real estate portfolio like never before.
            </motion.p>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4"
          >
            <Link to="/marketplace">
              <Button
                variant="glass-primary"
                size="lg"
                className="text-lg px-8 py-4 h-auto"
              >
                View Marketplace
              </Button>
            </Link>
            
            <Link to="/create">
              <Button
                variant="glass"
                size="lg"
                className="text-lg px-8 py-4 h-auto"
              >
                Start Tokenizing
              </Button>
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="hidden md:block"
        >
          <PhoneMockup />
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
