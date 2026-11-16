---
name: kinetix-builder
description: >-
  Develop Kinetix shared-group finance across contracts, backend and complete phone
  workflows while preserving custody, compatibility and deployment boundaries.
---

# Kinetix development workflow

Read repository instructions (`AGENTS.md`), direction (`docs/PRODUCT_DIRECTION.md`), target specification (`docs/GROUP_FINANCE_SPEC.md`), status (`docs/STATUS.md`) and architecture (`docs/ARCHITECTURE.md`). Project requirements override generic examples and historical hackathon plans.

## Scope and contracts

Identify actual T1/V1/treasury custody and capabilities. Prioritize operating/goal funds for adult-group pilots. Specify contribution/refund terms, authority, quorum, limits, policy changes and accounting. Review reuse first, preserve ABI/enums and plan explicit deployment/migration where needed. No mandatory dual-chain, fixed yield, age-based rights or free-gas claims.

## Backend and data

Separate organizational and financial permissions. Model contribution obligations, receipts, expense approval and payment independently. Specify isolation, private evidence, idempotency, finality/reorg handling and reconciliation. Dry-run additive migrations on isolated data; never grant financial rights solely through legacy role renaming.

## Phone interface and integration

Follow mobile standard (`docs/MOBILE_UX_STANDARD.md`) and acceptance (`docs/MOBILE_ACCEPTANCE.md`). Build complete phone tasks with concise copy, readable controls, keyboard/safe-area handling, wallet app switching and resumable status. Use current API/adapter boundaries. Independent UI work may proceed with explicit mock labels while contracts/backend are in development.

## Acceptance and handover

Run relevant financial, authorization and recovery checks. Record screenshots and actual device/browser/wallet results; identify untested environments. Update current specs without rewriting dated evidence. Code does not upgrade deployments; local tests do not establish mainnet safety. Do not rebuild unrelated phases for focused fixes.
