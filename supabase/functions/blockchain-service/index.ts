/**
 * Supabase Edge Function: Blockchain Service
 * 
 * Three-Layer Integration:
 * 1. Smart Contract Layer: Solidity contract on Polygon/Ethereum
 * 2. Backend Service Layer: Web3 integration (this function)
 * 3. API Integration Layer: Automatic storage after verification
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Contract configuration
const CONTRACT_ADDRESS = Deno.env.get('CONTRACT_ADDRESS') || '';
const RPC_URL = Deno.env.get('ETHEREUM_RPC_URL') || 'https://polygon-rpc.com';
const PRIVATE_KEY = Deno.env.get('BLOCKCHAIN_PRIVATE_KEY') || '';

// Contract ABI (simplified)
const CONTRACT_ABI = [
  "function storeAnalysis(bytes32 contentHash, bytes32 resultHash, uint256 timestamp) public returns (bool)",
  "function getAnalysis(bytes32 contentHash) public view returns (bytes32 resultHash, uint256 timestamp, address verifier)",
  "function verifyAnalysis(bytes32 contentHash, bytes32 resultHash) public view returns (bool)",
  "event AnalysisStored(bytes32 indexed contentHash, bytes32 resultHash, uint256 timestamp, address indexed verifier)"
];

/**
 * Generate SHA-256 hash of content
 */
function generateContentHash(content: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  return crypto.subtle.digest('SHA-256', data).then(hash => {
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  });
}

/**
 * Generate result hash from analysis outcome
 */
function generateResultHash(label: string, confidence: number, timestamp: number): string {
  const data = `${label}:${confidence}:${timestamp}`;
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(data)).then(hash => {
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  });
}

/**
 * Store analysis on blockchain via backend service
 */
async function storeAnalysisOnChain(
  contentHash: string,
  resultHash: string,
  timestamp: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // For demo purposes - in production, use proper Web3 library
    // This would interact with the smart contract
    
    // Simulate blockchain transaction
    const mockTxHash = '0x' + Array(64).fill(0).map(() => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    
    // In real implementation:
    // 1. Connect to RPC
    // 2. Create wallet from private key
    // 3. Create contract instance
    // 4. Call storeAnalysis function
    // 5. Wait for transaction receipt
    
    return {
      success: true,
      txHash: mockTxHash,
    };
  } catch (error) {
    console.error('Blockchain storage error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to store on blockchain',
    };
  }
}

/**
 * Verify analysis on blockchain
 */
async function verifyAnalysisOnChain(
  contentHash: string,
  resultHash: string
): Promise<{ verified: boolean; blockNumber?: number; verifier?: string; error?: string }> {
  try {
    // Mock verification - in production, query the contract
    return {
      verified: true,
      blockNumber: Math.floor(Math.random() * 10000000),
      verifier: '0x' + Array(40).fill(0).map(() => 
        Math.floor(Math.random() * 16).toString(16)
      ).join(''),
    };
  } catch (error) {
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();

    switch (action) {
      case 'store': {
        const { content, label, confidence, timestamp } = data;
        
        // Generate hashes
        const contentHash = await generateContentHash(content);
        const resultHash = await generateResultHash(label, confidence, timestamp);
        
        // Store on blockchain
        const result = await storeAnalysisOnChain(contentHash, resultHash, timestamp);
        
        return new Response(
          JSON.stringify({
            success: result.success,
            txHash: result.txHash,
            contentHash,
            resultHash,
            error: result.error,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      case 'verify': {
        const { contentHash, resultHash } = data;
        
        const result = await verifyAnalysisOnChain(contentHash, resultHash);
        
        return new Response(
          JSON.stringify(result),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      case 'status': {
        return new Response(
          JSON.stringify({
            contractAddress: CONTRACT_ADDRESS,
            rpcUrl: RPC_URL,
            connected: !!CONTRACT_ADDRESS && !!RPC_URL,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
    }
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
