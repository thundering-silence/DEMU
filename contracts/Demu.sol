// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Demu is Ownable, ERC20("DEMU", "DEMU") {
    mapping(address => bool) internal _allowedMinter;

    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event MinterUpdate(address indexed account, bool can);

    modifier allowedMinter() {
        require(_allowedMinter[_msgSender()], "Demu: 403");
        _;
    }

    function mint(address to, uint256 amount) public allowedMinter {
        _mint(to, amount);
        emit Mint(to, amount);
    }

    function burn(address from, uint256 amount) public allowedMinter {
        _burn(from, amount);
        emit Burn(from, amount);
    }

    function setMinter(address account, bool canMint) public onlyOwner {
        _allowedMinter[account] = canMint;
        emit MinterUpdate(account, canMint);
    }
}
