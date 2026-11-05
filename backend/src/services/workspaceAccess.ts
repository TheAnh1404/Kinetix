import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { vaultMembers, vaults, workspaces } from "../db/schema";
import { AuthContext, membership } from "../auth/service";
import { assert, uuidInput } from "../auth/security";
import { hubClient } from "./chainService";
import { vaultMappingIssue } from "../../../shared/vaultMapping";
import { verifiedDeployment } from "./deploymentService";
import { FAMILY_HUB_ABI } from "../../../shared/abis";
import { vaultCapabilities } from "../../../shared/vaultCapabilities";

export async function workspace(auth: AuthContext, id: string) {
  const member = await membership(db, auth, uuidInput(id));
  const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, id));
  assert(ws, 404, "Không tìm thấy không gian.");
  return { ws, member };
}
export async function visibleVaults(auth: AuthContext, workspaceId: string) {
  const { member } = await workspace(auth, workspaceId);
  const rows = await db
    .select()
    .from(vaults)
    .where(eq(vaults.workspaceId, workspaceId));
  if (member.role === "ADMIN") return rows;
  const links = await db
    .select({ vaultId: vaultMembers.vaultId })
    .from(vaultMembers)
    .where(eq(vaultMembers.userId, auth.user.id));
  return rows.filter((row) => links.some((link) => link.vaultId === row.id));
}
export async function reviewerVaultIds(auth: AuthContext) {
  const links = await db
    .select({ vaultId: vaultMembers.vaultId })
    .from(vaultMembers)
    .where(
      and(
        eq(vaultMembers.userId, auth.user.id),
        eq(vaultMembers.vaultRole, "GUARDIAN"),
      ),
    );
  return links.map((link) => link.vaultId);
}
export async function vaultAccess(
  auth: AuthContext,
  id: string,
  financial = false,
) {
  const [vault] = await db
    .select()
    .from(vaults)
    .where(eq(vaults.id, uuidInput(id)));
  assert(vault, 404, "Không tìm thấy hũ.");
  const { ws, member } = await workspace(auth, vault.workspaceId);
  const [link] = await db
      .select()
      .from(vaultMembers)
      .where(
        and(
          eq(vaultMembers.vaultId, vault.id),
          eq(vaultMembers.userId, auth.user.id),
        ),
      );
  assert(member.role === "ADMIN" || link, 403, "Bạn không có quyền trên hũ này.");
  let canApprove = ["ADMIN", "GUARDIAN"].includes(member.role) && link?.vaultRole === "GUARDIAN";
  const canReview = member.role === "ADMIN" || canApprove;
  let capabilities: ReturnType<typeof vaultCapabilities> | null = null;
  let chainState: any = null;
  let asOfBlock: string | null = null;
  if (financial) {
    const issue = vaultMappingIssue(
      vault,
      hubClient().chainId,
      ws.l1HubAddress,
    );
    assert(
      !issue,
      409,
      issue?.message || "Hũ chưa được đối soát.",
      issue?.code,
    );
    const { client, manifest } = await verifiedDeployment(ws.l1HubAddress);
    const block = await client.getBlock({ blockTag: "finalized" });
    const read = (functionName: string, args: unknown[] = []) => client.readContract({ address: manifest.contracts.hub!.address, abi: FAMILY_HUB_ABI, functionName, args, blockNumber: block.number! } as any);
    const [state, allowed, paused]: any[] = await Promise.all([
      read("getVault", [BigInt(vault.onchainVaultId)]),
      auth.wallet ? read("isAllowlisted", [auth.wallet.address]) : false,
      read("paused"),
    ]);
    chainState = state;
    asOfBlock = String(block.number);
    capabilities = vaultCapabilities({ role: member.role, linked: !!auth.wallet, allowed: allowed === true, paused: paused === true, active: state.isActive, rule: Number(state.ruleType), guardian: state.guardians.some((address: string) => address.toLowerCase() === auth.wallet?.address.toLowerCase()), beneficiary: state.beneficiaries.some((address: string) => address.toLowerCase() === auth.wallet?.address.toLowerCase()) });
    canApprove = capabilities.approveWithdrawal.allowed;
    assert(
      state.isActive &&
        state.vaultId === BigInt(vault.onchainVaultId) &&
        ["SHIELD", "MILESTONE", "ROSCA", "SHARED_GOAL"][
          Number(state.ruleType)
        ] === vault.ruleTemplate,
      409,
      "Thông tin hũ khác contract; cần đối soát lại.",
      "VAULT_POLICY_MISMATCH",
    );
  }
  return { vault, ws, member, canApprove, canReview, capabilities, chainState, asOfBlock };
}
