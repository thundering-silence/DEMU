const { expect } = require("chai");
const { constants } = require("ethers");
const { ethers } = require("hardhat");
require("dotenv").config();

describe("DataProvider", function () {
  before(async () => {
    const signers = await ethers.getSigners();
    this.owner = signers[0];
    this.notOwner = signers[1];

    this.Oracle = await ethers.getContractFactory("PriceOracle");
    this.oracle = await this.Oracle.deploy();
    await this.oracle.deployed();
    await this.oracle.setAggregatorForAsset(
      process.env.WMATIC,
      process.env.WMATIC_AGGREGATOR
    );
    await this.oracle.setEURUSDAggregator(process.env.EUR_USD_AGGREGATOR);

    this.DataProvider = await ethers.getContractFactory("DataProvider");
    this.provider = await this.DataProvider.deploy(
      this.oracle.address,
      await this.owner.getAddress(),
      [process.env.WMATIC]
    );
    await this.provider.deployed();
  });

  it("should allow reading oracle address", async () => {
    const res = await this.provider.oracle();
    expect(res).to.not.be.equal(constants.AddressZero);
  });
  it("should allow reading fees collector address", async () => {
    const res = await this.provider.feesCollector();
    expect(res).to.not.be.equal(constants.AddressZero);
  });
  it("should allow reading supported assets addresses", async () => {
    const res = await this.provider.supportedAssets();
    expect(res.length).to.be.equal(1);
    expect(res[0]).to.be.equal(process.env.WMATIC);
  });
});
