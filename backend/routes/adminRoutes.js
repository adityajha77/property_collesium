const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const { createPropertyToken } = require('../utils/solana');

module.exports = (io) => { // Accept io object
    // Approve property and create token
    router.post('/properties/:id/approve', async (req, res) => {
        try {
            const property = await Property.findOne({ propertyId: req.params.id });

            if (!property) return res.status(404).json({ msg: 'Property not found' });
            if (property.status !== 'pending_verification') return res.status(400).json({ msg: 'Property is not pending verification' });

            // Create the token on Solana
            const { mintAddress, metadataUri } = await createPropertyToken(property);

            // Update the property in DB
            property.tokenMintAddress = mintAddress;
            property.status = 'tokenized';
            await property.save();

            console.log(`✅ Tokenization successful for property ${property.title}. Mint Address: ${mintAddress}`);
            io.emit('propertyUpdate', property); // Emit real-time update
            res.json({ ...property.toObject(), mintAddress, metadataUri });

        } catch (err) {
            console.error("❌ Error during property approval and tokenization:", err);
            res.status(500).send('Error creating property token. Check signer and transaction logic.');
        }
    });

    // Reject property
    router.post('/properties/:id/reject', async (req, res) => {
        try {
            const property = await Property.findOne({ propertyId: req.params.id });

            if (!property) return res.status(404).json({ msg: 'Property not found' });
            if (property.status !== 'pending_verification') return res.status(400).json({ msg: 'Property is not pending verification' });

            property.status = 'rejected';
            await property.save();

            io.emit('propertyUpdate', property); // Emit real-time update
            res.json(property);
        } catch (err) {
            console.error("❌ Error during property rejection:", err);
            res.status(500).send('Server Error');
        }
    });

    return router;
};
