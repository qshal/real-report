/**
 * TruthChain API Integration
 * Connects to the Python TruthChain backend service
 */

const BLOCKCHAIN_API_BASE = import.meta.env.VITE_BLOCKCHAIN_API_URL || 'http://localhost:5000/api/blockchain';

export interface BlockchainStatus {
  connected: boolean;
  network?: string;
  chain_id?: number;
  contract_address?: string;
  wallet_address?: string;
  explorer_url?: string;
  storage_enabled?: boolean;
  total_verifications?: number;
  real_news_count?: number;
  fake_news_count?: number;
  accuracy_percent?: number;
}

export interface BlockchainStoreResult {
  success: boolean;
  tx_hash?: string;
  article_hash?: string;
  network?: string;
  explorer_url?: string;
  duplicate?: boolean;
  previously_verified?: boolean;
  is_real?: boolean;
  trust_score?: number;
  verification_date?: string;
  message?: string;
  error?: string;
}

export interface BlockchainVerifyResult {
  verified: boolean;
  details?: {
    previously_verified: boolean;
    article_hash: string;
    is_real: boolean;
    trust_score: number;
    source: string;
    timestamp: number;
    verifier: string;
    pipeline_version: string;
    confidence: number;
    verification_method: string;
    verification_date: string;
  };
  error?: string;
}

export interface BlockchainHashResult {
  article_hash: string;
  timestamp: number;
  network: string;
}

export interface BlockchainStats {
  storage_enabled: boolean;
  network?: string;
  contract_address?: string;
  total_verifications?: number;
  real_news_count?: number;
  fake_news_count?: number;
  accuracy_percent?: number;
  explorer_url?: string;
  error?: string;
}

/**
 * Get blockchain service status
 */
export async function getBlockchainApiStatus(): Promise<BlockchainStatus> {
  try {
    const response = await fetch(`${BLOCKCHAIN_API_BASE}/status`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Blockchain API status check failed:', error);
    return { connected: false };
  }
}

/**
 * Store news verification on blockchain via backend service
 */
export async function storeVerificationViaApi(
  content: string,
  label: string,
  confidence: number,
  trustScore?: number,
  sourceUrl?: string,
  verificationMethod: string = "multi_model_ensemble"
): Promise<BlockchainStoreResult> {
  try {
    const response = await fetch(`${BLOCKCHAIN_API_BASE}/store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        label,
        confidence,
        trust_score: trustScore || confidence,
        source_url: sourceUrl,
        verification_method: verificationMethod,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP ${response.status}`,
      };
    }

    return result;
  } catch (error) {
    console.error('Blockchain API store failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Verify if article was previously verified via backend service
 */
export async function verifyArticleViaApi(
  content: string
): Promise<BlockchainVerifyResult> {
  try {
    const response = await fetch(`${BLOCKCHAIN_API_BASE}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      return {
        verified: false,
        error: result.error || `HTTP ${response.status}`,
      };
    }

    return result;
  } catch (error) {
    console.error('Blockchain API verify failed:', error);
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get blockchain statistics
 */
export async function getBlockchainStatsViaApi(): Promise<BlockchainStats> {
  try {
    const response = await fetch(`${BLOCKCHAIN_API_BASE}/stats`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Blockchain API stats failed:', error);
    return {
      storage_enabled: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Generate article hash without storing
 */
export async function generateHashViaApi(
  content: string
): Promise<BlockchainHashResult | null> {
  try {
    const response = await fetch(`${BLOCKCHAIN_API_BASE}/hash`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Blockchain API hash generation failed:', error);
    return null;
  }
}

/**
 * Check for duplicate verification before analysis
 */
export async function checkDuplicateVerification(
  content: string
): Promise<{
  isDuplicate: boolean;
  previousVerification?: BlockchainVerifyResult['details'];
  error?: string;
}> {
  try {
    const result = await verifyArticleViaApi(content);
    
    if (result.error) {
      return { isDuplicate: false, error: result.error };
    }
    
    return {
      isDuplicate: result.verified,
      previousVerification: result.details,
    };
  } catch (error) {
    return {
      isDuplicate: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}