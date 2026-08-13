import { verifyAnchor } from '../../lib/blockchain.js';
import { loadConfig } from '../../lib/config.js';
import { requireBearerToken, requireMethod, sendError, sendJson } from '../../lib/http.js';
import { normalizeHash, normalizeTransactionReference } from '../../lib/validation.js';

export default async function handler(request, response) {
  try {
    requireMethod(request, 'GET');
    const config = loadConfig();
    requireBearerToken(request, config.serviceToken);
    const transactionReference = normalizeTransactionReference(request.query.transactionReference);
    const hash = normalizeHash(request.query.hash);
    const verified = await verifyAnchor(transactionReference, hash, config);
    sendJson(response, 200, { verified });
  } catch (error) {
    sendError(response, error);
  }
}

