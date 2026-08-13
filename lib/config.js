import { getAddress } from 'ethers';
import { HttpError } from './errors.js';

function required(environment, key) {
  const value = environment[key]?.trim();
  if (!value) {
    throw new HttpError(500, `Server configuration is missing ${key}.`);
  }

  return value;
}

export function loadConfig(environment = process.env) {
  const chainId = Number(required(environment, 'CHAIN_ID'));
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new HttpError(500, 'Server CHAIN_ID configuration is invalid.');
  }

  let contractAddress;
  try {
    contractAddress = getAddress(required(environment, 'CONTRACT_ADDRESS'));
  } catch {
    throw new HttpError(500, 'Server CONTRACT_ADDRESS configuration is invalid.');
  }

  return {
    rpcUrl: required(environment, 'RPC_URL'),
    chainId,
    networkName: required(environment, 'NETWORK_NAME'),
    contractAddress,
    privateKey: required(environment, 'WALLET_PRIVATE_KEY'),
    serviceToken: required(environment, 'BLOCKCHAIN_SERVICE_TOKEN'),
  };
}

