// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const { BigNumber } = require("ethers");
require("dotenv").config();

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const DEMU = await hre.ethers.getContractFactory("Demu");
  const demu = await DEMU.deploy(
    process.env.ORACLE,
    await signer.getAddress(),
    [process.env.WMATIC]
  );
  await demu.deployed();
  console.log(`DEMU=${demu.address}`);
  const assetsConfs = {
    assets: [process.env.WMATIC],
    confs: [
      [
        BigNumber.from(666),
        BigNumber.from(800),
        BigNumber.from(80),
        BigNumber.from(20),
      ],
    ],
  };
  await demu.updateAssetConfs(assetsConfs.assets, assetsConfs.confs);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
