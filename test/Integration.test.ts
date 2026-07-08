import { expect } from "chai";
import { ethers } from "hardhat";
import { deployAll } from "./helpers/deployAll";

const Model = { OneTime: 0, Subscription: 1, Free: 2, Donation: 3 };

/**
 * Mirrors src/lib/utils.ts::computeTrustScore so this test also documents
 * that the on-chain data shape lines up with the existing frontend formula.
 */
function computeTrustScore(input: {
  completedJobs: number;
  averageRating: number;
  walletAgeDays: number;
  verifiedCreator: boolean;
  uniqueUsers: number;
}) {
  const jobsScore = Math.min(Math.log10(input.completedJobs + 1) * 18, 30);
  const ratingScore = (input.averageRating / 5) * 30;
  const ageScore = Math.min(Math.log10(input.walletAgeDays + 1) * 8, 15);
  const usersScore = Math.min(Math.log10(input.uniqueUsers + 1) * 12, 20);
  const verifiedBonus = input.verifiedCreator ? 5 : 0;
  return Math.round(Math.min(jobsScore + ratingScore + ageScore + usersScore + verifiedBonus, 100));
}

describe("Integration: full agent lifecycle", () => {
  it("takes an agent from registration through purchase, review, and withdrawal", async () => {
    const ctx = await deployAll();

    // 1. Creator registers an agent -> mints AgentNFT #1
    const registerTx = await ctx.agentRegistry.connect(ctx.creator).register("bafybeiMeta", "Programming");
    await registerTx.wait();
    const agentId = 1n;
    expect(await ctx.agentNFT.ownerOf(agentId)).to.equal(ctx.creator.address);

    // 2. Creator publishes a version
    await ctx.versionControl.connect(ctx.creator).pushVersion(agentId, "1.0.0", "Initial release", "bafybeiV1");
    expect((await ctx.versionControl.latestVersion(agentId)).version).to.equal("1.0.0");

    // 3. Creator lists it as a one-time purchase
    const price = ethers.parseEther("0.05");
    await ctx.marketplace.connect(ctx.creator).createOrUpdateListing(agentId, Model.OneTime, price, 0);

    // 4. Two different buyers purchase
    await ctx.marketplace.connect(ctx.buyer).purchase(agentId, { value: price });
    await ctx.marketplace.connect(ctx.buyer2).purchase(agentId, { value: price });

    expect(await ctx.marketplace.hasActiveAccess(ctx.buyer.address, agentId)).to.equal(true);
    expect(await ctx.marketplace.hasActiveAccess(ctx.buyer2.address, agentId)).to.equal(true);

    // 5. Both buyers leave reviews
    await ctx.review.connect(ctx.buyer).submitReview(agentId, 5, "Excellent, fast turnaround");
    await ctx.review.connect(ctx.buyer2).submitReview(agentId, 4, "Solid, would use again");

    // 6. Admin marks the creator verified (Session 5 admin panel hook)
    await ctx.reputation.setVerified(agentId, true);

    // 7. Pull the raw stats the frontend needs and feed them into the
    // existing computeTrustScore formula unchanged.
    const stats = await ctx.reputation.getStats(agentId);
    const agentRecord = await ctx.agentRegistry.getAgent(agentId);
    const walletAgeDays = 42; // in production: (block.timestamp - agentRecord.createdAt) / 86400
    void agentRecord;

    expect(stats.completedJobs).to.equal(2n);
    expect(stats.uniqueUsers).to.equal(2n);

    const avgRatingScaled = await ctx.reputation.averageRatingScaled(agentId);
    const averageRating = Number(avgRatingScaled) / 100;
    expect(averageRating).to.equal(4.5);

    const score = computeTrustScore({
      completedJobs: Number(stats.completedJobs),
      averageRating,
      walletAgeDays,
      verifiedCreator: stats.verifiedCreator,
      uniqueUsers: Number(stats.uniqueUsers),
    });
    expect(score).to.be.a("number").and.to.be.within(0, 100);

    // 8. Creator withdraws proceeds from both sales.
    const expectedFee = (price * 2n * 250n) / 10000n;
    const expectedPayout = price * 2n - expectedFee;
    expect(await ctx.payments.withdrawable(ctx.creator.address)).to.equal(expectedPayout);

    await expect(ctx.payments.connect(ctx.creator).withdraw()).to.changeEtherBalance(
      ctx.creator,
      expectedPayout
    );

    // 9. Fee recipient withdraws the platform's cut.
    await expect(ctx.payments.connect(ctx.feeRecipient).withdraw()).to.changeEtherBalance(
      ctx.feeRecipient,
      expectedFee
    );
  });

  it("supports selling the agent NFT mid-lifecycle and future revenue follows the new owner", async () => {
    const ctx = await deployAll();
    await ctx.agentRegistry.connect(ctx.creator).register("bafybeiMeta2", "Trading");
    const agentId = 1n;
    const price = ethers.parseEther("0.02");
    await ctx.marketplace.connect(ctx.creator).createOrUpdateListing(agentId, Model.OneTime, price, 0);

    // First sale pays the original creator.
    await ctx.marketplace.connect(ctx.buyer).purchase(agentId, { value: price });
    expect(await ctx.payments.withdrawable(ctx.creator.address)).to.be.gt(0n);

    // Creator sells the agent NFT itself to buyer2.
    await ctx.agentNFT.connect(ctx.creator).transferFrom(ctx.creator.address, ctx.buyer2.address, agentId);

    // buyer2 (new owner) can now update the listing; old creator cannot.
    await expect(
      ctx.marketplace.connect(ctx.creator).createOrUpdateListing(agentId, Model.Donation, 0, 0)
    ).to.be.revertedWith("Marketplace: not agent owner");
    await ctx.marketplace.connect(ctx.buyer2).createOrUpdateListing(agentId, Model.Donation, 0, 0);

    // Next payment (from a new buyer) routes to buyer2, not the original creator.
    const creatorBalanceBefore = await ctx.payments.withdrawable(ctx.creator.address);
    await ctx.marketplace.connect(ctx.other).purchase(agentId, { value: ethers.parseEther("0.01") });
    expect(await ctx.payments.withdrawable(ctx.creator.address)).to.equal(creatorBalanceBefore); // unchanged
    expect(await ctx.payments.withdrawable(ctx.buyer2.address)).to.be.gt(0n);
  });
});
