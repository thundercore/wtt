const HDWalletProvider = require('@truffle/hdwallet-provider')

require('dotenv').config()

const KEY = ((secret = '') => {
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new Error(`Missing required env variable`)
  }

  return secret.indexOf(' ') === -1
    ? [secret] // private keys
    : secret   // mnemonic
})(process.env.KEY)


module.exports = {
  networks: {
    'thunder-testnet': {
      provider: () => new HDWalletProvider(KEY, 'https://testnet-rpc.thundercore.com'),
      network_id: 18,
      gas: 9e7,
      gasPrice: 1e9,
    },
    'thunder-mainnet': {
      provider: () => new HDWalletProvider(KEY, 'https://mainnet-rpc.thundercore.com'),
      network_id: 108,
      gas: 9e7,
      gasPrice: 1e9,
      production: true,
    },
  },

  compilers: {
    solc: {
      version: '0.8.9',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: 'london',
      },
    },
  },
}
