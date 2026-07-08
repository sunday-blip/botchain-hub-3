// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal surface other contracts need from AgentRegistry.
/// Kept separate from the full contract so Marketplace / VersionControl
/// don't need to import AgentNFT's ERC721 bytecode just to check ownership.
interface IAgentRegistry {
    function isOwner(uint256 agentId, address who) external view returns (bool);
    function ownerOf(uint256 agentId) external view returns (address);
}
