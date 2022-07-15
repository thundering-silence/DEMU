// const { expect } = require("chai");
// const { constants, BigNumber, utils } = require("ethers");
// const { ethers } = require("hardhat");
// require("dotenv").config();

// describe("DToken", function () {
//   before(async () => {
//     const signers = await ethers.getSigners();
//     this.signer = signers[0];

//     this.WMATIC = new ethers.Contract(
//       process.env.WMATIC,
//       [
//         "function deposit(uint256 wad) public payable",
//         "function approve(address spender, uint256 amount) public",
//       ],
//       this.signer
//     );

//     await this.WMATIC.deposit(utils.parseEther("10"), {
//       value: utils.parseEther("10"),
//     });

//     this.Oracle = await ethers.getContractFactory("PriceOracle");
//     this.oracle = await this.Oracle.deploy();
//     await this.oracle.deployed();
//     await this.oracle.setAggregatorForAsset(
//       process.env.WMATIC,
//       "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
//     );
//     await this.oracle.setEURUSDAggregator(
//       "0x73366Fe0AA0Ded304479862808e02506FE556a98"
//     );

//     this.DEMU = await ethers.getContractFactory("Demu");
//     this.demu = await this.DEMU.deploy();
//     await this.demu.deployed();

//     this.DToken = await ethers.getContractFactory("DToken");
//     this.dWMATIC;
//   });
//   it("Should be deployable", async () => {
//     this.dWMATIC = await this.DToken.deploy(
//       "dWMATIC",
//       "dWMATIC",
//       process.env.WMATIC,
//       constants.WeiPerEther.div(BigNumber.from("2")), //50%
//       constants.WeiPerEther.div(BigNumber.from("10")).mul(BigNumber.from("4")), //80% liquidation threshold
//       constants.WeiPerEther.div(BigNumber.from("10")), // 10%
//       this.oracle.address,
//       this.demu.address,
//       process.env.FEES_COLLECTOR,
//       {
//         gasLimit: 30000000,
//       }
//     );
//     await this.dWMATIC.deployed();
//     expect(this.dWMATIC.address).to.not.be.undefined;
//     await this.demu.setMinter(this.dWMATIC.address, true);
//   });

//   it("Should allow for supplying assets ", async () => {
//     await this.WMATIC.approve(this.dWMATIC.address, utils.parseEther("10"));

//     await this.dWMATIC.supply(utils.parseEther("10"));

//     const res = await this.dWMATIC.balanceOf(await this.signer.getAddress());
//     expect(res).to.be.equal(utils.parseEther("10"));
//   });

//   it("should allow to query for max debt allowed", async () => {
//     const res = await this.dWMATIC.maxDebt(await this.signer.getAddress());
//     expect(res.gt(constants.Zero)).to.be.true;
//   });

//   it("should allow to query for current collateral value", async () => {
//     const res = await this.dWMATIC.collateralValue(
//       await this.signer.getAddress()
//     );
//     expect(res.gt(constants.Zero)).to.be.true;
//   });

//   it("should allow to mint DEMU and query for current debt", async () => {
//     await this.dWMATIC.mintDemu(constants.WeiPerEther);
//     const res = await this.dWMATIC.debtValue(await this.signer.getAddress());
//     expect(res.eq(constants.WeiPerEther)).to.be.true;
//   });
// });
