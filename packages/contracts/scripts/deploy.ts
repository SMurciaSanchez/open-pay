import { ethers, network, run } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`Deploying to network: ${network.name}`);
  console.log(`Deployer:             ${deployer.address}`);
  console.log(`Balance:              ${ethers.formatEther(balance)} ETH`);

  const Factory = await ethers.getContractFactory("TransactionRegistry");
  const registry = await Factory.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  const deployTx = registry.deploymentTransaction();

  console.log("\nDeployed!");
  console.log(`Contract address:     ${address}`);
  console.log(`Deployment tx:        ${deployTx?.hash}`);

  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\nWaiting 30s before Basescan verification...");
    await new Promise((resolve) => setTimeout(resolve, 30_000));

    try {
      await run("verify:verify", {
        address,
        constructorArguments: [],
      });
      console.log("Verified on Basescan.");
    } catch (err: any) {
      if (err.message?.toLowerCase().includes("already verified")) {
        console.log("Already verified.");
      } else {
        console.error("Verification failed:", err.message);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
