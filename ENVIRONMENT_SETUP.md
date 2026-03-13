# Environment Variables Setup Guide

This guide explains how to set up environment variables for the Real Report application.

## Quick Start

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file** with your actual values (see details below)

3. **Restart your development server** after making changes

## Required Variables

### Supabase (Required for app to work)

The application requires Supabase for authentication and data storage.

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project or select an existing one
3. Navigate to **Settings** → **API**
4. Copy the following values:

```env
VITE_SUPABASE_URL=https://zbsrqijluhxnckfedewl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_3o7gS0AVKSOflksr35FB2Q_0I1Fd-Io
```

## Optional Variables

### Blockchain Configuration

Required only if you want to use blockchain storage features.

#### Step 1: Choose a Network

**For Testing (Recommended):**
- **Mumbai Testnet** (Polygon testnet) - Free, fast, good for development
- **Sepolia Testnet** (Ethereum testnet) - Free, slower, more realistic

**For Production:**
- **Polygon Mainnet** - Low fees, fast
- **Ethereum Mainnet** - Higher fees, most secure

#### Step 2: Deploy Smart Contract

1. Deploy the TruthChain contract to your chosen network
2. Copy the contract address

#### Step 3: Configure Environment Variables

```env
# Network name (mumbai, polygon, sepolia, ethereum)
VITE_BLOCKCHAIN_NETWORK=mumbai

# Your deployed contract address
VITE_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890

# Version identifier for your analysis pipeline
VITE_PIPELINE_VERSION=4.0.0
```

**Note:** If you don't set these, the app will work but blockchain features will be disabled.

### NewsAPI (Optional)

Used for cross-referencing news articles. Free tier: 100 requests/day.

1. Go to [NewsAPI.org](https://newsapi.org/register)
2. Sign up for a free account
3. Copy your API key

```env
VITE_NEWS_API_KEY=your-api-key-here
```

**Note:** Without this, the app will use AI-only analysis (still works, but less accurate).

### Google Fact Check API (Optional)

Used for additional fact-checking verification.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Fact Check Tools API"
4. Create API credentials

```env
VITE_GOOGLE_FACT_CHECK_API_KEY=your-api-key-here
```

## Setting Up Environment Variables

### Method 1: Using `.env` File (Recommended for Development)

1. **Create `.env` file** in the project root:
   ```bash
   # Windows
   copy .env.example .env
   
   # Mac/Linux
   cp .env.example .env
   ```

2. **Edit `.env`** with your favorite text editor:
   ```bash
   # Windows
   notepad .env
   
   # Mac/Linux
   nano .env
   # or
   code .env
   ```

3. **Add your values** (see examples above)

4. **Restart your dev server:**
   ```bash
   npm run dev
   ```

### Method 2: Using System Environment Variables (Production)

For production deployments (Vercel, Netlify, etc.):

#### Vercel
1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add each variable with its value
4. Redeploy your application

#### Netlify
1. Go to **Site settings** → **Environment variables**
2. Add each variable
3. Redeploy

#### Other Platforms
Set environment variables according to your platform's documentation.

## Verification

After setting up your environment variables:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Check the browser console** for any missing variable warnings

3. **Test the features:**
   - **Supabase:** Try logging in/registering
   - **Blockchain:** Check the Blockchain Status card in the dashboard
   - **NewsAPI:** Run an analysis and check if news sources are found

## Troubleshooting

### Variables Not Loading?

1. **Make sure the file is named `.env`** (not `.env.txt` or `.env.example`)
2. **Restart your dev server** after changing variables
3. **Check for typos** in variable names (must start with `VITE_`)
4. **Verify the file is in the project root** (same level as `package.json`)

### Blockchain Not Working?

1. **Check MetaMask is installed** and connected
2. **Verify contract address** is correct for your network
3. **Ensure you're on the correct network** in MetaMask
4. **Check browser console** for error messages

### NewsAPI Errors?

1. **Verify API key** is correct
2. **Check rate limits** (free tier: 100 requests/day)
3. **Ensure you're using the correct endpoint** (everything endpoint requires paid plan)

## Security Notes

⚠️ **IMPORTANT:**
- **Never commit `.env` file** to version control
- `.env` is already in `.gitignore`
- Use `.env.example` as a template (without real values)
- For production, use secure environment variable management
- Never share your API keys publicly

## File Structure

```
real-report/
├── .env                 # Your actual environment variables (not in git)
├── .env.example         # Template file (safe to commit)
└── ENVIRONMENT_SETUP.md # This file
```

## Need Help?

- Check the [README.md](./README.md) for general setup
- Review error messages in browser console
- Verify all required Supabase tables are created (see migrations)

