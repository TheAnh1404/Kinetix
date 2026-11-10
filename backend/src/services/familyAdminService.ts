import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { verifyMessage } from "viem";
import {
  db,
  workspaces,
  workspaceMembers,
  users,
  userWallets,
  workspaceInvitations,
  familyAdminState as states,
  familyAdminIntents as intents,
  treasuryJars as jars,
  treasuryPolicies as policies,
  treasuryJobs as jobs,
  treasuryTransfers as transfers,
  auditLogs,
  vaults,
} from "../db";
import { AuthContext, membership, liveAuth } from "../auth/service";
import {
  applicationOrigin,
  assert,
  digest,
  textInput,
  uuidInput,
} from "../auth/security";
import { treasuryAmount } from "../../../shared/treasury";
import { workflowOverview } from "./treasuryWorkflowService";

type Store = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function requireFamilyOwner(
  store: Store,
  auth: AuthContext,
  workspaceId: string,
) {
  const member = await membership(store, auth, uuidInput(workspaceId));
  const [workspace] = await store
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));
  assert(
    workspace?.creatorUserId === auth.user.id && member.role === "ADMIN",
    403,
    "Chỉ người tạo gia đình được vào khu quản trị của gia đình này.",
    "FAMILY_OWNER_ONLY",
  );
  return workspace;
}
const lock = async (tx: Transaction) => {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext('kinetix:fuji-treasury'))`,
  );
};
const canonical = (payload: Record<string, unknown>) =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(payload).sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
async function normalize(
  store: Store,
  workspaceId: string,
  action: string,
  input: any,
) {
  const fields: Record<string, string[]> = {
    RENAME: ["name"],
    REVOKE_INVITE: ["invitationId"],
    PAUSE: ["reason"],
    RESUME: ["reason"],
    ARCHIVE: ["reason"],
    RESTORE: ["reason"],
    MEMBER_ACCESS: ["userId", "disabled"],
    JAR_LIMIT: ["jarId", "dailyLimit", "dailyLimitWei"],
    ARCHIVE_JAR: ["jarId"],
    EXPORT: ["from", "to"],
  };
  assert(
    typeof action === "string" &&
      Array.isArray(fields[action]) &&
      input &&
      typeof input === "object" &&
      !Array.isArray(input) &&
      Object.keys(input).every((key) => fields[action].includes(key)),
    400,
    "Nội dung quản trị không hợp lệ.",
  );
  if (action === "RENAME") return { name: textInput(input.name, 100) };
  if (action === "REVOKE_INVITE") {
    const invitationId = uuidInput(input.invitationId);
    const [invite] = await store
      .select()
      .from(workspaceInvitations)
      .where(
        and(
          eq(workspaceInvitations.id, invitationId),
          eq(workspaceInvitations.workspaceId, workspaceId),
        ),
      );
    assert(
      invite &&
        !invite.acceptedAt &&
        !invite.revokedAt &&
        invite.expiresAt > new Date(),
      409,
      "Lời mời không còn hiệu lực trong gia đình này.",
    );
    return { invitationId };
  }
  if (["PAUSE", "RESUME", "ARCHIVE", "RESTORE"].includes(action))
    return { reason: textInput(input.reason, 500) };
  if (action === "MEMBER_ACCESS") {
    const userId = uuidInput(input.userId);
    const [target] = await store
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      );
    const [workspace] = await store
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId));
    assert(
      target && workspace?.creatorUserId !== userId,
      403,
      "Không thể khóa chủ nhà hoặc thay đổi người ở gia đình khác.",
    );
    assert(
      typeof input.disabled === "boolean",
      400,
      "Trạng thái truy cập không hợp lệ.",
    );
    return { userId, disabled: input.disabled };
  }
  if (["JAR_LIMIT", "ARCHIVE_JAR"].includes(action)) {
    const jarId = uuidInput(input.jarId);
    const [jar] = await store
      .select()
      .from(jars)
      .where(and(eq(jars.id, jarId), eq(jars.workspaceId, workspaceId)));
    assert(
      jar && !jar.isArchived,
      404,
      "Không tìm thấy hũ hoạt động trong gia đình.",
    );
    if (action === "ARCHIVE_JAR") return { jarId };
    const [policy] = await store
      .select()
      .from(policies)
      .where(eq(policies.jarId, jarId));
    assert(
      policy && ["SHIELD", "SAVINGS"].includes(policy.config.kind),
      409,
      "Chỉ thay hạn mức nhận của hũ an sinh hoặc heo đất.",
    );
    let dailyLimitWei = "";
    try {
      dailyLimitWei = treasuryAmount(input.dailyLimit).toString();
    } catch {
      assert(false, 400, "Hạn mức AVAX không hợp lệ.");
    }
    return { jarId, dailyLimitWei };
  }
  if (action === "EXPORT") {
    const from = new Date(input.from);
    const to = new Date(input.to);
    assert(
      Number.isFinite(from.getTime()) &&
        Number.isFinite(to.getTime()) &&
        to > from &&
        to.getTime() - from.getTime() <= 366 * 86400000,
      400,
      "Chọn khoảng thời gian hợp lệ, tối đa 366 ngày.",
    );
    return { from: from.toISOString(), to: to.toISOString() };
  }
  assert(false, 400, "Thao tác quản trị không được hỗ trợ.");
}
export async function adminOverview(auth: AuthContext, workspaceId: string) {
  const workspace = await requireFamilyOwner(db, auth, workspaceId);
  const [state] = await db
    .select()
    .from(states)
    .where(eq(states.workspaceId, workspaceId));
  const members = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
      role: workspaceMembers.role,
      disabledAt: workspaceMembers.accessDisabledAt,
      wallet: userWallets.address,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .leftJoin(userWallets, eq(userWallets.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));
  const invitations = await db
    .select({
      id: workspaceInvitations.id,
      wallet: workspaceInvitations.expectedWallet,
      expiresAt: workspaceInvitations.expiresAt,
      revokedAt: workspaceInvitations.revokedAt,
      acceptedAt: workspaceInvitations.acceptedAt,
    })
    .from(workspaceInvitations)
    .where(eq(workspaceInvitations.workspaceId, workspaceId))
    .orderBy(desc(workspaceInvitations.expiresAt))
    .limit(100);
  const history = await db
    .select()
    .from(intents)
    .where(eq(intents.workspaceId, workspaceId))
    .orderBy(desc(intents.createdAt))
    .limit(200);
  const experience = await workflowOverview(auth, workspaceId);
  return {
    workspace,
    state: state || {
      revision: 0,
      outgoingPaused: false,
      pauseReason: "",
      archived: false,
    },
    members: members.map((member) => ({
      ...member,
      isOwner: member.id === workspace.creatorUserId,
      role:
        member.id === workspace.creatorUserId
          ? "ADMIN"
          : member.role === "ADMIN"
            ? "GUARDIAN"
            : member.role,
    })),
    invitations,
    history,
    experience,
    checkedAt: new Date().toISOString(),
  };
}
export async function prepareAdminIntent(
  auth: AuthContext,
  workspaceId: string,
  body: any,
) {
  assert(
    body && typeof body === "object" && !Array.isArray(body),
    400,
    "Yêu cầu quản trị không hợp lệ.",
  );
  return db.transaction(async (tx) => {
    const current = await liveAuth(tx, auth);
    await lock(tx);
    const workspace = await requireFamilyOwner(tx, current, workspaceId);
    const id = uuidInput(body.requestId);
    const payload = await normalize(
      tx,
      workspaceId,
      body.action,
      body.payload || {},
    );
    const [prior] = await tx.select().from(intents).where(eq(intents.id, id));
    if (prior) {
      assert(
        prior.workspaceId === workspaceId &&
          prior.actorId === current.user.id &&
          prior.sessionId === current.session.id &&
          prior.action === body.action &&
          canonical(prior.payload) === canonical(payload),
        409,
        "Mã yêu cầu đã dùng cho nội dung khác.",
      );
      return prior;
    }
    await tx.insert(states).values({ workspaceId }).onConflictDoNothing();
    const [state] = await tx
      .select()
      .from(states)
      .where(eq(states.workspaceId, workspaceId));
    assert(
      Number.isInteger(body.revision) && state.revision === body.revision,
      409,
      "Gia đình đã thay đổi. Tải lại trước khi xác nhận.",
      "ADMIN_REVISION_CONFLICT",
    );
    const expiresAt = new Date(Date.now() + 5 * 60000);
    const message = `Kinetix — Xác nhận quản trị gia đình\nOrigin: ${applicationOrigin().origin}\nGia đình: ${workspace.name}\nWorkspace: ${workspaceId}\nChủ nhà: ${current.user.id}\nSession: ${digest(current.session.id)}\nThao tác: ${body.action}\nNội dung: ${JSON.stringify(payload)}\nPhiên bản: ${state.revision}\nNonce: ${id}\nHết hạn: ${expiresAt.toISOString()}\nChữ ký này xác nhận thay đổi trong ứng dụng. Không chuyển tài sản hoặc cấp quyền cho gia đình khác.`;
    const [intent] = await tx
      .insert(intents)
      .values({
        id,
        workspaceId,
        actorId: current.user.id,
        sessionId: current.session.id,
        revision: state.revision,
        action: body.action,
        payload,
        message,
        expiresAt,
      })
      .returning();
    return intent;
  });
}
function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export async function executeAdminIntent(
  auth: AuthContext,
  workspaceId: string,
  id: string,
  signature: unknown,
) {
  return db.transaction(async (tx) => {
    const current = await liveAuth(tx, auth);
    await lock(tx);
    const workspace = await requireFamilyOwner(tx, current, workspaceId);
    const [intent] = await tx
      .select()
      .from(intents)
      .where(
        and(
          eq(intents.id, uuidInput(id)),
          eq(intents.workspaceId, workspaceId),
          eq(intents.actorId, current.user.id),
          eq(intents.sessionId, current.session.id),
        ),
      );
    assert(intent, 404, "Không tìm thấy yêu cầu quản trị của phiên này.");
    if (intent.status === "COMPLETED" && intent.action !== "EXPORT")
      return { success: true, alreadyCompleted: true };
    assert(
      intent.status === "PENDING" && intent.expiresAt > new Date(),
      409,
      "Yêu cầu đã hoàn tất hoặc hết hạn.",
    );
    const [state] = await tx
      .select()
      .from(states)
      .where(eq(states.workspaceId, workspaceId));
    assert(
      state && state.revision === intent.revision,
      409,
      "Cấu hình đã thay đổi. Cần xem lại và ký yêu cầu mới.",
    );
    const signedLines = intent.message.split("\n");
    let signedPayload: Record<string, unknown> = {};
    try {
      signedPayload = JSON.parse(
        signedLines.find((line) => line.startsWith("Nội dung: "))?.slice(10) ||
          "{}",
      );
    } catch {
      /* Fail closed for corrupt stored messages. */
    }
    assert(
      canonical(signedPayload) === canonical(intent.payload) &&
        [
          `Workspace: ${workspaceId}`,
          `Chủ nhà: ${current.user.id}`,
          `Session: ${digest(current.session.id)}`,
          `Thao tác: ${intent.action}`,
          `Phiên bản: ${intent.revision}`,
          `Nonce: ${intent.id}`,
          `Hết hạn: ${intent.expiresAt.toISOString()}`,
        ].every((line) => signedLines.includes(line)),
      409,
      "Nội dung yêu cầu không còn khớp nội dung được ký. Chuẩn bị yêu cầu mới.",
    );
    assert(
      current.wallet &&
        typeof signature === "string" &&
        /^0x[0-9a-f]{130}$/i.test(signature),
      401,
      "Cần chữ ký Core của chủ nhà.",
    );
    let verified = false;
    try {
      verified = await verifyMessage({
        address: current.wallet.address as `0x${string}`,
        message: intent.message,
        signature: signature as `0x${string}`,
      });
    } catch {
      /* Invalid ECDSA input is an authentication failure. */
    }
    assert(verified, 401, "Chữ ký không đúng nội dung hoặc ví chủ nhà.");
    const p = intent.payload;
    await normalize(
      tx,
      workspaceId,
      intent.action,
      intent.action === "JAR_LIMIT"
        ? {
            ...p,
            dailyLimit: (await import("viem")).formatEther(
              BigInt(String(p.dailyLimitWei)),
            ),
          }
        : p,
    );
    let csv: string | undefined;
    if (intent.action === "RENAME")
      await tx
        .update(workspaces)
        .set({ name: String(p.name) })
        .where(eq(workspaces.id, workspaceId));
    else if (intent.action === "REVOKE_INVITE")
      await tx
        .update(workspaceInvitations)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(workspaceInvitations.id, String(p.invitationId)),
            eq(workspaceInvitations.workspaceId, workspaceId),
          ),
        );
    else if (["PAUSE", "RESUME"].includes(intent.action))
      await tx
        .update(states)
        .set({
          outgoingPaused: intent.action === "PAUSE",
          pauseReason: String(p.reason),
        })
        .where(eq(states.workspaceId, workspaceId));
    else if (intent.action === "MEMBER_ACCESS")
      await tx
        .update(workspaceMembers)
        .set({
          accessDisabledAt: p.disabled ? new Date() : null,
          canManageMembers: false,
        })
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, String(p.userId)),
          ),
        );
    else if (["JAR_LIMIT", "ARCHIVE_JAR"].includes(intent.action)) {
      const jarId = String(p.jarId);
      const [jar] = await tx.select().from(jars).where(eq(jars.id, jarId));
      const pending = await tx
        .select({ id: jobs.id })
        .from(jobs)
        .where(
          and(
            eq(jobs.jarId, jarId),
            inArray(jobs.status, [
              "TODO",
              "RETURNED",
              "PENDING",
              "APPROVED",
              "SUBMITTED",
              "PAYING",
            ]),
          ),
        );
      assert(
        !pending.length && jar.reservedWei === "0",
        409,
        "Hũ còn yêu cầu/tiền giữ chỗ. Xử lý xong trước khi thay đổi chính sách.",
      );
      if (intent.action === "ARCHIVE_JAR") {
        const active = await tx
          .select({ id: transfers.id })
          .from(transfers)
          .where(
            and(
              or(
                eq(transfers.jarId, jarId),
                eq(transfers.destinationJarId, jarId),
              ),
              inArray(transfers.status, ["READY", "SUBMITTED"]),
            ),
          );
        assert(
          jar.balanceWei === "0" && !active.length,
          409,
          "Hũ còn tiền hoặc giao dịch chưa hoàn tất.",
        );
        await tx
          .update(jars)
          .set({ isArchived: true })
          .where(eq(jars.id, jarId));
      } else {
        const [policy] = await tx
          .select()
          .from(policies)
          .where(eq(policies.jarId, jarId));
        await tx
          .update(policies)
          .set({
            config: {
              ...policy.config,
              dailyLimitWei: String(p.dailyLimitWei),
            },
          })
          .where(eq(policies.jarId, jarId));
      }
    } else if (["ARCHIVE", "RESTORE"].includes(intent.action)) {
      if (intent.action === "ARCHIVE") {
        const funded = await tx
          .select({ id: jars.id })
          .from(jars)
          .where(
            and(
              eq(jars.workspaceId, workspaceId),
              sql`(${jars.balanceWei} <> 0 OR ${jars.reservedWei} <> 0)`,
            ),
          );
        const active = await tx
          .select({ id: transfers.id })
          .from(transfers)
          .where(
            and(
              eq(transfers.workspaceId, workspaceId),
              inArray(transfers.status, ["READY", "SUBMITTED"]),
            ),
          );
        const contracts = await tx
          .select({ id: vaults.id })
          .from(vaults)
          .where(
            and(eq(vaults.workspaceId, workspaceId), eq(vaults.isActive, true)),
          );
        const pendingJobs = await tx
          .select({ id: jobs.id })
          .from(jobs)
          .where(
            and(
              eq(jobs.workspaceId, workspaceId),
              inArray(jobs.status, [
                "TODO",
                "RETURNED",
                "PENDING",
                "APPROVED",
                "SUBMITTED",
                "PAYING",
              ]),
            ),
          );
        assert(
          !funded.length &&
            !active.length &&
            !contracts.length &&
            !pendingJobs.length,
          409,
          "Gia đình còn tiền, nghĩa vụ, giao dịch hoặc hũ contract hoạt động; chưa thể lưu trữ.",
        );
      }
      await tx
        .update(states)
        .set({
          archived: intent.action === "ARCHIVE",
          outgoingPaused: true,
          pauseReason: String(p.reason),
        })
        .where(eq(states.workspaceId, workspaceId));
    } else if (intent.action === "EXPORT") {
      const rows = await tx
        .select()
        .from(transfers)
        .where(
          and(
            eq(transfers.workspaceId, workspaceId),
            sql`${transfers.createdAt} >= ${String(p.from)}::timestamptz AND ${transfers.createdAt} < ${String(p.to)}::timestamptz`,
          ),
        )
        .orderBy(desc(transfers.createdAt))
        .limit(10001);
      assert(
        rows.length <= 10000,
        413,
        "Báo cáo quá lớn. Chọn khoảng thời gian ngắn hơn.",
      );
      csv =
        "\uFEFF" +
        [
          [
            "id",
            "kind",
            "amount_wei",
            "sender",
            "recipient",
            "status",
            "tx_hash",
            "created_at",
          ],
          ...rows.map((r) => [
            r.id,
            r.kind,
            r.amountWei,
            r.sender,
            r.recipient,
            r.status,
            r.txHash,
            r.createdAt.toISOString(),
          ]),
        ]
          .map((row) => row.map(csvCell).join(","))
          .join("\r\n");
    }
    await tx
      .update(states)
      .set({ revision: state.revision + 1, updatedAt: new Date() })
      .where(eq(states.workspaceId, workspaceId));
    await tx
      .update(intents)
      .set({ status: "COMPLETED", completedAt: new Date() })
      .where(eq(intents.id, intent.id));
    await tx.insert(auditLogs).values({
      workspaceId,
      actorId: current.user.id,
      subjectId: current.user.id,
      action: `FAMILY_ADMIN_${intent.action}:${intent.id}`,
    });
    return {
      success: true,
      csv,
      filename: csv
        ? `kinetix-${workspace.id}-${new Date().toISOString().slice(0, 10)}.csv`
        : undefined,
    };
  });
}
