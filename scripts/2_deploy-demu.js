// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const { BigNumber } = require("ethers");
require("dotenv").config();

const assetConfTiers = {
  STABLE: [
    BigNumber.from(900), // mint LTV 90%
    BigNumber.from(950), // liquidation LTV 95%
    BigNumber.from(80), // liquidation incentive 8%
    BigNumber.from(20), // protocol cut 2%
  ],
  TOP: [
    BigNumber.from(700),
    BigNumber.from(900),
    BigNumber.from(80),
    BigNumber.from(2),
  ],
  MID: [
    BigNumber.from(600),
    BigNumber.from(900),
    BigNumber.from(80),
    BigNumber.from(20),
  ],
  LOW: [
    BigNumber.from(500),
    BigNumber.from(900),
    BigNumber.from(80),
    BigNumber.from(20),
  ],
};

const assetsConfs = {
  assets: [
    process.env.WMATIC,
    process.env.WBTC,
    process.env.WETH,
    process.env.AAVE,
    process.env.AVAX,
    process.env.BNB,
    process.env.COMP,
    process.env.GRT,
    process.env.MKR,
    process.env.LINK,
    process.env.amAAVE,
    process.env.amDAI,
    process.env.amUSDC,
    process.env.amUSDT,
    process.env.amWBTC,
    process.env.amWETH,
    process.env.amWMATIC,
  ],
  confs: [
    // MATIC
    assetConfTiers.MID,
    // BTC
    assetConfTiers.TOP,
    // ETH
    assetConfTiers.TOP,
    // AAVE
    assetConfTiers.MID,
    // AVAX
    assetConfTiers.MID,
    // BNB
    assetConfTiers.MID,
    // COMP
    assetConfTiers.LOW,
    // GRT
    assetConfTiers.LOW,
    // MKR
    assetConfTiers.LOW,
    // LINK
    assetConfTiers.MID,
    // amAAVE
    assetConfTiers.MID,
    // amDAI
    assetConfTiers.STABLE,
    // amUSDC
    assetConfTiers.STABLE,
    // amUSDT
    assetConfTiers.STABLE,
    // amWBTC
    assetConfTiers.TOP,
    // amWETH
    assetConfTiers.TOP,
    // amWMATIC
    assetConfTiers.MID,
  ],
};

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const DEMU = await hre.ethers.getContractFactory("Demu");
  const demu = await DEMU.deploy(
    process.env.ORACLE,
    await signer.getAddress(),
    assetsConfs.assets
  );
  await demu.deployed();
  console.log(`DEMU=${demu.address}`);

  await demu.updateAssetConfs(assetsConfs.assets, assetsConfs.confs);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
