import { constants, ethers } from "ethers"
import { useEffect, useState } from "react"
import { useAccount, useConnect, useContract, useContractWrite, useSigner } from "wagmi"
import { InjectedConnector } from 'wagmi/connectors/injected'

import DataProviderJson from '../contracts/DataProvider.sol/DataProvider.json'
import Vault from "./Vault"


const Main = () => {
    const { isConnected } = useAccount()
    const { data: signer } = useSigner()

    const { connect } = useConnect({
        connector: new InjectedConnector(),
    })

    const [dataProvider, setDataProvider] = useState()

    const [vaultAddress, setVaultAddress] = useState()

    const getUserVault = async (signer, contract) => {
        if (!signer) return;
        const res = await contract.getVaultFor(await signer.getAddress());
        console.log(res)
        setVaultAddress(res)
    }
    useEffect(() => {
        if (signer) {
            const contract = new ethers.Contract(
                import.meta.env.VITE_DATA_PROVIDER,
                DataProviderJson.abi,
                signer
            )
            setDataProvider(contract)
            getUserVault(signer, contract)
        }
    }, [signer])


    return <section className='min-h-screen pt-8 pb-24'>
        <h2 className='text-4xl text-primary font-bold text-center pb-2'>DEMU</h2>
        <p className='text-lg text-primary font-semibold text-center'>
            DEMU is completely FREE to mint and doesn't charge any interest
        </p>
        <div className='flex justify-center align-center pt-12'>
            {!isConnected ?
                <button className="btn btn-primary" onClick={connect}>Connect</button> :
                !vaultAddress ? <div>
                    <p className="text-lg text-primary">You must create your vault in order to mint DEMU</p>
                    <button className="btn btn-primary" onClick={dataProvider?.createVault}>
                        Create Vault
                    </button>
                </div> :
                    <Vault address={vaultAddress} signer={signer} />
            }
        </div>
    </section>
}


export default Main;
