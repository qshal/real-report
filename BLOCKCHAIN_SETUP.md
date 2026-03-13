# Blockchain Configuration Guide

This guide provides step-by-step instructions for setting up blockchain integration with the Real Report application.

## Prerequisites

- MetaMask browser extension installed
- Basic understanding of blockchain wallets
- Testnet tokens (free) for testing

## Step 1: Install MetaMask

1. **Download MetaMask:**
   - Visit [metamask.io](https://metamask.io)
   - Click "Download" and select your browser (Chrome, Firefox, Edge, etc.)
   - Follow the installation prompts

2. **Create or Import Wallet:**
   - If new: Create a new wallet and **save your seed phrase securely**
   - If existing: Import using your seed phrase

3. **Verify Installation:**
   - You should see the MetaMask fox icon in your browser toolbar
   - Click it to open the extension

## Step 2: Choose Your Network

### For Testing (Recommended First)

**Option A: Mumbai Testnet (Polygon Testnet) - Recommended**
- ✅ Fast transactions
- ✅ Free test tokens easy to get
- ✅ Low gas fees
- ✅ Good for development

**Option B: Sepolia Testnet (Ethereum Testnet)**
- ✅ More realistic to mainnet
- ⚠️ Slower transactions
- ✅ Free test tokens available

### For Production

**Option C: Polygon Mainnet**
- ✅ Very low fees (~$0.01 per transaction)
- ✅ Fast transactions
- ⚠️ Requires real MATIC tokens

**Option D: Ethereum Mainnet**
- ✅ Most secure and established
- ⚠️ Higher fees (~$5-50 per transaction)
- ⚠️ Requires real ETH tokens

## Step 3: Add Network to MetaMask

### For Mumbai Testnet (Recommended)

1. **Open MetaMask** and click the network dropdown (top of extension)
2. **Click "Add Network"** or "Add a network manually"
3. **Enter these details:**
   ```
   Network Name: Mumbai Testnet
   RPC URL: https://rpc-mumbai.maticvigil.com
   Chain ID: 80001
   Currency Symbol: MATIC
   Block Explorer: https://mumbai.polygonscan.com
   ```
4. **Click "Save"**

### For Sepolia Testnet

1. **Open MetaMask** and click the network dropdown
2. **Click "Add Network"** or "Add a network manually"
3. **Enter these details:**
   ```
   Network Name: Sepolia Testnet
   RPC URL: https://rpc.sepolia.org
   Chain ID: 11155111
   Currency Symbol: ETH
   Block Explorer: https://sepolia.etherscan.io
   ```
4. **Click "Save"**

### For Polygon Mainnet

1. **Open MetaMask** and click the network dropdown
2. **Click "Add Network"** or "Add a network manually"
3. **Enter these details:**
   ```
   Network Name: Polygon Mainnet
   RPC URL: https://polygon-rpc.com
   Chain ID: 137
   Currency Symbol: MATIC
   Block Explorer: https://polygonscan.com
   ```
4. **Click "Save"**

## Step 4: Get Testnet Tokens (For Testnets Only)

### Mumbai Testnet (MATIC)

1. **Switch to Mumbai Testnet** in MetaMask
2. **Copy your wallet address** (click on account name to copy)
3. **Get free MATIC from a faucet:**
   - Option 1: [Polygon Faucet](https://faucet.polygon.technology/)
   - Option 2: [Alchemy Faucet](https://www.alchemy.com/faucets/polygon-mumbai)
   - Option 3: [QuickNode Faucet](https://faucet.quicknode.com/polygon/mumbai)
4. **Paste your address** and request tokens
5. **Wait 1-2 minutes** for tokens to arrive

### Sepolia Testnet (ETH)

1. **Switch to Sepolia Testnet** in MetaMask
2. **Copy your wallet address**
3. **Get free ETH from a faucet:**
   - Option 1: [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
   - Option 2: [Infura Faucet](https://www.infura.io/faucet/sepolia)
   - Option 3: [Chainlink Faucet](https://faucets.chain.link/sepolia)
4. **Paste your address** and request tokens
5. **Wait 1-2 minutes** for tokens to arrive

## Step 5: Deploy Smart Contract

### Option A: Using Hardhat (Recommended)

1. **Navigate to contracts directory:**
   ```bash
   cd contracts
   ```

2. **Check if contract exists:**
   ```bash
   # Look for TruthChain.sol or similar contract file
   ls *.sol
   ```

3. **If contract exists, deploy it:**
   ```bash
   # Install dependencies if needed
   npm install
   
   # Deploy to Mumbai testnet
   npx hardhat run scripts/deploy.js --network mumbai
   ```

4. **Copy the contract address** from the deployment output
   - It will look like: `0x1234567890123456789012345678901234567890`

### Option B: Using Remix IDE (Easier for Beginners)

1. **Go to [Remix IDE](https://remix.ethereum.org/)**

2. **Create new file:**
   - Click "File Explorer" in left sidebar
   - Click "+" to create new file
   - Name it `TruthChain.sol`

3. **Paste your contract code** (if you have it)

4. **Compile:**
   - Go to "Solidity Compiler" tab
   - Select compiler version (0.8.0 or higher)
   - Click "Compile TruthChain.sol"

5. **Deploy:**
   - Go to "Deploy & Run Transactions" tab
   - Select "Injected Provider - MetaMask" as environment
   - Make sure you're on the correct network (Mumbai/Sepolia)
   - Click "Deploy"
   - **Approve the transaction** in MetaMask
   - **Copy the contract address** from the deployed contracts section

### Option C: Use Pre-Deployed Contract (For Testing)

If you don't have a contract yet, you can use a test contract address for now:

```env
# For Mumbai Testnet - Example (replace with your own)
VITE_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
```

**Note:** You'll need to deploy your own contract for production use.

## Step 6: Configure Environment Variables

1. **Open your `.env` file** in the project root (create it if it doesn't exist)

2. **Add blockchain configuration:**

   ```env
   # Network Configuration
   # Options: 'mumbai', 'polygon', 'sepolia', 'ethereum'
   VITE_BLOCKCHAIN_NETWORK=mumbai
   
   # Your deployed contract address
   VITE_CONTRACT_ADDRESS=0xYourContractAddressHere
   
   # Pipeline version identifier
   VITE_PIPELINE_VERSION=4.0.0
   ```

3. **Example for Mumbai Testnet:**
   ```env
   VITE_BLOCKCHAIN_NETWORK=mumbai
   VITE_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
   VITE_PIPELINE_VERSION=4.0.0
   ```

4. **Example for Polygon Mainnet:**
   ```env
   VITE_BLOCKCHAIN_NETWORK=polygon
   VITE_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
   VITE_PIPELINE_VERSION=4.0.0
   ```

5. **Save the file**

## Step 7: Restart Development Server

1. **Stop your current dev server** (Ctrl+C)

2. **Start it again:**
   ```bash
   npm run dev
   ```

3. **The environment variables will be loaded**

## Step 8: Test Blockchain Connection

1. **Open the application** in your browser

2. **Navigate to Dashboard** (after logging in)

3. **Look for "Blockchain Status" card:**
   - Should show connection status
   - Should display network name
   - Should show statistics (if contract is deployed)

4. **Connect MetaMask:**
   - Click "Connect MetaMask Wallet" button (if shown)
   - Approve the connection in MetaMask popup
   - Status should change to "Connected"

5. **Test Analysis with Blockchain:**
   - Submit a news article for analysis
   - After analysis completes, check for blockchain transaction
   - You should see a toast notification with transaction hash
   - Click the transaction hash to view on blockchain explorer

## Step 9: Verify Transaction on Explorer

1. **After an analysis is stored:**
   - You'll see a transaction hash in the notification
   - Or check the analysis history for blockchain verification badge

2. **Click the transaction hash** or "View Transaction" link

3. **Blockchain explorer will open:**
   - **Mumbai:** [mumbai.polygonscan.com](https://mumbai.polygonscan.com)
   - **Sepolia:** [sepolia.etherscan.io](https://sepolia.etherscan.io)
   - **Polygon:** [polygonscan.com](https://polygonscan.com)
   - **Ethereum:** [etherscan.io](https://etherscan.io)

4. **Verify the transaction details:**
   - Check transaction status (Success/Failed)
   - View gas fees
   - See contract interaction details

## Troubleshooting

### MetaMask Not Detected

**Problem:** App says "MetaMask not installed"

**Solution:**
- Make sure MetaMask extension is installed and enabled
- Refresh the browser page
- Check if MetaMask is unlocked
- Try a different browser

### Wrong Network

**Problem:** Transaction fails or "Wrong network" error

**Solution:**
1. Check your `.env` file has correct `VITE_BLOCKCHAIN_NETWORK`
2. Switch MetaMask to the matching network
3. Restart dev server
4. Refresh browser

### Insufficient Funds

**Problem:** "Insufficient funds" error

**Solution:**
- For testnets: Get more test tokens from faucets
- For mainnet: Add real tokens to your wallet
- Check you have enough for gas fees (usually $0.01-0.10 for testnets)

### Contract Not Found

**Problem:** "Contract address not configured" or "Contract not found"

**Solution:**
1. Verify `VITE_CONTRACT_ADDRESS` in `.env` is correct
2. Make sure contract is deployed on the correct network
3. Check contract address on blockchain explorer
4. Restart dev server after changing `.env`

### Transaction Fails

**Problem:** Transaction shows as "Failed" on explorer

**Possible Causes:**
- Contract doesn't exist at that address
- Contract function signature doesn't match
- Insufficient gas
- Contract reverted (check error message)

**Solution:**
- Check contract is deployed correctly
- Verify contract ABI matches the code
- Increase gas limit in MetaMask
- Check contract code for revert conditions

### Environment Variables Not Loading

**Problem:** Changes to `.env` not taking effect

**Solution:**
1. Make sure file is named exactly `.env` (not `.env.txt`)
2. Restart dev server completely
3. Clear browser cache
4. Check variable names start with `VITE_`
5. Verify file is in project root (same folder as `package.json`)

## Quick Reference

### Network Configurations

| Network | Chain ID | RPC URL | Explorer | Currency |
|---------|----------|---------|----------|----------|
| Mumbai | 80001 | https://rpc-mumbai.maticvigil.com | https://mumbai.polygonscan.com | MATIC |
| Polygon | 137 | https://polygon-rpc.com | https://polygonscan.com | MATIC |
| Sepolia | 11155111 | https://rpc.sepolia.org | https://sepolia.etherscan.io | ETH |
| Ethereum | 1 | https://mainnet.infura.io/v3/YOUR_KEY | https://etherscan.io | ETH |

### Environment Variable Template

```env
# Required for blockchain features
VITE_BLOCKCHAIN_NETWORK=mumbai
VITE_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
VITE_PIPELINE_VERSION=4.0.0

# Optional: Custom RPC URLs (only if default doesn't work)
# VITE_ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
# VITE_SEPOLIA_RPC_URL=https://rpc.sepolia.org
```

## Next Steps

After successful setup:

1. ✅ Test with a few news articles
2. ✅ Verify transactions on blockchain explorer
3. ✅ Check blockchain statistics in the dashboard
4. ✅ Deploy to production network when ready
5. ✅ Update contract address for production

## Security Reminders

⚠️ **Important:**
- Never share your MetaMask seed phrase
- Never commit `.env` file to git
- Use testnets for development
- Verify contract addresses before mainnet use
- Keep your private keys secure

## Need Help?

- Check browser console for error messages
- Review MetaMask transaction history
- Verify contract deployment on explorer
- Check network connection in MetaMask
- Review the [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for general setup

