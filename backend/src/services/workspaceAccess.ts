import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { vaultMembers, vaults, workspaces } from "../db/schema";
import { AuthContext, membership } from "../auth/service";
import { assert, uuidInput } from "../auth/security";
import { hubClient } from "./chainService";
import { vaultMappingIssue } from "../../../shared/vaultMapping";

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
        sql`${vaultMembers.vaultRole} in ('GUARDIAN','CREATOR')`,
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
  let canApprove = member.role === "ADMIN";
  if (!canApprove) {
    const [link] = await db
      .select()
      .from(vaultMembers)
      .where(
        and(
          eq(vaultMembers.vaultId, vault.id),
          eq(vaultMembers.userId, auth.user.id),
        ),
      );
    assert(link, 403, "Bạn không có quyền trên hũ này.");
    canApprove =
      member.role === "GUARDIAN" &&
      ["GUARDIAN", "CREATOR"].includes(link.vaultRole);
  }
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
  }
  return { vault, ws, member, canApprove };
}
