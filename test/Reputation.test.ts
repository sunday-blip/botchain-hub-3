import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reputation", () => {
  async function deployStandalone() {
    const [owner, marketplace, review, userA, userB] = await ethers.getSigners();
    const Reputation = await ethers.getContractFactory("Reputation");
    const reputation = await Reputation.deploy();
    await reputation.waitForDeployment();
    await reputation.setMarketplace(marketplace.address);
    await reputation.setReview(review.address);
    return { owner, marketplace, review, userA, userB, reputation };
  }

  it("only the registered marketplace address can record job completions", async () => {
    const { reputation, userA } = await deployStandalone();
    await expect(reputation.connect(userA).recordJobCompletion(1, userA.address)).to.be.revertedWith(
      "Reputation: caller is not marketplace"
    );
  });

  it("only the registered review address can record ratings", async () => {
    const { reputation, userA } = await deployStandalone();
    await expect(reputation.connect(userA).recordRating(1, 5)).to.be.revertedWith(
      "Reputation: caller is not review contract"
    );
  });

  it("counts completed jobs and unique users correctly across repeat interactions", async () => {
    const { reputation, marketplace, userA, userB } = await deployStandalone();

    await reputation.connect(marketplace).recordJobCompletion(1, userA.address);
    await reputation.connect(marketplace).recordJobCompletion(1, userA.address); // repeat user
    await reputation.connect(marketplace).recordJobCompletion(1, userB.address); // new user

    const stats = await reputation.getStats(1);
    expect(stats.completedJobs).to.equal(3n);
    expect(stats.uniqueUsers).to.equal(2n);
  });

  it("computes a scaled average rating and rejects out-of-range ratings", async () => {
    const { reputation, review } = await deployStandalone();

    await reputation.connect(review).recordRating(1, 5);
    await reputation.connect(review).recordRating(1, 3);
    // average = 4.0 -> scaled 400
    expect(await reputation.averageRatingScaled(1)).to.equal(400n);

    await expect(reputation.connect(review).recordRating(1, 0)).to.be.revertedWith(
      "Reputation: rating must be 1-5"
    );
    await expect(reputation.connect(review).recordRating(1, 6)).to.be.revertedWith(
      "Reputation: rating must be 1-5"
    );
  });

  it("returns 0 average for an agent with no ratings yet", async () => {
    const { reputation } = await deployStandalone();
    expect(await reputation.averageRatingScaled(42)).to.equal(0n);
  });

  it("only the owner can set the verified flag, and it's independent of activity", async () => {
    const { reputation, userA } = await deployStandalone();
    await expect(reputation.connect(userA).setVerified(1, true)).to.be.reverted;

    await reputation.setVerified(1, true);
    expect((await reputation.getStats(1)).verifiedCreator).to.equal(true);
  });
});
