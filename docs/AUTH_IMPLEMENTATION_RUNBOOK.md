> **Historical engineering note.** This document may describe superseded plans or validation results. See the [current project status](STATUS.md) for supported behavior and deployment evidence.

# AUTH implementation and cutover runbook

Updated: 2026-11-05. Runbook for the implemented authentication and first-use flows.

## Delivery status

Application code, migration, HTTP acceptance tests, transaction adapter and UI are implemented. This is not a production deployment or an external security audit.

Verified here: native Argon2id, exact usernames, opaque secrets, SIWE binding, HTTP guards, BFF and transaction adapter tests; contract suites and backend receipt verification against the local Hardhat EVM; backend/frontend TypeScript and Next production compilation.

Historical auth delivery checks passed locally. First-use behavior is implemented; real browser/Core QA is still required.

Not verified here:

- Hosted/staging PostgreSQL acceptance remains separate. Local isolated PostgreSQL acceptance now passes via `npm run test:auth:local` (96 cases); PostgreSQL + local EVM verification passes via `npm run test:v2:local` (10 checks). Application migrations 0006–0008 were applied separately after a data snapshot to fix missing registration tables.
- Browser screenshots, responsive QA and real Core-extension interaction: browser access host was unavailable.
- Live L1 genesis/precompile configuration, deployed ownership and production RPC/network addresses.

## Authoritative components

- `backend/src/auth/security.ts`: validation, native Argon2id, random secrets, exact SIWE messages and signed client-IP metadata.
- `backend/src/auth/service.ts`: credentials, sessions, onboarding, wallet proofs, member policy, invitations and audit.
- `backend/src/routes/authRoutes.ts`: HTTP guards, safe errors and auth/member routes.
- `backend/src/routes/apiRoutes.ts`: workspace/vault authorization and financial receipt reconciliation.
- `frontend/src/app/api/[...path]/route.ts`: same-origin BFF; forwards cookies, never trusts client role/user-ID headers.
- `frontend/src/hooks/useAuth.ts`: shared identity, onboarding and separate Core connection state.
- `frontend/src/lib/web3/client.ts`: fresh identity/workspace/account/network checks, simulation, receipts and reconciliation queue.
- `shared/abis.ts`: one ABI source for frontend, backend and worker.

Old JWT, PIN/family fallback, address-only sync and public family-code Guardian registration are retired. Those API paths return 410. Existing JWT cookies cannot authenticate to the new backend. Duplicate Next database/schema/services are removed from the request path.

## Permission matrix

| Action                         | Workspace Admin                                               | Guardian with management flag         | Guardian without flag                 | Elderly/Child                         |
| ------------------------------ | ------------------------------------------------------------- | ------------------------------------- | ------------------------------------- | ------------------------------------- |
| Read data                      | Own active workspace                                          | Own active workspace; assigned vaults | Own active workspace; assigned vaults | Own active workspace; assigned vaults |
| Create dependent               | Yes                                                           | Yes; becomes assigned manager         | No                                    | No                                    |
| List/profile/disable dependent | Dependents in own workspace                                   | Assigned dependents only              | No                                    | No                                    |
| Reset/enroll credential        | Assigned manager + recent Core proof                          | Assigned manager + recent Core proof  | No                                    | No                                    |
| Transfer manager               | Yes + recent Core proof                                       | No                                    | No                                    | No                                    |
| Grant management flag          | Yes + recent Core proof                                       | No                                    | No                                    | No                                    |
| Invite Guardian                | Yes + recent Core proof, nominated wallet                     | No                                    | No                                    | No                                    |
| Change own password/sessions   | Own account                                                   | Own account                           | Own account                           | Own account                           |
| First wallet link              | Authenticated onboarding, personal password set, no overwrite | Same                                  | Same                                  | Same                                  |
| Change/recover wallet          | No public API until contract recovery policy is reviewed      | Same                                  | Same                                  | Same                                  |

Legacy global role does not authorize workspace operations. Disabling access affects only that membership. Credential reset is account-wide, revokes all sessions and preserves the wallet. Vault Guardian status alone grants no workspace account-management permission.

## State and secrets

1. Temporary passwords are random or supplied under the same 12–128-character policy. Only Argon2id hashes are stored, using 19 MiB, two passes and one lane. Temporary credentials expire in 48 hours.
2. Initial login creates a 30-minute onboarding session. Ordinary APIs reject it server-side.
3. Password change verifies the current credential, removes temporary status, revokes old sessions and issues a new one.
4. Wallet link uses a server-generated SIWE message, five-minute challenge and browser/session/user/purpose binding. Exact stored-message verification, nonce consumption, unique wallet insertion, audit and session rotation are transactional.
5. Full sessions have a seven-day absolute limit and 24-hour idle limit. Cookies are HttpOnly, SameSite=Lax and Secure in production. DB stores only SHA-256 token digests.
6. Signed-in reads do not require Core. Disconnect preserves the verified link; logout clears app state/cache and stops UI provider use.
7. Passwords and invitation tokens are returned once. DTOs never expose hashes, tokens, signatures or private keys. Error logs contain categories only.

Member credential/manager changes lock account rows and recheck policy. DB uniqueness covers normalized usernames, wallet addresses, workspace membership and on-chain mappings. Legacy address reservations are case-insensitive.

## Runtime and configuration

Use Node **24.7+**, which provides native `crypto.argon2`. There is no weaker fallback. Measure concurrency and memory on the deployment runtime before tuning the workload.

Backend root environment:

```dotenv
APP_ORIGIN=https://your-app.example
DATABASE_URL=<application Neon PostgreSQL URL>
HUB_CHAIN_ID=<actual FamilyHub chain ID>
HUB_RPC_URL=<RPC on that chain>
FAMILY_L1_CHAIN_ID=<actual L1 chain ID>
FAMILY_HUB_ADDRESS=<actual deployed hub>
FAMILY_YIELD_VAULT_ADDRESS=<actual deployed yield vault>
TX_ALLOWLIST_ENABLED=false
TRUST_PROXY_HOPS=0
BFF_SHARED_SECRET=<random value of at least 32 characters>
```

Frontend: use `frontend/.env.example`, with the same origin/BFF secret, internal Express URL, matching public chain IDs, RPCs and addresses. Never put private keys or the BFF secret in `NEXT_PUBLIC_` variables.

The BFF signs the platform-provided client IP when available. On a self-hosted proxy, enable `BFF_TRUST_PROXY_IP_HEADER=true` only if the trusted proxy overwrites `x-real-ip` and no alternate untrusted ingress exists. Backend ignores invalid/expired signed metadata and uses its peer IP instead. Without forwarding, IP limits conservatively share the BFF peer bucket. Per-account limits remain shared in PostgreSQL.

Expose the frontend publicly and keep Express on the private application network. Use HTTPS for Secure cookies. This implementation does not use a JWT secret.

## Database cutover

1. Back up the target database and test restoration. Inventory user/workspace/wallet ownership.
2. Stop old auth/API instances and the old worker during cutover. Do not leave unauthenticated legacy routes running on another port.
3. Resolve duplicate memberships, lowercased wallet collisions and duplicate on-chain request/task mappings using ownership evidence and explicit Admin decisions. Never automatically choose the most privileged duplicate role.
4. Apply `npm run db:migrate` to staging first. `0001_account_auth.sql` adds auth tables/constraints and missing legacy columns, invalidates cleartext PINs/nonces, and does not fabricate verified wallets or managers.
5. Run the read-only legacy report below. It excludes credentials/hashes.
6. Legacy Core Admin/Guardian with legitimate active membership signs the original wallet, then creates username/password in onboarding. Missing/ambiguous memberships need an operator's audited repair first.
7. Legacy dependent: Admin explicitly assigns a manager. The assigned manager reauthenticates with Core and uses `POST .../:memberId/enroll` to issue a new username/temporary credential. The member-management UI supports this. Old PINs are never promoted.
8. Existing non-null wallet addresses stay reserved. Linking a different wallet returns `LEGACY_WALLET_REVIEW_REQUIRED`. Generated-address/lost-key records require reviewed recovery; never clear their address just to finish onboarding.
9. Old vault mappings remain unverified, with null hub/chain columns. Reconcile creation receipts into the correct workspace before enabling writes. No worker assigns them to the first family.
10. Run database acceptance and real Core flows, then start the new frontend/API/worker together.

```powershell
node -r ts-node/register/transpile-only scripts/auth-legacy-report.ts
```

This is a forward migration. Rollback requires tested backup/data reconciliation and a maintenance window. Reintroducing weak auth is not a safe rollback. Demo seeding requires `AUTH_SEED_ALLOW_RESET=true`, refuses production and must target disposable data.

## Provisioning and transactions

`provisioning_requests` is a queue, not authorization. PENDING never grants spending rights.

- An authorized operator calls `FamilyHub.setAllowlistStatus`. A manager submits the hash to `POST /api/workspaces/:id/provisioning/:requestId/confirm`. Server verifies receipt success, hub, matching event and live allowlist state. Operator and submitting manager may be different signers.
- Set `TX_ALLOWLIST_ENABLED=true` only when that L1 activates TransactionAllowList. Server confirmation/client preflight also read `readAllowList(wallet)` from the network precompile and require a nonzero role. Leave it false on Fuji or an L1 without this precompile.
- Vault creation selects verified Guardian/beneficiary wallets. Backend derives ID/configuration/roles from the actual receipt and contract state. One on-chain vault cannot map to two workspaces.
- Existing contracts have no general add-beneficiary method. Create a vault including the newly verified member or perform a separately reviewed contract migration. DB edits alone cannot grant contract rights.
- Before writes, client compares actual Core signer with stored link, validates server/client chain agreement, checks hub/network allowlists, simulates permissions, then rechecks identity/account/chain/workspace after prompts. RPC failure denies the action.
- Only successful receipts return success. Broadcast hashes are kept per account and polled without the original provider. Pending and reverted outcomes stay distinct.
- Confirmed-but-unsynced operations use a persistent API reconciliation queue. Timeouts/outages never automatically resend funds. Unique mappings and snapshot updates make reconciliation idempotent.
- Worker reconciles snapshots for verified mappings. Replay cannot increment balances or invent memberships. It holds no signing key and submits no transaction.

Application suspension and blockchain revocation are separate. The Hub allowlist mapping is not network-wide TransactionAllowList enforcement. Direct calls remain possible where contract roles/network policy permit them. Locking a membership never claims blockchain rights were revoked.

## Validation

```powershell
npm run test:auth
node node_modules/hardhat/internal/cli/cli.js test --no-compile test/Kinetix.test.ts test/SecurityHardening.test.ts test/ChainReceipt.test.ts
node node_modules/typescript/bin/tsc --noEmit
node frontend/node_modules/typescript/bin/tsc --noEmit --project frontend/tsconfig.json
npm --prefix frontend run build
```

Compile contracts first in a fresh checkout. In this restricted Windows sandbox, standard Next worker creation returned `spawn EPERM`. The verified alternative uses threads and separate output, preserving an existing dev server's build tree:

```powershell
$env:KINETIX_CONSTRAINED_BUILD = "true"
$env:KINETIX_BUILD_DIR = ".next-auth"
npm --prefix frontend run build
```

PostgreSQL acceptance uses actual HTTP cookies for activation, replay/races, expiration, manager/workspace boundaries, invitations/delegation, reset/revocation, DTO secrecy and legacy wallet protection:

```powershell
$env:TEST_DATABASE_URL = "<a separate disposable Neon database URL>"
$env:AUTH_TEST_ALLOW_RESET = "true"
npm run test:auth:integration
```

**This suite migrates and resets the dedicated test database.** It refuses an application `DATABASE_URL` match and never falls back to it. Do not target shared staging or production. Missing test configuration leaves cases visibly pending and is not an acceptance pass.

Real-device flow: Admin creates dependent → credential handoff → temporary login → password change → Core link → receipt-confirmed provisioning → dashboard → logout → password-only login on a new device → reconnect the same Core for a confirmed transaction. Also test cancellation, wrong signer/network, RPC outage, timeout and shared-device account changes. Use staging before real funds.

## Operations

Schedule retention for expired challenges/rate buckets, revoked/expired sessions and old idempotency records. Preserve audit logs under the product's chosen retention policy. Never log request bodies/cookies at the proxy. Resolve a lost one-time credential response with an explicit reset, never retained plaintext.

## Primary references

- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [ERC-4361 SIWE](https://eips.ethereum.org/EIPS/eip-4361)
- [Avalanche Transaction AllowList](https://build.avax.network/docs/avalanche-l1s/precompiles/transaction-allowlist)
