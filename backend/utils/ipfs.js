const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const uploadFileToIPFS = async (filePath) => {
    try {
        const file = fs.createReadStream(filePath);
        const data = new FormData();
        data.append('file', file);

        const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", data, {
            maxBodyLength: "Infinity",
            headers: {
                'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
                'pinata_api_key': process.env.PINATA_API_KEY,
                'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY
            }
        });
        return `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;
    } catch (error) {
        console.error('Error uploading file to IPFS:', error);
        throw error;
    }
};

const uploadJSONToIPFS = async (jsonContent) => {
    try {
        const res = await axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", jsonContent, {
            headers: {
                'pinata_api_key': process.env.PINATA_API_KEY,
                'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY
            }
        });
        return `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;
    } catch (error) {
        console.error('Error uploading JSON to IPFS:', error);
        throw error;
    }
};

module.exports = {
    uploadFileToIPFS,
    uploadJSONToIPFS
};
