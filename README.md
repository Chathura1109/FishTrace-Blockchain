# FishTrace Blockchain Integration - Full Project Handoff Guide

This guide is for the group member who has the complete FishTrace Laravel and Flutter project. It explains how to connect that project to the blockchain service already deployed by the team and test the complete flow from a mobile action to a publicly verified Celo Sepolia transaction.

The blockchain contract and API are already deployed. The tester does **not** need to deploy another contract, run Hardhat, create a MetaMask account, obtain test tokens, or run the blockchain service locally.

## End-to-end flow

```text
Flutter mobile action
        |
        v
FishTrace Laravel API creates an approved traceability event
        |
        v
AnchorTraceabilityEvent queue job
        |
        | HTTPS + Bearer token
        v
FishTrace blockchain service on Vercel
        |
        | Signed transaction
        v
FishTraceAnchor contract on Celo Sepolia
        |
        v
Laravel polling job verifies the transaction
        |
        v
Admin compliance page shows CONFIRMED and VALID
```

The mobile application never talks directly to the blockchain. No blockchain code or wallet private key belongs in Flutter. Laravel creates and hashes the approved event, and only the hash is sent to the blockchain service.

## Current shared test deployment

| Item | Value |
| --- | --- |
| API health URL | `https://fish-trace-blockchain.vercel.app/api` |
| Laravel service URL | `https://fish-trace-blockchain.vercel.app` |
| Network | Celo Sepolia |
| Chain ID | `11142220` |
| Contract address | `0x2deA3083a83BccFFCD3216bDa656de3b6fd81FF0` |
| Contract explorer | [Celo Sepolia Blockscout](https://celo-sepolia.blockscout.com/address/0x2deA3083a83BccFFCD3216bDa656de3b6fd81FF0) |
| Deployment transaction | [View deployment](https://celo-sepolia.blockscout.com/tx/0xbbee767596bf071f9a92a39e395ed70ca297a079a4271d7f0a28e76a2eccb3cd) |

The service root URL may return `404`. This is expected. Use `/api` for the health check.

## What the project owner must give the tester

The tester needs:

1. The FishTrace branch or commit containing the Laravel blockchain integration.
2. This README.
3. The `BLOCKCHAIN_SERVICE_TOKEN`, sent privately.

The tester does **not** need:

- The blockchain wallet private key
- Access to the MetaMask wallet
- Access to the Vercel account
- Test CELO in a personal wallet
- The local `.env` from another developer's computer

Never send a private key. Never commit the service token to GitHub. The service token may be shared privately only with the group member performing the integration test.

## 1. Prepare the full FishTrace project

Open PowerShell in the full Laravel project directory:

```powershell
cd "PATH_TO_FULL_FISHTRACE_PROJECT"
```

Install/update dependencies using the PHP version already used by the project:

```powershell
composer install
npm.cmd install
npm.cmd run build
```

Configure the project's normal MySQL connection, application key, Firebase settings, AI settings, mail settings, and mobile API URL as required by the full project.

Apply pending migrations without deleting existing data:

```powershell
php artisan migrate
```

Do not use `migrate:fresh` on a database containing data that must be retained.

## 2. Confirm that the Laravel integration code is present

Run:

```powershell
php artisan list | Select-String "fishtrace:poll-blockchain-transactions"
php artisan route:list --path=admin/compliance/blockchain
```

Both commands must return matching entries. If they return nothing, the tester's full-project branch does not contain the blockchain integration and must first merge the branch/commit supplied by the project owner.

The integration includes these main components:

- `config/fishtrace.php`
- `app/Services/Blockchain/`
- `app/Contracts/Blockchain/BlockchainClient.php`
- `app/Jobs/AnchorTraceabilityEvent.php`
- `app/Jobs/PollBlockchainTransaction.php`
- `app/Observers/TraceabilityEventObserver.php`
- `app/Console/Commands/PollBlockchainTransactions.php`
- Blockchain models and database migrations
- Admin blockchain compliance routes and views

Do not copy only the Node service folder into an older Laravel version and expect automatic anchoring. The Laravel integration code must also exist.

## 3. Test the deployed API before changing Laravel

```powershell
Invoke-RestMethod -Uri "https://fish-trace-blockchain.vercel.app/api" -Method Get
```

Expected result:

```text
service                                status
-------                                ------
FishTrace Blockchain Anchor Service   ok
```

This confirms only that the public API is online. The end-to-end test below confirms authenticated submission and verification.

## 4. Configure Laravel `.env`

Open the `.env` file in the full Laravel project and set:

```dotenv
BLOCKCHAIN_DRIVER=http
BLOCKCHAIN_SERVICE_URL=https://fish-trace-blockchain.vercel.app
BLOCKCHAIN_SERVICE_TOKEN=PASTE_THE_TOKEN_SHARED_PRIVATELY_BY_THE_PROJECT_OWNER
BLOCKCHAIN_NETWORK=celo-sepolia
BLOCKCHAIN_CONTRACT_ADDRESS=0x2deA3083a83BccFFCD3216bDa656de3b6fd81FF0
BLOCKCHAIN_AUTO_ANCHOR=true
BLOCKCHAIN_POLL_BATCH_SIZE=100
```

Important checks:

- Use the exact service token configured in Vercel.
- Do not put quotes or spaces around the token unless they are actually part of it.
- Do not add `/api` or `/anchors` to `BLOCKCHAIN_SERVICE_URL`.
- Do not change `BLOCKCHAIN_NETWORK` or the contract address.
- Do not add the wallet private key to the Laravel project.
- Ensure `QUEUE_CONNECTION=database` is configured.

The required queue configuration normally looks like:

```dotenv
QUEUE_CONNECTION=database
DB_QUEUE_RETRY_AFTER=180
QUEUE_FAILED_DRIVER=database-uuids
```

After editing `.env`, clear cached configuration:

```powershell
php artisan config:clear
php artisan cache:clear
php artisan queue:restart
```

Confirm the effective configuration without displaying the token:

```powershell
php artisan tinker --execute="dump(config('fishtrace.blockchain.driver'), config('fishtrace.blockchain.url'), config('fishtrace.blockchain.network'), config('fishtrace.blockchain.contract'), config('fishtrace.blockchain.auto_anchor'));"
```

Expected values include:

```text
http
https://fish-trace-blockchain.vercel.app
celo-sepolia
0x2deA3083a83BccFFCD3216bDa656de3b6fd81FF0
true
```

## 5. Start the complete project

Use separate terminals. All commands must run from the full Laravel project directory.

### Terminal 1: Laravel API and admin site

```powershell
php artisan serve --host=0.0.0.0 --port=8000
```

### Terminal 2: queue worker

Run only one blockchain submission worker for this demonstration setup. The service uses one signer wallet, and one worker avoids concurrent nonce conflicts.

```powershell
php artisan queue:work --tries=5 --timeout=120
```

Keep this terminal open and watch for:

```text
App\Jobs\AnchorTraceabilityEvent
App\Jobs\PollBlockchainTransaction
```

### Terminal 3: Laravel scheduler

```powershell
php artisan schedule:work
```

The scheduler runs `fishtrace:poll-blockchain-transactions` every five minutes. For a faster manual test, the polling command can be run directly after submission:

```powershell
php artisan fishtrace:poll-blockchain-transactions
```

The queue worker in Terminal 2 must remain running to process the polling job.

### Terminal 4: Flutter application, if required

Run the Flutter application using the group's existing Firebase and API configuration. The blockchain integration does not require a new Flutter endpoint or a blockchain package.

Typical local Laravel addresses are:

- Android emulator: `http://10.0.2.2:8000/api/v1`
- Physical phone: `http://PC_LAN_IP:8000/api/v1`
- Web/desktop running on the same PC: `http://127.0.0.1:8000/api/v1`

For a physical phone, the phone and PC must be on the same network, Laravel must use `--host=0.0.0.0`, and Windows Firewall must permit the connection.

## 6. Create a new eligible event from the mobile app

The simplest complete test is a new `BATCH_CREATED` event.

Using the Flutter application:

1. Sign in as a user with the `FISHER` role.
2. Use an existing active fishing trip or create/start one.
3. Register a catch for that trip.
4. Create a **new fish batch** from available catch weight.
5. Wait while the queue worker processes `AnchorTraceabilityEvent`.

Creating a batch saves the Laravel/MySQL batch and creates the `BATCH_CREATED` traceability event. Because `BLOCKCHAIN_AUTO_ANCHOR=true`, Laravel dispatches the blockchain job only after the database transaction commits successfully.

An existing batch created before blockchain HTTP mode was enabled does not automatically dispatch a new job. Create a new eligible event for this test.

Other event types that automatically qualify for anchoring are:

```text
CATCH_REGISTERED
BATCH_CREATED
PROCESSOR_ACCEPTED
QUALITY_INSPECTION_COMPLETED
PROCESSING_COMPLETED
TRANSPORT_STARTED
COLD_CHAIN_VIOLATION
TRANSPORT_COMPLETED
RETAIL_RECEIVED
BATCH_RECALLED
SENSOR_SUMMARY_ANCHORED
AI_PREDICTION_ANCHORED
```

Events outside this allowlist are intentionally not anchored.

## 7. Confirm submission in Laravel

Watch Terminal 2. A successful job should finish without a `FAIL` result.

Sign in to the Laravel web administration console using an `ADMIN` account. Non-admin mobile roles cannot open this administration page.

For a seeded development database:

```text
URL: http://127.0.0.1:8000/admin/login
Email: admin@fishtrace.demo
Password: FishTrace@2026
```

Open:

```text
http://127.0.0.1:8000/admin/compliance/blockchain
```

Find the new batch/event. Immediately after successful submission, the row should show approximately:

```text
transaction reference: 0x...
status: SUBMITTED
attempts: 1
verification: Not confirmed
```

`PENDING` with no transaction reference means the submission job has not completed or failed. Check the queue terminal and Laravel log.

## 8. Poll and confirm the blockchain transaction

For an immediate test, run:

```powershell
php artisan fishtrace:poll-blockchain-transactions
```

Expected console message:

```text
Queued 1 blockchain verification poll(s).
```

Terminal 2 should then process `App\Jobs\PollBlockchainTransaction`. Refresh the admin blockchain page.

The expected final state is:

```text
status: CONFIRMED
attempts: 1
verification: VALID / Confirmed
```

Open the transaction detail page and copy its public transaction reference. It can be checked independently at:

```text
https://celo-sepolia.blockscout.com/tx/TRANSACTION_REFERENCE
```

The explorer should show a successful transaction sent to:

```text
0x2deA3083a83BccFFCD3216bDa656de3b6fd81FF0
```

## 9. Verify the consumer trace result

Open or scan the batch QR code through the project's normal consumer trace flow. The consumer response exposes only a privacy-safe aggregate blockchain status, not the event hash, wallet key, service token, raw provider response, or private traceability data.

Possible blockchain states include:

- `VERIFIED`: every eligible event for that batch has confirmed evidence.
- `PENDING`: at least one eligible event still needs confirmation.
- `FAILED`: at least one anchor failed.
- `NOT_APPLICABLE`: the batch has no eligible event.

The overall public trace may remain `TRACE_RECORDED` until all eligible milestones for that batch are verified. This is expected when testing a batch containing earlier unanchored events.

## 10. Optional AI and IoT integration tests

Blockchain anchoring is independent from Firebase transport. A normal mobile-created `BATCH_CREATED` event is enough for the first test.

If the full project has AI configured and a successful prediction creates `AI_PREDICTION_ANCHORED`, that event is also automatically queued for blockchain anchoring.

If the full project imports IoT telemetry and creates `COLD_CHAIN_VIOLATION` or `SENSOR_SUMMARY_ANCHORED`, those events are also eligible. Raw telemetry is never written to the blockchain.

The architecture remains:

```text
IoT device -> Firebase -> Laravel sync -> MySQL event -> blockchain hash anchor
```

## Direct API diagnostic test

Use this only to separate Vercel/blockchain problems from Laravel/mobile problems. It consumes a very small amount of shared Celo Sepolia test CELO.

Enter the service token without displaying it:

```powershell
$secureToken = Read-Host "Enter BLOCKCHAIN_SERVICE_TOKEN" -AsSecureString
$token = [System.Net.NetworkCredential]::new('', $secureToken).Password
```

Generate a unique SHA-256 hash:

```powershell
$sha = [System.Security.Cryptography.SHA256]::Create()
$hash = ([System.BitConverter]::ToString($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes([guid]::NewGuid().ToString())))).Replace('-', '').ToLower()
$sha.Dispose()
```

Submit it:

```powershell
$body = @{
    hash = $hash
    network = "celo-sepolia"
    contractAddress = "0x2deA3083a83BccFFCD3216bDa656de3b6fd81FF0"
} | ConvertTo-Json

$submitRequest = @{
    Uri = "https://fish-trace-blockchain.vercel.app/anchors"
    Method = "Post"
    Headers = @{ Authorization = "Bearer $token" }
    ContentType = "application/json"
    Body = $body
}

$result = Invoke-RestMethod @submitRequest
$result
```

Expected status: `SUBMITTED` with a `transactionReference`.

Verify it:

```powershell
Start-Sleep -Seconds 10
$tx = $result.transactionReference

$verificationRequest = @{
    Uri = "https://fish-trace-blockchain.vercel.app/anchors/$tx`?hash=$hash"
    Method = "Get"
    Headers = @{ Authorization = "Bearer $token" }
}

Invoke-RestMethod @verificationRequest
```

Expected result: `verified = True`.

Remove the token from the PowerShell session:

```powershell
$token = $null
$secureToken = $null
Remove-Variable token, secureToken -ErrorAction SilentlyContinue
```

## Troubleshooting

### Service health URL returns 404

Use:

```text
https://fish-trace-blockchain.vercel.app/api
```

The root `/` route is not configured on Vercel.

### `Unauthenticated`, HTTP 401, or HTTP 403

The Laravel token does not exactly match `BLOCKCHAIN_SERVICE_TOKEN` in Vercel. Obtain the correct token privately and then run:

```powershell
php artisan config:clear
php artisan queue:restart
```

### HTTP 422 Unprocessable Entity

Confirm all three values:

```text
hash: exactly 64 hexadecimal characters
network: celo-sepolia
contract: 0x2deA3083a83BccFFCD3216bDa656de3b6fd81FF0
```

### Event remains PENDING with attempts 0

- Confirm the queue worker is running.
- Confirm `QUEUE_CONNECTION=database`.
- Run `php artisan queue:restart` after changing `.env`.
- Check `storage/logs/laravel.log`.
- Check failed jobs with `php artisan queue:failed`.

### Event becomes SUBMITTED but not CONFIRMED

Run:

```powershell
php artisan fishtrace:poll-blockchain-transactions
```

Ensure the queue worker processes the resulting polling job. Also check the transaction on Celo Sepolia Blockscout.

### Queue job shows FAIL

Inspect:

```powershell
php artisan queue:failed
Get-Content storage\logs\laravel.log -Tail 100
```

After correcting the configuration, restart the worker. Do not blindly retry jobs that may already have submitted a transaction; first check the stored transaction reference and admin blockchain page.

### Admin page says administrator access is required

Use an account with the `ADMIN` role. `FISHER`, `TRANSPORTER`, `PROCESSOR`, `RETAILER`, and `INSPECTOR` accounts cannot access the blockchain administration page.

### Mobile app cannot reach local Laravel

- Android emulator normally uses `10.0.2.2`, not `127.0.0.1`.
- A physical phone uses the PC's LAN IP.
- Keep the phone and PC on the same network.
- Start Laravel with `--host=0.0.0.0`.
- Permit port `8000` through Windows Firewall if required.

### A newly created event does not create a blockchain job

Confirm:

```dotenv
BLOCKCHAIN_AUTO_ANCHOR=true
```

Then confirm the event type is in the approved allowlist and that the event was created after the configuration was enabled.

## Test completion checklist

The integration test is complete when all of the following are true:

- [ ] `GET https://fish-trace-blockchain.vercel.app/api` returns `status: ok`.
- [ ] Laravel effective driver is `http`.
- [ ] Laravel network is `celo-sepolia`.
- [ ] Laravel uses the deployed contract address.
- [ ] A new eligible mobile action creates a traceability event in MySQL.
- [ ] `AnchorTraceabilityEvent` completes in the queue worker.
- [ ] Admin blockchain page shows a real `0x...` transaction reference.
- [ ] Status changes from `SUBMITTED` to `CONFIRMED` after polling.
- [ ] Verification displays `VALID` or confirmed.
- [ ] The transaction succeeds on Celo Sepolia Blockscout.
- [ ] No wallet private key or service token appears in GitHub, logs, screenshots, or mobile code.

## Security and data notes

Only a canonical SHA-256 event hash, contract/network identifiers, and the transaction reference leave Laravel. The original event data stays in MySQL. The chain does not receive fish details, user information, GPS coordinates, telemetry readings, AI input features, Firebase credentials, authentication tokens, or private files.

This Celo Sepolia deployment is intended for academic demonstrations and testing. It is not a production mainnet deployment. A production implementation requires managed key storage, wallet recovery and rotation, monitoring, rate limiting, gas management, and a separately reviewed production network design.
