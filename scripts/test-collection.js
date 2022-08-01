const { ethers } = require("hardhat");
const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const provider = new ethers.providers.AlchemyProvider(
    80001,
    "aCAgrk3LrCuV3rMZIDSrIxhvGKEOZoQD"
  );
  const collection = new ethers.Contract(
    "0x33661a2f5aeec87ad25d586b1490c1280bef74c8",
    ["function tokenURI(uint256 id) public view returns (string memory)"],
    provider
  );
  const uri = await collection.tokenURI(1);
  console.log(uri);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
