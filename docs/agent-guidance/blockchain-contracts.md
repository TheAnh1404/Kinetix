---
description: "Kinetix custody, policy and contract verification"
trigger: glob
globs: "contracts/**"
---

# Contract development rules

Follow [target specification](../../docs/GROUP_FINANCE_SPEC.md) and [custody boundaries](../../docs/ARCHITECTURE.md). Use the configured compiler (currently 0.8.26), compatible pragmas and repository OpenZeppelin version. Preserve NatSpec and four-space formatting; prefer custom errors for appropriate failure paths.

Separate group membership and financial rights. Validate fund-scoped authority, independent quorum, recipient self-approval exclusion, signer uniqueness, policy context and expiry. Define proposal/approval/execution/cancellation/recovery rights. Workspace admin is not implicit authority over pooled assets.

T1, V1 clones and custodial treasury are separate paths. Review reuse before new contracts. Preserve public selectors, enum order and storage compatibility. Source edits do not upgrade immutable deployments; document explicit versioning and migration.

Isolate balances and reservations, avoid double-counting obligations, and fix asset/amount/recipient/expiry/policy before approval. Changes require reapproval. Release reservations once; reject replay and duplicate execution. Use CEI, reentrancy protection and narrow emergency controls. Events support history; private evidence stays off-chain. Avoid unbounded operational loops.

T1 supports AVAX on Fuji with fees. Yield, cross-chain, stablecoin and free-gas assumptions require separate reviewed implementations; historical dual-chain plans do not authorize them.

Test cross-fund authority, independent quorum, stale epochs, policy changes, cumulative limits, reservation races, expiry/cancellation, failed recipients and execution replay. Preserve regressions for legacy modules. Compile/test/lint affected code, export changed ABIs, and verify receipts, source identity, runtime bytecode and wiring before activating a new manifest entry.
