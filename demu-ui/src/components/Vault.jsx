import { useEffect, useState } from "react"
import { BigNumber, ethers, constants, utils } from 'ethers'

import { supportedAssets } from "../constants"
import ActionForm from "./ActionForm"

const fetchAccountData = async (contract) => {
    if (!contract.signer?._address) return {};
    const signerAddress = contract.signer._address
    const collateral = await contract.collateral(signerAddress)
    const debtValue = await contract.currentDebt(signerAddress)
    const maxMint = await contract.maxMintable(signerAddress)
    const maxDebt = await contract.maxDebt(signerAddress)
    const health = debtValue.eq(constants.Zero) ? 'infinte' : maxDebt.mul(BigNumber.from('100')).div(debtValue).toNumber() / 100
    const supplied = await Promise.all(
        supportedAssets.map(async ({ address }) => await contract.supplied(signerAddress, address))
    )
    return {
        overview: {
            'Supplied': `€ ${utils.formatEther(collateral).slice(0, 10)}`,
            'Max Mintable': utils.formatEther(maxMint).slice(0, 10),
            'Max Debt': utils.formatEther(maxDebt).slice(0, 10),
            'Minted': utils.formatEther(debtValue).slice(0, 10),
            'Health Rate': health
        },
        supplied: supplied.map(el => utils.formatEther(el).slice(0, 10))
    }
}
const Vault = ({ demu }) => {
    const [accountData, setAccountData] = useState({
        overview: {
            'Health Rate': null,
            'Supplied': null,
            'Minted': null,
        },
        supplied: []
    })
    const getContractData = async () => {
        const res = await fetchAccountData(demu);
        setAccountData(state => ({ ...state, ...res }))
    }
    useEffect(() => {
        if (!demu) { return }
        if (accountData.overview['Health Rate']) { return }
        try {
            getContractData()
        } catch (e) { }
    }, [demu])

    return <div
        className='card shadow-md min-h-96 bg-info p-8 flex flex-col justify-between border-2 border-primary mt-8 w-full lg:w-1/2 '>
        <div className="flex-1 flex-col">
            <h3 className='text-base-100 font-semibold text-xl pb-4 text-center'>
                Overview
            </h3>
            <ul className='text-base-100'>
                {Object.entries(accountData.overview).map(el => <li
                    key={el[0]}
                >
                    <strong>{`${el[0]}: `}</strong>
                    <span className="text-sm font-semibold">{el[1]}</span>
                </li>)}
            </ul>
        </div>

        <h3 className='text-base-100 font-semibold text-xl pb-4 text-center'>
            Collateral Breakdown
        </h3>
        <div className="flex-1 flex-col">
            <ul>
                {supportedAssets.map((el, idx) => <li key={el.address} className="text-base-100">
                    <strong>{`${el.symbol}: `}</strong>
                    <span className="text-sm font-semibold">{accountData.supplied[idx]}</span>
                </li>)}
            </ul>

        </div>

        <h3 className='text-base-100 font-semibold text-xl pb-4 text-center'>
            Interactions
        </h3>
        <ActionForm
            demu={demu}
        />

    </div>
}


export default Vault
