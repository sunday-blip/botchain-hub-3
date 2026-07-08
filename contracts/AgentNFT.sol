// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title AgentNFT
/// @notice ERC721 that represents ownership of a registered agent.
/// tokenId is always equal to the agent's id in AgentRegistry, so "who owns
/// agent #42" is just `ownerOf(42)`. Ownership is transferable, which means
/// an agent (and its future marketplace revenue) can be sold or handed off
/// like any other NFT — Marketplace always pays whoever currently holds it.
contract AgentNFT is ERC721, Ownable {
    /// @notice The only address allowed to mint / update metadata — set to
    /// the AgentRegistry contract once it's deployed.
    address public minter;

    mapping(uint256 => string) private _ipfsHashes;

    event MinterUpdated(address indexed minter);

    modifier onlyMinter() {
        require(msg.sender == minter, "AgentNFT: caller is not minter");
        _;
    }

    constructor() ERC721("BotChain Agent", "BOTAGENT") Ownable(msg.sender) {}

    /// @notice One-time wiring step run by the deploy script right after
    /// AgentRegistry is deployed.
    function setMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "AgentNFT: zero address");
        minter = _minter;
        emit MinterUpdated(_minter);
    }

    function mint(address to, uint256 agentId, string calldata ipfsHash) external onlyMinter returns (uint256) {
        _safeMint(to, agentId);
        _ipfsHashes[agentId] = ipfsHash;
        return agentId;
    }

    function updateTokenURI(uint256 agentId, string calldata ipfsHash) external onlyMinter {
        require(_ownerOf(agentId) != address(0), "AgentNFT: nonexistent token");
        _ipfsHashes[agentId] = ipfsHash;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string.concat("ipfs://", _ipfsHashes[tokenId]);
    }
}
