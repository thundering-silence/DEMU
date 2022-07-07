// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
require("dotenv").config();

const supportedAssets = ['WMATIC', 'WBTC', 'WETH', 'DAI', 'USDC', 'LINK']

async function main() {
  const Oracle = await ethers.getContractFactory("PriceOracle");
  const oracle = await Oracle.deploy();
  await oracle.deployed();
  await Promise.all(supportedAssets.map(async asset => await oracle.setAggregatorForAsset(
    process.env[asset],
    process.env[`${asset}_AGGREGATOR`]
  )));
  await oracle.setEURUSDAggregator(process.env.EUR_USD_AGGREGATOR);
  console.log(`ORACLE=${oracle.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
