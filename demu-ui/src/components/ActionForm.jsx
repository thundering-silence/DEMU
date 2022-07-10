import { useEffect, useState } from 'react'
import { useSigner } from 'wagmi'
import { utils } from 'ethers'
import { getTokenBalances, } from '@alch/alchemy-sdk'
import alchemy from '../web3/alchemy'

const tabs = ['supply', 'withdraw', 'mint', 'burn']

const ActionForm = ({ underlyingAddress, tokenAddress, actions, metadata }) => {
    const { data: signer } = useSigner()
    const [selectedTab, setSelectedTab] = useState(tabs[0])
    const [amount, setAmount] = useState('0')
    const [showApprove, setShowApprove] = useState(true)
    const [underlyingBalance, setUnderlyingBalance] = useState('0.0')
    const [allowance, setAllowance] = useState()

    const fetchUnderlyingData = async () => {
        const signerAddress = await signer.getAddress()
        try {
            const { tokenBalances } = await getTokenBalances(alchemy, signerAddress, [underlyingAddress])
            const { result } = await alchemy.getProvider().send('alchemy_getTokenAllowance', [{
                contract: underlyingAddress,
                owner: signerAddress,
                spender: tokenAddress
            }])
            setAllowance(result)
            setUnderlyingBalance(utils.parseUnits(tokenBalances[0].tokenBalance, `${metadata.decimals}`))
        } catch (e) { }
    }


    useEffect(() => {
        if (!signer || allowance) return;
        fetchUnderlyingData()
    }, [underlyingAddress, signer])

    const handleAmountChange = e => {
        try {
            e.target.value && utils.parseEther(e.target.value)
            setAmount(e.target.value)
        } catch (e) { }
    }

    const handleTabSelect = tab => {
        setSelectedTab(tab)
        setShowApprove(tab === tabs[0])
    }

    return <div className='flex flex-col justify-center items-center g-baseb-100 rounded-lg pt-4'>
        <ul className="tabs tabs-boxed flex flex-row w-full">
            {tabs.map(tab => <li className='flex-1' key={tab}>
                <a
                    className={`tab  uppercase ${tab == selectedTab && 'tab-active'}`}
                    onClick={() => handleTabSelect(tab)}
                >
                    {tab}
                </a>
            </li>)}
        </ul>
        <div className='w-full p-2'>
            <div className='form-control'>
                <label className='label text-base-100 font-semibold'>
                    <span className="label-text text-base-100">Amount</span>
                    <span className="label-text-alt text-base-100">max: {underlyingBalance}</span>
                </label>
                <input className='input input-boredered border-white' value={amount} onChange={handleAmountChange} />
            </div>
            <div className='btn-group flex justify-center py-2'>
                {showApprove && <button
                    className='btn btn-primary'
                    onClick={() => underlying.approve(tokenAddress, utils.parseUnits(amount, metadata.decimals))}
                >
                    Approve
                </button>
                }
                <button
                    className='btn btn-primary'
                    onClick={() =>
                        actions[selectedTab](utils.parseUnits(amount, metadata.decimals))}
                >
                    {selectedTab}
                </button>
            </div>
        </div>
    </div>
}

export default ActionForm;
