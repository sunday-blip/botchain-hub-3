// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./AgentNFT.sol";

/// @title AgentRegistry
/// @notice Source of truth for "what agents exist". Registering an agent
/// mints an AgentNFT to the caller — owning that NFT *is* being the agent's
/// creator/owner everywhere else in the system (Marketplace listings,
/// VersionControl publishing, revenue routing in Payments all check back
/// here via `isOwner` / `ownerOf`).
///
/// Deliberately does NOT store pricing, versions, reviews, or reputation —
/// those live in Marketplace, VersionControl, Review and Reputation so each
/// contract has one job and none of them need write-access to each other's
/// storage, only read-only ownership checks against this one.
contract AgentRegistry is Ownable {
    enum AgentStatus {
        Active,
        Paused,
        Unpublished
    }

    struct AgentRecord {
        uint256 id;
        address creator;
        string ipfsHash; // metadata: name, tagline, description, capabilities, media
        string category;
        AgentStatus status;
        uint256 createdAt;
        uint256 updatedAt;
    }

    AgentNFT public immutable agentNFT;

    uint256 private _nextId = 1;
    mapping(uint256 => AgentRecord) private _agents;

    event AgentRegistered(uint256 indexed agentId, address indexed creator, string ipfsHash, string category);
    event AgentMetadataUpdated(uint256 indexed agentId, string ipfsHash);
    event AgentStatusUpdated(uint256 indexed agentId, AgentStatus status);

    constructor(address agentNFTAddress) Ownable(msg.sender) {
        require(agentNFTAddress != address(0), "AgentRegistry: zero address");
        agentNFT = AgentNFT(agentNFTAddress);
    }

    modifier onlyAgentOwner(uint256 agentId) {
        require(agentNFT.ownerOf(agentId) == msg.sender, "AgentRegistry: not agent owner");
        _;
    }

    /// @notice Register a new agent. Mints the caller an AgentNFT 1:1 with
    /// the returned agentId.
    /// @param ipfsHash CID pointing at the agent's JSON metadata (name,
    /// tagline, description, capabilities, logo/banner — see Agent type in
    /// the frontend's src/types/index.ts).
    function register(string calldata ipfsHash, string calldata category) external returns (uint256 agentId) {
        require(bytes(ipfsHash).length > 0, "AgentRegistry: ipfsHash required");
        require(bytes(category).length > 0, "AgentRegistry: category required");

        agentId = _nextId++;
        _agents[agentId] = AgentRecord({
            id: agentId,
            creator: msg.sender,
            ipfsHash: ipfsHash,
            category: category,
            status: AgentStatus.Active,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        agentNFT.mint(msg.sender, agentId, ipfsHash);
        emit AgentRegistered(agentId, msg.sender, ipfsHash, category);
    }

    function updateMetadata(uint256 agentId, string calldata ipfsHash) external onlyAgentOwner(agentId) {
        require(bytes(ipfsHash).length > 0, "AgentRegistry: ipfsHash required");
        _agents[agentId].ipfsHash = ipfsHash;
        _agents[agentId].updatedAt = block.timestamp;
        agentNFT.updateTokenURI(agentId, ipfsHash);
        emit AgentMetadataUpdated(agentId, ipfsHash);
    }

    function setStatus(uint256 agentId, AgentStatus status) external onlyAgentOwner(agentId) {
        _agents[agentId].status = status;
        _agents[agentId].updatedAt = block.timestamp;
        emit AgentStatusUpdated(agentId, status);
    }

    /// @notice Read-only ownership check used by Marketplace, VersionControl
    /// and Review — this is the only cross-contract dependency they have.
    function isOwner(uint256 agentId, address who) external view returns (bool) {
        return agentNFT.ownerOf(agentId) == who;
    }

    /// @notice Current owner of the agent (may differ from original creator
    /// if the AgentNFT has been transferred/sold).
    function ownerOf(uint256 agentId) external view returns (address) {
        return agentNFT.ownerOf(agentId);
    }

    function getAgent(uint256 agentId) external view returns (AgentRecord memory) {
        return _agents[agentId];
    }

    function totalAgents() external view returns (uint256) {
        return _nextId - 1;
    }
}
