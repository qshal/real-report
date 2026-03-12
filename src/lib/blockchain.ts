/**
 * Ethereum Blockchain Integration for Analysis Verification
 * 
 * Stores analysis hashes on-chain for immutable proof of fact-checking
 */

import { ethers } from "ethers";

// Analysis hash structure for blockchain storage
export interface AnalysisHash {
  id: string;
  contentHash: string; // SHA-256 hash of the analyzed content
  resultHash: string; // Hash of the verdict (label + confidence + timestamp)
  timestamp: number;
  txHash?: string;
  blockNumber?: number;
}

// Contract ABI for AnalysisRegistry (simplified)
const CONTRACT_ABI = [
  "function storeAnalysis(bytes32 contentHash, bytes32 resultHash, uint256 timestamp) public returns (bool)",
  "function getAnalysis(bytes32 contentHash) public view returns (bytes32 resultHash, uint256 timestamp, address verifier)",
  "function verifyAnalysis(bytes32 contentHash, bytes32 resultHash) public view returns (bool)",
  "event AnalysisStored(bytes32 indexed contentHash, bytes32 resultHash, uint256 timestamp, address indexed verifier)"
];

// For demo/testing - Sepolia testnet contract address (you'll need to deploy your own)
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";
const RPC_URL = import.meta.env.VITE_ETHEREUM_RPC_URL || "https://rpc.sepolia.org";

/**
 * Generate SHA-256 hash of content
 */
export function generateContentHash(content: string): string {
  return ethers.sha256(ethers.toUtf8Bytes(content));
}

/**
 * Generate result hash from analysis outcome
 */
export function generateResultHash(
  label: string,
  confidence: number,
  timestamp: number
): string {
  const data = `${label}:${confidence}:${timestamp}`;
  return ethers.sha256(ethers.toUtf8Bytes(data));
}

/**
 * Store analysis on blockchain
 * Requires user to have MetaMask connected
 */
export async function storeAnalysisOnChain(
  content: string,
  label: string,
  confidence: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // Check if MetaMask is available
    if (!window.ethereum) {
      return { success: false, error: "MetaMask not installed. Please install MetaMask to use blockchain features." };
    }

    // Request account access
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    // Connect to contract
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    
    // Generate hashes
    const contentHash = generateContentHash(content);
    const resultHash = generateResultHash(label, confidence, Date.now());
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Store on blockchain
    const tx = await contract.storeAnalysis(contentHash, resultHash, timestamp);
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.hash,
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
 * Verify if analysis exists on blockchain
 */
export async function verifyAnalysisOnChain(
  content: string,
  label: string,
  confidence: number,
  originalTimestamp: number
): Promise<{ verified: boolean; blockNumber?: number; verifier?: string; error?: string }> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    const contentHash = generateContentHash(content);
    const resultHash = generateResultHash(label, confidence, originalTimestamp);
    
    // Check if analysis exists and matches
    const isValid = await contract.verifyAnalysis(contentHash, resultHash);
    
    if (isValid) {
      const [storedResultHash, timestamp, verifier] = await contract.getAnalysis(contentHash);
      return {
        verified: true,
        verifier,
      };
    }
    
    return { verified: false };
  } catch (error) {
    console.error("Blockchain verification error:", error);
    return {
      verified: false,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

/**
 * Get blockchain status for display
 */
export function getBlockchainStatus(): { 
  connected: boolean; 
  network?: string; 
  address?: string;
  contractDeployed: boolean;
} {
  return {
    connected: !!CONTRACT_ADDRESS,
    contractDeployed: !!CONTRACT_ADDRESS,
  };
}

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
