export type VaultAction = "depositToVault" | "fastWithdraw" | "requestLargeWithdrawal" | "approveWithdrawal" | "executeWithdrawalWithSignatures" | "createChore" | "claimChoreCompleted" | "verifyAndRewardChore" | "cancelChore" | "contributeRoscaRound" | "payoutRoscaRound" | "recoverMemberWallet";
export interface CapabilityInput {
  role: string;
  linked: boolean;
  allowed: boolean;
  guardian: boolean;
  beneficiary: boolean;
  active: boolean;
  paused: boolean;
  rule: number;
}
export interface Capability { allowed: boolean; reason: string | null }

/** Quyền app và quyền contract phải cùng đúng; ADMIN/CREATOR không thêm phiếu on-chain. */
export function vaultCapabilities(input: CapabilityInput): Record<VaultAction, Capability> {
  const manager = ["ADMIN", "GUARDIAN"].includes(input.role);
  const base = !input.linked ? "WALLET_NOT_LINKED" : !input.allowed ? "NOT_ALLOWLISTED" : !input.active ? "VAULT_INACTIVE" : input.paused ? "CONTRACT_PAUSED" : null;
  const permission = (ok: boolean, reason: string): Capability => ({ allowed: !base && ok, reason: base || (ok ? null : reason) });
  const guardian = manager && input.guardian;
  return {
    depositToVault: permission(input.rule !== 2, "ROSCA_REQUIRES_CONTRIBUTION"),
    fastWithdraw: permission(input.beneficiary && input.rule === 0, "SHIELD_BENEFICIARY_REQUIRED"),
    requestLargeWithdrawal: permission(input.beneficiary && [0, 3].includes(input.rule), "WITHDRAWAL_POLICY_REQUIRED"),
    approveWithdrawal: permission(guardian, "CHAIN_GUARDIAN_REQUIRED"),
    executeWithdrawalWithSignatures: permission(manager && [0, 3].includes(input.rule), "GUARDIAN_APP_ROLE_REQUIRED"),
    createChore: permission(guardian && input.rule === 1, "MILESTONE_GUARDIAN_REQUIRED"),
    claimChoreCompleted: permission(input.beneficiary && input.rule === 1, "MILESTONE_ASSIGNEE_REQUIRED"),
    verifyAndRewardChore: permission(guardian && input.rule === 1, "MILESTONE_GUARDIAN_REQUIRED"),
    cancelChore: permission(guardian && input.rule === 1, "MILESTONE_GUARDIAN_REQUIRED"),
    contributeRoscaRound: permission(input.beneficiary && input.rule === 2, "ROSCA_BENEFICIARY_REQUIRED"),
    payoutRoscaRound: permission(input.rule === 2 && (manager || input.beneficiary), "ROSCA_MEMBER_REQUIRED"),
    recoverMemberWallet: permission(guardian, "CHAIN_GUARDIAN_REQUIRED"),
  };
}
