// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/interfaces/draft-IERC2612.sol";
import "@openzeppelin/contracts/interfaces/IERC3156FlashLender.sol";
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
contract DToken is ERC20, Multicall, IERC3156FlashLender {
    using SafeERC20 for IERC20;

    IERC20 internal _underlying;
    uint256 internal _ltv;
    uint256 internal _liquidationThreshold;
    uint256 internal _liquidationIncentive;
    IPriceFeed internal _oracle;
    IDemu public immutable demu;
    address internal _feesCollector;

    mapping(address => uint256) public debt;

    event Supply(address indexed src, uint256 amt);
    event Withdraw(address indexed src, uint256 amt);
    event Liquidate(address indexed caller, address indexed account);
    event FlashLoan(
        address indexed caller,
        address indexed receiver,
        uint256 amount
    );

    constructor(
        string memory name_,
        string memory symbol_,
        address underlying_,
        uint256 ltv_,
        uint256 threshold_,
        uint256 incentive_,
        address oracle_,
        address demu_,
        address feesCollector_
    ) ERC20(name_, symbol_) {
        _underlying = IERC20(underlying_);
        _ltv = ltv_;
        _liquidationThreshold = threshold_;
        _liquidationIncentive = incentive_;
        _oracle = IPriceFeed(oracle_);
        demu = IDemu(demu_);
        _feesCollector = feesCollector_;
    }

    function underlying() public view returns (IERC20) {
        return _underlying;
    }

    function ltv() public view returns (uint256) {
        return _ltv;
    }

    function liquidationIncentive() public view returns (uint256) {
        return _liquidationIncentive;
    }

    function liquidationThreshold() public view returns (uint256) {
        return _liquidationThreshold;
    }

    function oracle() public view returns (address) {
        return address(_oracle);
    }

    /**
     * @notice Compute the maximum amount of DEMU the `account` can mint
     * @param account - account for which to compute the maxMintable
     * @return amount - MAX mintable DEMU
     */
    function maxMintable(address account) public view returns (uint256) {
        uint256 collateralVal = collateralValue(account);
        uint256 ltv_ = _ltv;
        return (collateralVal * ltv_) / demuPrice();
    }

    /**
     * @notice Compute the maximum amount of DEMU the `account` can have borrowed
     * @param account - account for which to compute the maxDebt
     * @return amount - MAX borrowed DEMU
     */
    function maxDebt(address account) public view returns (uint256) {
        uint256 collateralVal = collateralValue(account);
        uint256 liqThreshold = _liquidationThreshold;
        return (collateralVal * liqThreshold) / demuPrice();
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
        _mint(
            _msgSender(),
            amount * 10**(18 - ERC20(address(_underlying)).decimals())
        );
        emit Supply(_msgSender(), amount);
    }

    /**
     * @notice supply collateral to vault
     * @dev requires approval first
     * @param amount - amount to supply
     */
    function supplyWithPermit(
        uint256 amount,
        uint256 deadline,
        uint8 permitV,
        bytes32 permitR,
        bytes32 permitS
    ) public {
        IERC2612(address(_underlying)).permit(
            msg.sender,
            address(this),
            amount,
            deadline,
            permitV,
            permitR,
            permitS
        );
        _underlying.safeTransferFrom(msg.sender, address(this), amount);
        _mint(
            _msgSender(),
            amount * 10**(18 - ERC20(address(_underlying)).decimals())
        );
        emit Supply(_msgSender(), amount);
    }

    /**
     * @notice withdraw collateral from vault
     * @dev reverts if account goes below min collateralisation
     * @param amount - amount to withdraw
     */
    function withdraw(uint256 amount) public {
        _burn(_msgSender(), amount);
        _underlying.safeTransferFrom(
            address(this),
            msg.sender,
            amount / 10**(18 - ERC20(address(_underlying)).decimals())
        );

        uint256 maximum = maxDebt(_msgSender());
        require(maximum <= debt[_msgSender()], "Vault: 403");
        emit Withdraw(_msgSender(), amount);
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
    }

    /**
     * @notice Burn `amount` DEMU
     * @param amount {uint} - amount of DEMU to burn
     */
    function burnDemu(uint256 amount) public {
        demu.burn(_msgSender(), amount);
        debt[_msgSender()] -= amount;
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

        // fee to devs
        uint256 chargePercent = 5 * 1e16; // 5%
        uint256 charge = (underlyingAmount * (1e18 + chargePercent)) / 1e18;
        _transfer(params.account, _feesCollector, charge);

        emit Liquidate(_msgSender(), params.account);
    }

    function maxFlashLoan(address token)
        public
        view
        override
        returns (uint256)
    {
        require(token == address(_underlying), "DToken: 400");
        return _underlying.balanceOf(address(this));
    }

    function flashFee(address token, uint256 amount)
        public
        view
        override
        returns (uint256)
    {
        require(token == address(_underlying), "DToken: 400");
        return amount / 100000; // 0.001% of amount
    }

    function flashLoan(
        IERC3156FlashBorrower receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) external override returns (bool) {
        require(token == address(_underlying), "DToken: 400");
        emit FlashLoan(_msgSender(), address(receiver), amount);
        uint256 fee = flashFee(address(_underlying), amount);
        require(
            receiver.onFlashLoan(msg.sender, token, amount, fee, data) ==
                keccak256("ERC3156FlashBorrower.onFlashLoan"),
            "IERC3156: Callback failed"
        );
        _transfer(address(this), _feesCollector, fee);
        return true;
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
