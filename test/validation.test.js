import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../lib/config.js';
import { requireBearerToken } from '../lib/http.js';
import { normalizeHash, normalizeTransactionReference, validateSubmission } from '../lib/validation.js';

const contractAddress = '0x1111111111111111111111111111111111111111';
const hash = 'a'.repeat(64);

test('configuration is parsed and normalized', () => {
  const config = loadConfig({
    RPC_URL: 'https://rpc.example.test',
    CHAIN_ID: '80002',
    NETWORK_NAME: 'polygon-amoy',
    CONTRACT_ADDRESS: contractAddress,
    WALLET_PRIVATE_KEY: `0x${'1'.repeat(64)}`,
    BLOCKCHAIN_SERVICE_TOKEN: 'test-token',
  });

  assert.equal(config.chainId, 80002);
  assert.equal(config.networkName, 'polygon-amoy');
  assert.equal(config.contractAddress, contractAddress);
});

test('bearer authentication accepts only the exact token', () => {
  assert.doesNotThrow(() => requireBearerToken({ headers: { authorization: 'Bearer secret-token' } }, 'secret-token'));
  assert.throws(
    () => requireBearerToken({ headers: { authorization: 'Bearer wrong-token' } }, 'secret-token'),
    (error) => error.status === 401,
  );
});

test('submission validation enforces hash, network and contract', () => {
  const config = { networkName: 'polygon-amoy', contractAddress };
  assert.equal(validateSubmission({ hash, network: 'polygon-amoy', contractAddress }, config), `0x${hash}`);
  assert.throws(
    () => validateSubmission({ hash, network: 'polygon-mainnet', contractAddress }, config),
    (error) => error.status === 422,
  );
  assert.throws(
    () => validateSubmission({ hash: 'not-a-hash', network: 'polygon-amoy', contractAddress }, config),
    (error) => error.status === 422,
  );
});

test('hash and transaction references are strictly normalized', () => {
  assert.equal(normalizeHash(hash.toUpperCase()), `0x${hash}`);
  assert.equal(normalizeTransactionReference(`0x${'B'.repeat(64)}`), `0x${'b'.repeat(64)}`);
  assert.throws(() => normalizeTransactionReference('tx/abc'), (error) => error.status === 422);
});

