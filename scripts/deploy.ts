import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploys and wires the full BotChain Hub contract stack.
 *
 * Order matters because several contracts need each other's addresses in
 * their constructor, and a couple of permission links can only be set
 * *after* both sides exist:
 *
 *   1. AgentNFT                     (no dependencies)
 *   2. AgentRegistry(agentNFT)      (needs AgentNFT address)
 *   3. AgentNFT.setMinter(registry) (wiring: only registry can mint)
 *   4. VersionControl(registry)     (needs AgentRegistry address)
 *   5. Reputation                   (no dependencies)
 *   6. Payments(feeRecipient, fee)  (no dependencies)
 *   7. Marketplace(registry, payments, reputation)
 *   8. Payments.setMarketplace(marketplace)     (wiring)
 *   9. Reputation.setMarketplace(marketplace)   (wiring)
 *  10. Review(marketplace, reputation)
 *  11. Reputation.setReview(review)             (wiring)
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const PLATFORM_FEE_BPS = 250; // 2.5%
  const feeRecipient = deployer.address; // swap for a treasury address in production

  const AgentNFT = await ethers.getContractFactory("AgentNFT");
  const agentNFT = await AgentNFT.deploy();
  await agentNFT.waitForDeployment();
  console.log("AgentNFT:", await agentNFT.getAddress());

  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy(await agentNFT.getAddress());
  await agentRegistry.waitForDeployment();
  console.log("AgentRegistry:", await agentRegistry.getAddress());

  await (await agentNFT.setMinter(await agentRegistry.getAddress())).wait();
  console.log("AgentNFT.minter -> AgentRegistry");

  const VersionControl = await ethers.getContractFactory("VersionControl");
  const versionControl = await VersionControl.deploy(await agentRegistry.getAddress());
  await versionControl.waitForDeployment();
  console.log("VersionControl:", await versionControl.getAddress());

  const Reputation = await ethers.getContractFactory("Reputation");
  const reputation = await Reputation.deploy();
  await reputation.waitForDeployment();
  console.log("Reputation:", await reputation.getAddress());

  const Payments = await ethers.getContractFactory("Payments");
  const payments = await Payments.deploy(feeRecipient, PLATFORM_FEE_BPS);
  await payments.waitForDeployment();
  console.log("Payments:", await payments.getAddress());

  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(
    await agentRegistry.getAddress(),
    await payments.getAddress(),
    await reputation.getAddress()
  );
  await marketplace.waitForDeployment();
  console.log("Marketplace:", await marketplace.getAddress());

  await (await payments.setMarketplace(await marketplace.getAddress())).wait();
  await (await reputation.setMarketplace(await marketplace.getAddress())).wait();
  console.log("Payments/Reputation.marketplace -> Marketplace");

  const Review = await ethers.getContractFactory("Review");
  const review = await Review.deploy(await marketplace.getAddress(), await reputation.getAddress());
  await review.waitForDeployment();
  console.log("Review:", await review.getAddress());

  await (await reputation.setReview(await review.getAddress())).wait();
  console.log("Reputation.review -> Review");

  const addresses = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    feeRecipient,
    platformFeeBps: PLATFORM_FEE_BPS,
    contracts: {
      AgentNFT: await agentNFT.getAddress(),
      AgentRegistry: await agentRegistry.getAddress(),
      VersionControl: await versionControl.getAddress(),
      Reputation: await reputation.getAddress(),
      Payments: await payments.getAddress(),
      Marketplace: await marketplace.getAddress(),
      Review: await review.getAddress(),
    },
    deployedAt: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${addresses.network || "unknown"}-${addresses.chainId}.json`);
  fs.writeFileSync(outFile, JSON.stringify(addresses, null, 2));

  console.log("\nAll contracts deployed and wired. Addresses written to:", outFile);
  console.table(addresses.contracts);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
