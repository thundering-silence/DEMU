// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract PriceOracle is Ownable {
    mapping(address => address) internal _aggregatorForAsset;
    address internal _eurUsdAggregator;

    event AssetAggregatorUpdate(address indexed asset, address aggregator);
    event EurUsdAggregatorUpdate(address indexed aggregator);

    function getAssetPriceEUR(address asset) public view returns (uint256) {
        uint256 priceUSD = _getAssetPriceUSD(asset);
        AggregatorV3Interface dataFeed = AggregatorV3Interface(
            _eurUsdAggregator
        );
        require(dataFeed.decimals() == 8, "DataFeedOracle: 400");
        (, int256 exchangeRate, , , ) = dataFeed.latestRoundData();
        return (priceUSD * 1e18) / uint256(exchangeRate); // scaled to 1 EUR = 1e18
    }

    function getDemuPriceEUR() public pure returns (uint256) {
        return 1e18;
    }

    function getAssetAggregator(address asset) public view returns (address) {
        return _aggregatorForAsset[asset];
    }

    function getEurUsdAggregator() public view returns (address) {
        return _eurUsdAggregator;
    }

    function _getAssetPriceUSD(address asset) internal view returns (uint256) {
        address aggregator = _aggregatorForAsset[asset];
        require(aggregator != address(0), "DataFeedOracle: 404");
        AggregatorV3Interface dataFeed = AggregatorV3Interface(aggregator);
        require(dataFeed.decimals() == 8, "DataFeedOracle: 400");
        (, int256 price, , , ) = dataFeed.latestRoundData();
        return uint256(price);
    }

    function setEURUSDAggregator(address aggregator) public onlyOwner {
        _eurUsdAggregator = aggregator;
        emit EurUsdAggregatorUpdate(aggregator);
    }

    function setAggregatorForAsset(address asset, address aggregator)
        public
        onlyOwner
    {
        _aggregatorForAsset[asset] = aggregator;
        emit AssetAggregatorUpdate(asset, aggregator);
    }

    function setAggregatorsorAssets(
        address[] calldata assets,
        address[] calldata aggregators
    ) public onlyOwner {
        uint256 loops = assets.length;
        for (uint256 i; i < loops; ++i) {
            setAggregatorForAsset(assets[i], aggregators[i]);
        }
    }
}
