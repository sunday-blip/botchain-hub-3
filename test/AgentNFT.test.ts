import { expect } from "chai";
import { ethers } from "hardhat";

describe("AgentNFT", () => {
  it("only the minter (AgentRegistry) can mint", async () => {
    const [owner, notMinter, to] = await ethers.getSigners();
    const AgentNFT = await ethers.getContractFactory("AgentNFT");
    const nft = await AgentNFT.deploy();
    await nft.waitForDeployment();

    await expect(nft.connect(notMinter).mint(to.address, 1, "hash")).to.be.revertedWith(
      "AgentNFT: caller is not minter"
    );

    await nft.connect(owner).setMinter(notMinter.address);
    await expect(nft.connect(notMinter).mint(to.address, 1, "hash")).to.not.be.reverted;
    expect(await nft.ownerOf(1)).to.equal(to.address);
  });

  it("only the contract owner can change the minter", async () => {
    const [, notOwner, newMinter] = await ethers.getSigners();
    const AgentNFT = await ethers.getContractFactory("AgentNFT");
    const nft = await AgentNFT.deploy();
    await nft.waitForDeployment();

    await expect(nft.connect(notOwner).setMinter(newMinter.address)).to.be.reverted;
  });

  it("returns an ipfs:// tokenURI reflecting the minted hash", async () => {
    const [owner, , to] = await ethers.getSigners();
    const AgentNFT = await ethers.getContractFactory("AgentNFT");
    const nft = await AgentNFT.deploy();
    await nft.waitForDeployment();
    await nft.setMinter(owner.address);

    await nft.mint(to.address, 5, "bafybeiExample");
    expect(await nft.tokenURI(5)).to.equal("ipfs://bafybeiExample");
  });

  it("reverts tokenURI for a token that was never minted", async () => {
    const AgentNFT = await ethers.getContractFactory("AgentNFT");
    const nft = await AgentNFT.deploy();
    await nft.waitForDeployment();
    await expect(nft.tokenURI(999)).to.be.reverted;
  });
});
