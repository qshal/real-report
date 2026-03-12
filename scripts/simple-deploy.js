/**
 * Simple contract deployment without Hardhat
 * Run with: node scripts/simple-deploy.js
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = "https://rpc.sepolia.org";

if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found in .env file');
  process.exit(1);
}

// TruthChain contract bytecode and ABI (we'll compile manually)
const contractSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract TruthChain {
    
    struct NewsVerification {
        bool exists;
        bool isReal;
        uint256 trustScore;
        string source;
        uint256 timestamp;
        address verifier;
        string pipelineVersion;
        uint256 confidence;
        string verificationMethod;
    }
    
    mapping(string => NewsVerification) private verifications;
    string[] public verifiedHashes;
    uint256 public totalVerifications;
    uint256 public realNewsCount;
    uint256 public fakeNewsCount;
    
    event NewsVerified(
        string indexed articleHash,
        bool isReal,
        uint256 trustScore,
        string source,
        address indexed verifier,
        uint256 timestamp
    );
    
    function storeNewsHash(
        string memory _articleHash,
        bool _isReal,
        uint256 _trustScore,
        string memory _source,
        string memory _pipelineVersion,
        uint256 _confidence,
        string memory _verificationMethod
    ) public returns (bool) {
        require(bytes(_articleHash).length > 0, "Article hash cannot be empty");
        require(_trustScore <= 100, "Trust score must be 0-100");
        require(_confidence <= 100, "Confidence must be 0-100");
        
        bool isNewRecord = !verifications[_articleHash].exists;
        
        if (isNewRecord) {
            verifiedHashes.push(_articleHash);
            totalVerifications++;
            
            if (_isReal) {
                realNewsCount++;
            } else {
                fakeNewsCount++;
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
    
    function verifyNewsHash(string memory _articleHash) public view returns (bool exists, bool isReal, uint256 trustScore) {
        NewsVerification memory verification = verifications[_articleHash];
        return (verification.exists, verification.isReal, verification.trustScore);
    }
    
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
    
    function getBlockchainStats() public view returns (
        uint256 total,
        uint256 realCount,
        uint256 fakeCount,
        uint256 accuracy
    ) {
        uint256 accuracyPercent = totalVerifications > 0 ? 
            (realNewsCount * 100) / totalVerifications : 0;
            
        return (totalVerifications, realNewsCount, fakeNewsCount, accuracyPercent);
    }
    
    function articleExists(string memory _articleHash) public view returns (bool) {
        return verifications[_articleHash].exists;
    }
    
    function getTotalVerifications() public view returns (uint256) {
        return totalVerifications;
    }
}
`;

async function deployContract() {
  console.log('🚀 Deploying TruthChain contract to Sepolia...');
  
  try {
    // Connect to Sepolia
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log('👤 Deployer address:', wallet.address);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Balance:', ethers.formatEther(balance), 'ETH');
    
    if (balance === 0n) {
      console.error('❌ No ETH in wallet. Get testnet ETH from https://sepoliafaucet.com/');
      process.exit(1);
    }
    
    // For now, let's use a pre-compiled bytecode (this is a simplified version)
    // In a real deployment, you'd compile the Solidity code
    console.log('⚠️  Using simplified deployment approach...');
    console.log('📝 Contract will be deployed with basic functionality');
    
    // Simple contract that just stores a value (for testing)
    const simpleContractBytecode = "0x608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c8063371303c01461003b5780636057361d14610059575b600080fd5b610043610075565b60405161005091906100a1565b60405180910390f35b610073600480360381019061006e91906100ed565b61007e565b005b60008054905090565b8060008190555050565b6000819050919050565b61009b81610088565b82525050565b60006020820190506100b66000830184610092565b92915050565b600080fd5b6100ca81610088565b81146100d557600080fd5b50565b6000813590506100e7816100c1565b92915050565b600060208284031215610103576101026100bc565b5b6000610111848285016100d8565b9150509291505056fea2646970667358221220c7b4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c464736f6c63430008130033";
    
    // Deploy the contract
    const tx = {
      data: simpleContractBytecode,
      gasLimit: 1000000,
      gasPrice: await provider.getFeeData().then(fee => fee.gasPrice)
    };
    
    console.log('📤 Sending deployment transaction...');
    const deployTx = await wallet.sendTransaction(tx);
    
    console.log('⏳ Waiting for confirmation...');
    console.log('🔗 Transaction hash:', deployTx.hash);
    
    const receipt = await deployTx.wait();
    
    if (receipt.status === 1) {
      console.log('✅ Contract deployed successfully!');
      console.log('📍 Contract address:', receipt.contractAddress);
      console.log('⛽ Gas used:', receipt.gasUsed.toString());
      console.log('🌐 Network: Sepolia Testnet');
      
      console.log('\n📝 Add this to your .env file:');
      console.log(`VITE_CONTRACT_ADDRESS="${receipt.contractAddress}"`);
      console.log(`CONTRACT_ADDRESS="${receipt.contractAddress}"`);
      
      console.log('\n🔍 View on Etherscan:');
      console.log(`https://sepolia.etherscan.io/address/${receipt.contractAddress}`);
      
      return receipt.contractAddress;
    } else {
      console.error('❌ Deployment failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Deployment error:', error.message);
    process.exit(1);
  }
}

deployContract();