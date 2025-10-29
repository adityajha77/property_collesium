import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { ThemeProvider } from './components/theme-provider.tsx';

// Default styles that can be overridden by your app
import "@solana/wallet-adapter-react-ui/styles.css";

const endpoint = "https://api.devnet.solana.com"; // Using public Solana Devnet RPC

// --> ADD THIS LOG <--
console.log(`Connecting to Solana cluster: ${endpoint}`); // Logs the actual RPC URL

const wallets = [new PhantomWalletAdapter()];

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <App />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ThemeProvider>
  </React.StrictMode>
);
