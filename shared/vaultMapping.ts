export interface VaultMapping {
  onchainVaultId: number;
  onchainChainId?: number | null;
  onchainHub?: string | null;
}
export function vaultMappingIssue(
  vault: VaultMapping,
  expectedChain: number,
  workspaceHub?: string | null,
) {
  if (
    !Number.isSafeInteger(vault.onchainVaultId) ||
    vault.onchainVaultId < 1 ||
    !vault.onchainChainId ||
    !vault.onchainHub
  )
    return {
      code: "VAULT_NOT_RECONCILED",
      message:
        "Hũ này chưa có liên kết hợp đồng đã xác minh. Quản trị viên cần cấu hình đúng mạng và đăng ký hũ bằng giao dịch tạo hũ thật trước khi nạp tiền.",
    };
  if (vault.onchainChainId !== expectedChain)
    return {
      code: "VAULT_CHAIN_MISMATCH",
      message:
        "Mạng đã xác minh của hũ khác mạng giao dịch đang cấu hình. Hãy kiểm tra lại cấu hình triển khai.",
    };
  if (
    !workspaceHub ||
    vault.onchainHub.toLowerCase() !== workspaceHub.toLowerCase()
  )
    return {
      code: "VAULT_HUB_MISMATCH",
      message:
        "Hợp đồng đã xác minh của hũ khác hợp đồng trong workspace. Cần đối soát lại trước khi nạp tiền.",
    };
  return null;
}
