import { expect } from "chai";
import { ethers } from "hardhat";
import { deployAll, registerAgent } from "./helpers/deployAll";

const Model = { OneTime: 0, Subscription: 1, Free: 2, Donation: 3 };

describe("Review", () => {
  it("rejects a review from a wallet with no verified access to the agent", async () => {
    const ctx = await deployAll();
    const agentId = await registerAgent(ctx);
    await ctx.marketplace.connect(ctx.creator).createOrUpdateListing(agentId, Model.OneTime, ethers.parseEther("0.1"), 0);

    await expect(
      ctx.review.connect(ctx.buyer).submitReview(agentId, 5, "Great agent!")
    ).to.be.revertedWith("Review: no verified access to this agent");
  });

  it("accepts a review after purchase, records it, and updates Reputation", async () => {
    const ctx = await deployAll();
    const agentId = await registerAgent(ctx);
    const price = ethers.parseEther("0.1");
    await ctx.marketplace.connect(ctx.creator).createOrUpdateListing(agentId, Model.OneTime, price, 0);
    await ctx.marketplace.connect(ctx.buyer).purchase(agentId, { value: price });

    await expect(ctx.review.connect(ctx.buyer).submitReview(agentId, 5, "Great agent!")).to.emit(
      ctx.review,
      "ReviewSubmitted"
    );

    const reviews = await ctx.review.getReviews(agentId);
    expect(reviews.length).to.equal(1);
    expect(reviews[0].author).to.equal(ctx.buyer.address);
    expect(reviews[0].rating).to.equal(5);

    expect(await ctx.reputation.averageRatingScaled(agentId)).to.equal(500n);
  });

  it("allows Free-tier agents to be reviewed without any purchase", async () => {
    const ctx = await deployAll();
    const agentId = await registerAgent(ctx);
    await ctx.marketplace.connect(ctx.creator).createOrUpdateListing(agentId, Model.Free, 0, 0);

    await expect(ctx.review.connect(ctx.buyer).submitReview(agentId, 4, "Solid free tool")).to.not.be.reverted;
  });

  it("blocks a second review from the same wallet on the same agent", async () => {
    const ctx = await deployAll();
    const agentId = await registerAgent(ctx);
    await ctx.marketplace.connect(ctx.creator).createOrUpdateListing(agentId, Model.Free, 0, 0);

    await ctx.review.connect(ctx.buyer).submitReview(agentId, 4, "First review");
    await expect(
      ctx.review.connect(ctx.buyer).submitReview(agentId, 5, "Trying again")
    ).to.be.revertedWith("Review: already reviewed this agent");
  });

  it("rejects ratings outside the 1-5 range", async () => {
    const ctx = await deployAll();
    const agentId = await registerAgent(ctx);
    await ctx.marketplace.connect(ctx.creator).createOrUpdateListing(agentId, Model.Free, 0, 0);

    await expect(ctx.review.connect(ctx.buyer).submitReview(agentId, 0, "bad")).to.be.revertedWith(
      "Review: rating must be 1-5"
    );
    await expect(ctx.review.connect(ctx.buyer).submitReview(agentId, 6, "bad")).to.be.revertedWith(
      "Review: rating must be 1-5"
    );
  });

  it("lets each wallet like a review once, and only the owner can report one", async () => {
    const ctx = await deployAll();
    const agentId = await registerAgent(ctx);
    await ctx.marketplace.connect(ctx.creator).createOrUpdateListing(agentId, Model.Free, 0, 0);
    await ctx.review.connect(ctx.buyer).submitReview(agentId, 4, "Nice");

    await ctx.review.connect(ctx.buyer2).likeReview(agentId, 0);
    expect((await ctx.review.getReviews(agentId))[0].likes).to.equal(1n);

    await expect(ctx.review.connect(ctx.buyer2).likeReview(agentId, 0)).to.be.revertedWith(
      "Review: already liked"
    );

    await expect(ctx.review.connect(ctx.other).reportReview(agentId, 0)).to.be.reverted;
    await ctx.review.connect(ctx.deployer).reportReview(agentId, 0);
    expect((await ctx.review.getReviews(agentId))[0].reported).to.equal(true);
  });
});
