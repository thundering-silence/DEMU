// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const { BigNumber, constants } = require("ethers");
const { ethers } = require("hardhat");
require("dotenv").config();

const supportedAssets = ["WMATIC", "WBTC", "WETH", "DAI", "USDC", "LINK"];

async function main() {
  const [signer] = await ethers.getSigners();
  const demu = new ethers.Contract(
    process.env.DEMU,
    ["function setMinter(address,bool) public"],
    signer
  );
  const DToken = await hre.ethers.getContractFactory("DToken");
  await Promise.all(
    supportedAssets.map(async (asset) => {
      const token = await DToken.deploy(
        `d${asset}`,
        `d${asset}`,
        process.env[asset],
        constants.WeiPerEther.div(BigNumber.from("2")), //50% LTV
        constants.WeiPerEther.div(
          BigNumber.from("10")
        ).mul(BigNumber.from("4")), //80% liquidation threshold
        constants.WeiPerEther.div(BigNumber.from("10")), // 10% Liquidation incentive
        process.env.ORACLE,
        process.env.DEMU,
        process.env.FEES_COLLECTOR,
        {
          gasLimit: 30000000,
        }
      );
      await token.deployed();
      console.log(`d${asset}=${token.address}`);
      await demu.setMinter(token.address, true, {
        gasLimit: 30000000,
      });
    })
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
