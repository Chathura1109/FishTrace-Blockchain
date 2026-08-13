import { readFile, writeFile } from 'node:fs/promises';
import { ContractFactory, JsonRpcProvider, Network, Wallet } from 'ethers';
import { loadConfig } from '../lib/config.js';
import { compileContract } from './contract-compiler.js';

const environmentFile = new URL('../.env.hardhat', import.meta.url);
const config = loadConfig();
const network = Network.from({ name: config.networkName, chainId: config.chainId });
const provider = new JsonRpcProvider(config.rpcUrl, network, { staticNetwork: network });
const wallet = new Wallet(config.privateKey, provider);
const actualNetwork = await provider.getNetwork();

if (actualNetwork.chainId !== BigInt(config.chainId)) {
  throw new Error('Local RPC network does not match CHAIN_ID.');
}

const compiled = compileContract(process.cwd());
const factory = new ContractFactory(compiled.abi, `0x${compiled.evm.bytecode.object}`, wallet);
console.log(`Deploying FishTraceAnchor from ${wallet.address} on ${config.networkName}...`);
const contract = await factory.deploy(wallet.address);
await contract.waitForDeployment();

const contractAddress = await contract.getAddress();
const currentEnvironment = await readFile(environmentFile, 'utf8');
const updatedEnvironment = currentEnvironment.replace(
  /^CONTRACT_ADDRESS=.*$/m,
  `CONTRACT_ADDRESS=${contractAddress}`,
);
await writeFile(environmentFile, updatedEnvironment, 'utf8');

console.log(`CONTRACT_ADDRESS=${contractAddress}`);
console.log(`DEPLOYMENT_TRANSACTION=${contract.deploymentTransaction().hash}`);
console.log('Updated .env.hardhat automatically.');
