/* eslint-disable no-unused-expressions */
const { expect } = require("chai");
const { constants, utils } = require("ethers");
const { ethers } = require("hardhat");
require("dotenv").config();

describe("DEMU", function () {
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

    this.DEMU = await ethers.getContractFactory("Demu");
    this.demu;
    this.WMATIC = new ethers.Contract(
      process.env.WMATIC,
      [
        "function deposit(uint256 wad) public payable",
        "function approve(address spender, uint256 amount) public",
      ],
      this.owner
    );
  });

  it("should be deployable", async () => {
    this.demu = await this.DEMU.deploy(
      this.oracle.address,
      await this.owner.getAddress(),
      [process.env.WMATIC]
    );
    await this.demu.deployed();
    expect(this.demu.address).to.not.be.undefined;
  });

  it("should allow for supplying tokens", async () => {
    const tx = await this.WMATIC.deposit(utils.parseEther("100"), {
      value: utils.parseEther("100"),
    });
    await tx.wait();
    await this.WMATIC.approve(this.demu.address, utils.parseEther("10"));
    await this.demu.supply(process.env.WMATIC, utils.parseEther("10"));
  });

  it("should allow for querying for collateral Value", async () => {
    const res = await this.demu.collateral(await this.owner.getAddress());
    expect(res.gt(constants.WeiPerEther)).to.be.true;
  });

  it("should allow for minting DEMU", async () => {
    const max = await this.demu.maxMintable(await this.owner.getAddress());
    await this.demu.mint(max);
    const demuBalance = await this.demu.balanceOf(
      await this.owner.getAddress()
    );
    expect(demuBalance.eq(max)).to.be.true;
  });

  it("should prevent from withdrawing when minted amount is too big", async () => {
    let err = false;
    try {
      await this.demu.withdraw(constants.WeiPerEther);
    } catch (e) {
      err = true;
    }
    expect(err).to.be.true;
  });

  it("should allow for burning DEMU", async () => {
    const demuBalanceBefore = await this.demu.balanceOf(
      await this.owner.getAddress()
    );
    await this.demu.burn(demuBalanceBefore);
    const demuBalanceAfter = await this.demu.balanceOf(
      await this.owner.getAddress()
    );
    expect(demuBalanceAfter.eq(constants.Zero)).to.be.true;
  });

  // it("should not allow minting by owner", async () => {
  //   let err = false;
  //   try {
  //     await this.demu.mint(
  //       await this.notOwner.getAddress(),
  //       constants.WeiPerEther
  //     );
  //   } catch (e) {
  //     err = true;
  //   }
  //   expect(err).to.be.true;
  // });

  // it("should not allow minting by non admins", async () => {
  //   const demu = this.demu.connect(await this.notOwner.getAddress());
  //   let err = false;
  //   try {
  //     await demu.mint(await this.notOwner.getAddress(), constants.WeiPerEther);
  //   } catch (e) {
  //     err = true;
  //   }
  //   expect(err).to.be.true;
  // });

  // it("should allow minting by admins", async () => {
  //   await this.demu.setAdmin(await this.owner.getAddress());
  //   let err = false;
  //   try {
  //     await this.demu.mint(
  //       await this.notOwner.getAddress(),
  //       constants.WeiPerEther
  //     );
  //   } catch (e) {
  //     err = true;
  //   }
  //   expect(err).to.be.false;
  // });

  // it("should not allow burning by non admins", async () => {
  //   const demu = this.demu.connect(await this.notOwner.getAddress());
  //   let err = false;
  //   try {
  //     await demu.burn(await this.notOwner.getAddress(), constants.WeiPerEther);
  //   } catch (e) {
  //     err = true;
  //   }
  //   expect(err).to.be.true;
  // });

  // it("should allow burning by admins", async () => {
  //   let err = false;
  //   try {
  //     await this.demu.burn(
  //       await this.notOwner.getAddress(),
  //       constants.WeiPerEther
  //     );
  //   } catch (e) {
  //     err = true;
  //   }
  //   expect(err).to.be.false;
  // });
});
