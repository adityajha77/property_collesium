const fs = require('fs');
const path = require('path');

let ipfs; // Declare ipfs client globally but initialize asynchronously

// Asynchronously initialize IPFS client
const initializeIpfs = async () => {
    if (!ipfs) {
        const { create } = await import('ipfs-http-client');
        ipfs = create({
            host: 'api.pinata.cloud',
            port: 443,
            protocol: 'https',
            headers: {
                pinata_api_key: process.env.PINATA_API_KEY,
                pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY
            }
        });
    }
    return ipfs;
};

const uploadFileToIPFS = async (filePath) => {
    try {
        await initializeIpfs(); // Ensure IPFS client is initialized
        const file = fs.readFileSync(filePath);
        const result = await ipfs.add(file);
        return `https://gateway.pinata.cloud/ipfs/${result.cid.toString()}`;
    } catch (error) {
        console.error('Error uploading file to IPFS:', error);
        throw error;
    }
};

const uploadJSONToIPFS = async (jsonContent) => {
    try {
        await initializeIpfs(); // Ensure IPFS client is initialized
        const result = await ipfs.add(JSON.stringify(jsonContent));
        return `https://gateway.pinata.cloud/ipfs/${result.cid.toString()}`;
    } catch (error) {
        console.error('Error uploading JSON to IPFS:', error);
        throw error;
    }
};

module.exports = {
    uploadFileToIPFS,
    uploadJSONToIPFS
};
