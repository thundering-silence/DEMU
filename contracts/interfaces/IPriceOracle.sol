// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPriceOracle {
    function getAssetPriceEUR(address asset) external view returns (uint256);

    function getDemuPriceEUR() external view returns (uint256);
}
