const config = {
  wsEndpoint: process.env.wsEndpoint || 'wss://kusama-rpc.polkadot.io',
  erasRange: process.env.erasRange === undefined ? 83 :process.env.erasRange,
  permill: process.env.permill || 1_000_000,
  // wsEndpoint : 'wss://wsnft.usetech.com',
};

export default config;
