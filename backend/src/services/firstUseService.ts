import { and, eq, isNull } from "drizzle-orm";
import {
  db,
  vaults,
  workspaceMembers,
  users,
  userWallets,
  chores,
  auditLogs,
  workspaces,
} from "../db";
import { AuthContext, membership, requireFull } from "../auth/service";
import { assert, uuidInput } from "../auth/security";
import { workspace, visibleVaults } from "./workspaceAccess";
import { deploymentManifest, verifiedDeployment } from "./deploymentService";
import { FAMILY_HUB_ABI } from "../../../shared/abis";
import { firstUseSteps, FirstUseInput } from "../../../shared/firstUse";
import { databaseErrorCode } from "../db/errors";
import { parseAbi } from "viem";

export async function firstUseStatus(auth: AuthContext, workspaceId: string) {
  requireFull(auth);
  const { ws, member } = await workspace(auth, uuidInput(workspaceId));
  const canManageMembers =
    member.role === "ADMIN" ||
    (member.role === "GUARDIAN" && member.canManageMembers);
  const input: FirstUseInput = {
    role: member.role as FirstUseInput["role"],
    canManageMembers,
    otherMembers: 0,
    deployment: "DISABLED",
    workspace: "MISSING",
    allowlisted: null,
    vaults: 0,
    fundedVaults: 0,
    tasks: 0,
  };
  if (canManageMembers) {
    const members = await db
      .select({ id: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, ws.id),
          isNull(workspaceMembers.accessDisabledAt),
        ),
      );
    input.otherMembers = members.filter(
      (row) => row.id !== auth.user.id,
    ).length;
  }
  let asOfBlock: string | null = null;
  let deploymentVersion: string | null = null;
  let operator: string | null = null;
  let diagnosticCode: string | null = null;
  let eligibleIds: string[] = [];
  // RPC errors must not prevent password-only access to the family dashboard.
  try {
    const configured = deploymentManifest();
    deploymentVersion = configured.version;
    if (configured.enabled) {
      const { manifest, client } = await verifiedDeployment();
      const hub = manifest.contracts.hub!.address;
      operator = manifest.admin;
      input.deployment = "VERIFIED";
      input.workspace = !ws.l1HubAddress
        ? "MISSING"
        : ws.l1HubAddress.toLowerCase() === hub.toLowerCase()
          ? "MATCH"
          : "CONFLICT";
      const block = await client.getBlock({ blockTag: "finalized" });
      asOfBlock = String(block.number!);
      const read = (functionName: string, args: unknown[]) =>
        client.readContract({
          address: hub,
          abi: FAMILY_HUB_ABI,
          functionName,
          args,
          blockNumber: block.number!,
        } as any) as Promise<any>;
      input.allowlisted = auth.wallet
        ? await read("isAllowlisted", [auth.wallet.address])
        : false;
      input.paused =
        (await read("paused", [])) ||
        (await client.readContract({
          address: manifest.contracts.cashflow!.address,
          abi: parseAbi(["function paused() view returns (bool)"]),
          functionName: "paused",
          blockNumber: block.number!,
        })) === true;
      if (input.workspace === "MATCH") {
        const candidates = (await visibleVaults(auth, ws.id)).filter(
          (vault) =>
            vault.onchainHub?.toLowerCase() === hub.toLowerCase() &&
            vault.onchainChainId === manifest.chainId &&
            vault.onchainCreationTx &&
            vault.onchainCreationLogIndex !== null &&
            vault.onchainVaultId > 0,
        );
        for (const vault of candidates) {
          const state = await read("getVault", [BigInt(vault.onchainVaultId)]);
          const beneficiary = state.beneficiaries.some(
            (address: string) => address.toLowerCase() === auth.wallet?.address,
          );
          const appropriate =
            input.role === "ELDERLY"
              ? Number(state.ruleType) === 0 && beneficiary
              : input.role === "CHILD"
                ? Number(state.ruleType) === 1 && beneficiary
                : true;
          if (
            !state.isActive ||
            state.vaultId !== BigInt(vault.onchainVaultId) ||
            !appropriate
          )
            continue;
          eligibleIds.push(vault.id);
          if (state.totalBalance > 0n) input.fundedVaults++;
        }
        input.vaults = eligibleIds.length;
      }
    }
  } catch (error: any) {
    if (databaseErrorCode(error)) throw error;
    input.deployment = "UNAVAILABLE";
    input.allowlisted = null;
    input.vaults = 0;
    input.fundedVaults = 0;
    eligibleIds = [];
    diagnosticCode = /^[A-Z_]+$/.test(error?.code || "")
      ? error.code
      : "RPC_UNAVAILABLE";
  }
  if (input.role === "CHILD" && eligibleIds.length) {
    const assigned = await db
      .select({ vaultId: chores.vaultId, status: chores.status })
      .from(chores)
      .where(eq(chores.childId, auth.user.id));
    input.tasks = assigned.filter(
      (task) =>
        eligibleIds.includes(task.vaultId!) &&
        ["TODO", "SUBMITTED", "VERIFIED"].includes(task.status),
    ).length;
  }
  return {
    workspaceId: ws.id,
    role: member.role,
    canManageMembers,
    facts: input,
    steps: firstUseSteps(input),
    asOfBlock,
    checkedAt: new Date().toISOString(),
    deploymentVersion,
    operator,
    diagnosticCode,
  };
}

export async function connectFirstUseWorkspace(
  auth: AuthContext,
  workspaceId: string,
) {
  requireFull(auth);
  const id = uuidInput(workspaceId);
  const { member } = await workspace(auth, id);
  assert(
    member.role === "ADMIN",
    403,
    "Chỉ Admin của không gian được nối cấu hình.",
  );
  const { manifest } = await verifiedDeployment();
  const hub = manifest.contracts.hub!.address.toLowerCase();
  return db.transaction(async (tx) => {
    const current = await membership(tx, auth, id);
    assert(current.role === "ADMIN", 403, "Quyền Admin đã thay đổi.");
    const [ws] = await tx
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id))
      .for("update");
    assert(ws, 404, "Không tìm thấy không gian.");
    assert(
      !ws.l1HubAddress || ws.l1HubAddress.toLowerCase() === hub,
      409,
      "Không gian đang gắn với Hub khác; cần đối soát riêng.",
      "WORKSPACE_HUB_CONFLICT",
    );
    const mapped = await tx
      .select()
      .from(vaults)
      .where(eq(vaults.workspaceId, id));
    assert(
      mapped.every(
        (vault) =>
          (!vault.onchainHub || vault.onchainHub.toLowerCase() === hub) &&
          (vault.onchainChainId === null ||
            vault.onchainChainId === manifest.chainId),
      ),
      409,
      "Có hũ thuộc deployment khác. Không tự chuyển quyền hoặc tài sản.",
      "WORKSPACE_VAULT_DEPLOYMENT_CONFLICT",
    );
    if (!ws.l1HubAddress) {
      await tx
        .update(workspaces)
        .set({ l1HubAddress: hub })
        .where(eq(workspaces.id, id));
      await tx.insert(auditLogs).values({
        actorId: auth.user.id,
        workspaceId: id,
        action: "WORKSPACE_DEPLOYMENT_CONNECTED",
      });
    }
    return { workspaceId: id, hub, chainId: manifest.chainId };
  });
}

export async function firstUseVaultCandidates(
  auth: AuthContext,
  workspaceId: string,
) {
  requireFull(auth);
  const { ws, member } = await workspace(auth, uuidInput(workspaceId));
  assert(
    member.role === "ADMIN",
    403,
    "Chỉ người bảo hộ được chuẩn bị hũ.",
  );
  const { client, manifest } = await verifiedDeployment(ws.l1HubAddress);
  assert(
    ws.l1HubAddress?.toLowerCase() ===
      manifest.contracts.hub!.address.toLowerCase(),
    409,
    "Cần nối không gian với deployment trước.",
    "WORKSPACE_NOT_CONNECTED",
  );
  const block = await client.getBlock({ blockTag: "finalized" });
  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      role: workspaceMembers.role,
      address: userWallets.address,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .leftJoin(userWallets, eq(userWallets.userId, users.id))
    .where(
      and(
        eq(workspaceMembers.workspaceId, ws.id),
        isNull(workspaceMembers.accessDisabledAt),
        isNull(users.suspendedAt),
      ),
    );
  const candidates = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      allowed: row.address
        ? (await client.readContract({
            address: manifest.contracts.hub!.address,
            abi: FAMILY_HUB_ABI,
            functionName: "isAllowlisted",
            args: [row.address],
            blockNumber: block.number!,
          } as any)) === true
        : false,
    })),
  );
  return {
    candidates,
    asOfBlock: String(block.number!),
    chainId: manifest.chainId,
  };
}
