import { Router } from "express";
import { and, or, eq, isNull, desc, inArray, sql, lt } from "drizzle-orm";
import { db } from "../db";
import {
  chores,
  withdrawalRequests,
  users,
  userWallets,
  vaults,
  workspaceMembers,
  guardianMemberLinks,
  proofAttachments,
  memberActivity,
} from "../db/schema";
import { endpoint, AuthRequest } from "./authRoutes";
import { AuthContext } from "../auth/service";
import { assert, uuidInput } from "../auth/security";
import {
  readHub,
  verifiedEvent,
  decimalAmount,
} from "../services/chainService";
import {
  workspace,
  visibleVaults,
  vaultAccess,
  reviewerVaultIds,
} from "../services/workspaceAccess";
import { recordReceiptActivity } from "../services/activityService";
import { sanitizeProofImage } from "../services/proofImage";
import { memberVaultPolicy } from "../services/vaultPolicyService";

// Mount trước API tương thích cũ để mọi client đều nhận dữ liệu có scope cá nhân.
export const memberRouter = Router();
memberRouter.post("/chores/create", (req, _res, next) => {
  void (async () => {
    const { canApprove } = await vaultAccess(
      (req as AuthRequest).auth!,
      req.body.vaultId || "",
      true,
    );
    assert(canApprove, 403, "Bạn không có quyền giao việc trên hũ này.");
  })().then(() => next(), next);
});
memberRouter.get(
  "/chores/:familyId",
  endpoint(async (req, res) => {
    const { member } = await workspace(req.auth!, req.params.familyId);
    const allowed = await visibleVaults(req.auth!, req.params.familyId);
    if (!allowed.length) return res.json({ success: true, data: [] });
    const reviewable =
      member.role === "GUARDIAN" ? await reviewerVaultIds(req.auth!) : [];
    const rows = await db
      .select({
        chore: chores,
        childName: users.fullName,
        childAvatar: users.avatarUrl,
        vaultName: vaults.name,
      })
      .from(chores)
      .innerJoin(users, eq(users.id, chores.childId))
      .innerJoin(vaults, eq(vaults.id, chores.vaultId))
      .where(
        and(
          eq(chores.familyId, req.params.familyId),
          inArray(
            chores.vaultId,
            allowed.map((item) => item.id),
          ),
          member.role === "ADMIN"
            ? undefined
            : member.role === "GUARDIAN"
              ? or(
                  eq(chores.childId, req.auth!.user.id),
                  inArray(chores.vaultId, reviewable),
                )
              : eq(chores.childId, req.auth!.user.id),
        ),
      )
      .orderBy(desc(chores.createdAt));
    return res.json({
      success: true,
      data: rows.map(({ chore, ...rest }) => ({ ...chore, ...rest })),
    });
  }),
);
memberRouter.get(
  "/withdrawals/:familyId",
  endpoint(async (req, res) => {
    const { member } = await workspace(req.auth!, req.params.familyId);
    const allowed = await visibleVaults(req.auth!, req.params.familyId);
    if (!allowed.length) return res.json({ success: true, data: [] });
    const reviewable =
      member.role === "GUARDIAN" ? await reviewerVaultIds(req.auth!) : [];
    const rows = await db
      .select({
        request: withdrawalRequests,
        requesterName: users.fullName,
        requesterAddress: userWallets.address,
        vaultName: vaults.name,
      })
      .from(withdrawalRequests)
      .innerJoin(users, eq(users.id, withdrawalRequests.requesterId))
      .leftJoin(userWallets, eq(userWallets.userId, users.id))
      .innerJoin(vaults, eq(vaults.id, withdrawalRequests.vaultId))
      .where(
        and(
          eq(withdrawalRequests.familyId, req.params.familyId),
          inArray(
            withdrawalRequests.vaultId,
            allowed.map((item) => item.id),
          ),
          member.role === "ADMIN"
            ? undefined
            : member.role === "GUARDIAN"
              ? or(
                  eq(withdrawalRequests.requesterId, req.auth!.user.id),
                  inArray(withdrawalRequests.vaultId, reviewable),
                )
              : eq(withdrawalRequests.requesterId, req.auth!.user.id),
        ),
      )
      .orderBy(desc(withdrawalRequests.createdAt));
    return res.json({
      success: true,
      data: rows.map(({ request, ...rest }) => ({ ...request, ...rest })),
    });
  }),
);
memberRouter.get(
  "/member/guardians",
  endpoint(async (req, res) => {
    const id = uuidInput(
      typeof req.query.workspaceId === "string" ? req.query.workspaceId : "",
    );
    await workspace(req.auth!, id);
    const data = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        phoneNumber: users.phoneNumber,
      })
      .from(guardianMemberLinks)
      .innerJoin(users, eq(users.id, guardianMemberLinks.guardianId))
      .innerJoin(
        workspaceMembers,
        and(
          eq(workspaceMembers.userId, users.id),
          eq(workspaceMembers.workspaceId, id),
          isNull(workspaceMembers.accessDisabledAt),
        ),
      )
      .where(
        and(
          eq(guardianMemberLinks.workspaceId, id),
          eq(guardianMemberLinks.memberId, req.auth!.user.id),
          eq(guardianMemberLinks.active, true),
          isNull(users.suspendedAt),
          sql`${workspaceMembers.role} in ('ADMIN','GUARDIAN')`,
        ),
      );
    return res.json({ success: true, data });
  }),
);
memberRouter.get(
  "/member/vaults/:id/policy",
  endpoint(async (req, res) => {
    const { vault, ws } = await vaultAccess(req.auth!, req.params.id, true);
    assert(req.auth!.wallet, 403, "Chưa liên kết ví cá nhân.");
    const policy = await memberVaultPolicy(
      ws.l1HubAddress!,
      BigInt(vault.onchainVaultId),
      req.auth!.wallet.address,
    );
    return res.json({ success: true, data: { vaultId: vault.id, ...policy } });
  }),
);
async function proofAccess(auth: AuthContext, id: string) {
  const [chore] = await db
    .select()
    .from(chores)
    .where(eq(chores.id, uuidInput(id)));
  assert(chore?.vaultId, 404, "Không tìm thấy việc.");
  const access = await vaultAccess(auth, chore.vaultId);
  assert(
    chore.childId === auth.user.id || access.canApprove,
    403,
    "Bạn không được xem minh chứng này.",
  );
  return { chore, ...access };
}
memberRouter.post(
  "/member/attachments",
  endpoint(async (req, res) => {
    const { chore } = await proofAccess(req.auth!, req.body.choreId);
    assert(
      chore.childId === req.auth!.user.id && chore.status === "TODO",
      403,
      "Chỉ người được giao việc chưa nộp mới được tải ảnh.",
    );
    const content = sanitizeProofImage(req.body.content);
    const uploadId = uuidInput(req.body.uploadId || "");
    await db
      .delete(proofAttachments)
      .where(lt(proofAttachments.expiresAt, new Date()));
    const attachment = await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(chores)
        .where(eq(chores.id, chore.id))
        .for("update");
      assert(
        current?.status === "TODO",
        409,
        "Bài đã thay đổi, hãy kiểm tra trạng thái trước khi tải thêm ảnh.",
      );
      const [replayed] = await tx
        .select()
        .from(proofAttachments)
        .where(eq(proofAttachments.id, uploadId));
      if (replayed) {
        assert(
          replayed.ownerId === req.auth!.user.id &&
            replayed.choreId === chore.id &&
            replayed.content === content,
          409,
          "Mã upload đã dùng cho ảnh khác.",
        );
        return { id: replayed.id };
      }
      const existing = await tx
        .select({ id: proofAttachments.id })
        .from(proofAttachments)
        .where(eq(proofAttachments.choreId, chore.id));
      assert(
        existing.length < 5,
        429,
        "Bài này đã có 5 ảnh tải lên. Hãy dùng ảnh đã tải hoặc liên hệ người bảo hộ.",
      );
      const [row] = await tx
        .insert(proofAttachments)
        .values({
          id: uploadId,
          choreId: chore.id,
          ownerId: req.auth!.user.id,
          content,
          expiresAt: new Date(Date.now() + 90 * 86400000),
        })
        .returning({ id: proofAttachments.id });
      return row;
    });
    return res.status(201).json({ success: true, attachmentId: attachment.id });
  }),
);
memberRouter.get(
  "/member/attachments/:id",
  endpoint(async (req, res) => {
    const [attachment] = await db
      .select()
      .from(proofAttachments)
      .where(eq(proofAttachments.id, uuidInput(req.params.id)));
    assert(
      attachment && attachment.expiresAt > new Date(),
      404,
      "Ảnh không tồn tại hoặc đã hết hạn lưu 90 ngày.",
    );
    await proofAccess(req.auth!, attachment.choreId);
    return res
      .set({
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      })
      .send(Buffer.from(attachment.content, "base64"));
  }),
);
memberRouter.get(
  "/member/activity",
  endpoint(async (req, res) => {
    const id = uuidInput(
      typeof req.query.workspaceId === "string" ? req.query.workspaceId : "",
    );
    await workspace(req.auth!, id);
    const page = Number(req.query.page || 0);
    assert(
      Number.isSafeInteger(page) && page >= 0 && page <= 10000,
      400,
      "Trang không hợp lệ.",
    );
    const rows = await db
      .select()
      .from(memberActivity)
      .where(
        and(
          eq(memberActivity.userId, req.auth!.user.id),
          eq(memberActivity.workspaceId, id),
        ),
      )
      .orderBy(desc(memberActivity.createdAt), desc(memberActivity.id))
      .limit(21)
      .offset(page * 20);
    return res.json({
      success: true,
      data: rows.slice(0, 20),
      hasMore: rows.length > 20,
    });
  }),
);
for (const action of ["submit", "verify"] as const) {
  memberRouter.post(
    `/chores/${action}`,
    endpoint(async (req, res) => {
      const { chore, ws, vault, canApprove } = await proofAccess(
        req.auth!,
        req.body.choreId,
      );
      assert(
        chore.onchainTaskId !== null,
        404,
        "Việc chưa được xác minh on-chain.",
      );
      await vaultAccess(req.auth!, vault.id, true);
      if (action === "submit")
        assert(
          chore.childId === req.auth!.user.id,
          403,
          "Bạn không phải người được giao việc.",
        );
      else assert(canApprove, 403, "Bạn không có quyền duyệt bài này.");
      let proof: string | undefined;
      if (action === "submit") {
        const [attachment] = await db
          .select()
          .from(proofAttachments)
          .where(
            and(
              eq(proofAttachments.id, uuidInput(req.body.attachmentId || "")),
              eq(proofAttachments.choreId, chore.id),
              eq(proofAttachments.ownerId, req.auth!.user.id),
            ),
          );
        assert(
          attachment && attachment.expiresAt > new Date(),
          400,
          "Ảnh không tồn tại hoặc đã hết hạn. Hãy chọn lại ảnh.",
        );
        proof = `/api/member/attachments/${attachment.id}`;
      }
      const verified = await verifiedEvent(
        req.auth!,
        ws.l1HubAddress!,
        req.body.txHash,
        action === "submit" ? "ChoreClaimed" : "ChoreRewarded",
        (args) => Number(args.taskId) === chore.onchainTaskId,
      );
      if (action === "verify")
        await recordReceiptActivity(verified.receipt, vault);
      // Receipt có thể được replay sau khi worker đã cập nhật chi trả; không hạ trạng thái.
      const [updated] = await db
        .update(chores)
        .set({
          status:
            action === "submit"
              ? sql`case when ${chores.status} = 'TODO' then 'SUBMITTED'::chore_status else ${chores.status} end`
              : "REWARDED",
          ...(proof
            ? {
                proofImageUrl: sql`coalesce(${chores.proofImageUrl}, ${proof})`,
              }
            : {}),
        })
        .where(eq(chores.id, chore.id))
        .returning();
      return res.json({ success: true, data: updated });
    }),
  );
}
memberRouter.patch(
  "/vaults",
  endpoint(async (req, res) => {
    const { vault, ws } = await vaultAccess(
      req.auth!,
      req.body.vaultId || "",
      true,
    );
    const eventName =
      req.body.action === "DEPOSIT"
        ? "FundsDeposited"
        : req.body.action === "WITHDRAW"
          ? "FastWithdrawalExecuted"
          : "";
    assert(eventName, 400, "Thao tác không hợp lệ.");
    const verified = await verifiedEvent(
      req.auth!,
      ws.l1HubAddress!,
      req.body.txHash,
      eventName,
      (args) => Number(args.vaultId) === vault.onchainVaultId,
    );
    await recordReceiptActivity(verified.receipt, vault);
    const state: any = await readHub(ws.l1HubAddress!, "getVaultOverview", [
      BigInt(vault.onchainVaultId),
    ]);
    const [updated] = await db
      .update(vaults)
      .set({
        cachedTotalBalance: decimalAmount(state[0]),
        cachedL1Buffer: decimalAmount(state[1]),
        cachedCChainYield: decimalAmount(state[2]),
      })
      .where(eq(vaults.id, vault.id))
      .returning();
    return res.json({ success: true, vault: updated });
  }),
);

// Ghi receipt chi trả cho cả đường duyệt thường và đường tổng hợp chữ ký mới.
for (const path of [
  "/withdrawals/approve",
  "/withdrawals/execute-signatures",
]) {
  memberRouter.post(path, (req, _res, next) => {
    void (async () => {
      const auth = (req as AuthRequest).auth!;
      const [request] = await db
        .select()
        .from(withdrawalRequests)
        .where(eq(withdrawalRequests.id, uuidInput(req.body.requestId || "")));
      assert(
        request?.vaultId && request.onchainRequestId !== null,
        404,
        "Không tìm thấy yêu cầu đã đối soát.",
      );
      const { ws, vault, canApprove } = await vaultAccess(
        auth,
        request.vaultId,
        true,
      );
      if (path.endsWith("approve"))
        assert(canApprove, 403, "Bạn không có quyền duyệt hũ này.");
      const verified = await verifiedEvent(
        auth,
        ws.l1HubAddress!,
        req.body.txHash,
        path.endsWith("approve") ? "WithdrawalApproved" : "WithdrawalExecuted",
        (args) =>
          Number(args.requestId) === request.onchainRequestId &&
          Number(args.vaultId) === vault.onchainVaultId,
        path.endsWith("approve"),
      );
      await recordReceiptActivity(verified.receipt, vault);
    })().then(() => next(), next);
  });
}
