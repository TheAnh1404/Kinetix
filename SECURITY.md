# Security Policy

Kinetix is experimental software intended for local development and testnet validation. The contracts have not undergone an independent security audit. There is no supported mainnet release.

## Reporting a Vulnerability

Use the repository's **Security → Report a vulnerability** option if private vulnerability reporting is enabled. Otherwise, contact the maintainer through an established private channel before sharing technical details. Do not publish exploit instructions, private keys, connection strings, personal data, or account tokens in public issues or pull requests.

A useful private report includes the affected revision and component, the required permissions, a minimal reproduction using local fixtures, expected and actual behavior, and the potential impact. No response-time commitment or bug bounty is currently established.

## Security Boundaries

- PIN, address-only, and legacy family login endpoints are retired. Password login uses Argon2id and database-backed limits of 10 attempts per account and 30 per client IP in a 15-minute window. These are temporary throttles, not permanent account lockouts.
- Application sessions do not grant signing authority. Financial actions require the linked wallet and applicable contract or treasury policy.
- A withdrawal recipient cannot count as its own approving guardian. Duplicate approvals, expired withdrawal requests, and stale membership epochs are rejected by the relevant contract paths.
- Guardian recovery is a trust-based quorum mechanism. A colluding or compromised quorum can replace a member's wallet. The application also requires a signed replacement-wallet proof; direct contract calls remain governed by the on-chain quorum. Recovery is not inheritance or a dead-man's switch.
- The Hub's application allowlist and an L1's Transaction AllowList are separate controls. A zero-fee L1 requires independently verified network configuration and administration; Fuji transactions incur network fees.
- Cross-chain execution and yield are disabled in the T1 manifest. Experimental messaging and reserve-funded accrual are not production asset-transfer or DeFi integrations.
- The shared Core treasury is custodial: its wallet holder controls the assets. Application approval records do not turn that wallet into an on-chain multisig.

## Deployment and Administration

For each new deployment or source version, keep its manifest entry disabled until deployment receipts, runtime bytecode, source revision, chain identity, and contract wiring have been verified. Existing T1 evidence is recorded in docs/FUJI_DEPLOYMENT.md; this policy does not claim it is currently disabled. Never substitute Hardhat fixtures for deployment evidence. Source changes require a fresh deployment and evidence; changing source code does not patch an existing contract or clone.

Before enabling an L1, document the genesis or upgrade configuration, precompile admin and manager roles, key custody, role-change monitoring, revocation procedures, relayer permissions, and recovery exercises. Use appropriately governed administrative accounts and keep operational keys separate from application services. A Hub allowlist entry alone does not prove network-level authorization.

For cross-chain work, independently track message delivery, application execution, and actual asset settlement. Delivery does not imply successful execution. Require authenticated origins, retry monitoring, idempotency, failure reconciliation, and tested liquidity recovery before activation. See [architecture](docs/ARCHITECTURE.md).

## Secrets and Test Data

Keep real environment files and credentials out of version control. If a credential has been published, revoke or rotate it; editing documentation does not remove exposure from Git history. Public development keys must never control real assets. Contract addresses are public identifiers, but an address alone is not deployment evidence.

Database integration tests can reset records. Use a disposable test database distinct from the application database, with the explicit test-reset opt-in. See [contributing](CONTRIBUTING.md).

## Group Finance Transition

The [target group-finance specification](docs/GROUP_FINANCE_SPEC.md) does not grant new permissions to existing users. Group administration, contribution, approval, payment execution, and policy changes have separate authority. Age, relationship labels, workspace ownership, and deposited amounts must not be used as implicit signing rights. Validate independent quorum and transition rules before enabling a migrated fund.

Mobile confirmation must retain exact asset, amount, recipient, source fund, network, and fee information. Returning from a wallet, reconnecting, or retrying must reconcile the existing request before submitting again. Financial completion requires verified evidence, not a UI success message. See the [mobile standard](docs/MOBILE_UX_STANDARD.md).
