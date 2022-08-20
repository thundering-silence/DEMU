// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract DataProvider is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;

    address internal _priceOracle;
    address internal _feesCollector;
    EnumerableSet.AddressSet internal _supportedAssets;

    struct AssetConf {
        uint256 mintLTV; // 500 = 50%
        uint256 liquidationLTV; // 750 = 75%
        uint256 liquidationIncentive; // 80 = 8%
        uint256 protocolCut; // 20 = 2%
    }
    mapping(address => AssetConf) internal _conf;
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

    function bpsDenominator() public pure returns (uint256) {
        return 1_000;
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

    function updateAssetConfs(
        address[] calldata assets,
        AssetConf[] calldata confs
    ) public onlyOwner {
        uint256 length = assets.length;
        for (uint256 i; i < length; ++i) {
            _conf[assets[i]].mintLTV = confs[i].mintLTV;
            _conf[assets[i]].liquidationLTV = confs[i].liquidationLTV;
            _conf[assets[i]].liquidationIncentive = confs[i]
                .liquidationIncentive;
            _conf[assets[i]].protocolCut = confs[i].protocolCut;
        }
    }
}
