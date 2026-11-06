import { and, eq, sql } from "drizzle-orm";
import { db, workspaceOnboarding } from "../db";
import { AuthContext, membership, requireFull } from "../auth/service";
import { assert, uuidInput } from "../auth/security";
import { workspace } from "./workspaceAccess";
import {
  START_FLOW_VERSION,
  StartProgress,
  StartStep,
  StartStatus,
  startSteps,
  dashboardRoute,
  startRoute,
} from "../../../shared/startFlow";

function progressDto(
  row: typeof workspaceOnboarding.$inferSelect | undefined,
  role: string,
): StartProgress {
  return {
    flowVersion: START_FLOW_VERSION,
    status: (row?.status || "IN_PROGRESS") as StartStatus,
    step: startSteps(role).includes(row?.lastStep as StartStep)
      ? (row!.lastStep as StartStep)
      : "WELCOME",
    revision: row?.revision || 0,
    completedAt: row?.completedAt?.toISOString() || null,
    deferredAt: row?.deferredAt?.toISOString() || null,
  };
}
export async function getStart(auth: AuthContext, workspaceId: string) {
  requireFull(auth);
  const { ws, member } = await workspace(auth, uuidInput(workspaceId));
  const [row] = await db
    .select()
    .from(workspaceOnboarding)
    .where(
      and(
        eq(workspaceOnboarding.userId, auth.user.id),
        eq(workspaceOnboarding.workspaceId, ws.id),
        eq(workspaceOnboarding.flowVersion, START_FLOW_VERSION),
      ),
    );
  return {
    workspace: { id: ws.id, name: ws.name },
    role: member.role,
    canManageMembers:
      member.role === "ADMIN" ||
      (member.role === "GUARDIAN" && member.canManageMembers),
    progress: progressDto(row, member.role),
    steps: startSteps(member.role),
    dashboardUrl: dashboardRoute(member.role, ws.id),
    startUrl: startRoute(ws.id),
  };
}
export async function updateStart(
  auth: AuthContext,
  workspaceId: string,
  input: Record<string, unknown>,
) {
  requireFull(auth);
  const id = uuidInput(workspaceId);
  assert(
    Object.keys(input).every((key) =>
      ["step", "status", "revision", "restart"].includes(key),
    ),
    400,
    "Yêu cầu tiến độ chứa trường không hợp lệ.",
  );
  assert(
    typeof input.revision === "number" &&
      Number.isSafeInteger(input.revision) &&
      input.revision >= 0,
    400,
    "Thiếu phiên bản tiến độ.",
  );
  assert(
    input.restart === undefined || typeof input.restart === "boolean",
    400,
    "Thao tác bắt đầu lại không hợp lệ.",
  );
  assert(
    typeof input.status === "string" &&
      ["IN_PROGRESS", "COMPLETED", "DEFERRED"].includes(input.status),
    400,
    "Trạng thái hướng dẫn không hợp lệ.",
  );
  await db.transaction(async (tx) => {
    const member = await membership(tx, auth, id);
    assert(
      startSteps(member.role).includes(input.step as StartStep),
      400,
      "Bước không phù hợp vai trò hiện tại.",
    );
    assert(
      input.status !== "COMPLETED" || input.step === "FINISH",
      400,
      "Hoàn tất ở bước tổng kết.",
    );
    assert(
      !input.restart || input.status === "IN_PROGRESS",
      400,
      "Bắt đầu lại cần trạng thái đang thiết lập.",
    );
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`start:${auth.user.id}:${id}:${START_FLOW_VERSION}`}))`,
    );
    const condition = and(
      eq(workspaceOnboarding.userId, auth.user.id),
      eq(workspaceOnboarding.workspaceId, id),
      eq(workspaceOnboarding.flowVersion, START_FLOW_VERSION),
    );
    const [current] = await tx
      .select()
      .from(workspaceOnboarding)
      .where(condition)
      .for("update");
    // A retry after losing the response is idempotent, even with its old revision.
    if (
      current?.status === input.status &&
      current.lastStep === input.step &&
      !input.restart
    )
      return;
    assert(
      (current?.revision || 0) === input.revision,
      409,
      "Tiến độ đã thay đổi trên thiết bị khác. Hãy kiểm tra lại.",
      "START_PROGRESS_CHANGED",
    );
    assert(
      !current ||
        current.status === "IN_PROGRESS" ||
        input.restart ||
        input.status !== "IN_PROGRESS",
      409,
      "Chọn tiếp tục thiết lập để mở lại hướng dẫn.",
      "START_RESTART_REQUIRED",
    );
    const now = new Date();
    const values = {
      status: String(input.status),
      lastStep: String(input.step),
      revision: (current?.revision || 0) + 1,
      updatedAt: now,
      completedAt: input.status === "COMPLETED" ? now : null,
      deferredAt: input.status === "DEFERRED" ? now : null,
    };
    if (current)
      await tx.update(workspaceOnboarding).set(values).where(condition);
    else
      await tx.insert(workspaceOnboarding).values({
        ...values,
        userId: auth.user.id,
        workspaceId: id,
        membershipId: member.id,
        flowVersion: START_FLOW_VERSION,
      });
  });
  return getStart(auth, id);
}
