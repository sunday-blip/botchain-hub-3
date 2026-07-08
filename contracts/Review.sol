// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IMarketplace.sol";
import "./interfaces/IReputation.sol";

/// @title Review
/// @notice One review per (agent, wallet), and only from wallets that
/// Marketplace confirms actually have access to the agent — no buying a
/// review from an account that never used the thing. Mirrors the
/// frontend's `Review` type (author, rating, comment, createdAt, likes).
contract Review is Ownable {
    struct ReviewRecord {
        address author;
        uint8 rating;
        string comment;
        uint256 createdAt;
        uint256 likes;
        bool reported;
    }

    IMarketplace public marketplace;
    IReputation public reputation;

    mapping(uint256 => ReviewRecord[]) private _reviews;
    mapping(uint256 => mapping(address => bool)) public hasReviewed;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) private _hasLiked;

    event ReviewSubmitted(uint256 indexed agentId, address indexed author, uint8 rating, uint256 index);
    event ReviewLiked(uint256 indexed agentId, uint256 indexed index, address indexed liker, uint256 newLikeCount);
    event ReviewReported(uint256 indexed agentId, uint256 indexed index);

    constructor(address marketplaceAddress, address reputationAddress) Ownable(msg.sender) {
        require(marketplaceAddress != address(0) && reputationAddress != address(0), "Review: zero address");
        marketplace = IMarketplace(marketplaceAddress);
        reputation = IReputation(reputationAddress);
    }

    function submitReview(uint256 agentId, uint8 rating, string calldata comment) external {
        require(rating >= 1 && rating <= 5, "Review: rating must be 1-5");
        require(!hasReviewed[agentId][msg.sender], "Review: already reviewed this agent");
        require(marketplace.hasActiveAccess(msg.sender, agentId), "Review: no verified access to this agent");

        hasReviewed[agentId][msg.sender] = true;
        _reviews[agentId].push(
            ReviewRecord({
                author: msg.sender,
                rating: rating,
                comment: comment,
                createdAt: block.timestamp,
                likes: 0,
                reported: false
            })
        );

        reputation.recordRating(agentId, rating);
        emit ReviewSubmitted(agentId, msg.sender, rating, _reviews[agentId].length - 1);
    }

    function likeReview(uint256 agentId, uint256 index) external {
        require(index < _reviews[agentId].length, "Review: invalid index");
        require(!_hasLiked[agentId][index][msg.sender], "Review: already liked");

        _hasLiked[agentId][index][msg.sender] = true;
        _reviews[agentId][index].likes += 1;

        emit ReviewLiked(agentId, index, msg.sender, _reviews[agentId][index].likes);
    }

    /// @notice Moderation hook for Session 5's admin panel.
    function reportReview(uint256 agentId, uint256 index) external onlyOwner {
        require(index < _reviews[agentId].length, "Review: invalid index");
        _reviews[agentId][index].reported = true;
        emit ReviewReported(agentId, index);
    }

    function getReviews(uint256 agentId) external view returns (ReviewRecord[] memory) {
        return _reviews[agentId];
    }

    function reviewCount(uint256 agentId) external view returns (uint256) {
        return _reviews[agentId].length;
    }
}
