# Backend Context: TokenEstate Real Estate Platform

## 1. Project Purpose
This is the Node.js + Express backend server for the "TokenEstate" platform. It functions as the central API, database manager, and blockchain orchestrator. It manages property data, admin approvals, and executes privileged on-chain actions using a dedicated server wallet.

## 2. Core Functionalities
- **REST API:** Provides endpoints for property/auction CRUD, user transactions, and admin controls (e.g., approving properties).
- **Database Management:** Uses Mongoose to manage `Property`, `Auction`, and `Transaction` data in MongoDB.
- **Blockchain Orchestration:** Uses a dedicated **server-side Solana wallet** to:
    - **Tokenize Properties:** Mint new SPL tokens (using Metaplex UMI) for admin-approved properties.
    - **Process Sales:** Verify user SOL payments on-chain, then transfer the corresponding property SPL tokens to the buyer.
    - **Manage Auctions:** Interact with the Rust Auction smart contract to start auctions, process bids, and settle final sales.
- **Real-time:** Uses Socket.IO to broadcast live `auctionUpdate` events to all connected frontends.
- **Storage:** Uploads property images and token metadata to IPFS (via Pinata).

## 3. Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (with Mongoose)
- **Blockchain (Server-side):** `@solana/web3.js`, `@solana/spl-token`, Metaplex UMI
- **Real-time:** Socket.IO
- **File Storage:** IPFS (Pinata), `multer` for uploads
- **Auth/Utils:** `dotenv`, `cors`

## 4. Key Directory Structure
- **`index.js`**: Server entry, DB/Solana/Socket.IO initialization.
- **`routes/`**: API route handlers (e.g., `propertyRoutes.js`, `auctionRoutes.js`).
- **`models/`**: Mongoose schemas (e.g., `Property.js`, `Auction.js`).
- **`utils/`**: Core logic modules, especially `solana.js` (all server-side blockchain interactions) and `ipfs.js`.
