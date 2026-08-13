import fs from 'node:fs';
import path from 'node:path';
import { compileContract } from './contract-compiler.js';

const root = process.cwd();
const contract = compileContract(root);
const artifactDirectory = path.join(root, 'artifacts');
fs.mkdirSync(artifactDirectory, { recursive: true });
fs.writeFileSync(
  path.join(artifactDirectory, 'FishTraceAnchor.json'),
  `${JSON.stringify({ abi: contract.abi, bytecode: `0x${contract.evm.bytecode.object}` }, null, 2)}\n`,
);
console.log('Compiled FishTraceAnchor.sol successfully.');

