const { expect } = require("chai");
const { ethers } = require("hardhat");
require("dotenv").config();

describe("PriceOracle", function () {
  before(async () => {
    this.Oracle = await ethers.getContractFactory("PriceOracle");
    this.oracle;
  });
  it("Should be deployable", async () => {
    this.oracle = await this.Oracle.deploy();
    await this.oracle.deployed();

    expect(this.oracle.address).to.not.be.undefined;
  });

  it("Should allow for setting aggregators for assets ", async () => {
    await this.oracle.setAggregatorForAsset(
      process.env.WMATIC,
      "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
    );

    const res = await this.oracle.getAssetAggregator(process.env.WMATIC);
    expect(res).to.be.equal("0xAB594600376Ec9fD91F8e885dADF0CE036862dE0");
  });

  it("should allow for setting the eur/usd aggregator", async () => {
    const eur_usd_feed = "0x73366Fe0AA0Ded304479862808e02506FE556a98";

    await this.oracle.setEURUSDAggregator(eur_usd_feed);
    const res = await this.oracle.getEurUsdAggregator();
    expect(res).to.be.equal(eur_usd_feed);
  });

  it("should allow for requesting an asset's price in EUR", async () => {
    const res = await this.oracle.getAssetPriceEUR(process.env.WMATIC);
    expect(res).to.not.be.undefined;
  });
});
