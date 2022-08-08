// import { useRef } from 'react';
import { WagmiConfig } from 'wagmi'
import client from './web3/wagmi.config';
import { Toaster } from 'react-hot-toast'
import Nav from './components/Nav';
import Hero from './components/Hero';


import './App.css'
import Main from './components/Main';
import Footer from './components/Footer';

function App() {
  return (
    <WagmiConfig client={client}>
      <div className='bg-base-100'>
        <Nav />
        <main className="container container-2xl mx-auto">
          <Hero />
          <Main />
        </main>
        <Footer />
      </div>
      <Toaster />
    </WagmiConfig>
  )
}

export default App
