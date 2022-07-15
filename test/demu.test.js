const { expect } = require("chai");
const { constants } = require("ethers");
const { ethers } = require("hardhat");
require("dotenv").config();

describe("DEMU", function () {
  before(async () => {
    const signers = await ethers.getSigners();
    this.owner = signers[0];
    this.notOwner = signers[1];

    this.DEMU = await ethers.getContractFactory("Demu");
    this.demu;
  });

  it("should be deployable", async () => {
    this.demu = await this.DEMU.deploy();
    await this.demu.deployed();
    expect(this.demu.address).to.not.be.undefined;
  });

  it("should not allow minting by owner", async () => {
    let err = false;
    try {
      await this.demu.mint(
        await this.notOwner.getAddress(),
        constants.WeiPerEther
      );
    } catch (e) {
      err = true;
    }
    expect(err).to.be.true;
  });

  it("should not allow minting by non admins", async () => {
    const demu = this.demu.connect(await this.notOwner.getAddress());
    let err = false;
    try {
      await demu.mint(await this.notOwner.getAddress(), constants.WeiPerEther);
    } catch (e) {
      err = true;
    }
    expect(err).to.be.true;
  });

  it("should allow minting by admins", async () => {
    await this.demu.setAdmin(await this.owner.getAddress());
    let err = false;
    try {
      await this.demu.mint(
        await this.notOwner.getAddress(),
        constants.WeiPerEther
      );
    } catch (e) {
      err = true;
    }
    expect(err).to.be.false;
  });

  it("should not allow burning by non admins", async () => {
    const demu = this.demu.connect(await this.notOwner.getAddress());
    let err = false;
    try {
      await demu.burn(await this.notOwner.getAddress(), constants.WeiPerEther);
    } catch (e) {
      err = true;
    }
    expect(err).to.be.true;
  });

  it("should allow burning by admins", async () => {
    let err = false;
    try {
      await this.demu.burn(
        await this.notOwner.getAddress(),
        constants.WeiPerEther
      );
    } catch (e) {
      err = true;
    }
    expect(err).to.be.false;
  });
});
