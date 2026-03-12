/**
 * Hardhat deployment script for AnalysisRegistry contract
 * 
 * Usage:
 * npx hardhat run contracts/deploy.js --network sepolia
 */

const hre = require("hardhat");

async function main() {
  console.log("Deploying AnalysisRegistry contract...");
  
  const AnalysisRegistry = await hre.ethers.getContractFactory("AnalysisRegistry");
  const registry = await AnalysisRegistry.deploy();
  
  await registry.waitForDeployment();
  
  const address = await registry.getAddress();
  console.log(`AnalysisRegistry deployed to: ${address}`);
  console.log(`\nAdd this to your .env file:`);
  console.log(`VITE_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
