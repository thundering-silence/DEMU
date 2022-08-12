# DEMU - Decentralized European Monetary Unit

## Zero-cost asset-backed over-collateralized EURO stablecoin

## Inspiration

The market of stablecoins is currently dominated by USD pegged tokens which have seen incedible adoption across the globe.
The problem is that whoever holds USD-pegged assets but doesn't live in an USD based economy is exposed to Forex risk.
It is hence important to develop and foster the adoption of stablecoins pegged to other FIAT currencies.

The Forex market in tradFi is currently worth trillions of dollars and is currently highly undervalued by web3 as we can assume by the lack of existence and adoption of non usd-pegged stablecoins.

Finally, among the handful of EURO-pegged stablecoins, all charge a fee for existing - some through minting fees, others through interest rates - and this definitely doesn't help with adoption.

## What it does

The Decentralized European Monetary Unit protocol allows users to mint a EURO-pegged stablecoin by depositing collateral.

Users holding any of the supported collaterals can supply such assets to the protocol and mint DEMU at varying LTVs completely for free (except for gas).
Once they wish to withdraw their deposited assets, all they have to do is burn enough DEMU to unlock their collateral and withdraw it.

If the collateral value was to drop below the liquidation threshold,it would be possible for anyone to repay the excess amount on behalf of the 'underwater' account and claim a portion of the collateral backing the excess.

All the price data is pulled from Chainlink Data Feeds.

## How we built it

The protocol revolves around a handful of contracts:

- _DEMU.sol_: a ERC20 token and vault holding collateral
- _PriceOracle.sol_: a contract capable of pulling data from Chainlinks's aggregators

Tools used: Hardhat, Openzeppelin, Chainlink, Alchemy, React, Ethers, Vite

## Challenges we ran into

Designing the inner workings of such a protocol has been quite the challenge and I had to review and redesign it a few times before getting it right.

## Accomplishments we are proud of

I am quite proud of having built this protocol by myself in a few days. It has been fun to imagine and build something that - albeit only on the surface and with an exetremely limited set of features - resembles DAI.

## What we learned

While developing DEMU I learned more about EIP2612's specifications as well as became more confortable in using frontend libraries such as wagmi and ethers.

## What's next for DEMU

Purely DEMU
- Allow more tokens to be used as collateral (very simple as long as supported by Chainlink Data Feeds)
- Allowing for yield bearing assets to be used as collateral (aTokens)
- Deploy on other chains
- Decentralize governance
- Find ways to protect liquidators against frontrunners (flashbots protect | whitelisted liquidators)

Requires LP on Dexes
- Implement non-liquidating self-repaying loans (Alchemix style) with minimal interest rate
- Allow for repaying the loan directly by using collateral (flash repay)
- Develop flash collateral swaps contract + UI
- Implement folding capabilities in order to increase exposure to an asset

DEMU's codebase can also be used to
- Implement the creation of synthetic assets (can be pegged to a single asset or an index)
- Expand the variety of mintable stables to other fiat widely used in FX (GBP, JPY, ...)

Extras
-Create a FX-only DEX with extremely low slippage
