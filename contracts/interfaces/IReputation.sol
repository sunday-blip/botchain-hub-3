// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IReputation {
    function recordJobCompletion(uint256 agentId, address user) external;
    function recordRating(uint256 agentId, uint8 rating) external;
}
