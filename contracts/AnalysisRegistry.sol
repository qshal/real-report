// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AnalysisRegistry
 * @dev Stores fact-checking analysis hashes on Ethereum for immutable verification
 */
contract AnalysisRegistry {
    
    struct Analysis {
        bytes32 contentHash;    // Hash of the analyzed content
        bytes32 resultHash;     // Hash of the verdict (label + confidence + timestamp)
        uint256 timestamp;      // When the analysis was stored
        address verifier;       // Address that stored the analysis
    }
    
    // Mapping from content hash to analysis
    mapping(bytes32 => Analysis) public analyses;
    
    // Array to track all stored content hashes
    bytes32[] public allAnalyses;
    
    // Events
    event AnalysisStored(
        bytes32 indexed contentHash,
        bytes32 resultHash,
        uint256 timestamp,
        address indexed verifier
    );
    
    event AnalysisVerified(
        bytes32 indexed contentHash,
        bool isValid,
        address indexed verifier
    );
    
    /**
     * @dev Store a new analysis on the blockchain
     * @param contentHash SHA-256 hash of the analyzed content
     * @param resultHash Hash of the verdict result
     * @param timestamp Unix timestamp of the analysis
     */
    function storeAnalysis(
        bytes32 contentHash,
        bytes32 resultHash,
        uint256 timestamp
    ) public returns (bool) {
        require(contentHash != bytes32(0), "Invalid content hash");
        require(resultHash != bytes32(0), "Invalid result hash");
        require(analyses[contentHash].timestamp == 0, "Analysis already exists");
        
        analyses[contentHash] = Analysis({
            contentHash: contentHash,
            resultHash: resultHash,
            timestamp: timestamp,
            verifier: msg.sender
        });
        
        allAnalyses.push(contentHash);
        
        emit AnalysisStored(contentHash, resultHash, timestamp, msg.sender);
        
        return true;
    }
    
    /**
     * @dev Get analysis details by content hash
     * @param contentHash The hash of the content to lookup
     */
    function getAnalysis(bytes32 contentHash) public view returns (
        bytes32 resultHash,
        uint256 timestamp,
        address verifier
    ) {
        Analysis memory analysis = analyses[contentHash];
        require(analysis.timestamp != 0, "Analysis not found");
        
        return (analysis.resultHash, analysis.timestamp, analysis.verifier);
    }
    
    /**
     * @dev Verify if an analysis matches the stored data
     * @param contentHash Hash of the content
     * @param resultHash Hash of the result to verify
     */
    function verifyAnalysis(
        bytes32 contentHash,
        bytes32 resultHash
    ) public view returns (bool) {
        Analysis memory analysis = analyses[contentHash];
        
        if (analysis.timestamp == 0) {
            return false;
        }
        
        return analysis.resultHash == resultHash;
    }
    
    /**
     * @dev Check if analysis exists for given content hash
     */
    function analysisExists(bytes32 contentHash) public view returns (bool) {
        return analyses[contentHash].timestamp != 0;
    }
    
    /**
     * @dev Get total number of analyses stored
     */
    function getTotalAnalyses() public view returns (uint256) {
        return allAnalyses.length;
    }
    
    /**
     * @dev Get analysis at index
     */
    function getAnalysisAtIndex(uint256 index) public view returns (
        bytes32 contentHash,
        bytes32 resultHash,
        uint256 timestamp,
        address verifier
    ) {
        require(index < allAnalyses.length, "Index out of bounds");
        
        contentHash = allAnalyses[index];
        Analysis memory analysis = analyses[contentHash];
        
        return (
            analysis.contentHash,
            analysis.resultHash,
            analysis.timestamp,
            analysis.verifier
        );
    }
}
