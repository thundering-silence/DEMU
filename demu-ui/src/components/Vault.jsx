import { useEffect, useState } from "react"
import { BigNumber, ethers, constants, utils } from 'ethers'

import VaultJson from '../contracts/Vault.sol/Vault.json'
import ActionForm from "./ActionForm"

const supportedAssets = ['WMATIC', 'WBTC', 'WETH', 'DAI', 'USDC', 'LINK']

const fetchUnderlyingData = async contract => {
    const supplied = await contract.collateral()
    const debtValue = await contract.currentDebt()
    const maxDebt = await contract.maxDebt()
    const health = debtValue.eq(constants.Zero) ? 'infinte' : maxDebt.mul(BigNumber.from('100')).div(debtValue).toNumber() / 100
    return {
        'Supplied': `EURO ${utils.formatEther(supplied).slice(0, 10)}`,
        'Minted': `EURO ${utils.formatEther(debtValue).slice(0, 10)}`,
        'Health Rate': health
    }
}
const Vault = ({ address, signer }) => {
    const [contract, setContract] = useState(new ethers.Contract(
        address,
        VaultJson.abi,
        signer
    ))

    const [data, setData] = useState({
        'Health Rate': null,
        'Supplied': null,
        'Minted': null,
        'Loan to Value': '50%',
        'Liquidation Incentive': '10%',
    })

    const getContractData = async () => {
        const res = await fetchUnderlyingData(contract);
        setData(state => ({ ...state, ...res }))
    }
    useEffect(() => {
        if (!contract && data['Health Rate']) { return }
        try {
            getContractData()
        } catch (e) { }
    }, [contract])

    return <div
        className='card shadow-md min-h-96 bg-info p-4 flex flex-col justify-between border-2 border-primary mt-8'>
        <div>
            <h3 className='text-base-100 font-semibold text-2xl pb-4 text-center'>

            </h3>

            <ul className='text-base-100'>
                {Object.entries(data).map(el => <li
                    key={el[0]}
                >
                    <strong>{`${el[0]}: `}</strong>
                    <span className="text-sm font-semibold">{el[1]}</span>
                </li>)}
            </ul>

            <ActionForm
                vaultAddress={address}
                signer={signer}
                actions={{
                    'supply': async (asset, amt) => await contract.supply(asset, amt),
                    'withdraw': async (asset, amt) => await contract.withdraw(asset, amt),
                    'mint': async (asset, amt) => await contract.mint(amt),
                    'burn': async (asset, amt) => await contract.burn(amt)
                }}
            />
        </div>
    </div>
}


export default Vault
