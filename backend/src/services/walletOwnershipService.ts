import { and, eq, isNull } from "drizzle-orm";
import { db, userWallets, walletHistory, workspaceMembers } from "../db";

/** Historical events remain attached to the same account after an evidenced wallet recovery. */
export async function walletOwnerInWorkspace(address: string, workspaceId: string) {
  const membership = (userId: any) => and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId), isNull(workspaceMembers.accessDisabledAt));
  const [current] = await db.select({ userId: userWallets.userId }).from(userWallets).innerJoin(workspaceMembers, membership(userWallets.userId)).where(eq(userWallets.address, address.toLowerCase()));
  if (current) return current;
  const [historical] = await db.select({ userId: walletHistory.userId }).from(walletHistory).innerJoin(workspaceMembers, membership(walletHistory.userId)).where(eq(walletHistory.address, address.toLowerCase()));
  return historical;
}
