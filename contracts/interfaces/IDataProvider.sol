// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDataProvider {
    function demu() external view returns (address);

    function oracle() external view returns (address);

    function supportedAssets() external view returns (address[] memory);

    function feesCollector() external view returns (address);
}
