// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./interfaces/IDemu.sol";

interface IVault {
    function owner() external view returns (address);

    function dataProvider() external view returns (address);

    function initialize(address dataProvider_, address owner_) external;
}

contract DataProvider is Ownable {
    address internal _demu;
    address internal _priceOracle;
    address internal _feesCollector;
    address[] internal _supportedAssets;
    address internal _vaultImplementation;

    mapping(address => address) internal _vaults;

    event PriceOracle(address newOracle);
    event FeesCollector(address newCollector);
    event NewAsset(address asset);
    event AssetRemoved(uint256 index);
    event NewImplementation(address newImplementation);

    constructor(
        address demu_,
        address oracle_,
        address collector_,
        address[] memory assets_,
        address vault_
    ) {
        _demu = demu_;
        _priceOracle = oracle_;
        _feesCollector = collector_;
        _supportedAssets = assets_;
        _vaultImplementation = vault_;
    }

    function demu() public view returns (address) {
        return _demu;
    }

    function oracle() public view returns (address) {
        return _priceOracle;
    }

    function feesCollector() public view returns (address) {
        return _feesCollector;
    }

    function vaultImplementation() public view returns (address) {
        return _vaultImplementation;
    }

    function supportedAssets() public view returns (address[] memory) {
        uint256 loops = _supportedAssets.length;
        address[] memory assets = new address[](loops);
        for (uint256 i; i < loops; ++i) {
            assets[i] = _supportedAssets[i];
        }
        return assets;
    }

    function getVaultFor(address account) public view returns (address) {
        return _vaults[account];
    }

    function createVault() public {
        require(
            _vaults[_msgSender()] == address(0),
            "DataProvider: not allowed"
        );

        bytes memory data = abi.encodeWithSignature(
            "initialize(address,address)",
            address(this),
            _msgSender()
        );

        ERC1967Proxy newVault = new ERC1967Proxy(_vaultImplementation, data);
        IVault vault = IVault(address(newVault));
        address owner = vault.owner();
        require(
            owner == _msgSender() && vault.dataProvider() == address(this),
            "Tx was tampered with"
        );

        _vaults[owner] = address(newVault);

        // Allow vault to mint/burn DEMU
        IDemu(_demu).setAdmin(address(newVault));
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
        _supportedAssets.push(asset);
        emit NewAsset(asset);
    }

    function removeSupportedAsset(uint256 index) public onlyOwner {
        uint256 loops = _supportedAssets.length;
        address[] memory oldAssets = _supportedAssets;
        address[] memory assets = new address[](loops - 1);
        for (uint256 i; i < loops; ++i) {
            uint256 idx = index >= i ? i + 1 : i;
            assets[i] = oldAssets[idx];
        }
        _supportedAssets = assets;
        emit AssetRemoved(index);
    }

    function setNewVaultImplementation(address newImplementation)
        public
        onlyOwner
    {
        _vaultImplementation = newImplementation;
        emit NewImplementation(newImplementation);
    }
}
