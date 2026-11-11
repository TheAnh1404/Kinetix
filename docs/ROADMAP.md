# Roadmap

This document describes proposed work. It is not a release commitment. See [STATUS.md](STATUS.md) for the current implementation.

## Testnet Acceptance

- Produce and verify fresh deployment receipts and runtime code for the reviewed source revision.
- Validate real Core wallet flows, transaction reconciliation, and recovery on supported devices.
- Complete isolated database integration validation and resolve remaining contract lint warnings.
- Review custodial treasury controls independently from contract-based vault controls.

## Experimental Infrastructure

- Implement a funded cross-chain asset adapter with settlement reconciliation and tested failure recovery before enabling ICM-backed financial flows.
- Design quorum-backed V1 membership administration and inter-vault transfers before removing their current restrictions.
- Verify L1 fee policy, precompile activation, admin custody, role changes, monitoring, and revocation procedures on an actual network.
- Investigate a real yield protocol only with a documented source of variable returns, asset and liquidity risks, and independently reviewed accounting. The reserve-funded simulation does not meet this requirement.

## Future Product Work

Passkeys, digital inheritance and dead-man's-switch policies, VietQR or other off-ramp integrations, production mobile wallet pairing, and PWA support remain proposed work. Social wallet recovery is a distinct existing mechanism and should not be described as inheritance.

## Research and Release Criteria

Historical hackathon market sizes, fraud statistics, and revenue forecasts are excluded from the public product introduction because this review has not established current primary-source evidence for them. Future research should record the source URL, reporting period, publication date, geography, assumptions, and calculation method. Estimates must be identified as estimates.

No mainnet launch is planned as an automatic consequence of passing local tests. An independent audit, remediation, verified deployment evidence, administrative governance, operational monitoring, and incident exercises are prerequisites for considering a production release.
