# Frontend Context: TokenEstate Real Estate Platform

## 1. Project Purpose
This is the React + TypeScript frontend for "TokenEstate," a decentralized real estate marketplace on the Solana blockchain. It provides the user interface for browsing, buying, selling, and auctioning tokenized property shares.

## 2. Core Functionalities
- **Wallet Connection:** Integrates with Solana wallets (e.g., Phantom) via `@solana/wallet-adapter-react`.
- **Marketplace:** Displays properties and live auctions. (`pages/MarketplacePage.tsx`)
- **Property Details:** Shows details for a single property and handles buy transactions. (`pages/PropertyDetail.tsx`)
- **Auctions:** Allows participation in and creation of property auctions. (`pages/AuctionPage.tsx`, `pages/StartAuctionPage.tsx`)
- **Liquidity Pools:** UI for interacting with the liquidity pool smart contract. (`pages/LiquidityPoolPage.tsx`)
- **Portfolio & Transactions:** (Inferred from navbar) Displays user's owned tokens and history.
- **Create Property:** A form for submitting new properties for tokenization. (`pages/CreateProperty.tsx`)

## 3. Tech Stack
- **Framework:** React (with Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **Routing:** React Router DOM
- **Data Fetching:** React Query
- **Blockchain Client:** `@solana/web3.js`, `@solana/spl-token`, `@solana/wallet-adapter-react`, `borsh`
- **Real-time:** `socket.io-client`

## 4. Key Data Flows
1.  **Backend API (REST):** Communicates with a Node.js backend (at `http://localhost:5000`) to `GET` property/auction data and `POST` new properties, buy orders, and bids.
2.  **Backend (WebSockets):** Uses `socket.io-client` to receive real-time `auctionUpdate` events.
3.  **Solana Blockchain:**
    - Initiates on-chain transactions (SOL transfers, smart contract calls) that are **signed by the user's connected wallet**.
    - Interacts directly with Rust smart contracts for Liquidity Pools (via `lib/liquidityPool.ts`) and Auctions.
