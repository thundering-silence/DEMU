// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

abstract contract DataProvider is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;

    address internal _priceOracle;
    address internal _feesCollector;
    EnumerableSet.AddressSet internal _supportedAssets;

    event PriceOracle(address newOracle);
    event FeesCollector(address newCollector);
    event NewAsset(address asset);
    event AssetRemoved(address asset);

    constructor(
        address oracle_,
        address collector_,
        address[] memory assets_
    ) {
        _priceOracle = oracle_;
        _feesCollector = collector_;
        uint256 loops = assets_.length;
        for (uint256 i; i < loops; ++i) {
            _supportedAssets.add(assets_[i]);
        }
    }

    function oracle() public view returns (address) {
        return _priceOracle;
    }

    function feesCollector() public view returns (address) {
        return _feesCollector;
    }

    function supportedAssets() public view returns (address[] memory) {
        return _supportedAssets.values();
    }

    function setPriceOracle(address newOracle) public onlyOwner {
        _priceOracle = newOracle;
        emit PriceOracle(newOracle);
    }

    function setFeesCollector(address newCollector) public onlyOwner {
        _feesCollector = newCollector;
        emit FeesCollector(newCollector);
    }

    function supportNewAsset(address asset) public onlyOwner {
        _supportedAssets.add(asset);
        emit NewAsset(asset);
    }

    function removeSupportedAsset(address asset) public onlyOwner {
        _supportedAssets.remove(asset);
        emit AssetRemoved(asset);
    }
}
