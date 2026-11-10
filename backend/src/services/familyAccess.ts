import { eq } from "drizzle-orm";
import { db, familyAdminState } from "../db";
import { assert } from "../auth/security";
type Store = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function requireWorkspaceWrites(store: Store, workspaceId: string, outgoing = false) {
  const [state] = await store.select().from(familyAdminState).where(eq(familyAdminState.workspaceId, workspaceId));
  assert(!state?.archived, 409, "Gia đình đã lưu trữ, chỉ có thể xem lịch sử.", "FAMILY_ARCHIVED");
  assert(!outgoing || !state?.outgoingPaused, 409, "Chủ nhà đã tạm dừng tạo lệnh chi mới.", "FAMILY_OUTGOING_PAUSED");
}
