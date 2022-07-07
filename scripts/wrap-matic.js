// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { utils } = require("ethers");
const { ethers } = require("hardhat");
const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const signers = await ethers.getSigners();
  const wMATIC = new ethers.Contract(
    process.env.WMATIC,
    ["function deposit(uint256 wad) public payable"],
    signers[0]
  );
  await wMATIC.deposit(utils.parseEther("1000"), {
    value: utils.parseEther("1000"),
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
