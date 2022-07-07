// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";

import "./interfaces/IDemu.sol";
import "./interfaces/IPriceFeed.sol";
import "hardhat/console.sol";

/**
 * @notice Vault allowing to deposit collateral and mint DEMU
 * @dev Inheriting from Multicall allows the following:
 *      - deposit and mintDemu in a signle transaction
 *      - burnDemu and withdraw in a signle transaction
 *      - Batch liquidations in a signle transaction
 */
contract DToken is ERC20, Multicall {
    using SafeERC20 for IERC20;

    IERC20 internal _underlying;
    uint256 internal _ltv;
    uint256 internal _liquidationIncentive;
    IPriceFeed internal _oracle;
    IDemu public immutable demu;

    mapping(address => uint256) public debt;

    constructor(
        string memory name_,
        string memory symbol_,
        address underlying_,
        uint256 ltv_,
        uint256 incentive_,
        address oracle_,
        address demu_
    ) ERC20(name_, symbol_) {
        _underlying = IERC20(underlying_);
        _ltv = ltv_;
        _liquidationIncentive = incentive_;
        _oracle = IPriceFeed(oracle_);
        demu = IDemu(demu_);
        // IDemu(demu_).setMinter(address(this), true);
    }

    /**
     * @notice Compute the maximum amount of DEMU the `account` can mint
     * @param account - account for which to compute the maxDebt
     * @return amount - MAX mintable DEMU
     */
    function maxDebt(address account) public view returns (uint256) {
        uint256 collateralVal = collateralValue(account);
        uint256 ltv = _ltv;
        return (collateralVal * ltv) / demuPrice();
    }

    /**
     * @notice Compute current debt value for `account`
     * @param account - account for which to run the computation
     * @return amount - EUR value of debt
     */
    function debtValue(address account) public view returns (uint256) {
        return (debt[account] * demuPrice()) / 1e18;
    }

    /**
     * @notice Compute current collateral value for `account`
     * @param account - account for which to run the computation
     * @return amount - EUR value of collateral
     */
    function collateralValue(address account) public view returns (uint256) {
        uint256 supplied = balanceOf(account);
        return (supplied * underlyingPrice()) / 1e18;
    }

    /**
     * @notice get the current value in EUR of DEMU
     * @return value - price of DEMU
     * @dev Currently hardcoded to 1e18. Implement TWAP and or other oracle systems to have market data.
     */
    function demuPrice() public view returns (uint256) {
        return _oracle.getDemuPriceEUR();
    }

    /**
     * @notice get the current value in EUR of _underlying
     * @return value - price of _underlying
     */
    function underlyingPrice() public view returns (uint256) {
        return _oracle.getAssetPriceEUR(address(_underlying));
    }

    /**
     * @notice supply collateral to vault
     * @dev requires approval first
     * @param amount - amount to supply
     */
    function supply(uint256 amount) public {
        _underlying.safeTransferFrom(msg.sender, address(this), amount);
        _mint(_msgSender(), amount);
        // emit
    }

    /**
     * @notice withdraw collateral from vault
     * @dev reverts if account goes below min collateralisation
     * @param amount - amount to withdraw
     */
    function withdraw(uint256 amount) public {
        _burn(_msgSender(), amount);
        _underlying.safeTransferFrom(address(this), msg.sender, amount);

        uint256 maximum = maxDebt(_msgSender());
        require(maximum <= debt[_msgSender()], "Vault: 403");
        // emit
    }

    /**
     * @notice Mint `amount` DEMU
     * @param amount - amount of DEMU to mint
     */
    function mintDemu(uint256 amount) public {
        uint256 currentlyCreated = debt[_msgSender()];
        uint256 maximum = maxDebt(_msgSender());
        require((currentlyCreated + amount) <= maximum, "Vault: 400");
        debt[_msgSender()] += amount;
        demu.mint(_msgSender(), amount);
        // emit
    }

    /**
     * @notice Burn `amount` DEMU
     * @param amount {uint} - amount of DEMU to burn
     */
    function burnDemu(uint256 amount) public {
        demu.burn(_msgSender(), amount);
        debt[_msgSender()] -= amount;
        // emit
    }

    struct LiquidationParams {
        address account;
        bool withdraw;
        address receiver;
    }

    /**
     * @notice Liquidate `account` and bring them back to safety
     * @param params - liquidation params allowing for instant withdrawal
     */
    function liquidate(LiquidationParams calldata params) public {
        // uint256 debt = debtValue(account);
        uint256 maximum = maxDebt(params.account);
        uint256 current = debt[params.account];
        require(current > maximum, "Vault: 400");

        uint256 amountToBurn = current - maximum; // bring user back to safety
        demu.burn(_msgSender(), amountToBurn); // remove DEMU from circulation

        uint256 amountToBurnVal = (amountToBurn * demuPrice()); // EUR val of
        uint256 underlyingAmount = amountToBurnVal / underlyingPrice(); // base amount bought
        uint256 underlyingToTransfer = (underlyingAmount *
            (1e18 + _liquidationIncentive)) / 1e18; // amount bought with incentives
        _transfer(params.account, _msgSender(), underlyingToTransfer);

        if (params.withdraw) {
            _burn(_msgSender(), underlyingToTransfer);
            _underlying.safeTransfer(params.receiver, underlyingToTransfer);
        }
    }

    // Not transferable
    function transfer(address, uint256) public pure override returns (bool) {
        return false;
    }

    // Not transferable
    function transferFrom(
        address,
        address,
        uint256
    ) public pure override returns (bool) {
        return false;
    }
}
