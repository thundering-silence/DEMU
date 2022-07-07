import { useEffect, useState } from 'react'
import { useContract, useSigner } from 'wagmi'
import { constants, utils } from 'ethers'

const tabs = ['supply', 'withdraw', 'mint', 'burn']

const ActionForm = ({ underlyingAddress, tokenAddress, actions }) => {
    const { data: signer } = useSigner()
    const [selectedTab, setSelectedTab] = useState(tabs[0])
    const [amount, setAmount] = useState('')
    const [showApprove, setShowApprove] = useState(true)
    const [underlyingBalance, setUnderlyingBalance] = useState('0.0')
    const [underlyingDecimals, setUnderlyingDecimals] = useState('18')

    const underlying = useContract({
        addressOrName: underlyingAddress,
        contractInterface: [
            "function balanceOf(address) public view returns (uint256)",
            "function approve(address, uint256) public",
            "function decimals() public view returns (uint256)"
        ],
        signerOrProvider: signer
    })

    const fetchUnderlyingData = async () => {
        try {
            const bal = await underlying.balanceOf(await signer.getAddress())
            const decimals = await underlying.decimals()
            setUnderlyingBalance(utils.parseUnits(bal, decimals.toString()))
            setUnderlyingDecimals(decimals.toString())
        } catch (e) { }
    }


    useEffect(() => {
        if (!signer || underlying.address == constants.AddressZero) return;
        fetchUnderlyingData()
    }, [underlying, signer])

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
                    onClick={() => underlying.approve(tokenAddress, utils.parseUnits(amount, underlyingDecimals))}
                >
                    Approve
                </button>
                }
                <button
                    className='btn btn-primary'
                    onClick={() =>
                        actions[selectedTab](utils.parseUnits(amount, underlyingDecimals))}
                >
                    {selectedTab}
                </button>
            </div>
        </div>
    </div>
}

export default ActionForm;
