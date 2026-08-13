import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const environmentPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(environmentPath)) {
  throw new Error('.env does not exist. Copy .env.example first.');
}

const contents = fs.readFileSync(environmentPath, 'utf8');
const match = contents.match(/^BLOCKCHAIN_SERVICE_TOKEN=(.*)$/m);
if (!match) {
  throw new Error('BLOCKCHAIN_SERVICE_TOKEN is missing from .env.');
}

const current = match[1].trim();
if (current && !/REPLACE|LATER|TOKEN/i.test(current)) {
  console.log('Existing blockchain service token kept unchanged.');
  process.exit(0);
}

const token = randomBytes(32).toString('hex');
fs.writeFileSync(
  environmentPath,
  contents.replace(/^BLOCKCHAIN_SERVICE_TOKEN=.*$/m, `BLOCKCHAIN_SERVICE_TOKEN=${token}`),
  { encoding: 'utf8', mode: 0o600 },
);
console.log('Generated and stored a blockchain service token without displaying it.');
