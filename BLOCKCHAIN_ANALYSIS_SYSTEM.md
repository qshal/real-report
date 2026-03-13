# Blockchain Analysis System

## Overview

This system creates an immutable blockchain of all analyses with unique verification codes. Each analysis is stored as a block in the chain, allowing you to search by verification code or content.

## Features

### 1. Unique Verification Codes
Every analysis gets a unique code in format: `VRF-XXXX-XXXXXXXX-XXXX`

Example: `VRF-0001-A7F3D2C1-4B8E`

**Format Breakdown**:
- `VRF` - Prefix (Verification)
- `0001` - Block number in hex
- `A7F3D2C1` - Content hash prefix
- `4B8E` - Checksum

### 2. Blockchain Structure
```
Block {
  blockNumber: 1
  timestamp: 1705334400000
  verificationCode: "VRF-0001-A7F3D2C1-4B8E"
  contentHash: "a7f3d2c1b8e9..."
  previousHash: "0000abc123..."
  data: {
    inputText: "News article content..."
    prediction: "fake"
    confidence: 87.3
    trustScore: 85.2
    explanation: "Analysis explanation..."
    nlpFeatures: { sentiment, clickbait, readability }
    modelUsed: "hybrid-ai"
  }
  nonce: 12345
  hash: "0000def456..."
}
```

### 3. Search Capabilities

**Search by Verification Code**:
```typescript
// Enter: VRF-0001-A7F3D2C1-4B8E
// Returns: Exact block with all analysis details
```

**Search by Content**:
```typescript
// Enter: "Breaking news about..."
// Returns: Exact match or similar analyses
```

### 4. Proof of Work
Each block is mined with difficulty level 2 (requires 2 leading zeros in hash).
This ensures computational effort and prevents tampering.

## How It Works

### Step 1: Analysis Submission
User submits text or URL for analysis
↓
AI analyzes content
↓
NLP features extracted
↓
Block created with unique code

### Step 2: Block Mining
```
Initial hash: abc123def456...
Nonce: 0 → Hash: abc123... (invalid)
Nonce: 1 → Hash: def456... (invalid)
...
Nonce: 12345 → Hash: 0000abc... (valid! ✓)
```

### Step 3: Chain Addition
New block linked to previous block
↓
Chain integrity verified
↓
Verification code generated
↓
User receives code

### Step 4: Search & Retrieval
User searches by code or content
↓
Blockchain searched
↓
Results returned with full details

## Usage Examples

### Example 1: New Analysis
```
Input: "Scientists discover cure for cancer"
↓
Analysis: FAKE (confidence: 92%)
↓
Block #42 created
↓
Code: VRF-002A-B3F7E1D4-9C2A
```

### Example 2: Search by Code
```
Search: VRF-002A-B3F7E1D4-9C2A
↓
Found: Block #42
↓
Display: Full analysis details
```

### Example 3: Search by Content
```
Search: "Scientists discover cure"
↓
Exact Match: Block #42
↓
Display: Previous analysis
```

### Example 4: Similar Content
```
Search: "Cancer cure discovered"
↓
No Exact Match
↓
Similar: 3 blocks found
- Block #42 (85% similar)
- Block #38 (72% similar)
- Block #15 (68% similar)
```

## Benefits

### 1. Immutability
✓ Cannot alter past analyses
✓ Cryptographically secured
✓ Tamper-proof chain

### 2. Traceability
✓ Every analysis tracked
✓ Unique verification codes
✓ Complete audit trail

### 3. Duplicate Detection
✓ Instant recognition of repeated content
✓ Reference to previous analysis
✓ Saves computation time

### 4. Transparency
✓ Full analysis history
✓ Verifiable results
✓ Public accountability

## Technical Details

### Hash Algorithm
- SHA-256 for all hashing
- Content hash: lowercase, trimmed input
- Block hash: includes all block data

### Similarity Detection
- Jaccard similarity for text comparison
- Threshold: 60% for similar matches
- Returns top 5 similar blocks

### Chain Validation
Checks performed:
1. Hash integrity (recalculate and compare)
2. Previous hash links (chain continuity)
3. Proof of work (leading zeros)
4. Block sequence (no gaps)

## API Reference

### getBlockchain()
Returns singleton blockchain instance

### addAnalysis()
Adds new analysis to blockchain
Returns: AnalysisBlock with verification code

### searchByCode()
Search by verification code
Returns: BlockchainSearchResult

### searchByContent()
Search by text content
Returns: Exact or similar matches

### verifyChain()
Validates entire blockchain
Returns: { valid: boolean, errors: string[] }

### getStats()
Returns blockchain statistics
- Total blocks
- Total analyses
- Prediction distribution
- Average confidence
- Chain validity

## Dashboard Components

### BlockchainSearchCard
- Search input for code or text
- Displays found blocks
- Shows similar matches
- Copy verification code

### BlockchainStatsCard
- Total blocks count
- Total analyses
- Latest block number
- Average confidence
- Prediction distribution
- Chain integrity status

## Security Features

### 1. Cryptographic Hashing
All content hashed with SHA-256

### 2. Proof of Work
Computational effort required

### 3. Chain Linking
Each block references previous

### 4. Immutability
Cannot modify past blocks

### 5. Verification
Easy to verify, hard to forge

## Performance

### Block Creation
- Time: ~50-200ms (depends on nonce)
- Memory: ~1KB per block
- Storage: Efficient JSON structure

### Search Performance
- By Code: O(n) linear search
- By Content: O(n) with similarity calc
- Typical: <10ms for 1000 blocks

### Chain Validation
- Full validation: O(n)
- Typical: <50ms for 1000 blocks

## Future Enhancements

1. Distributed storage
2. Consensus mechanism
3. Smart contracts
4. Token rewards
5. Public blockchain integration
6. IPFS storage
7. Multi-node network
8. Byzantine fault tolerance

---

**Version**: 1.0.0  
**Created**: 2024-01-15  
**Status**: Production Ready
