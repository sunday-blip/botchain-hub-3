import { expect } from "chai";
import { deployAll, registerAgent } from "./helpers/deployAll";

describe("VersionControl", () => {
  it("lets only the current agent owner push a version", async () => {
    const ctx = await deployAll();
    const agentId = await registerAgent(ctx);

    await expect(
      ctx.versionControl.connect(ctx.other).pushVersion(agentId, "1.1.0", "faster", "hashV2")
    ).to.be.revertedWith("VersionControl: not agent owner");

    await expect(
      ctx.versionControl.connect(ctx.creator).pushVersion(agentId, "1.1.0", "faster", "hashV2")
    ).to.emit(ctx.versionControl, "VersionPublished");
  });

  it("accumulates versions in order and exposes the latest one", async () => {
    const ctx = await deployAll();
    const agentId = await registerAgent(ctx);

    await ctx.versionControl.connect(ctx.creator).pushVersion(agentId, "1.0.0", "initial release", "hash0");
    await ctx.versionControl.connect(ctx.creator).pushVersion(agentId, "1.1.0", "streaming support", "hash1");
    await ctx.versionControl.connect(ctx.creator).pushVersion(agentId, "2.0.0", "breaking API change", "hash2");

    const versions = await ctx.versionControl.getVersions(agentId);
    expect(versions.length).to.equal(3);
    expect(versions[0].version).to.equal("1.0.0");
    expect(versions[2].version).to.equal("2.0.0");

    const latest = await ctx.versionControl.latestVersion(agentId);
    expect(latest.version).to.equal("2.0.0");
    expect(latest.changelog).to.equal("breaking API change");

    expect(await ctx.versionControl.versionCount(agentId)).to.equal(3n);
  });

  it("reverts latestVersion when nothing has been published yet", async () => {
    const ctx = await deployAll();
    const agentId = await registerAgent(ctx);
    await expect(ctx.versionControl.latestVersion(agentId)).to.be.revertedWith(
      "VersionControl: no versions published"
    );
  });

  it("rejects an empty version string", async () => {
    const ctx = await deployAll();
    const agentId = await registerAgent(ctx);
    await expect(
      ctx.versionControl.connect(ctx.creator).pushVersion(agentId, "", "changelog", "hash")
    ).to.be.revertedWith("VersionControl: version required");
  });
});
