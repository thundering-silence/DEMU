import { ethers } from 'ethers'
import { useEffect } from "react"
import { useAccount, useConnect, useContract, useSigner } from "wagmi"
import { InjectedConnector } from 'wagmi/connectors/injected'

import Demu from '../contracts/Demu.sol/Demu.json'
import Vault from "./Vault"

const switchToCorrectNetwork = async () => {
    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();

        provider.on("network", (newNetwork, oldNetwork) => {
            // When a Provider makes its initial connection, it emits a "network"
            // event with a null oldNetwork along with the newNetwork. So, if the
            // oldNetwork exists, it represents a changing network
            if (oldNetwork) {
                window.location.reload();
            }
        });
        console.log(network)
        if (network.chainId === 137) return;
        console.log('hello')
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [
                {
                    chainId: utils.hexValue("137"),
                },
            ],
        });
    } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: "wallet_addEthereumChain",
                    params: [
                        {
                            chainId: utils.hexValue("137"),
                            chainName: "Polygon (PoS) Mainnet",
                            rpcUrls: ['https://polygon-rpc.com'],
                        },
                    ],
                });
            } catch (addError) {
                console.log(addError);
            }
        }
    }
}


const Main = () => {
    const { isConnected } = useAccount()
    const { data: signer } = useSigner()

    const { connect } = useConnect({
        connector: new InjectedConnector(),
    })

    useEffect(() => {
        switchToCorrectNetwork()
    }, [])

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
