/**
 * TruthChain Blockchain Integration
 * Privacy-preserving news verification storage on blockchain
 */

import { ethers } from "ethers";

// Enhanced contract ABI for TruthChain
const TRUTHCHAIN_ABI = [
  "function storeNewsHash(string _articleHash, bool _isReal, uint256 _trustScore, string _source, string _pipelineVersion, uint256 _confidence, string _verificationMethod) public returns (bool)",
  "function verifyNewsHash(string _articleHash) public view returns (bool exists, bool isReal, uint256 trustScore)",
  "function getVerificationStatus(string _articleHash) public view returns (bool exists, bool isReal, uint256 trustScore, string source, uint256 timestamp, address verifier, string pipelineVersion, uint256 confidence, string verificationMethod)",
  "function getBlockchainStats() public view returns (uint256 total, uint256 realCount, uint256 fakeCount, uint256 accuracy)",
  "function articleExists(string _articleHash) public view returns (bool)",
  "event NewsVerified(string indexed articleHash, bool isReal, uint256 trustScore, string source, address indexed verifier, uint256 timestamp)"
];

// Multi-network configuration
const NETWORKS = {
  polygon: {
    rpcUrl: "https://polygon-rpc.com",
    chainId: 137,
    name: "Polygon Mainnet",
    explorer: "https://polygonscan.com"
  },
  mumbai: {
    rpcUrl: "https://rpc-mumbai.maticvigil.com",
    chainId: 80001,
    name: "Polygon Mumbai Testnet",
    explorer: "https://mumbai.polygonscan.com"
  },
  ethereum: {
    rpcUrl: import.meta.env.VITE_ETHEREUM_RPC_URL || "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
    chainId: 1,
    name: "Ethereum Mainnet",
    explorer: "https://etherscan.io"
  },
  sepolia: {
    rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
    chainId: 11155111,
    name: "Sepolia Testnet",
    explorer: "https://sepolia.etherscan.io"
  }
};

const NETWORK = import.meta.env.VITE_BLOCKCHAIN_NETWORK || 'mumbai';
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";
const PIPELINE_VERSION = import.meta.env.VITE_PIPELINE_VERSION || "4.0.0";

// News verification record structure
export interface NewsVerificationRecord {
  articleHash: string;
  isReal: boolean;
  trustScore: number;
  source: string;
  timestamp: number;
  verifier: string;
  pipelineVersion: string;
  confidence: number;
  verificationMethod: string;
  txHash?: string;
  blockNumber?: number;
}

// Blockchain storage result
export interface BlockchainStoreResult {
  success: boolean;
  txHash?: string;
  articleHash?: string;
  duplicate?: boolean;
  previousVerification?: NewsVerificationRecord;
  error?: string;
}

// Blockchain verification result
export interface BlockchainVerifyResult {
  verified: boolean;
  exists: boolean;
  details?: NewsVerificationRecord;
  error?: string;
}

/**
 * Generate SHA-256 hash of article content (privacy-preserving)
 */
export function generateArticleHash(articleText: string): string {
  return ethers.sha256(ethers.toUtf8Bytes(articleText));
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

/**
 * Store news verification on blockchain (MetaMask)
 */
export async function storeNewsVerification(
  articleText: string,
  prediction: string,
  trustScore: number,
  confidence: number,
  sourceUrl?: string,
  verificationMethod: string = "multi_model_ensemble"
): Promise<BlockchainStoreResult> {
  try {
    // Check if MetaMask is available
    if (!window.ethereum) {
      return { 
        success: false, 
        error: "MetaMask not installed. Please install MetaMask to use blockchain features." 
      };
    }

    if (!CONTRACT_ADDRESS) {
      return {
        success: false,
        error: "Blockchain contract address not configured. Please set VITE_CONTRACT_ADDRESS environment variable."
      };
    }

    // Request account access
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    // Connect to contract
    const contract = new ethers.Contract(CONTRACT_ADDRESS, TRUTHCHAIN_ABI, signer);
    
    // Generate article hash (privacy-preserving)
    const articleHash = generateArticleHash(articleText);
    
    // Check if article already exists
    const exists = await contract.articleExists(articleHash);
    if (exists) {
      // Get existing verification details
      const details = await contract.getVerificationStatus(articleHash);
      return {
        success: true,
        duplicate: true,
        articleHash,
        previousVerification: {
          articleHash,
          isReal: details[1],
          trustScore: Number(details[2]),
          source: details[3],
          timestamp: Number(details[4]),
          verifier: details[5],
          pipelineVersion: details[6],
          confidence: Number(details[7]),
          verificationMethod: details[8]
        }
      };
    }
    
    // Prepare parameters
    const isReal = prediction.toLowerCase() === 'real';
    const trustScoreInt = Math.max(0, Math.min(100, Math.round(trustScore * 100)));
    const confidenceInt = Math.max(0, Math.min(100, Math.round(confidence * 100)));
    const source = sourceUrl ? extractDomain(sourceUrl) : 'unknown';
    
    // Store on blockchain
    const tx = await contract.storeNewsHash(
      articleHash,
      isReal,
      trustScoreInt,
      source,
      PIPELINE_VERSION,
      confidenceInt,
      verificationMethod
    );
    
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.hash,
      articleHash,
    };
  } catch (error) {
    console.error("Blockchain storage error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to store on blockchain",
    };
  }
}

/**
 * Verify if article exists on blockchain
 */
export async function verifyNewsOnChain(
  articleText: string
): Promise<BlockchainVerifyResult> {
  try {
    if (!CONTRACT_ADDRESS) {
      return {
        verified: false,
        exists: false,
        error: "Contract address not configured"
      };
    }

    const networkConfig = NETWORKS[NETWORK as keyof typeof NETWORKS];
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, TRUTHCHAIN_ABI, provider);
    
    const articleHash = generateArticleHash(articleText);
    
    // Check if verification exists
    const [exists, isReal, trustScore] = await contract.verifyNewsHash(articleHash);
    
    if (exists) {
      // Get full verification details
      const details = await contract.getVerificationStatus(articleHash);
      return {
        verified: true,
        exists: true,
        details: {
          articleHash,
          isReal: details[1],
          trustScore: Number(details[2]),
          source: details[3],
          timestamp: Number(details[4]),
          verifier: details[5],
          pipelineVersion: details[6],
          confidence: Number(details[7]),
          verificationMethod: details[8]
        }
      };
    }
    
    return { verified: false, exists: false };
  } catch (error) {
    console.error("Blockchain verification error:", error);
    return {
      verified: false,
      exists: false,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

/**
 * Get blockchain statistics
 */
export async function getBlockchainStats(): Promise<{
  total: number;
  realCount: number;
  fakeCount: number;
  accuracy: number;
  network: string;
  explorer: string;
}> {
  try {
    if (!CONTRACT_ADDRESS) {
      const networkConfig = NETWORKS[NETWORK as keyof typeof NETWORKS];
      return {
        total: 0,
        realCount: 0,
        fakeCount: 0,
        accuracy: 0,
        network: networkConfig.name,
        explorer: networkConfig.explorer
      };
    }

    const networkConfig = NETWORKS[NETWORK as keyof typeof NETWORKS];
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, TRUTHCHAIN_ABI, provider);
    
    const [total, realCount, fakeCount, accuracy] = await contract.getBlockchainStats();
    
    return {
      total: Number(total),
      realCount: Number(realCount),
      fakeCount: Number(fakeCount),
      accuracy: Number(accuracy),
      network: networkConfig.name,
      explorer: networkConfig.explorer
    };
  } catch (error) {
    console.error("Failed to get blockchain stats:", error);
    const networkConfig = NETWORKS[NETWORK as keyof typeof NETWORKS];
    return {
      total: 0,
      realCount: 0,
      fakeCount: 0,
      accuracy: 0,
      network: networkConfig.name,
      explorer: networkConfig.explorer
    };
  }
}

/**
 * Get blockchain status for display
 */
export function getBlockchainStatus(): { 
  connected: boolean; 
  network: string;
  contractDeployed: boolean;
  explorer: string;
} {
  const networkConfig = NETWORKS[NETWORK as keyof typeof NETWORKS];
  
  return {
    connected: !!window.ethereum && !!CONTRACT_ADDRESS,
    network: networkConfig.name,
    contractDeployed: !!CONTRACT_ADDRESS,
    explorer: networkConfig.explorer
  };
}

/**
 * Get transaction URL for explorer
 */
export function getTransactionUrl(txHash: string): string {
  const networkConfig = NETWORKS[NETWORK as keyof typeof NETWORKS];
  return `${networkConfig.explorer}/tx/${txHash}`;
}

/**
 * Get contract URL for explorer
 */
export function getContractUrl(): string {
  const networkConfig = NETWORKS[NETWORK as keyof typeof NETWORKS];
  return `${networkConfig.explorer}/address/${CONTRACT_ADDRESS}`;
}

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

