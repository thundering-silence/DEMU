import { useEffect, useState } from "react"
import { useSigner, useContract } from "wagmi"
import { constants, utils } from "ethers"
import DTokenContract from '../contracts/DToken.sol/DToken.json'
import ActionForm from "./ActionForm"

const DToken = ({ name, tokenAddress }) => {
    const { data: signer } = useSigner()
    const contract = useContract({
        addressOrName: tokenAddress,
        contractInterface: DTokenContract.abi,
        signerOrProvider: signer
    })
    const [data, setData] = useState({
        'Underlying Address': constants.AddressZero,
        'Total Supply': null,
        'Loan to Value': null,
        'Liquidation Incentive': null,
        'Supplied': null,
    })

    const fetchUnderlyingData = async () => {
        const address = await contract.underlying()
        const supply = await contract.totalSupply()
        const ltv = await contract.ltv()
        const liquidationIncentive = await contract.liquidationIncentive()
        const balance = await contract.balanceOf(await signer.getAddress())
        setData(state => ({
            ...state,
            'Underlying Address': address,
            'Total Supply': utils.formatEther(supply),
            'Loan to Value': `${Number(utils.formatEther(ltv)) * 100}%`,
            'Liquidation Incentive': `${Number(utils.formatEther(liquidationIncentive)) * 100}%`,
            'Supplied': utils.formatEther(balance)
        }))
    }

    useEffect(() => {
        if (!contract) { return }
        try {
            fetchUnderlyingData()
        } catch (e) { }
    }, [contract])



    return <div className='card shadow-md min-h-96 bg-info p-4 flex flex-col justify-between border-2 border-primary'>
        <div>
            <h3 className='text-base-100 font-semibold text-2xl pb-4 text-center'>{name}</h3>
            <ul className='text-base-100'>
                {Object.entries(data).map(el => <li key={el[0]}><strong>{`${el[0]}: `}</strong>{el[1]}</li>)}
            </ul>
        </div>
        <ActionForm
            underlyingAddress={data['Underlying Address']}
            tokenAddress={tokenAddress}
            actions={{
                supply: contract.supply,
                withdraw: contract.withdraw,
                mint: contract.mintDemu,
                burn: contract.burnDemu
            }}

        />
    </div>
}


export default DToken;
