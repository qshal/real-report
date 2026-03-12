/**
 * Show wallet address from private key
 * Run with: node scripts/show-wallet-address.js
 */

import { ethers } from 'ethers';

const privateKey = "b7c92184011be4d6952e31ed0060e66cefa49df94cad880febb2580aa39940cb";

try {
  const wallet = new ethers.Wallet(privateKey);
  
  console.log('🔐 Your Wallet Information:');
  console.log('📍 Address:', wallet.address);
  console.log('🔑 Private Key:', privateKey);
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Get Sepolia testnet ETH from: https://sepoliafaucet.com/');
  console.log('2. Use this address:', wallet.address);
  console.log('3. Then deploy the contract: npx hardhat run scripts/deploy-contract.ts --network sepolia');
  
} catch (error) {
  console.error('Error:', error.message);
}