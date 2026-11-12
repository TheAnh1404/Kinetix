# Kinetix Vault Creation Flow - UX & Visual Architecture Specification
*Designed by Senior Product & UI/UX Specialist for Web3 Fintech*

Please refer to the full specification and interactive guide:
- Brain Artifact: [Kinetix_Vault_Creation_UX_Architecture.md](file:///C:/Users/The%20Anh/.gemini/antigravity-cli/brain/adf88685-b78d-4631-a500-1b6630de0388/Kinetix_Vault_Creation_UX_Architecture.md)
- Design Tokens & Math: [designTokens.ts](file:///C:/TheAnhproject/Kinetix/frontend/src/components/vaults/create/designTokens.ts)

## Key Highlights

1. **4 High-Impact Presets**:
   - `SHIELD`: Quỹ Khẩn Cấp & Trợ Cấp (20% L1 0 gas instant withdraw, 80% C-Chain 8% APY, 1/1 fast limit, M/N large).
   - `SHARED_GOAL`: Quỹ Mục Tiêu Chung (10% L1, 90% C-Chain, M/N multisig when goal reached).
   - `MILESTONE`: Quỹ Thưởng Nhiệm Vụ (Chore-to-Earn, funds locked yielding 8%, parent approves proof).
   - `ROSCA`: Quỹ Họ / Hụi Xoay Vòng Thông Minh (100% C-Chain yield, periodic contributions, rotating payout).

2. **Dual-Chain Liquidity & APY Visualizer**:
   - Dual-track visual slider: L1 Buffer (Sky Blue) vs Fuji C-Chain (Emerald Green).
   - Real-time Effective APY calculator: $8\% \times (1 - \text{bufferRatioBps} / 10000)$.
   - Quick preset pills: [Tối đa lãi: 0/100] [Chuẩn DeFi: 10/90] [Khẩn cấp: 20/80] [Linh hoạt: 30/70].

3. **Guardian Multi-sig Selector**:
   - SafeAvatar member chips with roles & connection status.
   - Segmented M/N approval threshold pills (e.g. "1/2 Bất kỳ ai duyệt", "2/2 Đồng thuận", "Đa số quá bán").

4. **Zero AI Slop**:
   - Dark slate palette (`#0B0F19`, `#111827`, `#1E293B`) + emerald yield accents (`#10B981`).
   - Strict 4/8dp rhythm, WCAG 2.1 AA compliant.
   - Human-centric Vietnamese financial microcopy (MoMo / Revolut / Safe mental model).
