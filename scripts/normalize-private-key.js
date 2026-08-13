import fs from 'node:fs';
import path from 'node:path';

const environmentPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(environmentPath)) {
  throw new Error('.env does not exist.');
}

const contents = fs.readFileSync(environmentPath, 'utf8');
const match = contents.match(/^WALLET_PRIVATE_KEY=(.*)$/m);
if (!match) {
  throw new Error('WALLET_PRIVATE_KEY is missing from .env.');
}

const normalized = match[1].trim().replace(/^(?:0x)+/i, '');
if (!/^[a-f0-9]{64}$/i.test(normalized)) {
  throw new Error('WALLET_PRIVATE_KEY must contain exactly 64 hexadecimal characters.');
}

fs.writeFileSync(
  environmentPath,
  contents.replace(/^WALLET_PRIVATE_KEY=.*$/m, `WALLET_PRIVATE_KEY=0x${normalized}`),
  { encoding: 'utf8', mode: 0o600 },
);
console.log('Normalized the private-key prefix without displaying the key.');
