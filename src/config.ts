
const config = {
  wsEndpoint: process.env.wsEndpoint || 'wss://cc3-5.kusama.network',
  erasRange: process.env.erasRange === undefined ? 83 : +process.env.erasRange,
  permill: +process.env.permill || 1_000_000,
  validatorsCountInResponse: +process.env.validatorsCountInResponse || 16,
  mongoConnection: process.env.mongoConnection || 'mongodb://172.17.0.2:27017/nomination',
  // wsEndpoint : 'wss://wsnft.usetech.com',
};

export default config;
