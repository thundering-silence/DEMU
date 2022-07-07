import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { InjectedConnector } from 'wagmi/connectors/injected'

const Nav = () => {
    const { address, isConnected } = useAccount()

    const { connect } = useConnect({
        connector: new InjectedConnector(),
    })
    const { disconnect } = useDisconnect()

    return <nav className='navbar w-full bg-primary flex flex-row justify-between'>
        <div className='navbar-left px-4'>
            <h3 className='title text-base-100 text-2xl font-bold'>DEMU</h3>
        </div>
        <div className='navbar-center'>
        </div>
        <div className='navbar-right px-4'>
            {!isConnected ? <button className='btn' onClick={connect}>Connect</button> :
                <div className='flex items-center'>
                    <p className='text-base-100 px-4 hidden md:flex'>{address}</p>
                    <button
                        className='btn btn-outline btn-accent'
                        onClick={disconnect}
                    >disconnect</button>
                </div>}
        </div>
    </nav>
}

export default Nav;
