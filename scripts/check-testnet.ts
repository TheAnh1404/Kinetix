import "dotenv/config";
import { verifiedDeployment } from "../backend/src/services/deploymentService";
import { vaultMappingIssue } from "../shared/vaultMapping";
import { FAMILY_HUB_ABI } from "../shared/abis";
import { parseEventLogs } from "viem";

/** Chỉ đọc: không khóa ký, không sửa DB/env và không dựng số liệu khi RPC lỗi. */
async function main() {
  const { manifest, client, chainId } = await verifiedDeployment();
  const hub = manifest.contracts.hub!.address;
  console.log(
    JSON.stringify({
      status: "VERIFIED",
      chainId,
      version: manifest.version,
      hub,
      features: manifest.features,
    }),
  );
  const index = process.argv.indexOf("--workspace");
  if (index < 0) return;
  const workspaceId = process.argv[index + 1];
  if (!/^[0-9a-f-]{36}$/i.test(workspaceId || ""))
    throw new Error("WORKSPACE_ARGUMENT_INVALID");
  const { db, pool, workspaces, vaults } = await import("../backend/src/db");
  const { eq } = await import("drizzle-orm");
  try {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId));
    if (
      !workspace ||
      workspace.l1HubAddress?.toLowerCase() !== hub.toLowerCase()
    )
      throw new Error("WORKSPACE_DEPLOYMENT_MISMATCH");
    const rows = await db
      .select()
      .from(vaults)
      .where(eq(vaults.workspaceId, workspaceId));
    let blocked = 0;
    for (const vault of rows) {
      let code = vaultMappingIssue(vault, chainId, hub)?.code;
      if (!code) {
        const state: any = await client.readContract({
          address: hub,
          abi: FAMILY_HUB_ABI,
          functionName: "getVault",
          args: [BigInt(vault.onchainVaultId)],
        });
        const receipt = await client.getTransactionReceipt({
          hash: vault.onchainCreationTx as `0x${string}`,
        });
        const events: any[] = parseEventLogs({
          abi: FAMILY_HUB_ABI,
          eventName: "VaultCreated",
          strict: true,
          logs: receipt.logs.filter(
            (log) =>
              log.address.toLowerCase() === hub.toLowerCase() &&
              log.logIndex === vault.onchainCreationLogIndex,
          ),
        });
        if (
          receipt.status !== "success" ||
          events.length !== 1 ||
          events[0].args.vaultId !== BigInt(vault.onchainVaultId) ||
          !state.isActive ||
          ["SHIELD", "MILESTONE", "ROSCA", "SHARED_GOAL"][
            Number(state.ruleType)
          ] !== vault.ruleTemplate
        )
          code = "VAULT_RECEIPT_POLICY_MISMATCH";
      }
      if (code) blocked++;
      console.log(
        JSON.stringify({
          status: code ? "BLOCKED" : "VERIFIED",
          vaultId: vault.id,
          onchainVaultId: vault.onchainVaultId,
          code: code || "VAULT_EVIDENCE_VERIFIED",
        }),
      );
    }
    console.log(JSON.stringify({ vaults: rows.length, blocked }));
    if (blocked) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
main().catch((error) => {
  console.error(
    JSON.stringify({
      status: "BLOCKED",
      code:
        error?.code ||
        (error?.message?.match(/^[A-Z_]+$/)
          ? error.message
          : "DOCTOR_UNAVAILABLE"),
      message: error?.status
        ? error.message
        : "Không xác minh được cấu hình/RPC/database. Không có dữ liệu nào được sửa.",
    }),
  );
  process.exitCode = 1;
});
