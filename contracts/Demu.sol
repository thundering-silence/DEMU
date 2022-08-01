// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/draft-IERC2612.sol";
import "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";
import "@openzeppelin/contracts/interfaces/IERC3156FlashLender.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";


import "./DataProvider.sol";
import "./interfaces/IPriceOracle.sol";

import "hardhat/console.sol";

contract Demu is ERC20("DEMU", "DEMU"), ERC20Permit("DEMU"), DataProvider, Multicall, KeeperCompatibleInterface, IERC3156FlashLender {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet internal _accounts;
    mapping(address => mapping(address => uint256)) internal _supplied;
    mapping(address => uint256) internal _minted;

    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event Supply(address indexed src, uint256 amt);
    event Withdraw(address indexed dst, uint256 amt);
    event Liquidate(address indexed caller);

    constructor(
        address oracle_,
        address collector_,
        address[] memory assets_
    )
    DataProvider(oracle_, collector_, assets_)
    {}

    function supplied(address account, address asset)
        public
        view
        returns (uint256)
    {
        return _supplied[account][asset];
    }

    function collateral(address account) public view returns (uint256 value) {
        address[] memory assets = supportedAssets();
        uint256 loops = assets.length;
        for (uint256 i; i < loops; ++i) {
            uint256 amount = _supplied[account][assets[i]];
            if (amount > 0) {
                uint256 scaledAmount = _scaleToStanderdDecimals(
                    assets[i],
                    amount
                );
                IPriceOracle oracle = IPriceOracle(oracle());
                uint256 price = oracle.getAssetPriceEUR(assets[i]);
                value += scaledAmount * price; // value is denominated in 1e36
            }
        }
        value /= 1e18; // scale down value back to 1e18
    }

    function maxMintable(address account) public view returns (uint256) {
        return collateral(account) / 2; // 50%
    }

    function maxDebt(address account) public view returns (uint256) {
        return (collateral(account) * 8) / 10; // 80%
    }

    function currentDebt(address account) public view returns (uint256) {
        return (_minted[account] * demuPrice()) / 1e18;
    }

    function demuPrice() public view returns (uint256) {
        return IPriceOracle(oracle()).getDemuPriceEUR();
    }

    function assetPrice(address asset) public view returns (uint256) {
        return IPriceOracle(oracle()).getAssetPriceEUR(asset);
    }

    function supply(address asset, uint256 amount) public {
        _supply(asset, amount);
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
        _supply(asset, amount);
    }

    function withdraw(address asset, uint256 amount) public {
        IERC20(asset).safeTransfer(_msgSender(), amount);
        require(
            currentDebt(_msgSender()) <= maxDebt(_msgSender()),
            "Vault: not allowed"
        );
        _supplied[_msgSender()][asset] -= amount;
        emit Withdraw(asset, amount);
    }

    function mint(uint256 amount) public {
        _mint(_msgSender(), amount);
        _minted[_msgSender()] += amount;
        _accounts.add(_msgSender());
        require(
            currentDebt(_msgSender()) <= maxMintable(_msgSender()),
            "Vault: not allowed"
        );
        emit Mint(_msgSender(), amount);
    }

    function burn(uint256 amount) public {
        _burn(_msgSender(), amount);
        uint256 minted = _minted[_msgSender()];
        // it's ok to revert if this goes underflows
        _minted[_msgSender()] = minted - amount; // it's ok to revert if this goes underflows
        if ((minted - amount) == 0) {
            _accounts.remove(_msgSender());
        }
        emit Burn(_msgSender(), amount);
    }

    struct LiquidationParams {
        address account;
        address[] assets;
        address liquidator;
    }

    function checkUpkeep(bytes calldata)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        address collector = feesCollector();
        uint256 balance = balanceOf(collector);
        if (balance == 0) {
            upkeepNeeded = false;
        } else {
            address[] memory supported = supportedAssets();
            // runs off-chain or in a gasless tx so it's fine even when there are a lot of accounts
            address[] memory accounts = _accounts.values();
            uint256 length = _accounts.length();
            // Not having dynamic length in-memory arrays is terrible...LOOK AT WHAT YOU MADE ME DO, VITALIK!
            bool[] memory dos = new bool[](length);
            address[] memory users = new address[](length);
            address[][] memory assets = new address[][](length);
            address[] memory liquidators = new address[](length);
            for (uint256 i; i < length; ++i) {
                address account = accounts[i];
                uint256 debtCeil = maxDebt(account);
                uint256 current = currentDebt(account);
                uint256 minExcess = debtCeil / 20; // excess needs to be at least 5% of maxDebt
                uint256 excessValue = current - debtCeil;
                if (excessValue >= minExcess) {
                  dos[i] = true;
                  users[i] = account;
                  assets[i] = supported;
                  liquidators[i] = feesCollector();
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
                liquidate(params);
            }
        }
    }

    function liquidate(LiquidationParams memory params) public {
        uint256 debtCeil = maxDebt(params.account);
        uint256 current = currentDebt(params.account);
        require(current > debtCeil, "Vault: not allowed");

        uint256 excessValue = current - debtCeil;
        uint256 excessAmount = excessValue / demuPrice();

        uint256 loops = params.assets.length;

        for (uint256 i; i < loops; ++i) {
            if (excessValue <= 0) {
                break;
            }
            address asset = params.assets[i];
            uint256 suppliedAmount = _supplied[params.account][asset];
            uint256 collateralPrice = IPriceOracle(oracle())
                .getAssetPriceEUR(asset);
            uint256 collateralValue = (suppliedAmount * collateralPrice) / 1e18;
            uint256 collateralAmount;
            if (collateralValue < ((excessValue * 1100) / 1000)) {
                collateralAmount = suppliedAmount;
            } else {
                collateralAmount = excessValue / collateralPrice;
                collateralValue = (collateralAmount * collateralPrice) / 1e18;
            }
            IERC20(asset).safeTransfer(
                params.liquidator,
                (collateralAmount * 1075) / 1100
            );
            IERC20(asset).safeTransfer(
                feesCollector(),
                (collateralAmount * 25) / 1100
            );
            excessValue -= collateralValue;
        }

        _burn(params.liquidator, excessAmount);
        emit Liquidate(params.liquidator);
    }

    function _supply(address asset, uint256 amount) internal {
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        _supplied[_msgSender()][asset] += amount;
        emit Supply(asset, amount);
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

    function maxFlashLoan(address token) external override view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function flashFee(address, uint256 amount) public override pure returns (uint256) {
        return (amount >= 1e27 ? 10 : amount >= 1e24 ? 25 : 50) * amount / 1000000; // 0.001% | 0.0025% | 0.005%
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
            receiver.onFlashLoan(msg.sender, token, amount, fee, data) == keccak256("ERC3156FlashBorrower.onFlashLoan"),
            "FlashLender: Callback failed"
        );
        require(
            IERC20(token).transferFrom(address(receiver), address(this), amount + fee),
            "FlashLender: Repay failed"
        );
        return true;
    }
}
