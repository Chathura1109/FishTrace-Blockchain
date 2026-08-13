import assert from 'node:assert/strict';
import test from 'node:test';
import { compileContract } from '../scripts/contract-compiler.js';

test('FishTraceAnchor compiles with an ABI and deployable bytecode', () => {
  const contract = compileContract();
  assert.ok(Array.isArray(contract.abi));
  assert.ok(contract.abi.some((entry) => entry.type === 'function' && entry.name === 'anchor'));
  assert.ok(contract.abi.some((entry) => entry.type === 'function' && entry.name === 'isAnchored'));
  assert.ok(contract.evm.bytecode.object.length > 0);
});

