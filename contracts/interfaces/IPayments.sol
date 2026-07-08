// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPayments {
    function processPayment(uint256 agentId, address creator, address payer) external payable;
}
