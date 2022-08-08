import { useEffect, useState } from 'react'
import { useContract } from 'wagmi'
import { utils } from 'ethers'
import { getTokenMetadata } from '@alch/alchemy-sdk'

import alchemy from '../web3/alchemy'
import { supportedAssets } from "../constants"

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

const ActionForm = ({ demu }) => {
    const [selectedTab, setSelectedTab] = useState('supply')
    const [amount, setAmount] = useState('0')
    const [underlyingBalance, setUnderlyingBalance] = useState('0.0')
    const [allowance, setAllowance] = useState('0')
    const [underlyingAddress, setUnderlyingAddress] = useState(import.meta.env.VITE_WMATIC)
    const [metadata, setMetadata] = useState();

    const executeAction = async (e) => {
        e.preventDefault()
        try {
            if (selectedTab == "supply" && underlyingAddress == "0xNATIVE") {
                await demu.supplyNative(utils.parseUnits(amount, 18))
            } else {
                const actions = {
                    'supply': async (asset, amt) => await demu.supply(asset, amt),
                    'withdraw': async (asset, amt) => await demu.withdraw(asset, amt),
                    'mint': async (_, amt) => await demu.mint(amt),
                    'burn': async (_, amt) => await demu.burn(amt)
                }
                await actions[selectedTab](demu.address, utils.parseUnits(amount, metadata.decimals))
            }
        } catch (err) {
            console.dir(err)
        }
    }

    const underlying = useContract({
        addressOrName: underlyingAddress,
        contractInterface: [
            'function approve(address,uint256) public',
            'function allowance(address,address) public view returns (uint256)',
            'function balanceOf(address) public view returns (uint256)',
        ],
        signerOrProvider: demu.signer
    })

    const fetchUnderlyingData = async () => {
        if (!demu.signer) return;
        try {
            if (underlyingAddress != "0xNATIVE") {
                const metadata = await getTokenMetadata(alchemy, underlyingAddress)
                setMetadata(metadata)
                const allowance = await underlying.allowance(demu.signer._address, demu.address);
                const balance = await underlying.balanceOf(demu.signer._address);
                setAllowance(utils.formatEther(allowance, metadata.decimals))
                setUnderlyingBalance(utils.formatEther(balance, metadata.decimals))
            } else {
                const balance = await demu.signer.getBalance()
                setUnderlyingBalance(utils.formatEther(balance, 18))
            }
        } catch (e) {
            console.log(e)
        }
    }


    useEffect(() => {
        fetchUnderlyingData()
    }, [underlyingAddress, demu.signer])

    const handleAmountChange = e => {
        try {
            e.target.value && utils.parseEther(e.target.value)
            setAmount(e.target.value)
        } catch (e) { }
    }

    return <div className='flex flex-col justify-center items-center rounded-lg pt-4 max-w-8'>
        <ul className="tabs tabs-boxed flex flex-row ">
            {Object.keys(tabs).map(tab => <li className='flex-1' key={tab}>
                <a
                    className={`tab uppercase ${tab == selectedTab && 'tab-active'}`}
                    onClick={() => setSelectedTab(tab)}
                >
                    <span className='text-xs md:text-md'>{tab}</span>
                </a>
            </li>)}
        </ul>
        <form className='w-full max-w-8 p-2' onSubmit={executeAction}>
            {tabs[selectedTab].asset && <div className='form-control'>
                <label className='label text-base-100 font-semibold'>
                    <span className="label-text text-base-100">Asset</span>
                </label>
                <select
                    className='select select-boredered border-white'
                    value={underlyingAddress}
                    onChange={e => setUnderlyingAddress(e.target.value)}
                >
                    {selectedTab == "supply" && <option value="0xNATIVE">MATIC</option>}
                    {supportedAssets.map(({ symbol }) => <option
                        key={symbol}
                        value={import.meta.env[`VITE_${symbol}`]}
                    >
                        {symbol}
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
                {tabs[selectedTab].approve && underlyingAddress != "0xNATIVE" && <button
                    type='button'
                    className='btn btn-primary'
                    onClick={() => underlying.approve(demu.address, utils.parseUnits(amount, metadata.decimals))}
                >
                    Approve
                </button>
                }
                <button
                    type='button'
                    className='btn btn-primary'
                    onClick={executeAction}
                >
                    {selectedTab}
                </button>
            </div>
        </form>
    </div>
}

export default ActionForm;
