import { createPublicClient, http, isAddress } from "viem";
import * as dotenv from "dotenv";
import { readFileSync, existsSync } from "node:fs";
import { FAMILY_HUB_ABI } from "../shared/abis";
import { vaultMappingIssue } from "../shared/vaultMapping";

dotenv.config();

/** Chẩn đoán chỉ đọc: không import khóa ký, không gửi tx và không sửa database/.env. */
async function main() {
  let failures = 0;
  const report = (code: string, details: object, failed = false) => {
    if (failed) failures++;
    console.log(
      JSON.stringify({ status: failed ? "BLOCKED" : "INFO", code, ...details }),
    );
  };
  const expectedChainId = Number(
    process.env.HUB_CHAIN_ID || process.env.FAMILY_L1_CHAIN_ID || 99999,
  );
  const rpc = process.env.HUB_RPC_URL || process.env.FAMILY_L1_RPC_URL;
  const workspaceArg = process.argv.indexOf("--workspace");
  const workspaceId =
    workspaceArg >= 0 ? process.argv[workspaceArg + 1] : undefined;
  let hub = process.env.FAMILY_HUB_ADDRESS;
  let yieldAddress = process.env.FAMILY_YIELD_VAULT_ADDRESS;
  let mappedVaults: {
    onchainVaultId: number;
    onchainChainId: number | null;
    onchainHub: string | null;
  }[] = [];
  if (workspaceArg >= 0) {
    if (!workspaceId || !/^[0-9a-f-]{36}$/i.test(workspaceId))
      throw new Error("WORKSPACE_ARGUMENT_INVALID");
    const { db, pool, workspaces, vaults } = await import("../backend/src/db");
    const { eq } = await import("drizzle-orm");
    try {
      const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId));
      if (!workspace) throw new Error("WORKSPACE_NOT_FOUND");
      hub = workspace.l1HubAddress || undefined;
      yieldAddress = workspace.cchainVaultAddress || undefined;
      mappedVaults = await db
        .select()
        .from(vaults)
        .where(eq(vaults.workspaceId, workspaceId));
      for (const vault of mappedVaults) {
        const issue = vaultMappingIssue(vault, expectedChainId, hub);
        report(
          issue?.code || "VAULT_MAPPING_PRESENT",
          {
            onchainVaultId: vault.onchainVaultId,
            chainId: vault.onchainChainId,
            hub: vault.onchainHub,
          },
          !!issue,
        );
      }
    } finally {
      await pool.end();
    }
  }
  const frontendFile = "frontend/.env.local";
  if (existsSync(frontendFile)) {
    const env = dotenv.parse(readFileSync(frontendFile));
    const frontendChainId = Number(
      env.NEXT_PUBLIC_HUB_CHAIN_ID ||
        env.NEXT_PUBLIC_FAMILY_L1_CHAIN_ID ||
        99999,
    );
    report(
      "CHAIN_CONFIGURATION",
      {
        backend: expectedChainId,
        frontend: frontendChainId,
        explicitBackendHubChain: !!process.env.HUB_CHAIN_ID,
        explicitFrontendHubChain: !!env.NEXT_PUBLIC_HUB_CHAIN_ID,
      },
      expectedChainId !== frontendChainId,
    );
  }
  if (!rpc) {
    report("HUB_RPC_MISSING", {}, true);
    process.exitCode = 1;
    return;
  }
  const client = createPublicClient({
    transport: http(rpc, { timeout: 5000, retryCount: 0 }),
  });
  try {
    const actual = await client.getChainId();
    report(
      "RPC_CHAIN",
      { expected: expectedChainId, actual },
      actual !== expectedChainId,
    );
    if (actual !== expectedChainId) {
      process.exitCode = 1;
      return;
    }
    if (!hub || !isAddress(hub)) report("HUB_ADDRESS_INVALID", {}, true);
    else {
      const code = await client.getBytecode({ address: hub });
      report(
        "HUB_BYTECODE",
        { address: hub, bytes: code ? (code.length - 2) / 2 : 0 },
        !code || code === "0x",
      );
      if (code && code !== "0x") {
        for (const functionName of [
          "familyAdmin",
          "vaultCounter",
          "trustedForwarder",
          "vaultCashflow",
        ] as const) {
          try {
            const value = await client.readContract({
              address: hub,
              abi: FAMILY_HUB_ABI,
              functionName,
            } as any);
            report("HUB_INTERFACE", { functionName, value: String(value) });
          } catch {
            report("HUB_INTERFACE_MISMATCH", { functionName }, true);
          }
        }
        for (const vault of mappedVaults.filter(
          (vault) => !vaultMappingIssue(vault, expectedChainId, hub),
        )) {
          try {
            const state: any = await client.readContract({
              address: hub,
              abi: FAMILY_HUB_ABI,
              functionName: "getVault",
              args: [BigInt(vault.onchainVaultId)],
            } as any);
            report(
              "VAULT_CHAIN_STATE",
              {
                vaultId: vault.onchainVaultId,
                active: state.isActive,
                returnedId: String(state.vaultId),
              },
              !state.isActive || state.vaultId !== BigInt(vault.onchainVaultId),
            );
          } catch {
            report(
              "VAULT_CHAIN_READ_FAILED",
              { vaultId: vault.onchainVaultId },
              true,
            );
          }
        }
      }
    }
    report("YIELD_DEPLOYMENT_SCOPE", {
      address: yieldAddress || null,
      note: "YieldVault phải được kiểm trên RPC C-Chain của manifest, không suy từ Hub RPC.",
    });
  } catch {
    report("HUB_RPC_UNREACHABLE", { expectedChainId }, true);
  }
  report(
    "SUMMARY",
    {
      failures,
      note: "Không lỗi cấu hình không đồng nghĩa contract đã được audit hoặc bridge đã nghiệm thu.",
    },
    false,
  );
  if (failures) process.exitCode = 1;
}
main().catch((error) => {
  console.error(
    JSON.stringify({
      status: "BLOCKED",
      code: /^[A-Z_]+$/.test(error.message)
        ? error.message
        : "DIAGNOSTIC_FAILED",
    }),
  );
  process.exitCode = 1;
});
