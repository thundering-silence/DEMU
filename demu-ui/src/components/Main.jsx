import { constants, ethers } from "ethers"
import { useEffect, useState } from "react"
import { useAccount, useConnect, useContract, useContractWrite, useSigner } from "wagmi"
import { InjectedConnector } from 'wagmi/connectors/injected'

import Demu from '../contracts/Demu.sol/Demu.json'
import Vault from "./Vault"


const Main = () => {
    const { isConnected } = useAccount()
    const { data: signer } = useSigner()

    const { connect } = useConnect({
        connector: new InjectedConnector(),
    })

    const demu = useContract({
        addressOrName: import.meta.env.VITE_DEMU,
        contractInterface: Demu.abi,
        signerOrProvider: signer,
    })

    return <section className='min-h-screen pt-8 pb-24 px-1'>
        <h2 className='text-4xl text-primary font-bold text-center pb-2'>DEMU</h2>
        <p className='text-lg text-primary font-semibold text-center'>
            DEMU is completely FREE to mint and doesn't charge any interest
        </p>
        <div className='flex justify-center align-center pt-12'>
            {!isConnected ?
                <button className="btn btn-primary" onClick={connect}>Connect</button> :
                <Vault demu={demu} signer={signer} />
            }
        </div>
    </section>
}


export default Main;
