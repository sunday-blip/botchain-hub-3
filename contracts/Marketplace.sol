// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IAgentRegistry.sol";
import "./interfaces/IPayments.sol";
import "./interfaces/IReputation.sol";

/// @title Marketplace
/// @notice Listings and the four pricing flows from the frontend's
/// `PricingModel` type (one-time, subscription, free, donation). Payment
/// splitting is delegated to Payments; job/rating stats to Reputation.
/// Whoever currently owns an agent's NFT (per AgentRegistry) receives the
/// proceeds and controls the listing — so selling the NFT sells the
/// business.
contract Marketplace is ReentrancyGuard {
    enum PricingModel {
        OneTime,
        Subscription,
        Free,
        Donation
    }

    struct Listing {
        PricingModel model;
        uint256 priceWei;
        uint32 intervalDays; // only used for Subscription
        bool exists;
    }

    IAgentRegistry public immutable agentRegistry;
    IPayments public immutable payments;
    IReputation public immutable reputation;

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => mapping(address => bool)) public purchased; // OneTime / Donation access
    mapping(address => mapping(uint256 => uint256)) public subscriptionExpiry; // user => agentId => expiry ts

    event ListingUpdated(uint256 indexed agentId, PricingModel model, uint256 priceWei, uint32 intervalDays);
    event Purchased(
        uint256 indexed agentId, address indexed buyer, address indexed creator, uint256 amount, PricingModel model
    );
    event Subscribed(
        uint256 indexed agentId, address indexed subscriber, address indexed creator, uint256 amount, uint256 newExpiry
    );
    event FreeUsageRecorded(uint256 indexed agentId, address indexed user);

    constructor(address agentRegistryAddress, address paymentsAddress, address reputationAddress) {
        require(
            agentRegistryAddress != address(0) && paymentsAddress != address(0) && reputationAddress != address(0),
            "Marketplace: zero address"
        );
        agentRegistry = IAgentRegistry(agentRegistryAddress);
        payments = IPayments(paymentsAddress);
        reputation = IReputation(reputationAddress);
    }

    /// @notice Create or replace an agent's listing. Only the current
    /// AgentNFT owner can call this.
    function createOrUpdateListing(uint256 agentId, PricingModel model, uint256 priceWei, uint32 intervalDays)
        external
    {
        require(agentRegistry.isOwner(agentId, msg.sender), "Marketplace: not agent owner");
        if (model == PricingModel.Subscription) {
            require(intervalDays > 0, "Marketplace: interval required");
        }
        if (model == PricingModel.OneTime) {
            require(priceWei > 0, "Marketplace: price required");
        }

        listings[agentId] = Listing({model: model, priceWei: priceWei, intervalDays: intervalDays, exists: true});
        emit ListingUpdated(agentId, model, priceWei, intervalDays);
    }

    /// @notice Buy a OneTime listing, or send an ad-hoc Donation amount.
    function purchase(uint256 agentId) external payable nonReentrant {
        Listing memory l = listings[agentId];
        require(l.exists, "Marketplace: no listing");
        require(
            l.model == PricingModel.OneTime || l.model == PricingModel.Donation,
            "Marketplace: use subscribe() or useFreeAgent()"
        );
        if (l.model == PricingModel.OneTime) {
            require(msg.value == l.priceWei, "Marketplace: incorrect price");
        } else {
            require(msg.value > 0, "Marketplace: donation must be positive");
        }

        address creator = agentRegistry.ownerOf(agentId);
        require(creator != msg.sender, "Marketplace: cannot buy your own agent");

        purchased[agentId][msg.sender] = true;
        payments.processPayment{value: msg.value}(agentId, creator, msg.sender);
        reputation.recordJobCompletion(agentId, msg.sender);

        emit Purchased(agentId, msg.sender, creator, msg.value, l.model);
    }

    /// @notice Pay for a Subscription listing. Stacks on top of any
    /// remaining time left on an existing subscription.
    function subscribe(uint256 agentId) external payable nonReentrant {
        Listing memory l = listings[agentId];
        require(l.exists && l.model == PricingModel.Subscription, "Marketplace: not a subscription listing");
        require(msg.value == l.priceWei, "Marketplace: incorrect price");

        address creator = agentRegistry.ownerOf(agentId);
        require(creator != msg.sender, "Marketplace: cannot subscribe to your own agent");

        uint256 currentExpiry = subscriptionExpiry[msg.sender][agentId];
        uint256 base = currentExpiry > block.timestamp ? currentExpiry : block.timestamp;
        uint256 newExpiry = base + (uint256(l.intervalDays) * 1 days);
        subscriptionExpiry[msg.sender][agentId] = newExpiry;

        payments.processPayment{value: msg.value}(agentId, creator, msg.sender);
        reputation.recordJobCompletion(agentId, msg.sender);

        emit Subscribed(agentId, msg.sender, creator, msg.value, newExpiry);
    }

    /// @notice Record a run of a Free-tier agent. No payment, but still
    /// counts toward completedJobs/uniqueUsers for the trust score.
    function useFreeAgent(uint256 agentId) external {
        Listing memory l = listings[agentId];
        require(l.exists && l.model == PricingModel.Free, "Marketplace: not a free listing");
        reputation.recordJobCompletion(agentId, msg.sender);
        emit FreeUsageRecorded(agentId, msg.sender);
    }

    /// @notice Whether `user` currently has the right to use/review this
    /// agent. Free is always true; Subscription checks expiry; OneTime and
    /// Donation check the one-time purchase flag.
    function hasActiveAccess(address user, uint256 agentId) public view returns (bool) {
        Listing memory l = listings[agentId];
        if (!l.exists) return false;
        if (l.model == PricingModel.Free) return true;
        if (l.model == PricingModel.Subscription) return subscriptionExpiry[user][agentId] > block.timestamp;
        return purchased[agentId][user];
    }

    function getListing(uint256 agentId) external view returns (Listing memory) {
        return listings[agentId];
    }
}
