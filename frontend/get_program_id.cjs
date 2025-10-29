const { Keypair, PublicKey } = require('@solana/web3.js');
const keypairBytes = [214,214,34,166,199,158,5,189,206,68,146,72,249,242,89,32,151,210,12,205,199,155,3,37,142,240,168,77,153,52,116,180,75,36,59,122,106,194,170,21,192,226,38,126,30,51,28,176,58,192,91,41,104,39,247,18,160,99,248,254,50,35,57,181];
const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairBytes));
console.log(keypair.publicKey.toBase58());
