// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMarketplace {
    function hasActiveAccess(address user, uint256 agentId) external view returns (bool);
}
