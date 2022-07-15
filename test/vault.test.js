const { expect } = require("chai");
const { BigNumber, constants, utils } = require("ethers");
const { ethers } = require("hardhat");
require("dotenv").config();

describe("Vault", function () {
  before(async () => {
    const signers = await ethers.getSigners();
    this.owner = signers[0];
    this.notOwner = signers[1];

    this.DEMU = await ethers.getContractFactory("Demu");
    this.demu = await this.DEMU.deploy();
    await this.demu.deployed();

    this.Vault = await ethers.getContractFactory("Vault");
    this.vault = await this.Vault.deploy();
    await this.vault.deployed();

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
      this.demu.address,
      this.oracle.address,
      await this.owner.getAddress(),
      [process.env.WMATIC],
      this.vault.address
    );
    await this.provider.deployed();

    await this.vault.initialize(this.provider.address, this.provider.address);
    await this.demu.transferOwnership(this.provider.address);
  });

  it("should be creatable through the provider", async () => {
    await this.provider.createVault();
    const res = await this.provider.getVaultFor(await this.owner.getAddress());
    expect(res).to.not.be.equal(constants.AddressZero);
    this.vault = this.vault.attach(res);
  });

  it("should allow fo reading the provider address", async () => {
    const res = await this.vault.dataProvider();
    expect(res).to.be.equal(this.provider.address);
  });

  it("should allow for supplying tokens", async () => {
    this.WMATIC = new ethers.Contract(
      process.env.WMATIC,
      [
        "function deposit(uint256 wad) public payable",
        "function approve(address spender, uint256 amount) public",
      ],
      this.owner
    );

    const tx = await this.WMATIC.deposit(utils.parseEther("100"), {
      value: utils.parseEther("100"),
    });
    await tx.wait();
    await this.WMATIC.approve(this.vault.address, utils.parseEther("10"));
    await this.vault.supply(process.env.WMATIC, utils.parseEther("10"));
  });

  it("should allow for querying for collateral Value", async () => {
    const res = await this.vault.collateral();
    expect(res.gt(constants.WeiPerEther)).to.be.true;
  });

  it("should allow for minting DEMU", async () => {
    const max = await this.vault.maxMintable();
    await this.vault.mint(max);
    const demuBalance = await this.demu.balanceOf(
      await this.owner.getAddress()
    );
    expect(demuBalance.eq(max)).to.be.true;
  });

  it("should revent from withdrawing when minted amount is too big", async () => {
    let err = false;
    try {
      await this.vault.withdraw(constants.WeiPerEther);
    } catch (e) {
      err = true;
    }
    expect(err).to.be.true;
  });

  it("should allow for burning DEMU", async () => {
    const demuBalanceBefore = await this.demu.balanceOf(
      await this.owner.getAddress()
    );
    await this.vault.burn(demuBalanceBefore);
    const demuBalanceAfter = await this.demu.balanceOf(
      await this.owner.getAddress()
    );
    expect(demuBalanceAfter.eq(constants.Zero)).to.be.true;
  });
});
