"""
TruthChain Blockchain Backend Service
Three-Layer Integration:
1. Smart Contract Layer: TruthChain.sol on Polygon/Ethereum
2. Backend Service Layer: Python Web3 integration (this file)
3. API Integration Layer: Automatic storage after verification
"""

import os
import hashlib
import json
from datetime import datetime
from typing import Dict, Optional, Tuple, List
from dataclasses import dataclass
from flask import Flask, request, jsonify
from flask_cors import CORS
from web3 import Web3
from eth_account import Account
import time

app = Flask(__name__)
CORS(app)

# Multi-Network Configuration
NETWORK = os.getenv('BLOCKCHAIN_NETWORK', 'polygon')
NETWORKS = {
    'polygon': {
        'rpc_url': os.getenv('POLYGON_RPC_URL', 'https://polygon-rpc.com'),
        'chain_id': 137,
        'name': 'Polygon Mainnet',
        'explorer': 'https://polygonscan.com'
    },
    'mumbai': {
        'rpc_url': os.getenv('MUMBAI_RPC_URL', 'https://rpc-mumbai.maticvigil.com'),
        'chain_id': 80001,
        'name': 'Polygon Mumbai Testnet',
        'explorer': 'https://mumbai.polygonscan.com'
    },
    'ethereum': {
        'rpc_url': os.getenv('ETHEREUM_RPC_URL', 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID'),
        'chain_id': 1,
        'name': 'Ethereum Mainnet',
        'explorer': 'https://etherscan.io'
    },
    'sepolia': {
        'rpc_url': os.getenv('SEPOLIA_RPC_URL', 'https://rpc.sepolia.org'),
        'chain_id': 11155111,
        'name': 'Sepolia Testnet',
        'explorer': 'https://sepolia.etherscan.io'
    }
}

# Configuration
CONTRACT_ADDRESS = os.getenv('CONTRACT_ADDRESS', '')
PRIVATE_KEY = os.getenv('BLOCKCHAIN_PRIVATE_KEY', '')
PIPELINE_VERSION = os.getenv('PIPELINE_VERSION', '4.0.0')

# Initialize Web3 with selected network
network_config = NETWORKS.get(NETWORK, NETWORKS['polygon'])
w3 = Web3(Web3.HTTPProvider(network_config['rpc_url']))

# Enhanced Contract ABI for TruthChain
CONTRACT_ABI = json.loads('''[
  {
    "inputs": [
      {"name": "_articleHash", "type": "string"},
      {"name": "_isReal", "type": "bool"},
      {"name": "_trustScore", "type": "uint256"},
      {"name": "_source", "type": "string"},
      {"name": "_pipelineVersion", "type": "string"},
      {"name": "_confidence", "type": "uint256"},
      {"name": "_verificationMethod", "type": "string"}
    ],
    "name": "storeNewsHash",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_articleHash", "type": "string"}],
    "name": "verifyNewsHash",
    "outputs": [
      {"name": "exists", "type": "bool"},
      {"name": "isReal", "type": "bool"},
      {"name": "trustScore", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "_articleHash", "type": "string"}],
    "name": "getVerificationStatus",
    "outputs": [
      {"name": "exists", "type": "bool"},
      {"name": "isReal", "type": "bool"},
      {"name": "trustScore", "type": "uint256"},
      {"name": "source", "type": "string"},
      {"name": "timestamp", "type": "uint256"},
      {"name": "verifier", "type": "address"},
      {"name": "pipelineVersion", "type": "string"},
      {"name": "confidence", "type": "uint256"},
      {"name": "verificationMethod", "type": "string"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBlockchainStats",
    "outputs": [
      {"name": "total", "type": "uint256"},
      {"name": "realCount", "type": "uint256"},
      {"name": "fakeCount", "type": "uint256"},
      {"name": "accuracy", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "_articleHash", "type": "string"}],
    "name": "articleExists",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
]''')


@dataclass
class NewsVerificationRecord:
    """Represents a news verification record for blockchain storage"""
    article_hash: str
    is_real: bool
    trust_score: int  # 0-100
    source: str
    pipeline_version: str
    confidence: int  # 0-100
    verification_method: str
    tx_hash: Optional[str] = None
    block_number: Optional[int] = None


def generate_article_hash(article_text: str) -> str:
    """Generate SHA-256 hash of article content"""
    return hashlib.sha256(article_text.encode('utf-8')).hexdigest()


def extract_domain(url: str) -> str:
    """Extract domain from URL"""
    try:
        from urllib.parse import urlparse
        return urlparse(url).netloc.replace('www.', '')
    except:
        return 'unknown'


class TruthChainService:
    """Service for interacting with TruthChain blockchain"""
    
    def __init__(self):
        self.w3 = w3
        self.contract = None
        self.account = None
        self.network_config = network_config
        
        if CONTRACT_ADDRESS and PRIVATE_KEY:
            try:
                self.contract = self.w3.eth.contract(
                    address=Web3.to_checksum_address(CONTRACT_ADDRESS),
                    abi=CONTRACT_ABI
                )
                self.account = Account.from_key(PRIVATE_KEY)
                print(f"✅ Connected to {network_config['name']}")
                print(f"📍 Contract: {CONTRACT_ADDRESS}")
                print(f"👤 Wallet: {self.account.address}")
            except Exception as e:
                print(f"❌ Blockchain initialization failed: {e}")
    
    def is_configured(self) -> bool:
        """Check if blockchain is properly configured"""
        return self.contract is not None and self.account is not None
    
    def check_duplicate(self, article_text: str) -> Tuple[bool, Optional[Dict]]:
        """Check if article was previously verified"""
        if not self.is_configured():
            return False, None
        
        try:
            article_hash = generate_article_hash(article_text)
            exists, is_real, trust_score = self.contract.functions.verifyNewsHash(article_hash).call()
            
            if exists:
                # Get full verification details
                full_details = self.contract.functions.getVerificationStatus(article_hash).call()
                return True, {
                    'previously_verified': True,
                    'article_hash': article_hash,
                    'is_real': full_details[1],
                    'trust_score': full_details[2],
                    'source': full_details[3],
                    'timestamp': full_details[4],
                    'verifier': full_details[5],
                    'pipeline_version': full_details[6],
                    'confidence': full_details[7],
                    'verification_method': full_details[8],
                    'verification_date': datetime.fromtimestamp(full_details[4]).isoformat()
                }
            
            return False, None
            
        except Exception as e:
            print(f"❌ Duplicate check failed: {e}")
            return False, None
    
    def store_verification(
        self,
        article_text: str,
        prediction: str,
        trust_score: float,
        confidence: float,
        source_url: str = None,
        verification_method: str = "multi_model_ensemble"
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Store news verification on blockchain
        
        Returns:
            (success: bool, tx_hash: Optional[str], error: Optional[str])
        """
        if not self.is_configured():
            return False, None, "Blockchain not configured"
        
        try:
            # Generate article hash
            article_hash = generate_article_hash(article_text)
            
            # Convert prediction to boolean
            is_real = prediction.lower() in ['real', 'true', 'legitimate']
            
            # Convert scores to integers (0-100)
            trust_score_int = max(0, min(100, int(trust_score * 100)))
            confidence_int = max(0, min(100, int(confidence * 100)))
            
            # Extract source domain
            source = extract_domain(source_url) if source_url else 'unknown'
            
            # Check if already exists
            exists = self.contract.functions.articleExists(article_hash).call()
            if exists:
                print(f"⚠️ Article already verified: {article_hash[:16]}...")
                return True, None, "Article already verified"
            
            # Build transaction
            tx = self.contract.functions.storeNewsHash(
                article_hash,
                is_real,
                trust_score_int,
                source,
                PIPELINE_VERSION,
                confidence_int,
                verification_method
            ).build_transaction({
                'from': self.account.address,
                'nonce': self.w3.eth.get_transaction_count(self.account.address),
                'gas': 300000,  # Increased gas limit for complex transaction
                'gasPrice': self.w3.eth.gas_price,
                'chainId': network_config['chain_id']
            })
            
            # Sign and send transaction
            signed_tx = self.w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            # Wait for receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            if receipt['status'] == 1:
                print(f"✅ Verification stored: {tx_hash.hex()}")
                return True, tx_hash.hex(), None
            else:
                return False, None, "Transaction failed"
                
        except Exception as e:
            print(f"❌ Blockchain storage error: {e}")
            return False, None, str(e)
    
    def get_blockchain_stats(self) -> Dict:
        """Get blockchain storage statistics"""
        if not self.is_configured():
            return {
                'storage_enabled': False,
                'error': 'Blockchain not configured'
            }
        
        try:
            total, real_count, fake_count, accuracy = self.contract.functions.getBlockchainStats().call()
            
            return {
                'storage_enabled': True,
                'network': network_config['name'],
                'contract_address': CONTRACT_ADDRESS,
                'total_verifications': total,
                'real_news_count': real_count,
                'fake_news_count': fake_count,
                'accuracy_percent': accuracy,
                'explorer_url': f"{network_config['explorer']}/address/{CONTRACT_ADDRESS}"
            }
            
        except Exception as e:
            return {
                'storage_enabled': False,
                'error': str(e)
            }


# Initialize service
truthchain_service = TruthChainService()


@app.route('/api/blockchain/status', methods=['GET'])
def get_status():
    """Get blockchain service status"""
    stats = truthchain_service.get_blockchain_stats()
    
    return jsonify({
        'connected': truthchain_service.is_configured(),
        'network': network_config['name'],
        'chain_id': network_config['chain_id'],
        'contract_address': CONTRACT_ADDRESS,
        'wallet_address': truthchain_service.account.address if truthchain_service.account else None,
        'explorer_url': network_config['explorer'],
        **stats
    })


@app.route('/api/blockchain/store', methods=['POST'])
def store_verification():
    """Store news verification on blockchain"""
    data = request.json
    
    article_text = data.get('content', '')
    prediction = data.get('label', '')
    trust_score = data.get('trust_score', data.get('confidence', 0)) / 100.0
    confidence = data.get('confidence', 0) / 100.0
    source_url = data.get('source_url')
    verification_method = data.get('verification_method', 'multi_model_ensemble')
    
    if not article_text or not prediction:
        return jsonify({'error': 'Missing required fields: content and label'}), 400
    
    # Check for duplicates first
    is_duplicate, duplicate_info = truthchain_service.check_duplicate(article_text)
    if is_duplicate:
        return jsonify({
            'success': True,
            'duplicate': True,
            'message': 'Article was previously verified',
            **duplicate_info
        })
    
    success, tx_hash, error = truthchain_service.store_verification(
        article_text, prediction, trust_score, confidence, source_url, verification_method
    )
    
    if success:
        return jsonify({
            'success': True,
            'tx_hash': tx_hash,
            'article_hash': generate_article_hash(article_text),
            'network': network_config['name'],
            'explorer_url': f"{network_config['explorer']}/tx/{tx_hash}" if tx_hash else None,
            'message': 'Verification stored on blockchain',
        })
    else:
        return jsonify({
            'success': False,
            'error': error,
        }), 500


@app.route('/api/blockchain/verify', methods=['POST'])
def verify_article():
    """Check if article was previously verified"""
    data = request.json
    
    article_text = data.get('content', '')
    if not article_text:
        return jsonify({'error': 'Missing content field'}), 400
    
    is_duplicate, duplicate_info = truthchain_service.check_duplicate(article_text)
    
    return jsonify({
        'verified': is_duplicate,
        'details': duplicate_info
    })


@app.route('/api/blockchain/stats', methods=['GET'])
def get_blockchain_stats():
    """Get comprehensive blockchain statistics"""
    return jsonify(truthchain_service.get_blockchain_stats())


@app.route('/api/blockchain/hash', methods=['POST'])
def generate_hash():
    """Generate article hash without storing"""
    data = request.json
    
    article_text = data.get('content', '')
    if not article_text:
        return jsonify({'error': 'Missing content field'}), 400
    
    article_hash = generate_article_hash(article_text)
    
    return jsonify({
        'article_hash': article_hash,
        'timestamp': int(time.time()),
        'network': network_config['name']
    })


if __name__ == '__main__':
    print(f"🚀 Starting TruthChain Blockchain Service")
    print(f"🌐 Network: {network_config['name']}")
    print(f"📡 RPC: {network_config['rpc_url']}")
    print(f"🔗 Contract: {CONTRACT_ADDRESS or 'Not configured'}")
    print(f"💾 Storage: {'Enabled' if truthchain_service.is_configured() else 'Disabled'}")
    
    app.run(debug=True, port=5000)
