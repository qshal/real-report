/**
 * Blockchain API Integration Layer
 * 
 * Three-Layer Architecture:
 * 1. Smart Contract Layer: Solidity contract on Polygon/Ethereum
 * 2. Backend Service Layer: Python/Node.js Web3 integration
 * 3. API Integration Layer: This file - automatic storage after verification
 */

import { supabase } from "@/integrations/supabase/client";

const BACKEND_URL = import.meta.env.VITE_BLOCKCHAIN_BACKEND_URL || 'http://localhost:5000';
const USE_EDGE_FUNCTION = import.meta.env.VITE_USE_EDGE_FUNCTION === 'true';

export interface BlockchainStoreResult {
  success: boolean;
  txHash?: string;
  contentHash?: string;
  resultHash?: string;
  error?: string;
}

export interface BlockchainVerifyResult {
  verified: boolean;
  details?: {
    result_hash: string;
    timestamp: number;
    verifier: string;
  };
  error?: string;
}

/**
 * Store analysis on blockchain via backend service
 * Layer 3: API Integration - calls Layer 2 (Backend Service)
 */
export async function storeAnalysisOnBackend(
  content: string,
  label: string,
  confidence: number
): Promise<BlockchainStoreResult> {
  try {
    if (USE_EDGE_FUNCTION) {
      // Use Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('blockchain-service', {
        body: {
          action: 'store',
          data: {
            content,
            label,
            confidence,
            timestamp: Math.floor(Date.now() / 1000),
          },
        },
      });

      if (error) throw error;
      return data;
    } else {
      // Use Python backend service
      const response = await fetch(`${BACKEND_URL}/api/blockchain/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          label,
          confidence,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to store on blockchain',
        };
      }

      return data;
    }
  } catch (error) {
    console.error('Blockchain API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify analysis on blockchain
 */
export async function verifyAnalysisOnBackend(
  content: string,
  label: string,
  confidence: number,
  timestamp: number
): Promise<BlockchainVerifyResult> {
  try {
    if (USE_EDGE_FUNCTION) {
      const { data, error } = await supabase.functions.invoke('blockchain-service', {
        body: {
          action: 'verify',
          data: {
            contentHash: await generateContentHash(content),
            resultHash: await generateResultHash(label, confidence, timestamp),
          },
        },
      });

      if (error) throw error;
      return data;
    } else {
      const response = await fetch(`${BACKEND_URL}/api/blockchain/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          label,
          confidence,
          timestamp,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          verified: false,
          error: data.error || 'Verification failed',
        };
      }

      return data;
    }
  } catch (error) {
    console.error('Blockchain verification error:', error);
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get blockchain service status
 */
export async function getBlockchainStatus(): Promise<{
  connected: boolean;
  contractAddress?: string;
  rpcUrl?: string;
  walletAddress?: string;
}> {
  try {
    if (USE_EDGE_FUNCTION) {
      const { data, error } = await supabase.functions.invoke('blockchain-service', {
        body: { action: 'status' },
      });

      if (error) throw error;
      return data;
    } else {
      const response = await fetch(`${BACKEND_URL}/api/blockchain/status`);
      return await response.json();
    }
  } catch (error) {
    console.error('Status check error:', error);
    return {
      connected: false,
    };
  }
}

/**
 * Generate SHA-256 hash of content
 */
export async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate result hash from analysis outcome
 */
export async function generateResultHash(
  label: string,
  confidence: number,
  timestamp: number
): Promise<string> {
  const data = `${label}:${confidence}:${timestamp}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Automatic storage after verification
 * This is called automatically when an analysis is verified
 */
export async function autoStoreOnBlockchain(
  content: string,
  label: string,
  confidence: number,
  verified: boolean
): Promise<BlockchainStoreResult | null> {
  // Only store if analysis is verified
  if (!verified) {
    console.log('Analysis not verified, skipping blockchain storage');
    return null;
  }

  console.log('Auto-storing verified analysis on blockchain...');
  return await storeAnalysisOnBackend(content, label, confidence);
}
