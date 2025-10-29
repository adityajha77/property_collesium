# Property Coliseum - Real Estate Tokenization Platform (Frontend)

This is the React + TypeScript frontend for "TokenEstate," a decentralized real estate marketplace on the Solana blockchain. It provides the user interface for browsing, buying, selling, and auctioning tokenized property shares.

## Project Setup

### Prerequisites

*   **Node.js:** Version 18 or later is required.
*   **npm:** Ensure you have npm installed (usually comes with Node.js).
*   **Solana Wallet:** A Solana wallet that supports the Devnet (e.g., Phantom, Solflare). **MetaMask is not compatible.**

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
    cd frontend
    npm install
    cd ..
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
    cd frontend
    npm run dev
    ```
    The frontend application should now be running on `http://localhost:5173` (or another port if 5173 is in use).

### Theme Customization

The frontend supports multiple themes: Light, Dark, System, Purple, and Green. You can switch between these themes using the theme toggle button located in the navigation bar.

*   **Light:** A clean and modern light theme.
*   **Dark:** A dark theme inspired by Codedex and Tensor.
*   **System:** Automatically matches your operating system's theme preference.
*   **Purple:** A vibrant purple-based theme.
*   **Green:** A fresh green-based theme.

To apply a theme, simply click on the theme toggle button in the navbar and select your desired theme from the dropdown menu.
