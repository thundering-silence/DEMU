# DEMU - Decentralized European Monetary Unit

## Zero-cost asset-backed over-collateralized EURO stablecoin

## Inspiration

In te recent weeks stablecoins - and the overall crypto industry - have taken a heavy hit in terms of credibility due to the crash of the LUNA/UST ecosystem. In my opinion, stablecoins are the best shot we have at mass adoption as they are the category of assets that has the least friction to adoption by non crypto natives due to the stability of their value.

The market of stables is currently being dominated by USD pegged tokens which have seen an incedible adoption across the globe. The issue is that whoever holds USD-pegged assets but doesn't live in an economy based on the dollar is exposed to Forex risk.
It is hence important to develop and foster the adoption of stablecoins pegged to other FIAT currencies.

Of the handful of EURO-pegged stablecoins, all charge a fee for existing - some through minting fee, some through interest rates - and this definitely doesn't help with adoption.

## What it does

The Decentralized European Monetary Unit protocol allows users to mint a EURO-pegged stablecoin by depositing collateral.

Users holding any of the supported collaterals can supply such assets to the respective vaults and mint DEMU at a LTV of 50% completely for free (except for gas).
Once they wish to withdraw their deposited assets all they have to do is burn enough DEMU to unlock their collateral and withdraw.

If the collateral value was to drop below the liquidation threshold (80% LTV) it would be possible for anyone to repay the excess amount on behalf of the 'underwater' account and claim an additional 8% of the collateral backing the excess - an additional 2% would be directed to the protocol.

All the price data is pulled from Chainlink Data Feeds.

## How we built it

The protocol revolves around a handful of contracts:

- _DEMU.sol_: a ERC20 token
- _Vault.sol_: a vault holding collateral and capable of minting/burning DEMU
- _PriceOracle.sol_: a contract capable of pulling data from Chainlinks's aggregators

Tools used: Hardhat, Openzeppelin, Chainlink, Alchemy, React, Ethers, Vite

## Challenges we ran into

Designing the inner workings of such a protocol has been quite the challenge and I had to review and redesign it a few times before getting there.

Not being able to query for Forex data on testnet has forced me to figure out how to fork mainnet locally.

## Accomplishments we are proud of

I am quite proud of having built this protocol by myself in a few days. It has been fun to imagine and release something that - albeit only on the surface and with an exetremely set of features - does what DAI can do.

## What we learned

While developing DEMU I learned more about EIP2612's specifications as well as became more confortable in using frontend libraries of the likes of wagmi and ethers.

## What's next for DEMU

- Allowing for additional collaterals
- Allowing for yield bearing assets to be used as collateral
- Implement self-repaying loans
- Allow for repaying the loan directly by using the collateral
- Implement folding capabilities in order to multiply exposure to an asset
- Implement whitelistsing for liquidation calls in order to avoid MEV attacks
- Release a NFT collection giving access to governance (hence becoming a DAO), revenue sharing and liquidations.
- Possibly expand the variety of stablecoins to other widely used currencies
- In the far future list DEMU on centralized and decentralized exchanges
