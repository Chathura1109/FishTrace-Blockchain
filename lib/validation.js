import { getAddress } from 'ethers';
import { HttpError } from './errors.js';

const HASH_PATTERN = /^[a-fA-F0-9]{64}$/;
const TRANSACTION_PATTERN = /^0x[a-fA-F0-9]{64}$/;

export function normalizeHash(value) {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new HttpError(422, 'hash must be a 64-character hexadecimal SHA-256 value.');
  }

  return `0x${value.toLowerCase()}`;
}

export function normalizeTransactionReference(value) {
  if (typeof value !== 'string' || !TRANSACTION_PATTERN.test(value)) {
    throw new HttpError(422, 'transactionReference must be a transaction hash.');
  }

  return value.toLowerCase();
}

export function validateSubmission(body, config) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(422, 'A JSON request body is required.');
  }
  if (body.network !== config.networkName) {
    throw new HttpError(422, 'The requested network is not supported.');
  }

  let requestedContract;
  try {
    requestedContract = getAddress(body.contractAddress);
  } catch {
    throw new HttpError(422, 'contractAddress is invalid.');
  }
  if (requestedContract !== config.contractAddress) {
    throw new HttpError(422, 'The requested contract is not supported.');
  }

  return normalizeHash(body.hash);
}

