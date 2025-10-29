const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const http = require('http'); // Import http module
const { Server } = require('socket.io'); // Import Server from socket.io
const mongoose = require('mongoose');
const cors = require('cors');
const solanaUtils = require('./utils/solana'); // Import all exports as solanaUtils
// Do not destructure initializeSolana and backendWallet here yet

// Debugging: Log all loaded environment variables
console.log('Loaded Environment Variables:');
for (const key in process.env) {
    if (key.startsWith('SOLANA_') || key.startsWith('BACKEND_') || key.startsWith('MONGO_') || key.startsWith('PINATA_') || key.startsWith('PORT')) {
        console.log(`  ${key}=${process.env[key]}`);
    }
}

// Initialize Solana connection and Umi instance
const solanaRpcUrl = process.env.SOLANA_RPC_URL;
const backendWalletSecretKey = process.env.BACKEND_WALLET_SECRET_KEY;

if (!solanaRpcUrl) {
    console.error('FATAL ERROR: SOLANA_RPC_URL is not defined in .env');
    process.exit(1);
}
if (!backendWalletSecretKey) {
    console.error('FATAL ERROR: BACKEND_WALLET_SECRET_KEY is not defined in .env');
    process.exit(1);
}

const backendWalletPublicKey = solanaUtils.initializeSolana(solanaRpcUrl, backendWalletSecretKey); // Call initializeSolana via solanaUtils
console.log("Backend Wallet Public Key for Frontend:", backendWalletPublicKey.toBase58()); // Log for frontend use

const app = express();
const server = http.createServer(app); // Create HTTP server
const io = new Server(server, { // Initialize socket.io
    cors: {
        origin: '*', // Allow all origins for WebSocket
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }
});
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: '*', // Allow all origins for HTTP requests
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow all methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow specific headers
}));
app.use(express.json());

// Make io accessible to routes
app.set('socketio', io);
app.set('connection', solanaUtils.getConnection()); // Also make solana connection accessible if needed

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('A user connected via WebSocket');
    socket.on('disconnect', () => {
        console.log('User disconnected from WebSocket');
    });
});

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Import PublicKey for the new route
const { PublicKey } = require('@solana/web3.js');

// Routes
// @route   GET /api/properties/backend-wallet-public-key
// @desc    Get the backend wallet's public key
// @access  Public
app.get('/api/properties/backend-wallet-public-key', (req, res) => {
    try {
        console.log("Attempting to fetch backend wallet public key (from index.js)...");
        if (!backendWalletPublicKey) { // Use the already initialized public key
            console.error("Backend wallet public key not available in index.js when endpoint was called.");
            return res.status(500).json({ message: 'Backend wallet not initialized.' });
        }
        console.log("Backend wallet public key found (from index.js):", backendWalletPublicKey.toBase58());
        res.status(200).json({ publicKey: backendWalletPublicKey.toBase58() });
    } catch (err) {
        console.error("Error fetching backend wallet public key (from index.js):", err.message);
        res.status(500).json({ message: 'Server Error fetching backend wallet public key', error: err.message });
    }
});

app.use('/api/properties', require('./routes/propertyRoutes')(solanaUtils)); // Pass solanaUtils to the router
app.use('/api/auctions', require('./routes/auctionRoutes')(solanaUtils, io)); // Pass solanaUtils AND io to the auction router
app.use('/api/admin', require('./routes/adminRoutes')(io)); // Pass io to the admin router

// Basic route
app.get('/', (req, res) => {
    res.send('Terra Pulse Vault Backend API');
});

// Start the server using the http server, not the express app
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
