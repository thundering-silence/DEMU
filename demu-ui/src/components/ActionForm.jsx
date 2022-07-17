import { useEffect, useState } from 'react'
import { useContract, useSigner } from 'wagmi'
import { utils } from 'ethers'
import { getTokenBalances, getTokenMetadata } from '@alch/alchemy-sdk'

import alchemy from '../web3/alchemy'

const tabs = {
    'supply': {
        approve: true,
        asset: true
    },
    'withdraw': {
        approve: false,
        asset: true
    },
    'mint': {
        approve: false,
        asset: false
    },
    'burn': {
        approve: false,
        asset: false
    }
}

const supportedAssets = ['WMATIC', 'WBTC', 'WETH', 'DAI', 'USDC', 'LINK']

const ActionForm = ({ vaultAddress, actions, signer }) => {
    const [selectedTab, setSelectedTab] = useState('supply')
    const [amount, setAmount] = useState('0')
    const [underlyingBalance, setUnderlyingBalance] = useState('0.0')
    const [allowance, setAllowance] = useState()
    const [underlyingAddress, setUnderlyingAddress] = useState(import.meta.env.VITE_WMATIC)
    const [metadata, setMetadata] = useState();

    const underlying = useContract({
        addressOrName: underlyingAddress,
        contractInterface: ['function approve(address,uint256) public'],
        signerOrProvider: signer
    })

    const fetchUnderlyingData = async () => {
        const signerAddress = await signer.getAddress()
        try {
            const metadata = await getTokenMetadata(alchemy, underlyingAddress)
            console.log(metadata)
            setMetadata(metadata)
            const { tokenBalances } = await getTokenBalances(alchemy, signerAddress, [underlyingAddress])
            const { result } = await alchemy.getProvider().send('alchemy_getTokenAllowance', [{
                contract: underlyingAddress,
                owner: signerAddress,
                spender: vaultAddress
            }])
            setAllowance(result)
            setUnderlyingBalance(utils.parseUnits(tokenBalances[0].tokenBalance, `${metadata.decimals}`))
        } catch (e) {
            console.log(e)
        }
    }


    useEffect(() => {
        fetchUnderlyingData()
    }, [underlyingAddress, signer])

    const handleAmountChange = e => {
        try {
            e.target.value && utils.parseEther(e.target.value)
            setAmount(e.target.value)
        } catch (e) { }
    }

    return <div className='flex flex-col justify-center items-center g-baseb-100 rounded-lg pt-4'>
        <ul className="tabs tabs-boxed flex flex-row w-full">
            {Object.keys(tabs).map(tab => <li className='flex-1' key={tab}>
                <a
                    className={`tab  uppercase ${tab == selectedTab && 'tab-active'}`}
                    onClick={() => setSelectedTab(tab)}
                >
                    {tab}
                </a>
            </li>)}
        </ul>
        <form className='w-full p-2'>
            {tabs[selectedTab].asset && <div className='form-control'>
                <label className='label text-base-100 font-semibold'>
                    <span className="label-text text-base-100">Asset</span>
                </label>
                <select
                    className='select select-boredered border-white'
                    value={underlyingAddress}
                    onChange={e => setUnderlyingAddress(e.target)}
                >
                    {supportedAssets.map((el) => <option
                        key={el}
                        value={import.meta.env[`VITE_${el}`]}
                    >
                        {el}
                    </option>
                    )}
                </select>
            </div>}
            <div className='form-control'>
                <label className='label text-base-100 font-semibold'>
                    <span className="label-text text-base-100">Amount</span>
                    <span className="label-text-alt text-base-100">max: {underlyingBalance}</span>
                </label>
                <input
                    className='input input-boredered border-white'
                    value={amount}
                    onChange={handleAmountChange}
                />
            </div>
            <div className='btn-group flex justify-center py-2'>
                {tabs[selectedTab].approve && <button
                    type='button'
                    className='btn btn-primary'
                    onClick={() => underlying.approve(vaultAddress, utils.parseUnits(amount, metadata.decimals))}
                >
                    Approve
                </button>
                }
                <button
                    type='button'
                    className='btn btn-primary'
                    onClick={() => actions[selectedTab](underlyingAddress, utils.parseUnits(amount, metadata.decimals))}
                >
                    {selectedTab}
                </button>
            </div>
        </form>
    </div>
}

export default ActionForm;
