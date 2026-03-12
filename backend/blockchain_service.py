"""
Blockchain Backend Service
Three-Layer Integration:
1. Smart Contract Layer: Solidity contract on Polygon/Ethereum
2. Backend Service Layer: Python Web3 integration (this file)
3. API Integration Layer: Automatic storage after verification
"""

import os
import hashlib
import json
from datetime import datetime
from typing import Dict, Optional, Tuple
from dataclasses import dataclass
from flask import Flask, request, jsonify
from flask_cors import CORS
from web3 import Web3
from eth_account import Account

app = Flask(__name__)
CORS(app)

# Configuration
CONTRACT_ADDRESS = os.getenv('CONTRACT_ADDRESS', '')
RPC_URL = os.getenv('ETHEREUM_RPC_URL', 'https://polygon-rpc.com')
PRIVATE_KEY = os.getenv('BLOCKCHAIN_PRIVATE_KEY', '')

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(RPC_URL))

# Contract ABI
CONTRACT_ABI = json.loads('''[
  {
    "inputs": [
      {"name": "contentHash", "type": "bytes32"},
      {"name": "resultHash", "type": "bytes32"},
      {"name": "timestamp", "type": "uint256"}
    ],
    "name": "storeAnalysis",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "contentHash", "type": "bytes32"}],
    "name": "getAnalysis",
    "outputs": [
      {"name": "resultHash", "type": "bytes32"},
      {"name": "timestamp", "type": "uint256"},
      {"name": "verifier", "type": "address"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "contentHash", "type": "bytes32"},
      {"name": "resultHash", "type": "bytes32"}
    ],
    "name": "verifyAnalysis",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
]''')


@dataclass
class AnalysisRecord:
    """Represents an analysis record for blockchain storage"""
    content_hash: str
    result_hash: str
    timestamp: int
    tx_hash: Optional[str] = None
    block_number: Optional[int] = None


def generate_content_hash(content: str) -> str:
    """Generate SHA-256 hash of content"""
    return '0x' + hashlib.sha256(content.encode()).hexdigest()


def generate_result_hash(label: str, confidence: float, timestamp: int) -> str:
    """Generate result hash from analysis outcome"""
    data = f"{label}:{confidence}:{timestamp}"
    return '0x' + hashlib.sha256(data.encode()).hexdigest()


class BlockchainService:
    """Service for interacting with the blockchain"""
    
    def __init__(self):
        self.w3 = w3
        self.contract = None
        self.account = None
        
        if CONTRACT_ADDRESS and PRIVATE_KEY:
            self.contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(CONTRACT_ADDRESS),
                abi=CONTRACT_ABI
            )
            self.account = Account.from_key(PRIVATE_KEY)
    
    def is_configured(self) -> bool:
        """Check if blockchain is properly configured"""
        return self.contract is not None and self.account is not None
    
    def store_analysis(
        self,
        content: str,
        label: str,
        confidence: float
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Store analysis on blockchain
        
        Returns:
            (success: bool, tx_hash: Optional[str], error: Optional[str])
        """
        if not self.is_configured():
            return False, None, "Blockchain not configured"
        
        try:
            # Generate hashes
            content_hash = generate_content_hash(content)
            timestamp = int(datetime.now().timestamp())
            result_hash = generate_result_hash(label, confidence, timestamp)
            
            # Build transaction
            tx = self.contract.functions.storeAnalysis(
                content_hash,
                result_hash,
                timestamp
            ).build_transaction({
                'from': self.account.address,
                'nonce': self.w3.eth.get_transaction_count(self.account.address),
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price,
            })
            
            # Sign and send transaction
            signed_tx = self.w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            # Wait for receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt['status'] == 1:
                return True, tx_hash.hex(), None
            else:
                return False, None, "Transaction failed"
                
        except Exception as e:
            return False, None, str(e)
    
    def verify_analysis(
        self,
        content: str,
        label: str,
        confidence: float,
        timestamp: int
    ) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Verify if analysis exists on blockchain
        
        Returns:
            (verified: bool, details: Optional[Dict], error: Optional[str])
        """
        if not self.is_configured():
            return False, None, "Blockchain not configured"
        
        try:
            content_hash = generate_content_hash(content)
            result_hash = generate_result_hash(label, confidence, timestamp)
            
            # Check if analysis exists and matches
            is_valid = self.contract.functions.verifyAnalysis(
                content_hash,
                result_hash
            ).call()
            
            if is_valid:
                result_hash, ts, verifier = self.contract.functions.getAnalysis(
                    content_hash
                ).call()
                
                return True, {
                    'result_hash': result_hash,
                    'timestamp': ts,
                    'verifier': verifier,
                }, None
            
            return False, None, None
            
        except Exception as e:
            return False, None, str(e)


# Initialize service
blockchain_service = BlockchainService()


@app.route('/api/blockchain/status', methods=['GET'])
def get_status():
    """Get blockchain service status"""
    return jsonify({
        'connected': blockchain_service.is_configured(),
        'contract_address': CONTRACT_ADDRESS,
        'rpc_url': RPC_URL,
        'wallet_address': blockchain_service.account.address if blockchain_service.account else None,
    })


@app.route('/api/blockchain/store', methods=['POST'])
def store_analysis():
    """Store analysis on blockchain"""
    data = request.json
    
    content = data.get('content', '')
    label = data.get('label', '')
    confidence = data.get('confidence', 0)
    
    if not content or not label:
        return jsonify({'error': 'Missing required fields'}), 400
    
    success, tx_hash, error = blockchain_service.store_analysis(
        content, label, confidence
    )
    
    if success:
        return jsonify({
            'success': True,
            'tx_hash': tx_hash,
            'message': 'Analysis stored on blockchain',
        })
    else:
        return jsonify({
            'success': False,
            'error': error,
        }), 500


@app.route('/api/blockchain/verify', methods=['POST'])
def verify_analysis():
    """Verify analysis on blockchain"""
    data = request.json
    
    content = data.get('content', '')
    label = data.get('label', '')
    confidence = data.get('confidence', 0)
    timestamp = data.get('timestamp', 0)
    
    if not content or not label:
        return jsonify({'error': 'Missing required fields'}), 400
    
    verified, details, error = blockchain_service.verify_analysis(
        content, label, confidence, timestamp
    )
    
    if error:
        return jsonify({'error': error}), 500
    
    return jsonify({
        'verified': verified,
        'details': details,
    })


@app.route('/api/blockchain/hash', methods=['POST'])
def generate_hashes():
    """Generate content and result hashes without storing"""
    data = request.json
    
    content = data.get('content', '')
    label = data.get('label', '')
    confidence = data.get('confidence', 0)
    
    content_hash = generate_content_hash(content)
    timestamp = int(datetime.now().timestamp())
    result_hash = generate_result_hash(label, confidence, timestamp)
    
    return jsonify({
        'content_hash': content_hash,
        'result_hash': result_hash,
        'timestamp': timestamp,
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)
