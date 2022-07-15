// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Demu is Ownable, ERC20("DEMU", "DEMU"), ERC20Permit("DEMU") {
    mapping(address => bool) internal _admin; // all vaults are admins

    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event AdminUpdate(address indexed account);

    modifier onlyAdmin() {
        require(_admin[_msgSender()], "Demu: not allowed");
        _;
    }

    function mint(address to, uint256 amount) public onlyAdmin {
        _mint(to, amount);
        emit Mint(to, amount);
    }

    function burn(address from, uint256 amount) public onlyAdmin {
        _burn(from, amount);
        emit Burn(from, amount);
    }

    function setAdmin(address account) public onlyOwner {
        _admin[account] = true;
        emit AdminUpdate(account);
    }
}
