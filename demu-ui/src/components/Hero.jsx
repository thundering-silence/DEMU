import { ethers, utils } from "ethers"
import { useEffect, useState } from "react"
import { useContractRead, useProvider } from "wagmi"

const Hero = () => {
    return <section className='hero min-h-screen flex flex-col justify-center items-center '>
        <div className='hero-content lg:w-2/3 mx-auto flex flex-col items-start'>
            <p className='font-bold text-5xl lg:text-6xl text-primary '>
                Decentralized
            </p>
            <p className='font-bold text-5xl lg:text-6xl text-primary '>
                European
            </p>
            <p className='font-bold text-5xl lg:text-6xl text-primary '>
                Monetary
            </p>
            <p className='font-bold text-5xl lg:text-6xl text-primary '>
                Unit
            </p>
            <h1 className=' text-lg lg:text-xl text-primary'>
                Zero-cost over-collateralized EURO stablecoin
            </h1>

        </div>
    </section>
}

export default Hero
