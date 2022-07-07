import DToken from './DToken';

const Tokens = ({ tokens }) => <section className='min-h-screen pt-8 pb-24'>
    <h2 className='text-4xl text-primary font-bold text-center pb-2'>MINT DEMU</h2>
    <p className='text-lg text-warning font-semibold text-center'>
        DEMU is completely FREE to mint and doesn't charge any interest
    </p>
    <ul className='m-0 px-8 pt-12 grid grid-cols-1 md:grid-cols-2 gap-8 xl:grid-cols-3'>
        {tokens.map(el => <DToken {...el} key={el.tokenAddress} />)}
    </ul>
</section>


export default Tokens;
