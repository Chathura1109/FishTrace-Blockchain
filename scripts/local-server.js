import { createServer } from 'node:http';
import anchorsHandler from '../api/anchors.js';
import verificationHandler from '../api/anchors/[transactionReference].js';

const port = Number(process.env.PORT ?? 8787);

function responseAdapter(response) {
  let statusCode = 200;

  return {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      response.writeHead(statusCode, { 'content-type': 'application/json' });
      response.end(JSON.stringify(body));
    },
  };
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const adaptedResponse = responseAdapter(response);

  try {
    if (request.method === 'GET' && url.pathname === '/') {
      adaptedResponse.status(200).json({ service: 'FishTrace Blockchain Anchor Service', status: 'ok' });
      return;
    }

    if (url.pathname === '/anchors') {
      await anchorsHandler({
        method: request.method,
        headers: request.headers,
        body: await readJson(request),
      }, adaptedResponse);
      return;
    }

    const verification = url.pathname.match(/^\/anchors\/(0x[0-9a-fA-F]{64})$/);
    if (verification) {
      await verificationHandler({
        method: request.method,
        headers: request.headers,
        query: {
          transactionReference: verification[1],
          hash: url.searchParams.get('hash'),
        },
      }, adaptedResponse);
      return;
    }

    adaptedResponse.status(404).json({ error: 'Not found.' });
  } catch (error) {
    console.error(error);
    if (!response.headersSent) {
      adaptedResponse.status(400).json({ error: 'Invalid request.' });
    }
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`FishTrace blockchain service listening on http://127.0.0.1:${port}`);
});
