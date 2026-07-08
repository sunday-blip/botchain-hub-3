// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Reputation
/// @notice Stores the raw inputs to the trust score, not the score itself.
///
/// The frontend already has the formula in src/lib/utils.ts::computeTrustScore
/// — it takes { completedJobs, averageRating, walletAgeDays, verifiedCreator,
/// uniqueUsers } and does log-scaled weighting client-side. Doing that same
/// log10 math in Solidity would be gas-expensive and imprecise, so this
/// contract just keeps the raw counters on-chain and Session 3 points the
/// existing `computeTrustScore` call at this contract's data instead of the
/// mock array. `walletAgeDays` isn't stored here — it's derived from
/// `AgentRegistry.getAgent(agentId).createdAt` on the frontend.
contract Reputation is Ownable {
    struct Stats {
        uint256 completedJobs;
        uint256 ratingSum;
        uint256 ratingCount;
        uint256 uniqueUsers;
        bool verifiedCreator;
    }

    /// @notice Only Marketplace may record completed jobs.
    address public marketplace;
    /// @notice Only Review may record ratings.
    address public review;

    mapping(uint256 => Stats) private _stats;
    mapping(uint256 => mapping(address => bool)) private _hasInteracted;

    event JobCompleted(uint256 indexed agentId, address indexed user, uint256 totalCompletedJobs);
    event RatingRecorded(uint256 indexed agentId, uint8 rating, uint256 ratingCount);
    event VerifiedStatusUpdated(uint256 indexed agentId, bool verified);
    event MarketplaceUpdated(address marketplace);
    event ReviewUpdated(address review);

    constructor() Ownable(msg.sender) {}

    modifier onlyMarketplace() {
        require(msg.sender == marketplace, "Reputation: caller is not marketplace");
        _;
    }

    modifier onlyReview() {
        require(msg.sender == review, "Reputation: caller is not review contract");
        _;
    }

    function setMarketplace(address _marketplace) external onlyOwner {
        require(_marketplace != address(0), "Reputation: zero address");
        marketplace = _marketplace;
        emit MarketplaceUpdated(_marketplace);
    }

    function setReview(address _review) external onlyOwner {
        require(_review != address(0), "Reputation: zero address");
        review = _review;
        emit ReviewUpdated(_review);
    }

    /// @notice Admin-controlled verified badge (surfaces in Session 5's
    /// admin panel). Independent of on-chain activity by design — identity
    /// verification is a human/off-chain judgment call.
    function setVerified(uint256 agentId, bool verified) external onlyOwner {
        _stats[agentId].verifiedCreator = verified;
        emit VerifiedStatusUpdated(agentId, verified);
    }

    function recordJobCompletion(uint256 agentId, address user) external onlyMarketplace {
        Stats storage s = _stats[agentId];
        s.completedJobs += 1;
        if (!_hasInteracted[agentId][user]) {
            _hasInteracted[agentId][user] = true;
            s.uniqueUsers += 1;
        }
        emit JobCompleted(agentId, user, s.completedJobs);
    }

    function recordRating(uint256 agentId, uint8 rating) external onlyReview {
        require(rating >= 1 && rating <= 5, "Reputation: rating must be 1-5");
        Stats storage s = _stats[agentId];
        s.ratingSum += rating;
        s.ratingCount += 1;
        emit RatingRecorded(agentId, rating, s.ratingCount);
    }

    function getStats(uint256 agentId) external view returns (Stats memory) {
        return _stats[agentId];
    }

    /// @notice Average rating scaled by 100 (e.g. 437 == 4.37 stars) since
    /// Solidity has no floating point. Divide by 100 client-side.
    function averageRatingScaled(uint256 agentId) external view returns (uint256) {
        Stats memory s = _stats[agentId];
        if (s.ratingCount == 0) return 0;
        return (s.ratingSum * 100) / s.ratingCount;
    }
}
