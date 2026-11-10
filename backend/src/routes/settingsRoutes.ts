import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, userPreferences, settingsAuditLogs } from "../db";
import { endpoint } from "./authRoutes";
import { assert, uuidInput } from "../auth/security";
import { workspace } from "../services/workspaceAccess";
import { requireFamilyOwner } from "../services/familyAdminService";

export const settingsRouter = Router();
const defaults = {
  uiMode: "LITE",
  defaultCurrency: "AVAX",
  preferredNetwork: "TESTNET",
  gasPreference: "NATIVE",
  privacyHideBalance: false,
  notificationConfig: { transactions: true, security: true, chores: true },
};
settingsRouter.get(
  "/overview",
  endpoint(async (req, res) => {
    const [preferences] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, req.auth!.user.id));
    const scoped = req.query.workspaceId
      ? await workspace(req.auth!, uuidInput(String(req.query.workspaceId)))
      : null;
    res.json({
      success: true,
      data: {
        user: {
          id: req.auth!.user.id,
          fullName: req.auth!.user.fullName,
          phoneNumber: req.auth!.user.phoneNumber,
          avatarUrl: req.auth!.user.avatarUrl,
          primaryWallet: req.auth!.wallet?.address || "",
        },
        preferences: {
          ...defaults,
          ...preferences,
          defaultCurrency: "AVAX",
          preferredNetwork: "TESTNET",
          gasPreference: "NATIVE",
        },
        linkedWallets: req.auth!.wallet
          ? [
              {
                id: req.auth!.user.id,
                walletAddress: req.auth!.wallet.address,
                walletType: "EXTERNAL_CORE",
                isPrimaryReceiving: true,
                verifiedAt: req.auth!.wallet.verifiedAt,
              },
            ]
          : [],
        workspace: scoped
          ? {
              id: scoped.ws.id,
              name: scoped.ws.name,
              type: scoped.ws.type,
              workspaceCode: scoped.ws.workspaceCode,
              creatorUserId: scoped.ws.creatorUserId,
              userRole: scoped.member.role,
              isAdmin: scoped.member.isOwner,
            }
          : null,
        members: [],
        allowancePolicies: [],
        sessionKeys: [],
        auditTimeline: [],
        security: {
          score: null,
          level: "Chưa đánh giá",
          factors: [
            "Không suy ra mức độ an toàn từ số thành viên hoặc việc đã kết nối ví.",
          ],
        },
      },
    });
  }),
);
settingsRouter.put(
  "/preferences",
  endpoint(async (req, res) => {
    const body = req.body || {};
    const allowed = [
      "uiMode",
      "privacyHideBalance",
      "notificationConfig",
      "workspaceId",
      "defaultCurrency",
      "preferredNetwork",
      "gasPreference",
    ];
    assert(
      Object.keys(body).every((key) => allowed.includes(key)),
      400,
      "Tùy chọn không được hỗ trợ.",
    );
    if (body.workspaceId)
      await workspace(req.auth!, uuidInput(body.workspaceId));
    const values: any = { updatedAt: new Date() };
    if (body.uiMode !== undefined) {
      assert(
        ["LITE", "PRO"].includes(body.uiMode),
        400,
        "Chế độ hiển thị không hợp lệ.",
      );
      values.uiMode = body.uiMode;
    }
    if (body.privacyHideBalance !== undefined) {
      assert(
        typeof body.privacyHideBalance === "boolean",
        400,
        "Tùy chọn ẩn số dư không hợp lệ.",
      );
      values.privacyHideBalance = body.privacyHideBalance;
    }
    if (body.notificationConfig !== undefined) {
      const config = body.notificationConfig;
      assert(
        config &&
          typeof config === "object" &&
          !Array.isArray(config) &&
          Object.keys(config).every(
            (key) =>
              ["transactions", "security", "chores"].includes(key) &&
              typeof config[key] === "boolean",
          ),
        400,
        "Cấu hình thông báo không hợp lệ.",
      );
      values.notificationConfig = { ...config, security: true };
    }
    assert(
      body.defaultCurrency === undefined || body.defaultCurrency === "AVAX",
      400,
      "Ứng dụng hiện hiển thị số tiền AVAX chính xác.",
    );
    assert(
      body.preferredNetwork === undefined ||
        body.preferredNetwork === "TESTNET",
      400,
      "Mạng vận hành không được thay đổi qua Cài đặt.",
    );
    assert(
      body.gasPreference === undefined || body.gasPreference === "NATIVE",
      400,
      "Phí mạng hiện được trả bằng AVAX.",
    );
    const [saved] = await db
      .insert(userPreferences)
      .values({ userId: req.auth!.user.id, ...defaults, ...values })
      .onConflictDoUpdate({ target: userPreferences.userId, set: values })
      .returning();
    res.json({ success: true, preferences: saved });
  }),
);
settingsRouter.get(
  "/audit-logs",
  endpoint(async (req, res) => {
    const workspaceId = uuidInput(String(req.query.workspaceId || ""));
    await requireFamilyOwner(db, req.auth!, workspaceId);
    const data = await db
      .select()
      .from(settingsAuditLogs)
      .where(eq(settingsAuditLogs.workspaceId, workspaceId))
      .orderBy(desc(settingsAuditLogs.createdAt))
      .limit(200);
    res.json({ success: true, data });
  }),
);
// Retire unverifiable sync and metadata-only wallet/session-key mutations.
// A well-formed hash is never evidence of a confirmed blockchain operation.
for (const path of [
  "/prepare-sync",
  "/confirm-sync",
  "/freeze-member",
  "/sessions/revoke",
])
  settingsRouter.post(
    path,
    endpoint(async (req, res) => {
      await requireFamilyOwner(
        db,
        req.auth!,
        uuidInput(req.body.workspaceId || ""),
      );
      res
        .status(410)
        .json({
          success: false,
          code: "VERIFIED_ADMIN_INTENT_REQUIRED",
          error:
            "Dùng khu quản trị chủ nhà và yêu cầu có chữ ký xác nhận; cơ chế đồng bộ cũ đã ngừng hoạt động.",
        });
    }),
  );
settingsRouter.post("/wallets", (_req, res) =>
  res
    .status(410)
    .json({
      success: false,
      error:
        "Liên kết ví phải qua challenge và chữ ký Core trong luồng xác thực.",
    }),
);
settingsRouter.patch("/wallets/:id/primary", (_req, res) =>
  res
    .status(410)
    .json({
      success: false,
      error: "Ví nhận phải là ví đã xác minh; thay ví qua quy trình recovery.",
    }),
);
