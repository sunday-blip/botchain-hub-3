import { expect } from "chai";
import { ethers } from "hardhat";
import { deployAll, registerAgent } from "./helpers/deployAll";

const Model = { OneTime: 0, Subscription: 1, Free: 2, Donation: 3 };

describe("Marketplace", () => {
  it("only the agent owner can create or update a listing", async () => {
    const ctx = await deployAll();
    const agentId = await registerAgent(ctx);

    await expect(
      ctx.marketplace.connect(ctx.other).createOrUpdateListing(agentId, Model.OneTime, ethers.parseEther("0.1"), 0)
    ).to.be.revertedWith("Marketplace: not agent owner");

    await expect(
      ctx.marketplace
        .connect(ctx.creator)
        .createOrUpdateListing(agentId, Model.OneTime, ethers.parseEther("0.1"), 0)
    ).to.emit(ctx.marketplace, "ListingUpdated");
  });

  it("requires an interval for Subscription listings and a price for OneTime listings", async () => {
    const ctx = await deployAll();
    const agentId = await registerAgent(ctx);

    await expect(
      ctx.marketplace.connect(ctx.creator).createOrUpdateListing(agentId, Model.Subscription, ethers.parseEther("0.05"), 0)
    ).to.be.revertedWith("Marketplace: interval required");

    await expect(
      ctx.marketplace.connect(ctx.creator).createOrUpdateListing(agentId, Model.OneTime, 0, 0)
    ).to.be.revertedWith("Marketplace: price required");
  });

  it("handles a OneTime purchase: exact price required, grants access, blocks buying your own agent", async () => {
    const ctx = await deployAll();
    const agentId = await registerAgent(ctx);
    const price = ethers.parseEther("0.1");
    await ctx.marketplace.connect(ctx.creator).createOrUpdateListing(agentId, Model.OneTime, price, 0);

    await expect(
      ctx.marketplace.connect(ctx.buyer).purchase(agentId, { value: ethers.parseEther("0.05") })
    ).to.be.revertedWith("Marketplace: incorrect price");

    await expect(
      ctx.marketplace.connect(ctx.creator).purchase(agentId, { value: price })
    ).to.be.revertedWith("Marketplace: cannot buy your own agent");

    await ctx.marketplace.connect(ctx.buyer).purchase(agentId, { value: price });
    expect(await ctx.marketplace.hasActiveAccess(ctx.buyer.address, agentId)).to.equal(true);
    expect(await ctx.marketplace.hasActiveAccess(ctx.buyer2.address, agentId)).to.equal(false);
  });

  it("handles Donation purchases with any positive amount", async () => {
    const ctx = await deployAll();
    const agentId = await registerAgent(ctx);
    await ctx.marketplace.connect(ctx.creator).createOrUpdateListing(agentId, Model.Donation, 0, 0);

    await expect(
      ctx.marketplace.connect(ctx.buyer).purchase(agentId, { value: 0 })
    ).to.be.revertedWith("Marketplace: donation must be positive");

    await ctx.marketplace.connect(ctx.buyer).purchase(agentId, { value: ethers.parseEther("0.001") });
    expect(await ctx.marketplace.hasActiveAccess(ctx.buyer.address, agentId)).to.equal(true);
  });

  it("handles Subscription: expiry math, stacking renewals, expiry lapsing", async () => {
    const ctx = await deployAll();
    const agentId = await registerAgent(ctx);
    const price = ethers.parseEther("0.02");
    const intervalDays = 30;
    await ctx.marketplace.connect(ctx.creator).createOrUpdateListing(agentId, Model.Subscription, price, intervalDays);

    await ctx.marketplace.connect(ctx.buyer).subscribe(agentId, { value: price });
    expect(await ctx.marketplace.hasActiveAccess(ctx.buyer.address, agentId)).to.equal(true);

    const expiry1 = await ctx.marketplace.subscriptionExpiry(ctx.buyer.address, agentId);
    const latestBlock = await ethers.provider.getBlock("latest");
    expect(expiry1).to.be.closeTo(BigInt(latestBlock!.timestamp) + BigInt(intervalDays * 86400), 5n);

    // Renewing while still active stacks on top of the existing expiry.
    await ctx.marketplace.connect(ctx.buyer).subscribe(agentId, { value: price });
    const expiry2 = await ctx.marketplace.subscriptionExpiry(ctx.buyer.address, agentId);
    expect(expiry2).to.equal(expiry1 + BigInt(intervalDays * 86400));

    // Fast-forward past expiry -> access should lapse.
    await ethers.provider.send("evm_increaseTime", [intervalDays * 86400 * 3]);
    await ethers.provider.send("evm_mine", []);
    expect(await ctx.marketplace.hasActiveAccess(ctx.buyer.address, agentId)).to.equal(false);
  });

  it("Free listings always grant access and useFreeAgent records usage without payment", async () => {
    const ctx = await deployAll();
    const agentId = await registerAgent(ctx);
    await ctx.marketplace.connect(ctx.creator).createOrUpdateListing(agentId, Model.Free, 0, 0);

    expect(await ctx.marketplace.hasActiveAccess(ctx.buyer.address, agentId)).to.equal(true);
    await expect(ctx.marketplace.connect(ctx.buyer).useFreeAgent(agentId)).to.emit(
      ctx.marketplace,
      "FreeUsageRecorded"
    );

    const stats = await ctx.reputation.getStats(agentId);
    expect(stats.completedJobs).to.equal(1n);
    expect(stats.uniqueUsers).to.equal(1n);
  });

  it("routes payment to whoever currently owns the agent's NFT", async () => {
    const ctx = await deployAll();
    const agentId = await registerAgent(ctx);
    const price = ethers.parseEther("0.1");
    await ctx.marketplace.connect(ctx.creator).createOrUpdateListing(agentId, Model.OneTime, price, 0);

    // Sell the agent NFT to buyer2 before buyer purchases.
    await ctx.agentNFT.connect(ctx.creator).transferFrom(ctx.creator.address, ctx.buyer2.address, agentId);

    await ctx.marketplace.connect(ctx.buyer).purchase(agentId, { value: price });

    const expectedFee = (price * 250n) / 10000n;
    expect(await ctx.payments.withdrawable(ctx.buyer2.address)).to.equal(price - expectedFee);
    expect(await ctx.payments.withdrawable(ctx.creator.address)).to.equal(0n);
  });
});
