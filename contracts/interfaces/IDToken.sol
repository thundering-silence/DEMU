// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./IDemu.sol";
import "./IPriceFeed.sol";

interface IDToken {
    function demu() external view returns (IDemu);

    function underlying() external view returns (IERC20);

    function ltv() external view returns (uint256);

    function liquidationIncentive() external view returns (uint256);

    function liquidationThreshold() external view returns (uint256);

    function oracle() external view returns (address);

    /**
     * @notice Compute the maximum amount of DEMU the `account` can mint
     * @param account - account for which to compute the maxMintable
     * @return amount - MAX mintable DEMU
     */
    function maxMintable(address account) external view returns (uint256);

    /**
     * @notice Compute the maximum amount of DEMU the `account` can have borrowed
     * @param account - account for which to compute the maxDebt
     * @return amount - MAX borrowed DEMU
     */
    function maxDebt(address account) external view returns (uint256);

    /**
     * @notice Compute current debt value for `account`
     * @param account - account for which to run the computation
     * @return amount - EUR value of debt
     */
    function debtValue(address account) external view returns (uint256);

    /**
     * @notice Compute current collateral value for `account`
     * @param account - account for which to run the computation
     * @return amount - EUR value of collateral
     */
    function collateralValue(address account) external view returns (uint256);

    /**
     * @notice get the current value in EUR of DEMU
     * @return value - price of DEMU
     * @dev Currently hardcoded to 1e18. Implement TWAP and or other oracle systems to have market data.
     */
    function demuPrice() external view returns (uint256);

    /**
     * @notice get the current value in EUR of _underlying
     * @return value - price of _underlying
     */
    function underlyingPrice() external view returns (uint256);

    /**
     * @notice supply collateral to vault
     * @dev requires approval first
     * @param amount - amount to supply
     */
    function supply(uint256 amount) external;

    function supplyWithPermit(
        uint256 amount,
        uint256 deadline,
        uint8 permitV,
        bytes32 permitR,
        bytes32 permitS
    ) external;

    /**
     * @notice withdraw collateral from vault
     * @dev reverts if account goes below min collateralisation
     * @param amount - amount to withdraw
     */
    function withdraw(uint256 amount) external;

    /**
     * @notice Mint `amount` DEMU
     * @param amount - amount of DEMU to mint
     */
    function mintDemu(uint256 amount) external;

    /**
     * @notice Burn `amount` DEMU
     * @param amount {uint} - amount of DEMU to burn
     */
    function burnDemu(uint256 amount) external;

    struct LiquidationParams {
        address account;
        bool withdraw;
        address receiver;
    }

    /**
     * @notice Liquidate `account` and bring them back to safety
     * @param params - liquidation params allowing for instant withdrawal
     */
    function liquidate(LiquidationParams calldata params) external;
}
