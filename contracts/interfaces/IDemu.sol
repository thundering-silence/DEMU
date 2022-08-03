// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC3156FlashLender.sol";

interface IDemu is IERC20, IERC20Metadata, IERC3156FlashLender {
    function supplied(address account, address asset)
        external
        view
        returns (uint256);

    function collateral(address account) external view returns (uint256 value);

    function maxMintable(address account) external view returns (uint256 value);

    function maxDebt(address account) external view returns (uint256 value);

    function currentDebt(address account) external view returns (uint256);

    function demuPrice() external view returns (uint256);

    function assetPrice(address asset) external view returns (uint256);

    function supply(address asset, uint256 amount) external;

    function supplyWithPermit(
        address asset,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function withdraw(address asset, uint256 amount) external;

    function mint(uint256 amount) external;

    function burn(uint256 amount) external;
}
