import { ethers } from "hardhat";

async function main() {
  console.log("Deploying AnalysisRegistry contract...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());
  
  const AnalysisRegistry = await ethers.getContractFactory("AnalysisRegistry");
  const registry = await AnalysisRegistry.deploy();
  
  await registry.waitForDeployment();
  
  const address = await registry.getAddress();
  console.log(`\n✅ AnalysisRegistry deployed to: ${address}`);
  console.log(`\nAdd this to your .env file:`);
  console.log(`CONTRACT_ADDRESS=${address}`);
  console.log(`VITE_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
