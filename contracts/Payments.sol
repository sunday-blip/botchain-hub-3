// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Payments
/// @notice Splits every purchase/subscription payment between the agent's
/// current owner and the platform fee recipient, using the pull-payment
/// pattern (funds accumulate in `withdrawable` and each party withdraws
/// themselves) so a misbehaving recipient can never block a purchase.
contract Payments is Ownable, ReentrancyGuard {
    uint256 public constant MAX_FEE_BPS = 1000; // 10% hard cap

    /// @notice Only Marketplace may push payments through.
    address public marketplace;
    address public feeRecipient;
    uint256 public feeBps; // basis points, e.g. 250 = 2.5%

    mapping(address => uint256) public withdrawable;

    event PaymentProcessed(
        uint256 indexed agentId, address indexed payer, address indexed creator, uint256 amount, uint256 fee
    );
    event Withdrawal(address indexed account, uint256 amount);
    event MarketplaceUpdated(address marketplace);
    event FeeUpdated(uint256 feeBps);
    event FeeRecipientUpdated(address feeRecipient);

    modifier onlyMarketplace() {
        require(msg.sender == marketplace, "Payments: caller is not marketplace");
        _;
    }

    constructor(address _feeRecipient, uint256 _feeBps) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Payments: zero fee recipient");
        require(_feeBps <= MAX_FEE_BPS, "Payments: fee too high");
        feeRecipient = _feeRecipient;
        feeBps = _feeBps;
    }

    function setMarketplace(address _marketplace) external onlyOwner {
        require(_marketplace != address(0), "Payments: zero address");
        marketplace = _marketplace;
        emit MarketplaceUpdated(_marketplace);
    }

    function setFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= MAX_FEE_BPS, "Payments: fee too high");
        feeBps = _feeBps;
        emit FeeUpdated(_feeBps);
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Payments: zero address");
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(_feeRecipient);
    }

    /// @notice Called by Marketplace with `value` forwarded from the buyer.
    /// Credits `creator` and `feeRecipient`'s withdrawable balances; neither
    /// receives an actual transfer here.
    function processPayment(uint256 agentId, address creator, address payer)
        external
        payable
        onlyMarketplace
        nonReentrant
    {
        require(msg.value > 0, "Payments: no value sent");

        uint256 fee = (msg.value * feeBps) / 10000;
        uint256 payout = msg.value - fee;

        withdrawable[creator] += payout;
        if (fee > 0) {
            withdrawable[feeRecipient] += fee;
        }

        emit PaymentProcessed(agentId, payer, creator, msg.value, fee);
    }

    function withdraw() external nonReentrant {
        uint256 amount = withdrawable[msg.sender];
        require(amount > 0, "Payments: nothing to withdraw");
        withdrawable[msg.sender] = 0;

        (bool ok,) = payable(msg.sender).call{value: amount}("");
        require(ok, "Payments: transfer failed");

        emit Withdrawal(msg.sender, amount);
    }
}
