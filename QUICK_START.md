# TruthChain Quick Start Guide

## Step 1: Fix Python Dependencies

You're getting a `pkg_resources` error. Here's how to fix it:

### Option A: Use Setup Script (Recommended)
```powershell
# In PowerShell (as Administrator)
cd backend
.\setup.ps1
```

### Option B: Manual Installation
```powershell
# Upgrade pip first
python -m pip install --upgrade pip

# Install setuptools explicitly
python -m pip install setuptools>=65.0.0

# Install requirements
python -m pip install -r requirements.txt
```

### Option C: Individual Package Installation
If the above fails, install packages one by one:
```powershell
python -m pip install flask==3.0.0
python -m pip install flask-cors==4.0.0
python -m pip install web3==6.15.1
python -m pip install eth-account==0.10.0
python -m pip install python-dotenv==1.0.0
```

## Step 2: Generate Wallet

```powershell
# Go back to project root
cd ..

# Generate a new wallet
node scripts/generate-wallet.js
```

This will output something like:
```
📍 Address: 0x1234567890123456789012345678901234567890
🔑 Private Key: abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

## Step 3: Update Environment Variables

Copy the private key (without 0x) to your `.env` file:
```env
PRIVATE_KEY="abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
BLOCKCHAIN_PRIVATE_KEY="abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
```

## Step 4: Get Testnet ETH

1. Go to [Sepolia Faucet](https://sepoliafaucet.com/)
2. Enter your wallet address: `0x1234567890123456789012345678901234567890`
3. Request testnet ETH

## Step 5: Deploy Smart Contract

```powershell
# Compile and deploy
npx hardhat run scripts/deploy-contract.ts --network sepolia
```

This will output:
```
✅ TruthChain deployed to: 0xABCDEF1234567890ABCDEF1234567890ABCDEF12
```

## Step 6: Update Contract Address

Add the contract address to your `.env`:
```env
VITE_CONTRACT_ADDRESS="0xABCDEF1234567890ABCDEF1234567890ABCDEF12"
CONTRACT_ADDRESS="0xABCDEF1234567890ABCDEF1234567890ABCDEF12"
```

## Step 7: Start Backend Service

```powershell
cd backend
python blockchain_service.py
```

You should see:
```
🚀 Starting TruthChain Blockchain Service
🌐 Network: Sepolia Testnet
✅ Connected to Sepolia Testnet
📍 Contract: 0xABCDEF1234567890ABCDEF1234567890ABCDEF12
👤 Wallet: 0x1234567890123456789012345678901234567890
💾 Storage: Enabled
```

## Step 8: Start Frontend

```powershell
# In a new terminal, go to project root
npm run dev
```

## Step 9: Test the Integration

1. Open http://localhost:5173
2. Go to the dashboard
3. Check the "Blockchain Verification" card - should show "Connected"
4. Submit an article for analysis
5. Check that it gets stored on blockchain

## Troubleshooting

### Python Issues
- **"python not found"**: Install Python from python.org
- **"pkg_resources missing"**: Run `python -m pip install setuptools>=65.0.0`
- **Permission errors**: Run PowerShell as Administrator

### Blockchain Issues
- **"Contract not found"**: Make sure you deployed the contract and updated .env
- **"Insufficient funds"**: Get more testnet ETH from the faucet
- **"Transaction failed"**: Check your private key and network settings

### Network Issues
- **Backend not starting**: Check if port 5000 is available
- **Frontend can't connect**: Make sure backend is running on localhost:5000

## Production Deployment

For production, change these settings in `.env`:
```env
# Use Polygon mainnet for lower fees
VITE_BLOCKCHAIN_NETWORK="polygon"
BLOCKCHAIN_NETWORK="polygon"
POLYGON_RPC_URL="https://polygon-rpc.com"

# Or Ethereum mainnet for maximum security
VITE_BLOCKCHAIN_NETWORK="ethereum"
BLOCKCHAIN_NETWORK="ethereum"
ETHEREUM_RPC_URL="https://mainnet.infura.io/v3/YOUR_PROJECT_ID"
```

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Ensure all environment variables are set correctly
3. Verify you have testnet ETH in your wallet
4. Check that all services are running (backend on :5000, frontend on :5173)