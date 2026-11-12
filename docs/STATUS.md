# Project Status

Code review snapshot: **2026-11-11**. Fuji contract deployment updated on **2026-11-12**. Contract deployment evidence does not establish public frontend hosting or an independent audit.

## Deployment and Assets

The checked-in `shared/deployment.json` is now `verified` with `enabled: true`. FamilyHub, VaultCashflow, and KinetixForwarder were deployed on Avalanche Fuji, chain ID 43113, with native AVAX T1 settings. All three creation receipts and two wiring receipts were finalized; exact transaction inputs, compiled runtime code, source identity, admin/controller permissions, and wiring were verified before activation. See [addresses and transaction evidence](FUJI_DEPLOYMENT.md).

The dedicated deployment administrator is recorded in the manifest. Its signing key remains in the ignored local environment file. Existing workspaces and legacy vaults were not silently reassigned. Hardhat uses a separate local EVM; its fixture addresses do not establish a Fuji deployment.

ERC20/USDC, cross-chain transfers, yield, and sponsored relaying are disabled in T1. Fuji network fees apply. Experimental dual-chain deployment/wiring scripts are not the acceptance path for an enabled T1 deployment.

## Implementation Matrix

| Area | Reviewed state | Remaining boundary |
| --- | --- | --- |
| Accounts and wallet ownership | Password authentication, signed wallet proofs, scoped sessions, account/IP rate limits; legacy PIN endpoints return 410 | Passkeys are not implemented; signing still requires the correct wallet. |
| Workspaces and vault policies | Role-based application services and local regression coverage for four financial models | Real contract transactions require fresh, verified deployment evidence. |
| SHIELD approvals | Independent approving guardians, duplicate-vote protection, expiry, and membership-epoch checks | A 48-hour expiration window is not a mandatory delay or timelock. Overlapping roles can reduce the available independent quorum. |
| Wallet recovery | Guardian quorum, identity replacement, epoch invalidation, and application replacement-wallet proof | A compromised quorum remains trusted to replace a wallet; this is not inheritance. |
| Native accounting | Receipt/event reconciliation, task reward reservations, and local principal accounting | ROSCA does not offer automatic cancellation/refunds when a participant stops contributing. |
| Vault V1 | Experimental clone implementation with additional policy regressions | Unilateral member edits and direct transfers are disabled when more than one approval is required; full quorum-backed workflows remain planned. |
| Shared Core treasury | Separate custodial workflow with receipt reconciliation | The wallet holder controls the assets; application votes are not an on-chain multisig. |
| Yield | Standalone operator-funded simulation with reserve checks | Hypothetical 8% simple annual accrual, no external yield protocol, disabled in T1. |
| Cross-chain | Experimental configuration, authenticated receiver checks, and local mocks | No accepted asset bridge, production retry/settlement workflow, or end-to-end relayer validation. |
| Family L1 and zero fees | Configurable research direction | No verified active L1 genesis, precompile administration, or zero-fee network evidence. |
| Inheritance, VietQR, passkeys, PWA | Roadmap | Not advertised as implemented features. |

## Changes from This Review

- Replaced the old mixed product pitch and operational README with a concise English introduction and links to current references. Removed credentials, deployment-address examples, unsupported market figures, fixed test badges, and unverified promotional links.
- Corrected current UI copy about yield, automatic bridging, PIN/passkey support, zero gas, and security guarantees. The simulator is explicitly hypothetical and reserve-funded.
- Blocked self-benefiting withdrawal approvals through FamilyHub's direct and EIP-712 paths, and stopped V1 recipients from approving their own payments.
- Fixed V1 shared-goal checks on both execution paths, removed reservation double-counting, enforced request expiry, and blocked generic spending paths that bypass task/ROSCA policies.
- Blocked unilateral V1 administration/direct transfers for multi-approval vaults and invalidated withdrawal authorizations on beneficiary membership changes.
- Added ten security regression tests, synchronized application ABIs, added MIT licensing and contribution/security policies, and added issue/PR templates.
- Extended existing CI with current-document checks, root typechecking, ABI consistency checks, and an isolated PostgreSQL integration job. Historical notes are marked and indexed rather than silently treated as current specifications.

## Validation Snapshot

Environment: Windows, Node.js 24.19.0, local Hardhat network, and a newly initialized, loopback-only PostgreSQL 18 instance with a disposable test database. The application database was not used. Counts below are a dated snapshot and should be regenerated after changes.

| Check | Result |
| --- | --- |
| `npm run compile` | Passed; compiler 0.8.26, Cancun EVM target. |
| `npm test`, without test database | **307 passing, 20 pending, 0 failing**. Pending tests require an isolated database. |
| Full `npm test` with isolated PostgreSQL and test-only transport | **327 passing, 0 pending, 0 failing**. Includes the ten new security regressions. |
| Root, backend, and frontend typechecks | Passed. |
| Frontend production build | Passed with `KINETIX_CONSTRAINED_BUILD=true`. |
| `npm run sol:lint` | Passed exit status; **0 errors, 671 warnings**. Warnings remain technical debt. |

For the full local database run, configure an isolated `TEST_DATABASE_URL`, set `AUTH_TEST_ALLOW_RESET=true` and `FORBID_PENDING_TESTS=true`, and preload `scripts/local-postgres-transport.cjs` through `NODE_OPTIONS` before running `npm test`. The adapter accepts only loopback PostgreSQL and refuses application-database aliases. Credentials and local connection values are intentionally omitted here. The disposable review server was stopped after validation.

CI has been updated but was not executed on GitHub during this review. The local PostgreSQL run used version 18; CI provisions version 16, so that runner remains a separate validation step. Docker smoke tests, real-device wallet/accessibility tests, public application hosting verification, and independent audit remain outstanding. Fuji contract deployment and RPC verification were completed on 2026-11-12; see the deployment evidence linked above.

## External Information

The previous pitch video, pitch deck, and advertised public website could not be verified using the web tool. They are omitted rather than described as confirmed live links or confirmed 404s. Market and revenue claims are excluded until supported by current primary sources. See [roadmap](ROADMAP.md) for research requirements.

GitHub About description, topics, website, and private reporting settings have not been changed by these local edits. The environment has no installed authenticated GitHub CLI or connected GitHub administration tool; the computer-use tool also refused access to Chrome because the app was not approved for control. Suggested values and an application command are documented in [repository metadata](REPOSITORY_METADATA.md).

Untracked components appeared concurrently in `frontend/src/components/landing/`. They were not created or modified by this review and are outside its implementation scope.

## Release Gate

Keep contract functionality on local/test networks. Source changes do not upgrade existing deployments or immutable clones. Redeploy the reviewed sources, verify receipts and runtime code, complete operational acceptance, and obtain an independent audit before considering a mainnet release. See [SECURITY.md](../SECURITY.md) and [ARCHITECTURE.md](ARCHITECTURE.md).
