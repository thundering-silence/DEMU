# DEMU - Decentralized Monetary Unit Protocol

## Zero-cost asset-backed over-collateralized stablecoins

## Inspiration

The market of FIAT linked stablecoins is currently dominated by USD pegged tokens which have seen incedible adoption across the globe.
The problem is that whoever holds USD-pegged assets and doesn't live in an USD based economy is exposed to Forex risk. In addition, if blockchain networks are to become widely used as payment netorks, merchants and businesses are likely to prefer receiveing funds linked in their economy's currency.
It is hence important to develop and foster the adoption of stablecoins pegged to other FIAT currencies.

The Forex market in tradFi is currently worth trillions of dollars and is currently highly undervalued by web3 as we can conclude by the lack of variety & adoption of non usd-pegged stablecoins.

DEMU, the Decentralised European Monetary Unit, differs from other EURO-pegged stablecoins because it is completely free to mint - most charge interest during the lifetime of the loan or expect a upfront fee when generating tokens.

## What it does

The Decentralized European Monetary Unit protocol allows users to mint DEMU, a EURO-pegged stablecoin.
Users holding any of the supported collaterals can supply such assets to the protocol and mint DEMU completely for free (except for gas).
Once they wish to withdraw their deposited assets, all they have to do is burn enough DEMU to unlock their collateral and withdraw it.
If the collateral value were to drop below the liquidation threshold, it would be possible for anyone to repay the excess amount on behalf of the 'underwater' account and claim a portion of the collateral.

The vault implements EIP3156 allowing for flash loans of collateralized assets and flash minting of DEMU for free.
In addition the vault implements EIP2612 allowing for a better UX on dapps.

The protocol integrates two services from Chainlink:

- All price data is pulled from their Data Feeds
- The automated liquidation system is built on top of their Keepers network

## How I built it

The protocol revolves around a couple of contracts:

- _DEMU.sol_: a ERC20 token and vault holding collateral
- _PriceOracle.sol_: a contract capable of pulling data from Chainlinks's aggregators

Tools used: Hardhat, Openzeppelin, Chainlink, Alchemy, React, Ethers, Vite

## Challenges we ran into

Designing the inner workings of such a protocol has been quite the challenge and I had to review and redesign it a few times before getting it right.

## Accomplishments we are proud of

I am quite proud of having built this protocol by myself in a few days. It has been fun to imagine and build something that - albeit only on the surface and with an exetremely limited set of features - resembles DAI.

## What we learned

While developing DEMU I learned more about EIP2612's specifications as well as became much more confortable in using frontend libraries such as wagmi and ethers.

## What's next for DEMU

It is important to state that the priority for DEMU is to drive adoption rather than generating revenue.

Purely DEMU

- Making contracts upgradeable through proxy/diamond pattern
- Expand supported collaterals to other tokens (LP tokens, Farm tokens, other yield generating assets)
- Deploy on other EVM chains
- Develop flash collateral swaps contract + UI
- Find ways to protect liquidators against frontrunners (flashbots protect or whitelisted liquidators or other)
- Decentralized governance (when system is big enough)
- Add utility to governance token (required to access specific features maybe?)

Requires LPs on Dexes

- Allow for repaying loans directly by using collateral (flash repay)
- Implement folding capabilities in order to increase exposure to an asset
- Implement non-liquidating self-repaying loans (Alchemix style) with minimal upfront cost (0.5% fee to borrow) and no interest

DEMU's codebase can also be used to

- Expand the variety of mintable stables to other FIAT currencies widely used in FX (GBP, JPY, etc.)
- Implement the creation of other synthetic assets (either pegged to a single asset or indexes)

Extras

- Create a FX-only DEX with extremely low fees & slippage
- Integrate with a derivatives protocol to generate - or increase - yield from collaterals through delta neutral strategies

## To run this project

```
$ npx hardhat node
$ yarn deploy
$ cd demu-ui && yarn dev
```
