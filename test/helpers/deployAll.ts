import { ethers } from "hardhat";

export const PLATFORM_FEE_BPS = 250; // 2.5%

export async function deployAll() {
  const [deployer, creator, buyer, buyer2, feeRecipient, other] = await ethers.getSigners();

  const AgentNFT = await ethers.getContractFactory("AgentNFT");
  const agentNFT = await AgentNFT.deploy();
  await agentNFT.waitForDeployment();

  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy(await agentNFT.getAddress());
  await agentRegistry.waitForDeployment();
  await (await agentNFT.setMinter(await agentRegistry.getAddress())).wait();

  const VersionControl = await ethers.getContractFactory("VersionControl");
  const versionControl = await VersionControl.deploy(await agentRegistry.getAddress());
  await versionControl.waitForDeployment();

  const Reputation = await ethers.getContractFactory("Reputation");
  const reputation = await Reputation.deploy();
  await reputation.waitForDeployment();

  const Payments = await ethers.getContractFactory("Payments");
  const payments = await Payments.deploy(feeRecipient.address, PLATFORM_FEE_BPS);
  await payments.waitForDeployment();

  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(
    await agentRegistry.getAddress(),
    await payments.getAddress(),
    await reputation.getAddress()
  );
  await marketplace.waitForDeployment();

  await (await payments.setMarketplace(await marketplace.getAddress())).wait();
  await (await reputation.setMarketplace(await marketplace.getAddress())).wait();

  const Review = await ethers.getContractFactory("Review");
  const review = await Review.deploy(await marketplace.getAddress(), await reputation.getAddress());
  await review.waitForDeployment();

  await (await reputation.setReview(await review.getAddress())).wait();

  return {
    deployer,
    creator,
    buyer,
    buyer2,
    feeRecipient,
    other,
    agentNFT,
    agentRegistry,
    versionControl,
    reputation,
    payments,
    marketplace,
    review,
  };
}

/** Registers one agent as `creator` and returns its agentId (bigint). */
export async function registerAgent(
  ctx: Awaited<ReturnType<typeof deployAll>>,
  ipfsHash = "bafybeigDummyMetadataHash",
  category = "Writing"
) {
  const tx = await ctx.agentRegistry.connect(ctx.creator).register(ipfsHash, category);
  const receipt = await tx.wait();
  const event = receipt!.logs
    .map((log) => {
      try {
        return ctx.agentRegistry.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed) => parsed?.name === "AgentRegistered");
  return event!.args.agentId as bigint;
}
