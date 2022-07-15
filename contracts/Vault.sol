// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/interfaces/draft-IERC2612.sol";
import "@openzeppelin/contracts/interfaces/IERC3156FlashLender.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "./interfaces/IDataProvider.sol";
import "./interfaces/IDemu.sol";
import "./interfaces/IPriceOracle.sol";

import "hardhat/console.sol";

contract Vault is Context, Initializable, KeeperCompatibleInterface, Multicall {
    using SafeERC20 for IERC20;

    address internal _owner;
    IDataProvider internal _dataProvider;
    mapping(address => uint256) internal _supplied;
    uint256 internal _minted;

    event Supply(address indexed src, uint256 amt);
    event Withdraw(address indexed src, uint256 amt);
    event Liquidate(address indexed caller);

    modifier onlyOwner() {
        require(_msgSender() == _owner, "Vault: not owner");
        _;
    }

    function initialize(address dataProvider_, address owner_)
        public
        initializer
    {
        _dataProvider = IDataProvider(dataProvider_);
        _owner = owner_;
        emit Initialized(1);
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function dataProvider() public view returns (address) {
        return address(_dataProvider);
    }

    function collateral() public view returns (uint256 value) {
        address[] memory assets = _dataProvider.supportedAssets();
        uint256 loops = assets.length;
        for (uint256 i; i < loops; ++i) {
            uint256 amount = _supplied[assets[i]];
            if (amount > 0) {
                uint256 scaledAmount = _scaleToStanderdDecimals(
                    assets[i],
                    amount
                );
                IPriceOracle oracle = IPriceOracle(_dataProvider.oracle());
                uint256 price = oracle.getAssetPriceEUR(assets[i]);
                value += scaledAmount * price; // value is denominated in 1e36
            }
        }
        value /= 1e18; // scale down value back to 1e8
    }

    function maxMintable() public view returns (uint256) {
        return collateral() / 2; // 50%
    }

    function maxDebt() public view returns (uint256) {
        return (collateral() * 8) / 10; // 80%
    }

    function currentDebt() public view returns (uint256) {
        return (_minted * demuPrice()) / 1e18;
    }

    function demuPrice() public view returns (uint256) {
        return IPriceOracle(_dataProvider.oracle()).getDemuPriceEUR();
    }

    function assetPrice(address asset) public view returns (uint256) {
        return IPriceOracle(_dataProvider.oracle()).getAssetPriceEUR(asset);
    }

    function supply(address asset, uint256 amount) public onlyOwner {
        _supply(asset, amount);
    }

    function supplyWithPermit(
        address asset,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public onlyOwner {
        IERC2612(asset).permit(
            _msgSender(),
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        );
        _supply(asset, amount);
    }

    function withdraw(address asset, uint256 amount) public onlyOwner {
        _beforeWithdraw(asset, amount);
        IERC20(asset).safeTransfer(_msgSender(), amount);
        require(currentDebt() <= maxDebt(), "Vault: not allowed");
        _supplied[asset] -= amount;
        emit Withdraw(asset, amount);
    }

    function mint(uint256 amount) public onlyOwner {
        IDemu demu = IDemu(_dataProvider.demu());
        demu.mint(_msgSender(), amount);
        _minted += amount;
        require(currentDebt() <= maxMintable(), "Vault: not allowed");
    }

    function burn(uint256 amount) public onlyOwner {
        IDemu demu = IDemu(_dataProvider.demu());
        demu.burn(_msgSender(), amount);
        _minted -= amount;
    }

    struct LiquidationParams {
        address[] assets;
        address liquidator;
    }

    function checkUpkeep(bytes calldata)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        IDemu demu = IDemu(_dataProvider.demu());
        address collector = _dataProvider.feesCollector();
        uint256 balance = demu.balanceOf(collector);
        uint256 debtCeil = maxDebt();
        uint256 current = currentDebt();
        uint256 minExcess = debtCeil / 20; // excess needs to be at least 5% of maxDebt
        uint256 excessValue = current - debtCeil;
        uint256 excessAmount = excessValue / demuPrice();
        upkeepNeeded = excessValue >= minExcess && (balance >= excessAmount);
        if (upkeepNeeded) {
            LiquidationParams memory params = LiquidationParams({
                assets: _dataProvider.supportedAssets(),
                liquidator: collector
            });
            performData = abi.encode(params);
        }
    }

    function performUpkeep(bytes calldata performData) external override {
        LiquidationParams memory params = abi.decode(
            performData,
            (LiquidationParams)
        );
        liquidate(params);
    }

    function liquidate(LiquidationParams memory params) public {
        uint256 debtCeil = maxDebt();
        uint256 current = currentDebt();
        require(current > debtCeil, "Vault: not allowed");

        uint256 excessValue = current - debtCeil;
        uint256 excessAmount = excessValue / demuPrice();
        IDemu demu = IDemu(_dataProvider.demu());

        uint256 loops = params.assets.length;

        for (uint256 i; i < loops; ++i) {
            if (excessValue <= 0) {
                break;
            }
            address asset = params.assets[i];
            uint256 suppliedAmount = _supplied[asset];
            uint256 collateralPrice = IPriceOracle(_dataProvider.oracle())
                .getAssetPriceEUR(asset);
            uint256 collateralValue = (suppliedAmount * collateralPrice) / 1e18;
            uint256 collateralAmount;
            if (collateralValue < ((excessValue * 110) / 100)) {
                collateralAmount = suppliedAmount;
            } else {
                collateralAmount = excessValue / collateralPrice;
                collateralValue = (collateralAmount * collateralPrice) / 1e18;
            }
            IERC20(asset).safeTransfer(
                params.liquidator,
                (collateralAmount * 108) / 110
            );
            IERC20(asset).safeTransfer(
                _dataProvider.feesCollector(),
                (collateralAmount * 2) / 110
            );
            excessValue -= collateralValue;
        }

        demu.burn(params.liquidator, excessAmount);
        emit Liquidate(params.liquidator);
    }

    function _supply(address asset, uint256 amount) internal {
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        _supplied[asset] += amount;
        emit Supply(asset, amount);
        _afterSupply(asset, amount);
    }

    function _scaleToStanderdDecimals(address asset, uint256 amount)
        internal
        view
        returns (uint256)
    {
        uint256 decimals = IERC20Metadata(asset).decimals();
        if (decimals < 18) {
            return amount * 10**(18 - decimals);
        } else if (decimals > 18) {
            return amount / 10**(decimals - 18);
        }
        return amount;
    }

    /**
     *@dev Possible hook to execute things like depositing into another protocol's vault (i.e Aave)
     */
    function _afterSupply(address asset, uint256 amount) internal {}

    /**
     *@dev Possible hook to execute things like withdrawing from another protocol's vault (i.e Aave)
     */
    function _beforeWithdraw(address asset, uint256 amount) internal {}
}
