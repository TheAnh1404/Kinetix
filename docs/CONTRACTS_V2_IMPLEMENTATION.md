# Contracts V2 — implementation plan

Scope: new, versioned native-AVAX contracts for operating and goal funds. Existing T1/V1 deployments, enums, ABIs and application adapters stay unchanged. Follow PRODUCT_DIRECTION and GROUP_FINANCE_SPEC.

## Decisions

- Factory atomically initializes isolated immutable EIP-1167 funds; no factory owner can withdraw or edit funds.
- Explicit fund permissions: propose expenses, approve, limited spending. Creator/workspace owner has no implicit rights.
- At least two approvers; quorum must be positive and strictly below approver count, retaining enough independent votes for any single recipient. A recipient never approves their payment.
- Expenses reserve available native funds, have fixed recipient/amount/hash/expiry and policy epoch. Anyone executes after quorum; proposer cancels, an independent approver rejects, anyone cleans expired/invalidated requests.
- Limited spending applies only to operating funds, with per-transaction, per-member UTC-day and whole-fund UTC-day caps. Spending cannot consume reservations.
- Full membership/policy replacement uses old approver quorum, a 24-hour execution delay and a seven-day lifetime. Applying it increments epoch and invalidates old expense/governance approvals; obsolete reservations are released in O(1), with effective status exposed to indexers. Daily spending is not reset by reconfiguration.
- Emergency pause/resume needs approver quorum without a delay; pause blocks deposits and outflows but not governance, cancellation or cleanup. Closure requires zero accounted balance and no active reservations, quorum and delay.
- Goal target/deadline are immutable. Deposits stop at deadline; reaching the target latches success. No spending before success. If the deadline passes without success, contributors can reclaim exactly their own deposits, with no quorum or third-party recipient. Operating contributions do not create automatic refund/share rights.
- Plain transfers revert. Forced native surplus remains separate from accounted balances and can only be paid through recipient-independent quorum plus delay. No generic external calls, token approvals, ERC20, yield, cross-chain or delegated signing in V2.
- Policy/terms hashes are commitments, not privacy or truth guarantees. No private descriptions on-chain.

## Work and verification

1. Implement typed interface, fund and factory; lock implementation initialization.
2. Add hostile receiver fixtures and tests for permissions, reservations, governance/epoch changes, limits, goal refunds, failed/reentrant recipients, isolation and forced surplus.
3. Compile and inspect deployed bytecode sizes; run targeted and legacy contract regressions, root typecheck, lint and documentation checks.
4. Export a separate V2 ABI artifact, provide a deployment script and integration/custody reference. Local deployment rehearsal only; do not activate a public manifest or move user funds.

Implementation and API details are recorded in [CONTRACTS_V2.md](CONTRACTS_V2.md). Independent audit, real-wallet acceptance and public deployment remain separate work.

## Implementation results — 2026-11-15

- Added `IKinetixFundV2`, `KinetixFundV2`, `KinetixFundFactoryV2`, hostile/native-surplus test fixtures and `test/KinetixFundV2.test.ts`.
- Exported V2 ABIs alongside existing ABI exports; no existing selectors/enums or deployment manifest were changed.
- Added `scripts/deploy-fund-v2.ts`, restricted to local/Fuji networks and producing a separate disabled deployment record. No public deployment performed.
- `npm run compile`: passed, Solidity 0.8.26 / Cancun / optimizer + viaIR. Compiler warns about SELFDESTRUCT in the forced-native test fixture only; the production fund/factory do not use it.
- Targeted contract/policy regression run: **114 passing, 0 failing**, including **33 V2 tests**. The invariant test exercises 72 deterministic mixed actions and checks both asset conservation and active reservations. The run includes V1, T1, security, signatures/recovery, policy, wiring and deployment-boundary suites; it is not the full database integration suite.
- Root, frontend and backend TypeScript checks: passed. A receiver test helper getter initially collided with ethers `BaseContract.target`; it was renamed to `targetFund` and generated types were rebuilt before these checks passed.
- Targeted Solidity lint: **0 errors, 93 warnings** (documentation/style/gas suggestions, state-count warning and test-fixture warnings). These are outstanding lint debt, not an audit result.
- Deployed runtime sizes: fund **12,322 bytes**, factory **1,250 bytes**, both below the 24,576-byte EIP-170 limit.
- Local deployment rehearsal passed via `node -r ts-node/register scripts/deploy-fund-v2.ts`; the standard `hardhat run` wrapper encountered sandbox `spawn EPERM`. The disabled Hardhat record is a disposable local artifact, not public-chain evidence.
- `npm run docs:check` and `git diff --check`: passed. No database migrations, asset transfers, public manifest activation or mainnet deployment.

## Integration remaining

Backend/indexer must add the V2 adapter, reconcile policy epochs and finalized receipts, preserve transaction intents for retries, and keep contribution obligations separate from deposits. Frontend must display exact quorum/terms, goal refund conditions, UTC-day limits and mobile-wallet status. Existing adapters remain on their current contract generation until deliberately migrated. No real-device or independent audit acceptance is claimed by the contract test run.
