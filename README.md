# Property Coliseum - Real Estate Tokenization Platform

This is a full-stack application for tokenizing real estate properties on the Solana blockchain.

## Project Setup

### Prerequisites

- Node.js (v18 or later)
- A Solana wallet that supports the Devnet (e.g., Phantom, Solflare). **MetaMask is not compatible.**

### Wallet Setup (Crucial Step)

1.  **Install a Solana Wallet:** We recommend using the [Phantom wallet](https://phantom.app/) browser extension.
2.  **Switch to Devnet:** Open your Phantom wallet and switch the network from "Mainnet Beta" to "Devnet". You can do this in `Settings > Developer Settings > Active Network`.
3.  **Get Free Devnet SOL:** You will need Devnet SOL to pay for transaction fees. You can get some for free by using a Solana faucet. You can find one inside the Phantom wallet or by searching for a "Solana Devnet Faucet" online.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/adityajha77/property_collesium
    cd property_collesium
    ```

2.  **Install frontend dependencies:**
    ```bash
    npm install
    ```

3.  **Install backend dependencies:**
    ```bash
    cd backend
    npm install
    cd ..
    ```

4.  **Set up environment variables:**
    - Create a `.env` file in the `backend` directory.
    - Add your backend wallet's secret key and your IPFS credentials. See `backend/.env.example` for the required format.

### Running the Application

1.  **Start the backend server:**
    ```bash
    cd backend
    npm start
    ```

2.  **Start the frontend development server:**
    ```bash
    npm run dev
    ```

The application should now be running on `http://localhost:8080`.
