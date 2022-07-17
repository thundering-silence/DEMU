// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");
const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [signer] = await hre.ethers.getSigners();
  this.DataProvider = await ethers.getContractFactory("DataProvider");
  this.provider = await this.DataProvider.deploy(
    process.env.DEMU,
    process.env.ORACLE,
    await signer.getAddress(),
    [process.env.WMATIC],
    process.env.VAULT
  );
  await this.provider.deployed();
  console.log(`DATA_PROVIDER=${this.provider.address}`);

  const vault = new ethers.Contract(
    process.env.VAULT,
    ["function initialize(address, address) public"],
    signer
  );
  await vault.initialize(this.provider.address, this.provider.address);

  const demu = new ethers.Contract(
    process.env.DEMU,
    ["function transferOwnership(address) public"],
    signer
  );
  await demu.transferOwnership(this.provider.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
