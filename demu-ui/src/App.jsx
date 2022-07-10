import { useRef } from 'react';
import { WagmiConfig } from 'wagmi'
import client from './web3/wagmi.config';
import Nav from './components/Nav';
import Hero from './components/Hero';


import './App.css'
import Tokens from './components/Tokens';
import Footer from './components/Footer';

const supportedAssets = ["WMATIC", "WBTC", "WETH", "DAI", "USDC", "LINK"];

function App() {
  const dTokens = useRef(supportedAssets.map(el => ({
    name: el,
    tokenAddress: import.meta.env[`VITE_d${el}`],
    underlyingAddress: import.meta.env[`VITE_${el}`]
  })))

  return (
    <WagmiConfig client={client}>
      <div className='bg-base-100'>
        <Nav />
        <main className="container container-2xl mx-auto">
          <Hero />

          <Tokens tokens={dTokens.current} />
        </main>
        <Footer />
      </div>
    </WagmiConfig>
  )
}

export default App
