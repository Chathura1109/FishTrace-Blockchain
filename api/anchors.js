import { submitAnchor } from '../lib/blockchain.js';
import { loadConfig } from '../lib/config.js';
import { requireBearerToken, requireMethod, sendError, sendJson } from '../lib/http.js';
import { validateSubmission } from '../lib/validation.js';

export default async function handler(request, response) {
  try {
    requireMethod(request, 'POST');
    const config = loadConfig();
    requireBearerToken(request, config.serviceToken);
    const hash = validateSubmission(request.body, config);
    const result = await submitAnchor(hash, config);
    sendJson(response, 202, result);
  } catch (error) {
    sendError(response, error);
  }
}

