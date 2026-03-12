# Blockchain Integration Setup Guide

This guide will help you set up the complete blockchain integration for the fake news detection platform.

## Overview

The blockchain integration provides:
- **Immutable Storage**: Analysis results stored on Ethereum/Polygon
- **Verification**: Cryptographic proof of analysis integrity
- **Transparency**: Public verification of fact-checking results
- **Audit Trail**: Complete history of all analyses

## Architecture

```
Frontend (React) ←→ Smart Contract (Solidity)
       ↓
Backend Service (Python) ←→ Blockchain Network
```

## Prerequisites

1. **Node.js & npm** (for frontend and contract deployment)
2. **Python 3.8+** (for backend service)
3. **MetaMask** (for frontend blockchain interactions)
4. **Ethereum Testnet ETH** (for contract deployment and transactions)

## Step 1: Environment Setup

### 1.1 Install Dependencies

```bash
# Frontend dependencies (already included)
npm install ethers

# Backend dependencies
cd backend
pip install -r requirements.txt
```

### 1.2 Configure Environment Variables

Update your `.env` file:

```env
# Blockchain Configuration
VITE_CONTRACT_ADDRESS=""                    # Will be set after deployment
VITE_ETHEREUM_RPC_URL="https://rpc.sepolia.org"
VITE_BLOCKCHAIN_API_URL="http://localhost:5000/api/blockchain"

# Backend Blockchain Service
CONTRACT_ADDRESS=""                         # Same as VITE_CONTRACT_ADDRESS
ETHEREUM_RPC_URL="https://rpc.sepolia.org"
BLOCKCHAIN_PRIVATE_KEY=""                   # Your wallet private key
```

## Step 2: Smart Contract Deployment

### 2.1 Configure Hardhat

Ensure your `hardhat.config.ts` includes Sepolia network:

```typescript
networks: {
  sepolia: {
    url: "https://rpc.sepolia.org",
    accounts: [process.env.BLOCKCHAIN_PRIVATE_KEY || ""]
  }
}
```

### 2.2 Deploy Contract

```bash
# Compile contracts
npx hardhat compile

# Deploy to Sepolia testnet
npx hardhat run scripts/deploy-contract.ts --network sepolia
```

### 2.3 Update Environment

Copy the deployed contract address to your `.env` file:

```env
VITE_CONTRACT_ADDRESS="0x..." # From deployment output
CONTRACT_ADDRESS="0x..."      # Same address
```

## Step 3: Backend Service Setup

### 3.1 Configure Private Key

**⚠️ Security Warning**: Never commit private keys to version control!

```bash
# Generate a new wallet for the service (recommended)
# Or use an existing wallet's private key

# Add to .env (without 0x prefix)
BLOCKCHAIN_PRIVATE_KEY="your_private_key_here"
```

### 3.2 Start Backend Service

```bash
cd backend
python blockchain_service.py
```

The service will start on `http://localhost:5000`

### 3.3 Test Backend API

```bash
# Check status
curl http://localhost:5000/api/blockchain/status

# Expected response:
{
  "connected": true,
  "contract_address": "0x...",
  "rpc_url": "https://rpc.sepolia.org",
  "wallet_address": "0x..."
}
```

## Step 4: Frontend Integration

### 4.1 MetaMask Setup

1. Install MetaMask browser extension
2. Add Sepolia testnet to MetaMask
3. Get testnet ETH from [Sepolia Faucet](https://sepoliafaucet.com/)

### 4.2 Test Integration

1. Start your frontend: `npm run dev`
2. Navigate to the dashboard
3. Check the "Blockchain Verification" card
4. Run an analysis to test blockchain storage

## Step 5: Production Deployment

### 5.1 Mainnet Deployment

For production, deploy to Ethereum mainnet or Polygon:

```bash
# Ethereum Mainnet
ETHEREUM_RPC_URL="https://mainnet.infura.io/v3/YOUR_PROJECT_ID"

# Polygon Mainnet (recommended for lower fees)
ETHEREUM_RPC_URL="https://polygon-rpc.com"
```

### 5.2 Backend Service Deployment

Deploy the Python backend service to your preferred platform:

- **Heroku**: `git push heroku main`
- **AWS Lambda**: Use serverless framework
- **Docker**: Build and deploy container
- **VPS**: Run with systemd service

### 5.3 Environment Variables

Update production environment variables:

```env
VITE_BLOCKCHAIN_API_URL="https://your-backend-domain.com/api/blockchain"
```

## Troubleshooting

### Common Issues

1. **"MetaMask not installed"**
   - Install MetaMask browser extension
   - Refresh the page

2. **"Transaction failed"**
   - Check wallet has sufficient ETH for gas
   - Verify contract address is correct
   - Check network connection

3. **"Backend service offline"**
   - Ensure Python service is running
   - Check firewall/port settings
   - Verify environment variables

4. **"Contract not found"**
   - Verify contract address in .env
   - Ensure contract was deployed successfully
   - Check you're on the correct network

### Debug Commands

```bash
# Check contract deployment
npx hardhat verify --network sepolia CONTRACT_ADDRESS

# Test backend service
curl -X POST http://localhost:5000/api/blockchain/hash \
  -H "Content-Type: application/json" \
  -d '{"content":"test","label":"real","confidence":85}'

# Check blockchain status
node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://rpc.sepolia.org');
provider.getBlockNumber().then(console.log);
"
```

## Security Considerations

1. **Private Keys**: Never expose private keys in code or logs
2. **API Endpoints**: Secure backend API with authentication
3. **Rate Limiting**: Implement rate limiting for blockchain calls
4. **Gas Optimization**: Monitor and optimize gas usage
5. **Contract Upgrades**: Consider proxy patterns for upgradability

## Monitoring

Monitor your blockchain integration:

1. **Transaction Status**: Track successful/failed transactions
2. **Gas Usage**: Monitor gas costs and optimize
3. **Service Health**: Monitor backend service uptime
4. **Contract Events**: Listen for contract events

## Cost Estimation

Approximate costs per analysis (Sepolia testnet):
- **Contract Deployment**: ~0.01 ETH
- **Store Analysis**: ~0.001 ETH per transaction
- **Verify Analysis**: Free (read-only)

For production (Ethereum mainnet), costs will be higher. Consider Polygon for lower fees.

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review contract deployment logs
3. Test with Sepolia testnet first
4. Verify all environment variables are set correctly

## Next Steps

Once blockchain integration is working:

1. **Analytics**: Add blockchain analytics to dashboard
2. **Bulk Operations**: Implement batch storage for efficiency
3. **Verification UI**: Add public verification interface
4. **API Integration**: Expose blockchain verification via API
5. **Mobile Support**: Add mobile wallet integration