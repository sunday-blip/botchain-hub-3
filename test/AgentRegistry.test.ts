import { expect } from "chai";
import { deployAll, registerAgent } from "./helpers/deployAll";

describe("AgentRegistry", () => {
  it("registers an agent and mints the creator an AgentNFT with matching tokenId", async () => {
    const ctx = await deployAll();
    const agentId = await registerAgent(ctx, "bafybeiHash1", "Writing");

    expect(await ctx.agentNFT.ownerOf(agentId)).to.equal(ctx.creator.address);
    expect(await ctx.agentRegistry.totalAgents()).to.equal(1n);

    const record = await ctx.agentRegistry.getAgent(agentId);
    expect(record.creator).to.equal(ctx.creator.address);
    expect(record.ipfsHash).to.equal("bafybeiHash1");
    expect(record.category).to.equal("Writing");
    expect(record.status).to.equal(0); // Active
  });

  it("rejects registration with an empty ipfsHash or category", async () => {
    const ctx = await deployAll();
    await expect(ctx.agentRegistry.connect(ctx.creator).register("", "Writing")).to.be.revertedWith(
      "AgentRegistry: ipfsHash required"
    );
    await expect(ctx.agentRegistry.connect(ctx.creator).register("bafyHash", "")).to.be.revertedWith(
      "AgentRegistry: category required"
    );
  });

  it("increments agentId across multiple registrations", async () => {
    const ctx = await deployAll();
    const id1 = await registerAgent(ctx, "hash1");
    const id2 = await registerAgent(ctx, "hash2");
    expect(id2).to.equal(id1 + 1n);
    expect(await ctx.agentRegistry.totalAgents()).to.equal(2n);
  });

  it("only the current NFT owner can update metadata or status", async () => {
    const ctx = await deployAll();
    const agentId = await registerAgent(ctx);

    await expect(
      ctx.agentRegistry.connect(ctx.other).updateMetadata(agentId, "new-hash")
    ).to.be.revertedWith("AgentRegistry: not agent owner");

    await ctx.agentRegistry.connect(ctx.creator).updateMetadata(agentId, "new-hash");
    const record = await ctx.agentRegistry.getAgent(agentId);
    expect(record.ipfsHash).to.equal("new-hash");

    await expect(ctx.agentRegistry.connect(ctx.other).setStatus(agentId, 1)).to.be.revertedWith(
      "AgentRegistry: not agent owner"
    );
    await ctx.agentRegistry.connect(ctx.creator).setStatus(agentId, 1); // Paused
    expect((await ctx.agentRegistry.getAgent(agentId)).status).to.equal(1);
  });

  it("routes ownership through the current NFT holder after a transfer", async () => {
    const ctx = await deployAll();
    const agentId = await registerAgent(ctx);

    await ctx.agentNFT.connect(ctx.creator).transferFrom(ctx.creator.address, ctx.buyer.address, agentId);

    expect(await ctx.agentRegistry.isOwner(agentId, ctx.buyer.address)).to.equal(true);
    expect(await ctx.agentRegistry.isOwner(agentId, ctx.creator.address)).to.equal(false);
    expect(await ctx.agentRegistry.ownerOf(agentId)).to.equal(ctx.buyer.address);

    // Old owner can no longer update metadata; new owner can.
    await expect(
      ctx.agentRegistry.connect(ctx.creator).updateMetadata(agentId, "x")
    ).to.be.revertedWith("AgentRegistry: not agent owner");
    await expect(ctx.agentRegistry.connect(ctx.buyer).updateMetadata(agentId, "x")).to.not.be.reverted;
  });
});
