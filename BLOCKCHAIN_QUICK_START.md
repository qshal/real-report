# Blockchain Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Install MetaMask (2 minutes)
1. Go to [metamask.io](https://metamask.io) and install extension
2. Create or import wallet
3. **Save your seed phrase securely!**

### Step 2: Add Mumbai Testnet (1 minute)
1. Open MetaMask → Click network dropdown → "Add Network"
2. Enter:
   ```
   Network Name: Mumbai Testnet
   RPC URL: https://rpc-mumbai.maticvigil.com
   Chain ID: 80001
   Currency: MATIC
   Explorer: https://mumbai.polygonscan.com
   ```
3. Click "Save"

### Step 3: Get Test Tokens (1 minute)
1. Switch to Mumbai Testnet in MetaMask
2. Copy your wallet address
3. Visit [Polygon Faucet](https://faucet.polygon.technology/)
4. Paste address and request MATIC tokens

### Step 4: Configure Environment (1 minute)
1. Create `.env` file in project root
2. Add:
   ```env
   VITE_BLOCKCHAIN_NETWORK=mumbai
   VITE_CONTRACT_ADDRESS=0xYourContractAddress
   VITE_PIPELINE_VERSION=4.0.0
   ```
3. Restart dev server: `npm run dev`

### Step 5: Deploy Contract
- **Option A:** Use Remix IDE (easiest)
  - Go to [remix.ethereum.org](https://remix.ethereum.org)
  - Deploy contract to Mumbai testnet
  - Copy contract address to `.env`

- **Option B:** Use Hardhat
  ```bash
  npx hardhat run scripts/deploy.js --network mumbai
  ```

## ✅ Verify Setup

1. Open app → Dashboard
2. Check "Blockchain Status" card shows "Connected"
3. Run an analysis
4. Look for blockchain transaction notification
5. Click transaction hash to view on explorer

## 📚 Full Guide

For detailed instructions, see [BLOCKCHAIN_SETUP.md](./BLOCKCHAIN_SETUP.md)

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| MetaMask not detected | Install/enable extension, refresh page |
| Wrong network | Switch MetaMask to Mumbai, check `.env` |
| No funds | Get test tokens from faucet |
| Contract not found | Verify contract address in `.env` |
| Variables not loading | Restart dev server, check file name is `.env` |

## 🌐 Network Quick Reference

**Mumbai Testnet (Recommended for testing):**
- Chain ID: 80001
- Faucet: https://faucet.polygon.technology/
- Explorer: https://mumbai.polygonscan.com

**Polygon Mainnet (Production):**
- Chain ID: 137
- Requires real MATIC tokens
- Explorer: https://polygonscan.com

