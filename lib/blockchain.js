import { Contract, Interface, JsonRpcProvider, Network, Wallet } from 'ethers';
import { ANCHOR_ABI } from './contract.js';

export function createBlockchain(config) {
  const network = Network.from({
    name: config.networkName,
    chainId: config.chainId,
  });
  const provider = new JsonRpcProvider(config.rpcUrl, network, { staticNetwork: network });
  const wallet = new Wallet(config.privateKey, provider);
  const contract = new Contract(config.contractAddress, ANCHOR_ABI, wallet);

  return { provider, wallet, contract, contractInterface: new Interface(ANCHOR_ABI) };
}

export async function submitAnchor(hash, config, blockchain = createBlockchain(config)) {
  const network = await blockchain.provider.getNetwork();
  if (network.chainId !== BigInt(config.chainId)) {
    throw new Error('RPC network does not match CHAIN_ID.');
  }

  const contractOwner = await blockchain.contract.owner();
  if (contractOwner.toLowerCase() !== blockchain.wallet.address.toLowerCase()) {
    throw new Error('Configured wallet is not the contract owner.');
  }
  if (await blockchain.contract.isAnchored(hash)) {
    throw new Error('Hash is already anchored.');
  }

  const transaction = await blockchain.contract.anchor(hash);

  return {
    transactionReference: transaction.hash,
    status: 'SUBMITTED',
    network: config.networkName,
  };
}

export async function verifyAnchor(transactionReference, hash, config, blockchain = createBlockchain(config)) {
  const receipt = await blockchain.provider.getTransactionReceipt(transactionReference);
  if (!receipt || receipt.status !== 1 || receipt.to?.toLowerCase() !== config.contractAddress.toLowerCase()) {
    return false;
  }

  let parsed;
  try {
    const transaction = await blockchain.provider.getTransaction(transactionReference);
    parsed = transaction ? blockchain.contractInterface.parseTransaction({ data: transaction.data, value: transaction.value }) : null;
  } catch {
    return false;
  }
  if (!parsed || parsed.name !== 'anchor' || parsed.args[0].toLowerCase() !== hash.toLowerCase()) {
    return false;
  }

  return blockchain.contract.isAnchored(hash);
}

