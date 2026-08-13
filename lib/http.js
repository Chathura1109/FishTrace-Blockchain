import { timingSafeEqual } from 'node:crypto';
import { HttpError } from './errors.js';

export function requireBearerToken(request, expectedToken) {
  const authorization = request.headers.authorization ?? '';
  const suppliedToken = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : '';
  const supplied = Buffer.from(suppliedToken);
  const expected = Buffer.from(expectedToken);

  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new HttpError(401, 'Unauthorized.');
  }
}

export function sendJson(response, status, body) {
  response.status(status).json(body);
}

export function sendError(response, error) {
  if (error instanceof HttpError) {
    sendJson(response, error.status, { error: error.message });
    return;
  }

  console.error(error);
  sendJson(response, 502, { error: 'Blockchain provider request failed.' });
}

export function requireMethod(request, allowed) {
  if (request.method !== allowed) {
    throw new HttpError(405, 'Method not allowed.');
  }
}

