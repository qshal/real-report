/**
 * Generate a new wallet for blockchain deployment
 * Run with: node scripts/generate-wallet.js
 */

const { ethers } = require('ethers');

function generateWallet() {
  console.log('🔐 Generating new wallet for blockchain deployment...\n');
  
  // Create a random wallet
  const wallet = ethers.Wallet.createRandom();
  
  console.log('✅ New wallet generated:');
  console.log('📍 Address:', wallet.address);
  console.log('🔑 Private Key:', wallet.privateKey);
  console.log('🌱 Mnemonic:', wallet.mnemonic.phrase);
  
  console.log('\n📝 Add this to your .env file:');
  console.log(`PRIVATE_KEY="${wallet.privateKey.slice(2)}"`); // Remove 0x prefix
  console.log(`BLOCKCHAIN_PRIVATE_KEY="${wallet.privateKey.slice(2)}"`);
  console.log(`SEPOLIA_RPC_URL="https://rpc.sepolia.org"`);
  
  console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
  console.log('1. Never commit private keys to version control');
  console.log('2. This wallet is for development/testing only');
  console.log('3. You need Sepolia ETH to deploy contracts');
  console.log('4. Get testnet ETH from: https://sepoliafaucet.com/');
  
  console.log('\n🚀 Next steps:');
  console.log('1. Add the private key to your .env file');
  console.log('2. Get Sepolia ETH from the faucet');
  console.log('3. Run: npx hardhat run scripts/deploy-contract.ts --network sepolia');
}

generateWallet();