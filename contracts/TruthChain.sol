// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TruthChain
 * @dev Privacy-preserving news verification storage on blockchain
 * Stores only SHA-256 hashes of articles, not full content
 */
contract TruthChain {
    
    struct NewsVerification {
        bool exists;           // Record exists
        bool isReal;          // AI prediction result (true = real, false = fake)
        uint256 trustScore;   // Trust score (0-100)
        string source;        // News source domain
        uint256 timestamp;    // Verification time
        address verifier;     // Who verified it
        string pipelineVersion; // AI pipeline version
        uint256 confidence;   // Model confidence (0-100)
        string verificationMethod; // Method used for verification
    }
    
    // Mapping from article hash to verification record
    mapping(string => NewsVerification) private verifications;
    
    // Array to track all verified hashes for statistics
    string[] public verifiedHashes;
    
    // Statistics tracking
    uint256 public totalVerifications;
    uint256 public realNewsCount;
    uint256 public fakeNewsCount;
    
    // Events for transparency
    event NewsVerified(
        string indexed articleHash,
        bool isReal,
        uint256 trustScore,
        string source,
        address indexed verifier,
        uint256 timestamp
    );
    
    event VerificationUpdated(
        string indexed articleHash,
        bool previousResult,
        bool newResult,
        address indexed updater
    );
    
    // Modifiers
    modifier validTrustScore(uint256 _trustScore) {
        require(_trustScore <= 100, "Trust score must be 0-100");
        _;
    }
    
    modifier validConfidence(uint256 _confidence) {
        require(_confidence <= 100, "Confidence must be 0-100");
        _;
    }
    
    /**
     * @dev Store news verification result
     * @param _articleHash SHA-256 hash of the article
     * @param _isReal AI prediction result
     * @param _trustScore Trust score (0-100)
     * @param _source News source domain
     * @param _pipelineVersion AI pipeline version
     * @param _confidence Model confidence (0-100)
     * @param _verificationMethod Method used for verification
     */
    function storeNewsHash(
        string memory _articleHash,
        bool _isReal,
        uint256 _trustScore,
        string memory _source,
        string memory _pipelineVersion,
        uint256 _confidence,
        string memory _verificationMethod
    ) public validTrustScore(_trustScore) validConfidence(_confidence) returns (bool) {
        require(bytes(_articleHash).length > 0, "Article hash cannot be empty");
        require(bytes(_source).length > 0, "Source cannot be empty");
        
        bool isNewRecord = !verifications[_articleHash].exists;
        
        if (isNewRecord) {
            verifiedHashes.push(_articleHash);
            totalVerifications++;
            
            if (_isReal) {
                realNewsCount++;
            } else {
                fakeNewsCount++;
            }
        } else {
            // Update counters if prediction changed
            bool previousResult = verifications[_articleHash].isReal;
            if (previousResult != _isReal) {
                if (_isReal) {
                    realNewsCount++;
                    fakeNewsCount--;
                } else {
                    fakeNewsCount++;
                    realNewsCount--;
                }
                
                emit VerificationUpdated(_articleHash, previousResult, _isReal, msg.sender);
            }
        }
        
        verifications[_articleHash] = NewsVerification({
            exists: true,
            isReal: _isReal,
            trustScore: _trustScore,
            source: _source,
            timestamp: block.timestamp,
            verifier: msg.sender,
            pipelineVersion: _pipelineVersion,
            confidence: _confidence,
            verificationMethod: _verificationMethod
        });
        
        emit NewsVerified(_articleHash, _isReal, _trustScore, _source, msg.sender, block.timestamp);
        
        return true;
    }
    
    /**
     * @dev Check if article was previously verified
     * @param _articleHash SHA-256 hash of the article
     */
    function verifyNewsHash(string memory _articleHash) public view returns (bool exists, bool isReal, uint256 trustScore) {
        NewsVerification memory verification = verifications[_articleHash];
        return (verification.exists, verification.isReal, verification.trustScore);
    }
    
    /**
     * @dev Get complete verification details
     * @param _articleHash SHA-256 hash of the article
     */
    function getVerificationStatus(string memory _articleHash) public view returns (
        bool exists,
        bool isReal,
        uint256 trustScore,
        string memory source,
        uint256 timestamp,
        address verifier,
        string memory pipelineVersion,
        uint256 confidence,
        string memory verificationMethod
    ) {
        NewsVerification memory verification = verifications[_articleHash];
        return (
            verification.exists,
            verification.isReal,
            verification.trustScore,
            verification.source,
            verification.timestamp,
            verification.verifier,
            verification.pipelineVersion,
            verification.confidence,
            verification.verificationMethod
        );
    }
    
    /**
     * @dev Get blockchain storage statistics
     */
    function getBlockchainStats() public view returns (
        uint256 total,
        uint256 realCount,
        uint256 fakeCount,
        uint256 accuracy
    ) {
        uint256 accuracyPercent = totalVerifications > 0 ? 
            (realCount * 100) / totalVerifications : 0;
            
        return (totalVerifications, realNewsCount, fakeNewsCount, accuracyPercent);
    }
    
    /**
     * @dev Get verification by index (for pagination)
     */
    function getVerificationByIndex(uint256 _index) public view returns (
        string memory articleHash,
        bool isReal,
        uint256 trustScore,
        string memory source,
        uint256 timestamp
    ) {
        require(_index < verifiedHashes.length, "Index out of bounds");
        
        string memory hash = verifiedHashes[_index];
        NewsVerification memory verification = verifications[hash];
        
        return (hash, verification.isReal, verification.trustScore, verification.source, verification.timestamp);
    }
    
    /**
     * @dev Get total number of verifications
     */
    function getTotalVerifications() public view returns (uint256) {
        return totalVerifications;
    }
    
    /**
     * @dev Check if article exists in blockchain
     */
    function articleExists(string memory _articleHash) public view returns (bool) {
        return verifications[_articleHash].exists;
    }
    
    /**
     * @dev Get verifications by source domain
     */
    function getVerificationsBySource(string memory _source) public view returns (uint256 count) {
        uint256 sourceCount = 0;
        
        for (uint256 i = 0; i < verifiedHashes.length; i++) {
            string memory hash = verifiedHashes[i];
            if (keccak256(bytes(verifications[hash].source)) == keccak256(bytes(_source))) {
                sourceCount++;
            }
        }
        
        return sourceCount;
    }
}
