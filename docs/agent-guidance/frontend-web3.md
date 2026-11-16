---
description: "Phone-first Kinetix UI and transaction integration"
trigger: glob
globs: "frontend/**"
---

# Frontend and Web3 rules

Follow [mobile UX](../../docs/MOBILE_UX_STANDARD.md), [acceptance](../../docs/MOBILE_ACCEPTANCE.md) and [target specification](../../docs/GROUP_FINANCE_SPEC.md). Keep actual repository framework versions and BFF boundaries; generic examples do not mandate upgrades.

- Design from 360px, verify at 320px without page overflow. Use one column for primary phone tasks.
- All essential operations work on phones, including administration, settings and reports. No hover-only controls or extension-only signing assumptions.
- One primary task and CTA per task screen; disclose secondary details progressively. Body/input around 16px, secondary labels around 14px, touch areas at least 44px.
- Handle safe areas, dynamic viewport, virtual keyboards and sticky-footer clearance. Pages for long forms, sheets for short choices, one modal layer.
- Task-based navigation and fund-scoped capabilities. Role previews and group presets never grant authority.
- Prioritize available funds, pending tasks and recent activity. Avoid repetitive cards, marketing copy, decorative badges and unsupported guarantees.
- Show exact asset, amount, recipient, fund, network and fee before signing. Parse bigint units; never sign rounded display values.
- Use actual T1/V1/treasury adapter capabilities. Do not assume calls share the same vault ID/address interface.
- Separate approval, signing, submission, finality and reconciliation. Reconcile timeouts before retry; preserve drafts and request identity across app switches/reload.
- Include loading, empty, permission, stale-data and recoverable errors. Unloaded balance is not zero; approval is not payment.
- Keep private evidence out of URLs, chain memos, public storage and analytics.
- Record phone screenshots and actual supported wallet results; list untested environments.

Do not restore L1/yield sliders, fixed APY promises or age-based portals from superseded plans. Preserve legacy funds through verified adapters until migration.
