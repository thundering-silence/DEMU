import { useEffect, useState } from "react"
import { useSigner, useContract, ContractMethodNoResultError } from "wagmi"
import { BigNumber, constants, utils } from "ethers"
import { getTokenMetadata } from '@alch/alchemy-sdk'
import alchemy from "../web3/alchemy"
import DTokenContract from '../contracts/DToken.sol/DToken.json'
import ActionForm from "./ActionForm"

const fetchUnderlyingData = async (contract, signerAddress) => {
    const supply = await contract.totalSupply()
    const ltv = await contract.ltv()
    const liquidationIncentive = await contract.liquidationIncentive()
    const balance = await contract.balanceOf(signerAddress)

    const debtValue = await contract.debtValue(signerAddress)
    const maxDebt = await contract.maxDebt(signerAddress)
    const health = debtValue.eq(constants.Zero) ? 'infinte' : maxDebt.mul(BigNumber.from('100')).div(debtValue).toNumber() / 100
    return {
        'Total Supply': utils.formatEther(supply),
        'Loan to Value': `${Number(utils.formatEther(ltv)) * 100}%`,
        'Liquidation Incentive': `${Number(utils.formatEther(liquidationIncentive)) * 100}%`,
        'Supplied': utils.formatEther(balance),
        'Health Rate': health
    }
}

const DToken = ({ tokenAddress, underlyingAddress }) => {
    const { data: signer } = useSigner()
    const contract = useContract({
        addressOrName: tokenAddress,
        contractInterface: DTokenContract.abi,
        signerOrProvider: signer
    })
    const [data, setData] = useState({
        'Underlying Address': underlyingAddress,
        'Total Supply': null,
        'Loan to Value': null,
        'Liquidation Incentive': null,
        'Supplied': null,
        'Health Rate': null
    })
    const [metadata, setMetadata] = useState()

    const getContractData = async () => {
        const res = await fetchUnderlyingData(contract, await signer.getAddress());
        setData(state => ({ ...state, ...res }))
    }

    const fetchUnderlyingMetadata = async address => {
        const data = await getTokenMetadata(alchemy, address)
        console.log(data)
        setMetadata(data)
    }

    useEffect(() => {
        if (metadata?.decimals) { return }
        fetchUnderlyingMetadata(underlyingAddress)
    }, [underlyingAddress])

    useEffect(() => {
        if (!contract && data['Health Rate']) { return }
        try {
            getContractData()
        } catch (e) { }
    }, [contract])



    return <div className='card shadow-md min-h-96 bg-info p-4 flex flex-col justify-between border-2 border-primary'>
        <div>
            <h3 className='text-base-100 font-semibold text-2xl pb-4 text-center'>
                {metadata?.symbol}
            </h3>

            <ul className='text-base-100'>
                {Object.entries(data).map(el => <li
                    key={el[0]}
                >
                    <strong>{`${el[0]}: `}</strong>
                    <span className="text-sm">{el[1]}</span>
                </li>)}
            </ul>
        </div>
        {!!metadata?.decimals && contract && <ActionForm
            underlyingAddress={underlyingAddress}
            tokenAddress={tokenAddress}
            metadata={metadata}
            actions={{
                supply: contract.supply,
                supplyWithPermit: contract.supplyWithPermit,
                withdraw: contract.withdraw,
                mint: contract.mintDemu,
                burn: contract.burnDemu
            }}

        />}
    </div>
}


export default DToken;
