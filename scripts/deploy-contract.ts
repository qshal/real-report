/**
 * Deploy TruthChain Smart Contract
 * Run with: npx hardhat run scripts/deploy-contract.ts --network sepolia
 */

import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying TruthChain contract...");

  // Get the contract factory
  const TruthChain = await ethers.getContractFactory("TruthChain");

  // Deploy the contract
  const truthChain = await TruthChain.deploy();

  // Wait for deployment to complete
  await truthChain.waitForDeployment();

  const contractAddress = await truthChain.getAddress();
  
  console.log("✅ TruthChain deployed to:", contractAddress);
  console.log("📝 Update your .env file with:");
  console.log(`VITE_CONTRACT_ADDRESS="${contractAddress}"`);
  console.log(`CONTRACT_ADDRESS="${contractAddress}"`);

  // Verify deployment by calling view functions
  try {
    const totalVerifications = await truthChain.getTotalVerifications();
    const [total, realCount, fakeCount, accuracy] = await truthChain.getBlockchainStats();
    
    console.log("🔍 Contract verification:");
    console.log(`  Total verifications: ${totalVerifications.toString()}`);
    console.log(`  Real news count: ${realCount.toString()}`);
    console.log(`  Fake news count: ${fakeCount.toString()}`);
    console.log(`  Accuracy: ${accuracy.toString()}%`);
  } catch (error) {
    console.error("❌ Contract verification failed:", error);
  }

  // Display network info
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "Chain ID:", network.chainId.toString());
  
  // Display deployer info
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("👤 Deployer:", deployer.address);
  console.log("💰 Deployer balance:", ethers.formatEther(balance), "ETH");

  // Display contract features
  console.log("\n🔧 TruthChain Features:");
  console.log("  ✓ Privacy-preserving (only stores SHA-256 hashes)");
  console.log("  ✓ Duplicate detection");
  console.log("  ✓ Multi-network support (Polygon/Ethereum)");
  console.log("  ✓ Comprehensive verification tracking");
  console.log("  ✓ Statistical analysis");

  console.log("\n🚀 Next steps:");
  console.log("1. Update your .env file with the contract address");
  console.log("2. Configure your blockchain network (polygon/ethereum/sepolia)");
  console.log("3. Start the backend service: cd backend && python blockchain_service.py");
  console.log("4. Test the integration in your frontend");
  console.log("5. Monitor transactions at:", `https://${network.name === 'sepolia' ? 'sepolia.' : ''}etherscan.io/address/${contractAddress}`);

  // Test storage (optional)
  console.log("\n🧪 Testing contract functionality...");
  try {
    const testHash = "test_article_hash_" + Date.now();
    const tx = await truthChain.storeNewsHash(
      testHash,
      true, // isReal
      85,   // trustScore
      "test.com", // source
      "4.0.0", // pipelineVersion
      90,   // confidence
      "test_deployment" // verificationMethod
    );
    
    await tx.wait();
    console.log("✅ Test verification stored successfully");
    
    // Verify the test storage
    const [exists, isReal, trustScore] = await truthChain.verifyNewsHash(testHash);
    console.log(`✅ Test verification retrieved: exists=${exists}, isReal=${isReal}, trustScore=${trustScore}`);
    
  } catch (error) {
    console.log("⚠️ Test storage failed (this is normal for some networks):", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });