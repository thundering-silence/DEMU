import { Network, initializeAlchemy } from "@alch/alchemy-sdk";

const settings = {
  apiKey: import.meta.env.VITE_ALCHEMY_KEY, // Replace with your Alchemy API Key.
  network: Network.MATIC_MAINNET, // Replace with your network.
  maxRetries: 10,
};

const alchemy = initializeAlchemy(settings);

export default alchemy;
