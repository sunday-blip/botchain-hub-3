// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IAgentRegistry.sol";

/// @title VersionControl
/// @notice Append-only version history per agent. Mirrors the frontend's
/// `VersionEntry { version, publishedAt, changelog }` type exactly, plus an
/// ipfsHash pointer so each version can pin its own updated metadata/model
/// artifact in Session 3.
contract VersionControl {
    struct VersionEntry {
        string version;
        string changelog;
        string ipfsHash;
        uint256 publishedAt;
    }

    IAgentRegistry public immutable agentRegistry;

    mapping(uint256 => VersionEntry[]) private _versions;

    event VersionPublished(uint256 indexed agentId, string version, string ipfsHash, uint256 publishedAt);

    constructor(address agentRegistryAddress) {
        require(agentRegistryAddress != address(0), "VersionControl: zero address");
        agentRegistry = IAgentRegistry(agentRegistryAddress);
    }

    /// @notice Publish a new version. Anyone can call, but it only succeeds
    /// if the caller currently owns the agent's NFT.
    function pushVersion(
        uint256 agentId,
        string calldata version,
        string calldata changelog,
        string calldata ipfsHash
    ) external {
        require(agentRegistry.isOwner(agentId, msg.sender), "VersionControl: not agent owner");
        require(bytes(version).length > 0, "VersionControl: version required");

        _versions[agentId].push(
            VersionEntry({version: version, changelog: changelog, ipfsHash: ipfsHash, publishedAt: block.timestamp})
        );

        emit VersionPublished(agentId, version, ipfsHash, block.timestamp);
    }

    function getVersions(uint256 agentId) external view returns (VersionEntry[] memory) {
        return _versions[agentId];
    }

    function versionCount(uint256 agentId) external view returns (uint256) {
        return _versions[agentId].length;
    }

    function latestVersion(uint256 agentId) external view returns (VersionEntry memory) {
        VersionEntry[] storage v = _versions[agentId];
        require(v.length > 0, "VersionControl: no versions published");
        return v[v.length - 1];
    }
}
