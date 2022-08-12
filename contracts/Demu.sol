// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {KeeperCompatibleInterface} from "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC2612} from "@openzeppelin/contracts/interfaces/draft-IERC2612.sol";
import {IERC3156FlashBorrower} from "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";
import {IERC3156FlashLender} from "@openzeppelin/contracts/interfaces/IERC3156FlashLender.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Multicall} from "@openzeppelin/contracts/utils/Multicall.sol";
import {EnumerableMap} from "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";


import "./DataProvider.sol";
import "./interfaces/IPriceOracle.sol";
import "./interfaces/INative.sol";

contract Demu is
DataProvider,
ERC20("DEMU", "DEMU"),
ERC20Permit("DEMU"),
Multicall,
KeeperCompatibleInterface,
IERC3156FlashLender
{
    using Address for address;
    using SafeERC20 for IERC20;
    using EnumerableMap for EnumerableMap.AddressToUintMap;

    mapping(address => EnumerableMap.AddressToUintMap) internal _supplied;
    EnumerableMap.AddressToUintMap internal _minted;

    event Mint(address indexed dst, uint256 amt);
    event Burn(address indexed src, uint256 amt);
    event Supply(address indexed src, uint256 amt);
    event Withdraw(address indexed dst, uint256 amt);
    event Liquidate(address indexed dst, address indexed src, address asset, uint amt);

    struct LiquidationParams {
        address account;
        address[] assets;
        address liquidator;
    }

    function initialize(
        address oracle_,
        address collector_,
        address[] memory assets_
    ) public initializer {
        init_data_provider(oracle_, collector_, assets_);
    }

    function supplied(address account, address asset)
        public
        view
        returns (uint256)
    {
        (, uint amt) = _supplied[account].tryGet(asset);
        return amt;
    }

    function collateral(address account) public view returns (uint256 value) {
        uint256 loops = _supplied[account].length();
        for (uint256 i; i < loops; ++i) {
            (address asset, uint amount) = _supplied[account].at(i);
            if (amount > 0) {
                uint256 scaledAmount = _scaleToStandardDecimals(
                    asset,
                    amount
                );
                IPriceOracle oracle = IPriceOracle(oracle());
                uint256 price = oracle.getAssetPriceEUR(asset);
                value += scaledAmount * price; // value is denominated in 1e36
            }
        }
        value /= 1e18; // scale down value back to 1e18
    }

    function maxMintable(address account) public view returns (uint256 value) {
        uint256 loops = _supplied[account].length();
        for (uint256 i; i < loops; ++i) {
            (address asset, uint amount) = _supplied[account].at(i);
            if (amount > 0) {
                uint256 scaledAmount = _scaleToStandardDecimals(
                    asset,
                    amount
                );
                IPriceOracle oracle = IPriceOracle(oracle());
                uint256 price = oracle.getAssetPriceEUR(asset);
                value += (scaledAmount * price * _conf[asset].mintLTV);
            }
            value /= (1e18 * bpsDenominator()); // scale value back down to 1e18
        }
    }

    function maxDebt(address account) public view returns (uint256 value) {
        uint256 loops = _supplied[account].length();
        for (uint256 i; i < loops; ++i) {
            (address asset, uint amount) = _supplied[account].at(i);
            if (amount > 0) {
                uint256 scaledAmount = _scaleToStandardDecimals(
                    asset,
                    amount
                );
                IPriceOracle oracle = IPriceOracle(oracle());
                uint256 price = oracle.getAssetPriceEUR(asset);
                value += (scaledAmount * price * _conf[asset].liquidationLTV);
            }
            value /= (1e18 * bpsDenominator()); // scale value back down to 1e18
        }
    }

    function currentDebt(address account) public view returns (uint256) {
        (, uint amt) = _minted.tryGet(account);
        return (amt * demuPrice()) / 1e18;
    }

    function demuPrice() public view returns (uint256) {
        return IPriceOracle(oracle()).getDemuPriceEUR();
    }

    function assetPrice(address asset) public view returns (uint256) {
        return IPriceOracle(oracle()).getAssetPriceEUR(asset);
    }

    function supply(address asset, uint256 amount) public {
        address account = _msgSender();
        IERC20(asset).safeTransferFrom(account, address(this), amount);
        _supply(account, asset, amount);
    }

    function supplyNative() public payable {
        address account = _msgSender();
        INATIVE(0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270).deposit{value: msg.value}();
        _supply(account, 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270, msg.value);
    }

    function supplyWithPermit(
        address asset,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        IERC2612(asset).permit(
            _msgSender(),
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        );
        address account = _msgSender();
        IERC20(asset).safeTransferFrom(account, address(this), amount);
        _supply(account, asset, amount);
    }

    function withdraw(address asset, uint256 amount) public {
        IERC20(asset).safeTransfer(_msgSender(), amount);
        require(
            currentDebt(_msgSender()) <= maxDebt(_msgSender()),
            "DEMU: Not allowed to withdraw this much"
        );
        _supplied[_msgSender()].set(asset, supplied(_msgSender(), asset) - amount);
        emit Withdraw(asset, amount);
    }

    function mint(uint256 amount) public {
        _mint(_msgSender(), amount);
        if (_minted.contains(_msgSender())) {
            (, uint amt) = _minted.tryGet(_msgSender());
            _minted.set(_msgSender(), amt += amount);
        } else {
            _minted.set(_msgSender(), amount);
        }
        require(
            currentDebt(_msgSender()) <= maxMintable(_msgSender()),
            "DEMU: Not allowed to mint this much"
        );
        emit Mint(_msgSender(), amount);
    }

    function burn(uint256 amount) public {
        _burn(_msgSender(), amount);
        require(_minted.contains(_msgSender()));
        (, uint minted) = _minted.tryGet(_msgSender());
        // it's ok to revert if this goes underflows
        minted -= amount;
        if (minted == 0) {
            _minted.remove(_msgSender());
        } else {
            _minted.set(_msgSender(), minted);
        }
        emit Burn(_msgSender(), amount);
    }

    function checkUpkeep(bytes calldata)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        address collector = _feesCollector;
        uint256 balance = balanceOf(collector);
        if (balance == 0) {
            upkeepNeeded = false;
        } else {
            address[] memory supported = supportedAssets();
            // runs off-chain or in a gasless tx so it's fine even when there are a lot of users
            uint256 length = _minted.length();
            bool[] memory dos = new bool[](length);
            address[] memory accounts = new address[](length);
            address[][] memory assets = new address[][](length);
            address[] memory liquidators = new address[](length);
            for (uint256 i; i < length; ++i) {
                (address account,) = _minted.at(i);
                uint256 current = currentDebt(account);
                uint256 debtCeil = maxDebt(account);
                uint256 minExcess = debtCeil / 20; // excess needs to be at least 5% of maxDebt
                uint256 excessValue = current - debtCeil;
                if (excessValue >= minExcess) {
                  dos[i] = true;
                  accounts[i] = account;
                  assets[i] = supported;
                  liquidators[i] = collector;
                }
            }
            performData = abi.encode(dos, accounts, assets, liquidators);
        }
    }

    function performUpkeep(bytes calldata performData) external override {
        (
            bool[] memory dos,
            address[] memory accounts,
            address[][] memory assets,
            address[] memory liquidators
        ) = abi.decode(performData, (bool[], address[], address[][], address[]));

        uint length = dos.length;
        for (uint i; i< length; ++i) {
            if (dos[i]) {
                LiquidationParams memory params = LiquidationParams({
                    account: accounts[i],
                    assets: assets[i],
                    liquidator: liquidators[i]
                });
                Address.functionDelegateCall(address(this), abi.encodeWithSignature("liquidate(address,address[],address)", params));
            }
        }
    }

    function liquidate(LiquidationParams memory params) public {
        uint256 debtCeil = maxDebt(params.account);
        uint256 current = currentDebt(params.account);
        require(current > debtCeil, "DEMU: Cannot liquidate account");

        uint256 excessValue = current - debtCeil;
        uint256 excessAmount = excessValue / demuPrice();
        _burn(params.liquidator, excessAmount);
        uint256 loops = params.assets.length;

        for (uint256 i; i < loops; ++i) {
            if (excessValue <= 0) {
                break;
            }
            address asset = params.assets[i];
            uint256 suppliedAmount = supplied(params.account, asset);
            uint256 collateralPrice = IPriceOracle(oracle())
                .getAssetPriceEUR(asset);
            uint256 collateralValue = (suppliedAmount * collateralPrice) / 1e18;
            uint256 collateralAmount;
            uint sumOfLiqPenalties = _conf[asset].liquidationIncentive + _conf[asset].protocolCut + bpsDenominator();
            if (collateralValue < ((excessValue * sumOfLiqPenalties) / bpsDenominator())) {
                collateralAmount = suppliedAmount;
            } else {
                collateralAmount = excessValue / collateralPrice;
                collateralValue = (collateralAmount * collateralPrice) / 1e18;
            }
            IERC20(asset).safeTransfer(
                params.liquidator,
                (collateralAmount * (bpsDenominator() + _conf[asset].liquidationIncentive)) / sumOfLiqPenalties
            );
            IERC20(asset).safeTransfer(
                feesCollector(),
                (collateralAmount * _conf[asset].protocolCut) / sumOfLiqPenalties
            );
            excessValue -= collateralValue;
            emit Liquidate(params.liquidator, params.account, asset, collateralAmount);
        }
    }

    function _supply(address account, address asset, uint256 amount) internal {
        if (_supplied[account].contains(asset)) {
            (, uint amt) = _supplied[account].tryGet(asset);
            _supplied[account].set(asset, amt += amount);
        } else {
            _supplied[account].set(asset, amount);
        }
        emit Supply(asset, amount);
    }

    function _scaleToStandardDecimals(address asset, uint256 amount)
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

    function flashMint(IERC3156FlashBorrower receiver, uint256 amount, bytes calldata data) external returns (bool) {
        _mint(address(receiver), amount);
        require(
            receiver.onFlashLoan(_msgSender(), address(this), amount, 0, data) == keccak256("ERC3156FlashBorrower.onFlashLoan"),
            "FlashMinter: Callback failed"
        );
        _burn(address(receiver), amount);
        return true;
    }

    function maxFlashLoan(address token) external override view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function flashFee(address token, uint256 amount) public override view returns (uint256) {
        uint scaledAmount = _scaleToStandardDecimals(token, amount);
        return (scaledAmount >= 1e27 ? 10 : scaledAmount >= 1e24 ? 25 : 50) * scaledAmount / 1000000; // 0.001% | 0.0025% | 0.005%
    }

    function flashLoan(
        IERC3156FlashBorrower receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) external override returns (bool) {
        uint256 fee = flashFee(token, amount);
        require(
            IERC20(token).transfer(address(receiver), amount),
            "FlashLender: Transfer failed"
        );
        require(
            receiver.onFlashLoan(_msgSender(), token, amount, fee, data) == keccak256("ERC3156FlashBorrower.onFlashLoan"),
            "FlashLender: Callback failed"
        );
        require(
            IERC20(token).transferFrom(address(receiver), address(this), amount + fee),
            "FlashLender: Repay failed"
        );
        IERC20(token).transfer(_feesCollector, fee);
        return true;
    }
}
