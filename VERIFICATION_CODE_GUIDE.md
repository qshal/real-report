# Verification Code System - Quick Guide

## What is a Verification Code?

Every analysis you run gets a unique verification code that looks like this:

```
VRF-0001-A7F3D2C1-4B8E
```

This code is like a "receipt" for your analysis that you can use to retrieve it later.

## How to Get Your Verification Code

### Step 1: Submit Analysis
1. Go to Dashboard
2. Enter text or URL
3. Click "Analyze and save"

### Step 2: Receive Code
After analysis completes, you'll see:
```
✓ Analysis added to blockchain! Code: VRF-0001-A7F3D2C1-4B8E
```

### Step 3: Save Your Code
- Copy the code
- Save it for future reference
- Use it to retrieve this exact analysis

## How to Search for Analysis

### Method 1: Search by Verification Code

1. Go to "Blockchain Analysis Search" card
2. Enter your verification code:
   ```
   VRF-0001-A7F3D2C1-4B8E
   ```
3. Click "Search"
4. View complete analysis details

**What You'll See**:
- ✓ Block number
- ✓ Timestamp
- ✓ Prediction (REAL/FAKE/MISLEADING)
- ✓ Confidence score
- ✓ Trust score
- ✓ Full explanation
- ✓ NLP features
- ✓ Original content
- ✓ Block hashes

### Method 2: Search by Content

1. Go to "Blockchain Analysis Search" card
2. Enter the same text or similar text:
   ```
   Breaking news about scientists...
   ```
3. Click "Search"

**Possible Results**:

**Exact Match Found**:
```
✓ Exact match found! This content was previously analyzed in Block #42.
```
Shows the complete previous analysis.

**Similar Matches Found**:
```
⚠ No exact match, but found 3 similar analysis(es).
```
Shows up to 5 similar analyses with similarity scores.

**No Match**:
```
✗ No matching or similar analyses found.
```
This is new content that hasn't been analyzed before.

## Verification Code Format

```
VRF - 0001 - A7F3D2C1 - 4B8E
 │     │       │         │
 │     │       │         └─ Checksum (4 chars)
 │     │       └─────────── Content Hash (8 chars)
 │     └─────────────────── Block Number (hex)
 └───────────────────────── Prefix
```

### Components:

1. **VRF**: Verification prefix
2. **0001**: Block number in hexadecimal
   - Block 1 = 0001
   - Block 255 = 00FF
   - Block 4096 = 1000

3. **A7F3D2C1**: First 8 characters of content hash
   - Unique to your content
   - Same content = same hash

4. **4B8E**: Checksum for validation
   - Prevents typos
   - Ensures code integrity

## Use Cases

### Use Case 1: Verify Past Analysis
```
Scenario: You analyzed an article last week
Action: Search by verification code
Result: Retrieve exact analysis with all details
```

### Use Case 2: Check for Duplicates
```
Scenario: Someone sends you an article to analyze
Action: Search by content
Result: See if it was already analyzed
```

### Use Case 3: Track Analysis History
```
Scenario: You want to see all your analyses
Action: View blockchain statistics
Result: See total analyses, predictions, trends
```

### Use Case 4: Share Results
```
Scenario: You want to share analysis with others
Action: Share verification code
Result: Others can verify the same analysis
```

### Use Case 5: Audit Trail
```
Scenario: You need proof of when analysis was done
Action: Search by code
Result: See exact timestamp and block number
```

## Example Workflow

### Analyzing New Content

```
1. Submit: "Scientists discover cure for cancer"
   ↓
2. AI Analysis: FAKE (92% confidence)
   ↓
3. Blockchain: Block #42 created
   ↓
4. Code Generated: VRF-002A-B3F7E1D4-9C2A
   ↓
5. Notification: "Analysis added to blockchain!"
```

### Retrieving Analysis

```
1. Enter Code: VRF-002A-B3F7E1D4-9C2A
   ↓
2. Search Blockchain
   ↓
3. Found: Block #42
   ↓
4. Display:
   - Prediction: FAKE
   - Confidence: 92%
   - Trust Score: 88%
   - Explanation: "Multiple red flags detected..."
   - NLP Features: High clickbait (78%)
   - Timestamp: 2024-01-15 14:30:22
```

### Checking Similar Content

```
1. Enter: "Cancer cure discovered by scientists"
   ↓
2. Search: No exact match
   ↓
3. Similar Found: 85% match with Block #42
   ↓
4. Display:
   - Original: "Scientists discover cure for cancer"
   - Prediction: FAKE (92%)
   - Suggestion: "View full analysis?"
```

## Benefits

### For Users
✓ Never lose your analysis results
✓ Easy retrieval with simple code
✓ Verify authenticity of analyses
✓ Share results with others
✓ Track your analysis history

### For System
✓ Immutable record keeping
✓ Duplicate detection
✓ Audit trail
✓ Data integrity
✓ Tamper-proof storage

## Tips

### Tip 1: Save Your Codes
Keep a list of important verification codes for quick access.

### Tip 2: Use Content Search
If you lost your code, search by content to find it.

### Tip 3: Check Similar
Before analyzing, search to see if similar content exists.

### Tip 4: Copy Full Details
Use the copy button to save complete analysis details.

### Tip 5: Verify Integrity
Check blockchain stats to ensure chain is valid.

## Troubleshooting

### Problem: Code Not Found
**Solution**: 
- Check for typos in code
- Ensure all parts are included
- Try searching by content instead

### Problem: No Similar Matches
**Solution**:
- This is genuinely new content
- Proceed with new analysis
- Your analysis will be added to chain

### Problem: Too Many Similar Matches
**Solution**:
- Review each match
- Check timestamps
- Select most relevant one

## Security Features

### 1. Cryptographic Hashing
Every analysis is hashed with SHA-256 for security.

### 2. Proof of Work
Each block is mined to prevent spam and ensure effort.

### 3. Chain Linking
Blocks are linked, making tampering detectable.

### 4. Immutability
Once added, analyses cannot be modified.

### 5. Verification
Anyone can verify the blockchain integrity.

## Statistics Dashboard

View real-time blockchain statistics:

- **Total Blocks**: Number of analyses in chain
- **Total Analyses**: Excluding genesis block
- **Latest Block**: Most recent block number
- **Avg Confidence**: Average across all analyses
- **Prediction Distribution**: REAL vs FAKE vs MISLEADING
- **Chain Integrity**: ✓ Valid or ✗ Invalid

## API Integration (For Developers)

```typescript
import { getBlockchain } from '@/lib/analysisBlockchain';

// Get blockchain instance
const blockchain = getBlockchain();

// Add analysis
const block = blockchain.addAnalysis(
  text, type, prediction, confidence, 
  trustScore, explanation, model, nlpFeatures
);

// Search by code
const result = blockchain.searchByCode('VRF-0001-...');

// Search by content
const result = blockchain.searchByContent('text...');

// Get statistics
const stats = blockchain.getStats();

// Verify chain
const validation = blockchain.verifyChain();
```

## FAQ

**Q: Can I edit a past analysis?**
A: No, blockchain is immutable. You can create a new analysis.

**Q: How long are codes stored?**
A: Permanently in the blockchain.

**Q: Can others see my analyses?**
A: Only if you share your verification code.

**Q: What if I lose my code?**
A: Search by content to find it.

**Q: Are codes case-sensitive?**
A: Yes, use exact format with uppercase letters.

**Q: Can I delete an analysis?**
A: No, blockchain is immutable for integrity.

**Q: How many analyses can be stored?**
A: Unlimited, blockchain grows dynamically.

**Q: Is this a real blockchain?**
A: It's a blockchain-like structure with similar properties.

---

**Need Help?**
- Check BLOCKCHAIN_ANALYSIS_SYSTEM.md for technical details
- View Dashboard for live statistics
- Contact support for assistance

**Version**: 1.0.0  
**Last Updated**: 2024-01-15
