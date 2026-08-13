import fs from 'node:fs';
import path from 'node:path';
import solc from 'solc';

export function compileContract(rootDirectory = process.cwd()) {
  const contractPath = path.join(rootDirectory, 'contracts', 'FishTraceAnchor.sol');
  const source = fs.readFileSync(contractPath, 'utf8');
  const input = {
    language: 'Solidity',
    sources: { 'FishTraceAnchor.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors ?? []).filter((entry) => entry.severity === 'error');
  if (errors.length > 0) {
    throw new Error(errors.map((entry) => entry.formattedMessage).join('\n'));
  }

  return output.contracts['FishTraceAnchor.sol'].FishTraceAnchor;
}

