# Kinetix Vault Creation Flow - Mobile-First & Anti-AI-Slop Specification
*Designed by Senior Product & UI/UX Specialist for Web3 Fintech*

Full specification artifacts:
- Brain Artifact: [Kinetix_Vault_Creation_Mobile_UX_Overhaul.md](file:///C:/Users/The%20Anh/.gemini/antigravity-cli/brain/adf88685-b78d-4631-a500-1b6630de0388/Kinetix_Vault_Creation_Mobile_UX_Overhaul.md)
- Design Tokens & Math: [designTokens.ts](file:///C:/TheAnhproject/Kinetix/frontend/src/components/vaults/create/designTokens.ts)

## Key Mobile Improvements (360px - 430px Viewports):

1. **Cut 60% Verbose Text (Zero AI-Slop)**:
   - Replaced multi-paragraph descriptions with 1-line taglines and compact badges.
   - Removed 3-bullet feature lists inside cards on mobile.

2. **2-Column Compact Grid for Presets**:
   - `grid-cols-2 gap-2` on mobile, ~100px height per card.
   - Clean, instant selection with single-tap quick names (`[Khẩn cấp]` `[Du lịch]` `[Tiết kiệm]`).
   - Description hidden behind progressive disclosure (`+ Thêm ghi chú riêng tư`).

3. **Combined Single Card for Liquidity & APY**:
   - Integrated dual-track slider: Sky Blue L1 vs Emerald C-Chain.
   - Replaced bulky 4-box simulator with 1-line inline return badge:
     `💡 10 AVAX: 2 AVAX rút 0s • 8 AVAX sinh lãi ~0.51 AVAX/năm`.

4. **Compact Member & Multi-sig Rows**:
   - Member cards scaled down to `p-2.5`, avatar `w-8 h-8`.
   - Threshold selector as horizontal segmented pill `[1/2]` `[2/2]`.

5. **Ergonomic Bottom Sheet Modal**:
   - Mobile: `rounded-t-3xl max-h-[92dvh]` with sticky bottom action dock.
   - Desktop: Centered card `max-w-2xl rounded-2xl`.
