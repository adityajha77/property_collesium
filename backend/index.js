const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { initializeSolana } = require('./utils/solana');

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

initializeSolana(solanaRpcUrl, backendWalletSecretKey);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/properties', require('./routes/propertyRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Basic route
app.get('/', (req, res) => {
    res.send('Terra Pulse Vault Backend API');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
