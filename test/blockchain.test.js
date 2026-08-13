import assert from 'node:assert/strict';
import test from 'node:test';
import { Interface } from 'ethers';
import { submitAnchor, verifyAnchor } from '../lib/blockchain.js';
import { ANCHOR_ABI } from '../lib/contract.js';

const contractAddress = '0x1111111111111111111111111111111111111111';
const walletAddress = '0x2222222222222222222222222222222222222222';
const transactionReference = `0x${'3'.repeat(64)}`;
const hash = `0x${'a'.repeat(64)}`;
const config = { chainId: 80002, networkName: 'polygon-amoy', contractAddress };

test('submission returns the Laravel HTTP contract without waiting for confirmation', async () => {
  const blockchain = {
    provider: { getNetwork: async () => ({ chainId: 80002n }) },
    wallet: { address: walletAddress },
    contract: {
      owner: async () => walletAddress,
      isAnchored: async () => false,
      anchor: async (submittedHash) => {
        assert.equal(submittedHash, hash);
        return { hash: transactionReference };
      },
    },
  };

  assert.deepEqual(await submitAnchor(hash, config, blockchain), {
    transactionReference,
    status: 'SUBMITTED',
    network: 'polygon-amoy',
  });
});

test('submission rejects a signer that does not own the contract', async () => {
  const blockchain = {
    provider: { getNetwork: async () => ({ chainId: 80002n }) },
    wallet: { address: walletAddress },
    contract: {
      owner: async () => contractAddress,
      isAnchored: async () => false,
    },
  };

  await assert.rejects(() => submitAnchor(hash, config, blockchain), /not the contract owner/);
});

test('verification checks receipt, destination, calldata hash and contract state', async () => {
  const contractInterface = new Interface(ANCHOR_ABI);
  const data = contractInterface.encodeFunctionData('anchor', [hash]);
  const blockchain = {
    provider: {
      getTransactionReceipt: async () => ({ status: 1, to: contractAddress }),
      getTransaction: async () => ({ data, value: 0n }),
    },
    contractInterface,
    contract: { isAnchored: async (verifiedHash) => verifiedHash === hash },
  };

  assert.equal(await verifyAnchor(transactionReference, hash, config, blockchain), true);
});

test('verification rejects failed receipts and mismatched anchored hashes', async () => {
  const contractInterface = new Interface(ANCHOR_ABI);
  const otherHash = `0x${'b'.repeat(64)}`;
  const failed = {
    provider: { getTransactionReceipt: async () => ({ status: 0, to: contractAddress }) },
  };
  assert.equal(await verifyAnchor(transactionReference, hash, config, failed), false);

  const mismatch = {
    provider: {
      getTransactionReceipt: async () => ({ status: 1, to: contractAddress }),
      getTransaction: async () => ({ data: contractInterface.encodeFunctionData('anchor', [otherHash]), value: 0n }),
    },
    contractInterface,
    contract: { isAnchored: async () => true },
  };
  assert.equal(await verifyAnchor(transactionReference, hash, config, mismatch), false);
});

