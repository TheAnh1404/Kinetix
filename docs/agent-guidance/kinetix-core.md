---
description: "Kinetix shared funds: product scope and authority"
trigger: always_on
---

# Kinetix core rules

Read [product direction](../../docs/PRODUCT_DIRECTION.md), [target specification](../../docs/GROUP_FINANCE_SPEC.md), [current status](../../docs/STATUS.md) and [architecture](../../docs/ARCHITECTURE.md).

Kinetix serves clubs, communities, friends, siblings and families sharing money. Prioritize operating/goal funds and complete phone workflows. Group type is a setup preset, not a permission model. Age and relationships do not grant authority.

Separate workspace administration, contribution, expense proposal, approval, payment execution and policy changes. Verify financial authority against the actual contract or custody adapter. Database approvals do not create on-chain multisig. Deposits do not implicitly grant shares, votes or refunds.

T1 uses native AVAX on Fuji with ERC20, yield, cross-chain and relaying disabled. V1 clones and Core treasury are distinct paths. Do not infer zero-fee L1, passkeys, bridging or live yield from historical plans. Verify the manifest and deployment evidence.

Preserve enums, ABIs, routes and balances until an explicit migration is implemented. Source edits do not upgrade contracts. Do not move assets or change permissions merely to align naming.

Follow [mobile UX](../../docs/MOBILE_UX_STANDARD.md) and [acceptance](../../docs/MOBILE_ACCEPTANCE.md). UI work can proceed against explicit API contracts; unrelated contract changes are not prerequisites. Use comments for non-obvious business/security logic. Distinguish target behavior, implemented behavior and dated evidence.
