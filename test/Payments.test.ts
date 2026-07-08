import { expect } from "chai";
import { ethers } from "hardhat";
import { PLATFORM_FEE_BPS, deployAll } from "./helpers/deployAll";

describe("Payments", () => {
  it("only the marketplace address can call processPayment", async () => {
    const ctx = await deployAll();
    await expect(
      ctx.payments.connect(ctx.other).processPayment(1, ctx.creator.address, ctx.buyer.address, {
        value: ethers.parseEther("1"),
      })
    ).to.be.revertedWith("Payments: caller is not marketplace");
  });

  it("splits a payment between creator and fee recipient at the configured bps", async () => {
    const ctx = await deployAll();
    // Marketplace is the only allowed caller; simplest path is a real purchase.
    const AgentId = 1;
    await ctx.agentRegistry.connect(ctx.creator).register("hash", "Writing");
    await ctx.marketplace.connect(ctx.creator).createOrUpdateListing(AgentId, 0, ethers.parseEther("1"), 0);

    await ctx.marketplace.connect(ctx.buyer).purchase(AgentId, { value: ethers.parseEther("1") });

    const expectedFee = (ethers.parseEther("1") * BigInt(PLATFORM_FEE_BPS)) / 10000n;
    const expectedPayout = ethers.parseEther("1") - expectedFee;

    expect(await ctx.payments.withdrawable(ctx.creator.address)).to.equal(expectedPayout);
    expect(await ctx.payments.withdrawable(ctx.feeRecipient.address)).to.equal(expectedFee);
  });

  it("lets an account withdraw its accumulated balance exactly once", async () => {
    const ctx = await deployAll();
    await ctx.agentRegistry.connect(ctx.creator).register("hash", "Writing");
    await ctx.marketplace.connect(ctx.creator).createOrUpdateListing(1, 0, ethers.parseEther("1"), 0);
    await ctx.marketplace.connect(ctx.buyer).purchase(1, { value: ethers.parseEther("1") });

    const expectedPayout = ethers.parseEther("1") - (ethers.parseEther("1") * BigInt(PLATFORM_FEE_BPS)) / 10000n;

    const before = await ethers.provider.getBalance(ctx.creator.address);
    const tx = await ctx.payments.connect(ctx.creator).withdraw();
    const receipt = await tx.wait();
    const gasCost = receipt!.gasUsed * receipt!.gasPrice;
    const after = await ethers.provider.getBalance(ctx.creator.address);

    expect(await ctx.payments.withdrawable(ctx.creator.address)).to.equal(0n);
    expect(after).to.equal(before - gasCost + expectedPayout);

    await expect(ctx.payments.connect(ctx.creator).withdraw()).to.be.revertedWith(
      "Payments: nothing to withdraw"
    );
  });

  it("rejects a fee above the hard cap at deploy time and via setFeeBps", async () => {
    const Payments = await ethers.getContractFactory("Payments");
    const [owner] = await ethers.getSigners();
    await expect(Payments.deploy(owner.address, 1001)).to.be.revertedWith("Payments: fee too high");

    const payments = await Payments.deploy(owner.address, 250);
    await payments.waitForDeployment();
    await expect(payments.setFeeBps(1001)).to.be.revertedWith("Payments: fee too high");
    await expect(payments.setFeeBps(500)).to.not.be.reverted;
  });

  it("only the owner can update marketplace, fee bps, and fee recipient", async () => {
    const ctx = await deployAll();
    await expect(ctx.payments.connect(ctx.other).setMarketplace(ctx.other.address)).to.be.reverted;
    await expect(ctx.payments.connect(ctx.other).setFeeBps(100)).to.be.reverted;
    await expect(ctx.payments.connect(ctx.other).setFeeRecipient(ctx.other.address)).to.be.reverted;
  });
});
