export default function handler(_request, response) {
  response.status(200).json({
    service: 'FishTrace Blockchain Anchor Service',
    status: 'ok',
  });
}

