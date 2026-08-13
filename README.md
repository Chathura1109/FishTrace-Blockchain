# FishTrace blockchain anchor service

This independently deployed Vercel Node service implements the HTTP boundary expected by FishTrace Laravel. It writes only canonical SHA-256 event hashes to the owner-gated `FishTraceAnchor` contract on an EVM network. The reference zero-cost deployment uses Base Sepolia. Fish, user, GPS, telemetry, AI feature, and credential data never enter the chain.

## HTTP contract

- `POST /anchors` submits `{ hash, network, contractAddress }` and returns `{ transactionReference, status, network }`.
- `GET /anchors/{transactionHash}?hash={hash}` returns `{ verified: boolean }`.
- Both endpoints require `Authorization: Bearer <BLOCKCHAIN_SERVICE_TOKEN>`.

Verification requires all of the following: a successful receipt, the configured contract as destination, calldata that invokes `anchor()` with the requested hash, and current `isAnchored(hash)` contract state.

## 1. Local setup

Requirements: Node.js 20 or newer.

```powershell
cd blockchain-service
npm install
Copy-Item .env.example .env
npm test
npm run compile
```

Never commit `.env`, a wallet private key, or a real service token.

### Run a fully local blockchain (no wallet or faucet)

The local chain uses Hardhat's public development-only account and free simulated ETH. Do not reuse its private key on any public network.

Open three PowerShell windows in `blockchain-service` and run:

```powershell
# Window 1: keep running
npm.cmd run local:node

# Window 2: deploy after the node is ready
Copy-Item .env.hardhat.example .env.hardhat
# Copy Account #0's private key printed by Window 1 into
# WALLET_PRIVATE_KEY in the ignored .env.hardhat file only.
npm.cmd run local:deploy

# Window 2: keep running after deployment
npm.cmd run local:server
```

`local:deploy` updates `CONTRACT_ADDRESS` in `.env.hardhat` automatically. Restarting the Hardhat node resets the entire local chain, so deploy again and copy the newly printed contract address into Laravel `.env`.

Configure Laravel for the local service:

```text
BLOCKCHAIN_DRIVER=http
BLOCKCHAIN_SERVICE_URL=http://127.0.0.1:8787
BLOCKCHAIN_SERVICE_TOKEN=fishtrace-local-development-token
BLOCKCHAIN_NETWORK=hardhat-local
BLOCKCHAIN_CONTRACT_ADDRESS=0xADDRESS_PRINTED_BY_LOCAL_DEPLOY
BLOCKCHAIN_AUTO_ANCHOR=true
```

Then clear Laravel's configuration cache and run its queue worker. Both local blockchain terminals must remain open while testing.

## 2. Base Sepolia wallet

Create a dedicated MetaMask test account. Add Base Sepolia with chain ID `84532`, currency `ETH`, explorer `https://sepolia.basescan.org`, and `https://sepolia.base.org` as the public RPC. Request free Base Sepolia test ETH from a faucet listed in the official Base documentation. Do not reuse a wallet that owns real funds.

Put the dedicated account private key in the local `.env` only. Before the contract exists, leave `CONTRACT_ADDRESS` as the zero address.

## 3. Deploy the contract

Load `.env` into the current PowerShell process, then deploy:

```powershell
Get-Content .env | Where-Object { $_ -and -not $_.StartsWith('#') } | ForEach-Object {
    $name, $value = $_ -split '=', 2
    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}
npm run deploy:testnet
```

Copy the printed `CONTRACT_ADDRESS` into `.env`. Confirm the deployment transaction on BaseScan Sepolia.

## 4. Deploy the service to Vercel

Create a separate Vercel project whose Root Directory is `blockchain-service`. Configure these Production environment variables and redeploy:

```text
RPC_URL
CHAIN_ID=84532
NETWORK_NAME=base-sepolia
CONTRACT_ADDRESS
WALLET_PRIVATE_KEY
BLOCKCHAIN_SERVICE_TOKEN
```

Generate a service token with at least 32 random bytes. Store it only in Vercel and the Laravel deployment environment. Vercel rewrites expose the Laravel-compatible `/anchors` paths while keeping the implementation under `/api`.

## 5. Connect Laravel

Set the FishTrace Laravel `.env` values:

```text
BLOCKCHAIN_DRIVER=http
BLOCKCHAIN_SERVICE_URL=https://YOUR-BLOCKCHAIN-SERVICE.vercel.app
BLOCKCHAIN_SERVICE_TOKEN=SAME_RANDOM_TOKEN
BLOCKCHAIN_NETWORK=base-sepolia
BLOCKCHAIN_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS
BLOCKCHAIN_AUTO_ANCHOR=true
BLOCKCHAIN_POLL_BATCH_SIZE=100
```

Then run:

```powershell
& "C:\php-x64\php.exe" artisan config:clear
& "C:\php-x64\php.exe" artisan queue:work --tries=3 --timeout=120
& "C:\php-x64\php.exe" artisan fishtrace:poll-blockchain-transactions
```

For this free/demo serverless deployment, process blockchain submission jobs through one Laravel queue worker to avoid concurrent transactions from the same wallet competing for a nonce. Base Sepolia is a test network and not a production trust or availability guarantee. Mainnet use requires real gas and a production wallet/signing design.
