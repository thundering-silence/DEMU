// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
require("dotenv").config();

const supportedAssets = [
  process.env.WMATIC,
  process.env.WBTC,
  process.env.WETH,
  process.env.AAVE,
  process.env.AVAX,
  process.env.BNB,
  process.env.COMP,
  process.env.GRT,
  process.env.LINK,
  process.env.MKR,
  process.env.amAAVE,
  process.env.amDAI,
  process.env.amUSDC,
  process.env.amUSDT,
  process.env.amWBTC,
  process.env.amWETH,
  process.env.amWMATIC,
];

const aggregators = [
  process.env.WMATIC_AGGREGATOR,
  process.env.WBTC_AGGREGATOR,
  process.env.WETH_AGGREGATOR,
  process.env.AAVE_AGGREGATOR,
  process.env.AVAX_AGGREGATOR,
  process.env.BNB_AGGREGATOR,
  process.env.COMP_AGGREGATOR,
  process.env.GRT_AGGREGATOR,
  process.env.LINK_AGGREGATOR,
  process.env.MKR_AGGREGATOR,
  process.env.AAVE_AGGREGATOR,
  process.env.DAI_AGGREGATOR,
  process.env.USDC_AGGREGATOR,
  process.env.USDT_AGGREGATOR,
  process.env.WBTC_AGGREGATOR,
  process.env.WETH_AGGREGATOR,
  process.env.WMATIC_AGGREGATOR,
];

async function main() {
  const Oracle = await hre.ethers.getContractFactory("PriceOracle");
  const oracle = await Oracle.deploy();
  await oracle.deployed();
  await Promise.all(
    supportedAssets.map(
      async (asset, idx) =>
        await oracle.setAggregatorForAsset(asset, aggregators[idx])
    )
  );
  await oracle.setEURUSDAggregator(process.env.EUR_USD_AGGREGATOR);
  console.log(`ORACLE=${oracle.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
