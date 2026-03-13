/**
 * Analysis Blockchain System
 * Creates immutable chain of analyses with unique verification codes
 */

/**
 * Browser-compatible SHA-256 hash function
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Synchronous hash for compatibility (uses simple hash)
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

export interface AnalysisBlock {
  blockNumber: number;
  timestamp: number;
  verificationCode: string;
  contentHash: string;
  previousHash: string;
  data: {
    inputText: string;
    inputType: 'text' | 'url';
    prediction: string;
    confidence: number;
    trustScore: number;
    explanation: string;
    nlpFeatures?: {
      sentiment: number;
      clickbait: number;
      readability: number;
    };
    modelUsed: string;
  };
  nonce: number;
  hash: string;
}

export interface BlockchainSearchResult {
  found: boolean;
  block?: AnalysisBlock;
  similarBlocks?: AnalysisBlock[];
  message: string;
}

class AnalysisBlockchain {
  private chain: AnalysisBlock[] = [];
  private readonly DIFFICULTY = 2; // Number of leading zeros required

  constructor() {
    // Create genesis block
    this.createGenesisBlock();
  }

  /**
   * Create the first block in the chain
   */
  private createGenesisBlock(): void {
    const genesisBlock: AnalysisBlock = {
      blockNumber: 0,
      timestamp: Date.now(),
      verificationCode: 'GENESIS-0000',
      contentHash: '0',
      previousHash: '0',
      data: {
        inputText: 'Genesis Block - Analysis Blockchain Initialized',
        inputType: 'text',
        prediction: 'real',
        confidence: 100,
        trustScore: 100,
        explanation: 'This is the genesis block of the analysis blockchain',
        modelUsed: 'system',
      },
      nonce: 0,
      hash: '',
    };

    genesisBlock.hash = this.calculateHash(genesisBlock);
    this.chain.push(genesisBlock);
  }

  /**
   * Generate unique verification code
   */
  private generateVerificationCode(blockNumber: number, contentHash: string): string {
    const prefix = 'VRF';
    const blockHex = blockNumber.toString(16).toUpperCase().padStart(4, '0');
    const contentPrefix = contentHash.substring(0, 8).toUpperCase();
    const checksum = this.calculateChecksum(contentHash);
    
    return `${prefix}-${blockHex}-${contentPrefix}-${checksum}`;
  }

  /**
   * Calculate checksum for verification code
   */
  private calculateChecksum(input: string): string {
    const hash = simpleHash(input);
    return hash.substring(0, 4).toUpperCase();
  }

  /**
   * Calculate hash for a block
   */
  private calculateHash(block: AnalysisBlock): string {
    const data = JSON.stringify({
      blockNumber: block.blockNumber,
      timestamp: block.timestamp,
      verificationCode: block.verificationCode,
      contentHash: block.contentHash,
      previousHash: block.previousHash,
      data: block.data,
      nonce: block.nonce,
    });

    return simpleHash(data);
  }

  /**
   * Calculate content hash from input
   */
  private calculateContentHash(input: string): string {
    return simpleHash(input.toLowerCase().trim());
  }

  /**
   * Mine block (Proof of Work)
   */
  private mineBlock(block: AnalysisBlock): AnalysisBlock {
    const target = '0'.repeat(this.DIFFICULTY);
    
    while (!block.hash.startsWith(target)) {
      block.nonce++;
      block.hash = this.calculateHash(block);
    }

    return block;
  }

  /**
   * Get the latest block
   */
  private getLatestBlock(): AnalysisBlock {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Add new analysis to blockchain
   */
  addAnalysis(
    inputText: string,
    inputType: 'text' | 'url',
    prediction: string,
    confidence: number,
    trustScore: number,
    explanation: string,
    modelUsed: string,
    nlpFeatures?: { sentiment: number; clickbait: number; readability: number }
  ): AnalysisBlock {
    const previousBlock = this.getLatestBlock();
    const blockNumber = previousBlock.blockNumber + 1;
    const contentHash = this.calculateContentHash(inputText);
    const verificationCode = this.generateVerificationCode(blockNumber, contentHash);

    const newBlock: AnalysisBlock = {
      blockNumber,
      timestamp: Date.now(),
      verificationCode,
      contentHash,
      previousHash: previousBlock.hash,
      data: {
        inputText,
        inputType,
        prediction,
        confidence,
        trustScore,
        explanation,
        nlpFeatures,
        modelUsed,
      },
      nonce: 0,
      hash: '',
    };

    // Mine the block
    const minedBlock = this.mineBlock(newBlock);
    this.chain.push(minedBlock);

    return minedBlock;
  }

  /**
   * Search by verification code
   */
  searchByCode(verificationCode: string): BlockchainSearchResult {
    const block = this.chain.find(b => b.verificationCode === verificationCode);

    if (block) {
      return {
        found: true,
        block,
        message: `Analysis found! Block #${block.blockNumber} verified.`,
      };
    }

    return {
      found: false,
      message: 'Verification code not found in blockchain.',
    };
  }

  /**
   * Search by content (exact or similar)
   */
  searchByContent(inputText: string): BlockchainSearchResult {
    const contentHash = this.calculateContentHash(inputText);

    // Exact match
    const exactMatch = this.chain.find(b => b.contentHash === contentHash);
    if (exactMatch) {
      return {
        found: true,
        block: exactMatch,
        message: `Exact match found! This content was previously analyzed in Block #${exactMatch.blockNumber}.`,
      };
    }

    // Similar matches (using simple text similarity)
    const similarBlocks = this.findSimilarContent(inputText);
    
    if (similarBlocks.length > 0) {
      return {
        found: false,
        similarBlocks,
        message: `No exact match, but found ${similarBlocks.length} similar analysis(es).`,
      };
    }

    return {
      found: false,
      message: 'No matching or similar analyses found.',
    };
  }

  /**
   * Find similar content using text similarity
   */
  private findSimilarContent(inputText: string, threshold: number = 0.6): AnalysisBlock[] {
    const similar: Array<{ block: AnalysisBlock; similarity: number }> = [];

    for (const block of this.chain) {
      if (block.blockNumber === 0) continue; // Skip genesis block

      const similarity = this.calculateSimilarity(
        inputText.toLowerCase(),
        block.data.inputText.toLowerCase()
      );

      if (similarity >= threshold) {
        similar.push({ block, similarity });
      }
    }

    // Sort by similarity (highest first)
    similar.sort((a, b) => b.similarity - a.similarity);

    return similar.slice(0, 5).map(s => s.block);
  }

  /**
   * Calculate text similarity (Jaccard similarity)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.match(/\b\w+\b/g) || []);
    const words2 = new Set(text2.match(/\b\w+\b/g) || []);

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Verify blockchain integrity
   */
  verifyChain(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Verify hash
      const calculatedHash = this.calculateHash(currentBlock);
      if (currentBlock.hash !== calculatedHash) {
        errors.push(`Block #${i}: Hash mismatch`);
      }

      // Verify previous hash link
      if (currentBlock.previousHash !== previousBlock.hash) {
        errors.push(`Block #${i}: Previous hash mismatch`);
      }

      // Verify proof of work
      if (!currentBlock.hash.startsWith('0'.repeat(this.DIFFICULTY))) {
        errors.push(`Block #${i}: Invalid proof of work`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get blockchain statistics
   */
  getStats() {
    const totalBlocks = this.chain.length;
    const totalAnalyses = totalBlocks - 1; // Exclude genesis block

    const predictions = this.chain
      .slice(1)
      .reduce((acc, block) => {
        acc[block.data.prediction] = (acc[block.data.prediction] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const avgConfidence =
      this.chain.slice(1).reduce((sum, block) => sum + block.data.confidence, 0) / totalAnalyses || 0;

    return {
      totalBlocks,
      totalAnalyses,
      predictions,
      avgConfidence: avgConfidence.toFixed(2),
      chainValid: this.verifyChain().valid,
      latestBlock: this.getLatestBlock().blockNumber,
    };
  }

  /**
   * Get recent analyses
   */
  getRecentAnalyses(limit: number = 10): AnalysisBlock[] {
    return this.chain
      .slice(-limit)
      .reverse()
      .filter(b => b.blockNumber > 0);
  }

  /**
   * Get full chain
   */
  getChain(): AnalysisBlock[] {
    return [...this.chain];
  }

  /**
   * Export blockchain to JSON
   */
  exportChain(): string {
    return JSON.stringify(this.chain, null, 2);
  }

  /**
   * Get block by number
   */
  getBlockByNumber(blockNumber: number): AnalysisBlock | null {
    return this.chain.find(b => b.blockNumber === blockNumber) || null;
  }
}

// Singleton instance
let blockchainInstance: AnalysisBlockchain | null = null;

/**
 * Get blockchain instance
 */
export function getBlockchain(): AnalysisBlockchain {
  if (!blockchainInstance) {
    blockchainInstance = new AnalysisBlockchain();
  }
  return blockchainInstance;
}

/**
 * Format verification code for display
 */
export function formatVerificationCode(code: string): string {
  return code.replace(/-/g, ' - ');
}

/**
 * Validate verification code format
 */
export function isValidVerificationCode(code: string): boolean {
  const pattern = /^VRF-[0-9A-F]{4}-[0-9A-F]{8}-[0-9A-F]{4}$/;
  return pattern.test(code);
}
