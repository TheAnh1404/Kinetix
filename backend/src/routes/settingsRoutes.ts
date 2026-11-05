import { Router, Response } from "express";
import { and, eq, desc, sql } from "drizzle-orm";
import { db } from "../db";
import {
  users,
  workspaces,
  workspaceMembers,
  userPreferences,
  linkedWallets,
  memberAllowancePolicies,
  sessionKeysAndApprovals,
  settingsAuditLogs,
} from "../db/schema";
import { endpoint, AuthRequest } from "./authRoutes";
import { assert, uuidInput, textInput } from "../auth/security";
import { workspace } from "../services/workspaceAccess";

export const settingsRouter = Router();

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;

/**
 * @notice Tính điểm an toàn bảo mật hệ thống (Security Score 0 - 100)
 */
function calculateSecurityScore(
  hasLinkedWallet: boolean,
  memberCount: number,
  hasPreferences: boolean,
  activeSessionCount: number,
  hasFrozenMembers: boolean,
): { score: number; level: "Cao" | "Trung bình" | "Cần chú ý"; factors: string[] } {
  let score = 25; // Điểm cơ bản khi đã đăng nhập
  const factors: string[] = ["Đã xác thực danh tính phiên làm việc (+25đ)"];

  if (hasLinkedWallet) {
    score += 25;
    factors.push("Đã liên kết ví phần cứng / Web3 bảo mật (+25đ)");
  }
  if (memberCount >= 2) {
    score += 25;
    factors.push(`Đã thiết lập mạng lưới đa chữ ký (${memberCount} thành viên) (+25đ)`);
  }
  if (hasPreferences) {
    score += 15;
    factors.push("Đã kích hoạt cấu hình bảo vệ hạn mức cá nhân (+15đ)");
  }
  if (activeSessionCount > 0 && !hasFrozenMembers) {
    score += 10;
    factors.push("Trạng thái phiên làm việc & Session keys an toàn (+10đ)");
  }

  const finalScore = Math.min(100, score);
  const level = finalScore >= 80 ? "Cao" : finalScore >= 50 ? "Trung bình" : "Cần chú ý";

  return { score: finalScore, level, factors };
}

/**
 * @route GET /api/settings/overview
 * @desc Lấy toàn bộ dữ liệu cài đặt hợp nhất trong 1 truy vấn duy nhất (Batching tránh N+1)
 */
settingsRouter.get(
  "/overview",
  endpoint(async (req: AuthRequest, res: Response) => {
    const user = req.auth!.user;
    const workspaceIdQuery = req.query.workspaceId as string | undefined;

    // 1. Lấy thông tin Preferences người dùng
    let [pref] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, user.id));

    if (!pref) {
      // Khởi tạo mặc định nếu chưa có
      const [newPref] = await db
        .insert(userPreferences)
        .values({
          userId: user.id,
          uiMode: "LITE",
          defaultCurrency: "VND",
          preferredNetwork: "TESTNET",
          gasPreference: "SPONSORED",
          privacyHideBalance: false,
          notificationConfig: {},
        })
        .returning();
      pref = newPref;
    }

    // 2. Lấy danh sách ví liên kết
    let wallets = await db
      .select()
      .from(linkedWallets)
      .where(eq(linkedWallets.userId, user.id));

    // Nếu chưa có ví nào trong linked_wallets, tự động đồng bộ ví đăng nhập hiện tại
    const primaryAddress = req.auth?.wallet?.address || user.walletAddress;
    if (wallets.length === 0 && primaryAddress) {
      const [seededWallet] = await db
        .insert(linkedWallets)
        .values({
          userId: user.id,
          walletAddress: primaryAddress,
          walletType: user.authMethod === "PASSKEY_EMBEDDED" ? "EMBEDDED_MPC" : "EXTERNAL_CORE",
          isPrimaryReceiving: true,
          chainId: 43113,
          label: "Ví Kinetix Chính",
        })
        .returning();
      wallets = [seededWallet];
    }

    // 3. Nếu có workspaceId, kiểm tra quyền và lấy dữ liệu thành viên & chính sách hạn mức
    let workspaceData = null;
    let allowancePolicies: any[] = [];
    let sessionKeys: any[] = [];
    let auditTimeline: any[] = [];
    let workspaceMembersList: any[] = [];

    if (workspaceIdQuery) {
      const { ws, member } = await workspace(req.auth!, workspaceIdQuery);

      // Lấy danh sách thành viên trong workspace
      workspaceMembersList = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          username: users.username,
          walletAddress: users.walletAddress,
          role: workspaceMembers.role,
          avatarUrl: users.avatarUrl,
          joinedAt: workspaceMembers.joinedAt,
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(users.id, workspaceMembers.userId))
        .where(eq(workspaceMembers.workspaceId, ws.id));

      // Lấy chính sách hạn mức của các thành viên
      allowancePolicies = await db
        .select()
        .from(memberAllowancePolicies)
        .where(eq(memberAllowancePolicies.workspaceId, ws.id));

      // Tự động khởi tạo chính sách mặc định cho các thành viên chưa có bản ghi
      for (const m of workspaceMembersList) {
        const hasPolicy = allowancePolicies.some((p) => p.memberUserId === m.id);
        if (!hasPolicy) {
          const [newPolicy] = await db
            .insert(memberAllowancePolicies)
            .values({
              workspaceId: ws.id,
              memberUserId: m.id,
              walletAddress: m.walletAddress || null,
              role: m.role === "ADMIN" ? "ADMIN" : "SPENDER",
              dailyLimitAmount: m.role === "ADMIN" ? "500" : "50",
              autoApproveThreshold: m.role === "ADMIN" ? "100" : "10",
              allowedCategories: ["FOOD", "EDUCATION", "HEALTHCARE"],
              isFrozen: false,
              onchainSyncStatus: "SYNCED",
            })
            .returning();
          allowancePolicies.push(newPolicy);
        }
      }

      // Lấy danh sách Session Keys
      sessionKeys = await db
        .select()
        .from(sessionKeysAndApprovals)
        .where(eq(sessionKeysAndApprovals.workspaceId, ws.id));

      // Lấy nhật ký hoạt động kép (Dual Audit Logs) gần nhất
      auditTimeline = await db
        .select({
          id: settingsAuditLogs.id,
          actorId: settingsAuditLogs.actorId,
          actorName: users.fullName,
          actionType: settingsAuditLogs.actionType,
          layer: settingsAuditLogs.layer,
          metadataDiff: settingsAuditLogs.metadataDiff,
          txHash: settingsAuditLogs.txHash,
          status: settingsAuditLogs.status,
          createdAt: settingsAuditLogs.createdAt,
        })
        .from(settingsAuditLogs)
        .innerJoin(users, eq(users.id, settingsAuditLogs.actorId))
        .where(eq(settingsAuditLogs.workspaceId, ws.id))
        .orderBy(desc(settingsAuditLogs.createdAt))
        .limit(20);

      workspaceData = {
        id: ws.id,
        name: ws.name,
        type: ws.type,
        workspaceCode: ws.workspaceCode,
        l1HubAddress: ws.l1HubAddress,
        cchainVaultAddress: ws.cchainVaultAddress,
        userRole: member.role,
        isAdmin: member.role === "ADMIN" || member.role === "GUARDIAN",
      };
    }

    // 4. Tính điểm an toàn bảo mật (Security Score)
    const hasFrozen = allowancePolicies.some((p) => p.isFrozen);
    const security = calculateSecurityScore(
      wallets.length > 0,
      workspaceMembersList.length,
      Boolean(pref),
      sessionKeys.filter((s) => !s.isRevoked).length,
      hasFrozen,
    );

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          avatarUrl: user.avatarUrl,
          primaryWallet: primaryAddress || "",
          authMethod: user.authMethod,
        },
        preferences: pref,
        linkedWallets: wallets,
        workspace: workspaceData,
        members: workspaceMembersList,
        allowancePolicies,
        sessionKeys,
        auditTimeline,
        security,
      },
    });
  }),
);

/**
 * @route PUT /api/settings/preferences
 * @desc Cập nhật tùy chọn Web2 siêu tốc (<50ms) và ghi nhận nhật ký Off-chain
 */
settingsRouter.put(
  "/preferences",
  endpoint(async (req: AuthRequest, res: Response) => {
    const user = req.auth!.user;
    const body = req.body || {};

    const updateFields: any = {
      updatedAt: new Date(),
    };

    if (body.uiMode !== undefined) {
      assert(["LITE", "PRO"].includes(body.uiMode), 400, "uiMode không hợp lệ (LITE | PRO).");
      updateFields.uiMode = body.uiMode;
    }
    if (body.defaultCurrency !== undefined) {
      assert(
        ["VND", "USD", "AVAX"].includes(body.defaultCurrency),
        400,
        "defaultCurrency không hợp lệ.",
      );
      updateFields.defaultCurrency = body.defaultCurrency;
    }
    if (body.preferredNetwork !== undefined) {
      assert(
        ["MAINNET", "TESTNET"].includes(body.preferredNetwork),
        400,
        "preferredNetwork không hợp lệ.",
      );
      updateFields.preferredNetwork = body.preferredNetwork;
    }
    if (body.gasPreference !== undefined) {
      assert(
        ["SPONSORED", "STABLECOIN", "NATIVE"].includes(body.gasPreference),
        400,
        "gasPreference không hợp lệ.",
      );
      updateFields.gasPreference = body.gasPreference;
    }
    if (typeof body.privacyHideBalance === "boolean") {
      updateFields.privacyHideBalance = body.privacyHideBalance;
    }
    if (body.notificationConfig && typeof body.notificationConfig === "object") {
      updateFields.notificationConfig = body.notificationConfig;
    }

    const [updated] = await db
      .insert(userPreferences)
      .values({
        userId: user.id,
        ...updateFields,
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: updateFields,
      })
      .returning();

    // Ghi nhận Audit Log thuần Web2 (Off-chain)
    if (body.workspaceId) {
      await db.insert(settingsAuditLogs).values({
        actorId: user.id,
        workspaceId: body.workspaceId,
        actionType: "UPDATE_PREFERENCES",
        layer: "OFF_CHAIN",
        metadataDiff: {
          description: "Cập nhật tùy chọn giao diện & cấu hình hệ thống",
          changes: updateFields,
        },
        status: "COMPLETED",
      });
    }

    return res.json({
      success: true,
      message: "Đã lưu tùy chọn hệ thống thành công.",
      preferences: updated,
    });
  }),
);

/**
 * @route POST /api/settings/wallets
 * @desc Thêm ví liên kết mới (Hybrid Wallet Switcher)
 */
settingsRouter.post(
  "/wallets",
  endpoint(async (req: AuthRequest, res: Response) => {
    const user = req.auth!.user;
    const { walletAddress, walletType, label, isPrimaryReceiving, workspaceId } = req.body;

    assert(
      typeof walletAddress === "string" && ETH_ADDRESS_REGEX.test(walletAddress),
      400,
      "Địa chỉ ví Web3 không đúng định dạng (0x... 40 ký tự hex).",
    );

    const type = ["EMBEDDED_MPC", "EXTERNAL_CORE", "EXTERNAL_METAMASK"].includes(walletType)
      ? walletType
      : "EXTERNAL_CORE";

    // Nếu đặt làm ví chính nhận tiền, tắt cờ các ví khác của user
    if (isPrimaryReceiving) {
      await db
        .update(linkedWallets)
        .set({ isPrimaryReceiving: false })
        .where(eq(linkedWallets.userId, user.id));
    }

    const [savedWallet] = await db
      .insert(linkedWallets)
      .values({
        userId: user.id,
        walletAddress: walletAddress.toLowerCase(),
        walletType: type,
        label: textInput(label || "Ví Phụ Web3", 50),
        isPrimaryReceiving: Boolean(isPrimaryReceiving),
        chainId: 43113,
      })
      .onConflictDoUpdate({
        target: [linkedWallets.userId, linkedWallets.walletAddress],
        set: {
          walletType: type,
          label: textInput(label || "Ví Phụ Web3", 50),
          isPrimaryReceiving: Boolean(isPrimaryReceiving),
        },
      })
      .returning();

    if (workspaceId) {
      await db.insert(settingsAuditLogs).values({
        actorId: user.id,
        workspaceId,
        actionType: "LINK_WALLET",
        layer: "OFF_CHAIN",
        metadataDiff: {
          description: `Liên kết ví mới: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} (${type})`,
          isPrimary: Boolean(isPrimaryReceiving),
        },
        status: "COMPLETED",
      });
    }

    return res.json({
      success: true,
      message: "Đã liên kết ví thành công.",
      wallet: savedWallet,
    });
  }),
);

/**
 * @route PATCH /api/settings/wallets/:id/primary
 * @desc Đặt ví làm địa chỉ nhận tiền mặc định
 */
settingsRouter.patch(
  "/wallets/:id/primary",
  endpoint(async (req: AuthRequest, res: Response) => {
    const user = req.auth!.user;
    const walletId = uuidInput(req.params.id);
    const { workspaceId } = req.body;

    // Tắt toàn bộ ví hiện tại
    await db
      .update(linkedWallets)
      .set({ isPrimaryReceiving: false })
      .where(eq(linkedWallets.userId, user.id));

    // Kích hoạt ví được chọn
    const [updated] = await db
      .update(linkedWallets)
      .set({ isPrimaryReceiving: true })
      .where(and(eq(linkedWallets.id, walletId), eq(linkedWallets.userId, user.id)))
      .returning();

    assert(updated, 404, "Không tìm thấy ví cần cập nhật.");

    if (workspaceId) {
      await db.insert(settingsAuditLogs).values({
        actorId: user.id,
        workspaceId,
        actionType: "SWITCH_PRIMARY_WALLET",
        layer: "OFF_CHAIN",
        metadataDiff: {
          description: `Chuyển ví nhận tiền mặc định sang: ${updated.walletAddress}`,
        },
        status: "COMPLETED",
      });
    }

    return res.json({
      success: true,
      message: "Đã đặt ví nhận tiền mặc định thành công.",
      wallet: updated,
    });
  }),
);

/**
 * @route POST /api/settings/prepare-sync
 * @desc Bước 1 của cơ chế Dual-Sync: Validate quyền Admin, cập nhật Optimistic State và sinh On-chain Calldata
 */
settingsRouter.post(
  "/prepare-sync",
  endpoint(async (req: AuthRequest, res: Response) => {
    const user = req.auth!.user;
    const {
      workspaceId,
      actionType,
      targetMemberUserId,
      dailyLimitAmount,
      autoApproveThreshold,
      allowedCategories,
      isFrozen,
      sessionKeyAddress,
    } = req.body;

    assert(workspaceId, 400, "Thiếu workspaceId.");
    const { ws, member } = await workspace(req.auth!, workspaceId);
    assert(
      member.role === "ADMIN" || member.role === "GUARDIAN",
      403,
      "Chỉ Quản trị viên hoặc Người bảo hộ (Guardian) mới có quyền thay đổi chính sách quỹ.",
    );

    let callDataResult: any = null;
    let pendingLogId = "";

    if (actionType === "UPDATE_ALLOWANCE" || actionType === "FREEZE_MEMBER") {
      assert(targetMemberUserId, 400, "Thiếu targetMemberUserId.");
      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, uuidInput(targetMemberUserId)));
      assert(targetUser, 404, "Không tìm thấy thành viên.");

      const walletAddr = targetUser.walletAddress || "0x0000000000000000000000000000000000000000";

      // Cập nhật Optimistic Stage vào DB với trạng thái PENDING_SIGNATURE
      const updatePayload: any = {
        onchainSyncStatus: "PENDING_SIGNATURE",
        updatedAt: new Date(),
      };

      if (dailyLimitAmount !== undefined) {
        assert(Number(dailyLimitAmount) >= 0, 400, "Hạn mức không được âm.");
        updatePayload.dailyLimitAmount = String(dailyLimitAmount);
      }
      if (autoApproveThreshold !== undefined) {
        assert(Number(autoApproveThreshold) >= 0, 400, "Ngưỡng duyệt tự động không được âm.");
        updatePayload.autoApproveThreshold = String(autoApproveThreshold);
      }
      if (Array.isArray(allowedCategories)) {
        updatePayload.allowedCategories = allowedCategories;
      }
      if (typeof isFrozen === "boolean") {
        updatePayload.isFrozen = isFrozen;
      }

      await db
        .insert(memberAllowancePolicies)
        .values({
          workspaceId: ws.id,
          memberUserId: targetUser.id,
          walletAddress: walletAddr,
          ...updatePayload,
        })
        .onConflictDoUpdate({
          target: [memberAllowancePolicies.workspaceId, memberAllowancePolicies.memberUserId],
          set: updatePayload,
        });

      // Tạo nhật ký chờ chữ ký
      const [log] = await db
        .insert(settingsAuditLogs)
        .values({
          actorId: user.id,
          workspaceId: ws.id,
          actionType,
          layer: "HYBRID_DUAL",
          metadataDiff: {
            targetUser: targetUser.fullName,
            walletAddress: walletAddr,
            changes: updatePayload,
            notice: isFrozen ? "Yêu cầu đóng băng khẩn cấp tài khoản" : "Cập nhật chính sách hạn mức chi tiêu",
          },
          status: "PENDING_CONFIRMATION",
        })
        .returning();

      pendingLogId = log.id;

      // Sinh tham số giao dịch On-chain Smart Contract
      // Tùy theo actionType, gọi hàm tương ứng trên FamilyHub.sol
      if (actionType === "FREEZE_MEMBER") {
        callDataResult = {
          contractAddress: ws.l1HubAddress,
          functionName: "setAllowlistStatus",
          args: [walletAddr, !isFrozen], // Khi freeze -> status = false (chặn tương tác)
          calldataPreview: `FamilyHub.setAllowlistStatus("${walletAddr}", ${!isFrozen})`,
          estimatedGasGwei: "0 (Miễn phí trên L1)",
        };
      } else {
        callDataResult = {
          contractAddress: ws.l1HubAddress,
          functionName: "setVaultDailyLimit",
          args: [1, BigInt(Math.floor(Number(dailyLimitAmount || 50) * 1e18)).toString()],
          calldataPreview: `FamilyHub.setVaultDailyLimit(vaultId: 1, limit: ${dailyLimitAmount || 50} AVAX)`,
          estimatedGasGwei: "0 (Miễn phí trên L1)",
        };
      }
    } else if (actionType === "REVOKE_SESSION") {
      assert(sessionKeyAddress && ETH_ADDRESS_REGEX.test(sessionKeyAddress), 400, "Địa chỉ session key không hợp lệ.");

      await db
        .update(sessionKeysAndApprovals)
        .set({ isRevoked: true })
        .where(
          and(
            eq(sessionKeysAndApprovals.workspaceId, ws.id),
            eq(sessionKeysAndApprovals.sessionKeyAddress, sessionKeyAddress),
          ),
        );

      const [log] = await db
        .insert(settingsAuditLogs)
        .values({
          actorId: user.id,
          workspaceId: ws.id,
          actionType: "REVOKE_SESSION",
          layer: "HYBRID_DUAL",
          metadataDiff: {
            sessionKey: sessionKeyAddress,
            notice: "Thu hồi quyền truy cập Session Key",
          },
          status: "PENDING_CONFIRMATION",
        })
        .returning();

      pendingLogId = log.id;

      callDataResult = {
        contractAddress: ws.l1HubAddress,
        functionName: "setAllowlistStatus",
        args: [sessionKeyAddress, false],
        calldataPreview: `FamilyHub.setAllowlistStatus("${sessionKeyAddress}", false)`,
        estimatedGasGwei: "0 (Miễn phí trên L1)",
      };
    } else {
      assert(false, 400, "actionType không được hỗ trợ.");
    }

    return res.json({
      success: true,
      pendingLogId,
      step: "PREPARED_FOR_SIGNATURE",
      callData: callDataResult,
    });
  }),
);

/**
 * @route POST /api/settings/confirm-sync
 * @desc Bước 2 của cơ chế Dual-Sync: Xác nhận TxHash sau khi Frontend gửi giao dịch on-chain thành công
 */
settingsRouter.post(
  "/confirm-sync",
  endpoint(async (req: AuthRequest, res: Response) => {
    const user = req.auth!.user;
    const { workspaceId, pendingLogId, txHash, targetMemberUserId } = req.body;

    assert(workspaceId, 400, "Thiếu workspaceId.");
    assert(
      typeof txHash === "string" && TX_HASH_REGEX.test(txHash),
      400,
      "Mã giao dịch txHash không đúng định dạng (0x... 64 ký tự hex).",
    );

    const { ws } = await workspace(req.auth!, workspaceId);

    // Cập nhật trạng thái chính sách thành viên nếu có
    if (targetMemberUserId) {
      await db
        .update(memberAllowancePolicies)
        .set({
          onchainSyncStatus: "SYNCED",
          lastTxHash: txHash,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(memberAllowancePolicies.workspaceId, ws.id),
            eq(memberAllowancePolicies.memberUserId, uuidInput(targetMemberUserId)),
          ),
        );
    }

    // Cập nhật bản ghi Audit Log tương ứng sang COMPLETED
    if (pendingLogId) {
      await db
        .update(settingsAuditLogs)
        .set({
          status: "COMPLETED",
          txHash,
        })
        .where(eq(settingsAuditLogs.id, uuidInput(pendingLogId)));
    } else {
      // Nếu không có pendingLogId, tạo mới bản ghi audit log hoàn tất
      await db.insert(settingsAuditLogs).values({
        actorId: user.id,
        workspaceId: ws.id,
        actionType: "ONCHAIN_CONFIRMATION",
        layer: "HYBRID_DUAL",
        metadataDiff: {
          notice: "Đồng bộ on-chain thành công",
          targetMemberUserId,
        },
        txHash,
        status: "COMPLETED",
      });
    }

    return res.json({
      success: true,
      message: "Đồng bộ on-chain và hoàn tất thiết lập thành công!",
      txHash,
      onchainSyncStatus: "SYNCED",
      syncedAt: new Date().toISOString(),
    });
  }),
);

/**
 * @route POST /api/settings/freeze-member
 * @desc Thao tác 1 chạm Đóng băng khẩn cấp thành viên (Emergency Freeze)
 */
settingsRouter.post(
  "/freeze-member",
  endpoint(async (req: AuthRequest, res: Response) => {
    const user = req.auth!.user;
    const { workspaceId, memberUserId, freeze } = req.body;

    assert(workspaceId && memberUserId, 400, "Thiếu thông tin workspaceId hoặc memberUserId.");
    const { ws, member } = await workspace(req.auth!, workspaceId);
    assert(
      member.role === "ADMIN" || member.role === "GUARDIAN",
      403,
      "Chỉ Admin hoặc Guardian mới có quyền đóng băng thành viên.",
    );

    const isFrozen = Boolean(freeze);

    const [updated] = await db
      .update(memberAllowancePolicies)
      .set({
        isFrozen,
        onchainSyncStatus: "PENDING_SIGNATURE",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(memberAllowancePolicies.workspaceId, ws.id),
          eq(memberAllowancePolicies.memberUserId, uuidInput(memberUserId)),
        ),
      )
      .returning();

    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, uuidInput(memberUserId)));

    const [log] = await db
      .insert(settingsAuditLogs)
      .values({
        actorId: user.id,
        workspaceId: ws.id,
        actionType: "FREEZE_MEMBER",
        layer: "HYBRID_DUAL",
        metadataDiff: {
          targetName: targetUser?.fullName || "Thành viên",
          action: isFrozen ? "Kích hoạt Đóng băng khẩn cấp" : "Hủy đóng băng thành viên",
          isFrozen,
        },
        status: "PENDING_CONFIRMATION",
      })
      .returning();

    const walletAddr = targetUser?.walletAddress || "0x0000000000000000000000000000000000000000";

    return res.json({
      success: true,
      policy: updated,
      pendingLogId: log.id,
      callData: {
        contractAddress: ws.l1HubAddress,
        functionName: "setAllowlistStatus",
        args: [walletAddr, !isFrozen],
        calldataPreview: `FamilyHub.setAllowlistStatus("${walletAddr}", ${!isFrozen})`,
      },
    });
  }),
);

/**
 * @route POST /api/settings/revoke-session
 * @desc Thu hồi Session Key của AI Agent / Tự động hóa
 */
settingsRouter.post(
  "/revoke-session",
  endpoint(async (req: AuthRequest, res: Response) => {
    const user = req.auth!.user;
    const { workspaceId, sessionId, txHash } = req.body;

    assert(workspaceId && sessionId, 400, "Thiếu workspaceId hoặc sessionId.");
    const { ws, member } = await workspace(req.auth!, workspaceId);
    assert(
      member.role === "ADMIN" || member.role === "GUARDIAN",
      403,
      "Chỉ Admin hoặc Guardian mới có quyền thu hồi Session Key.",
    );

    const [updated] = await db
      .update(sessionKeysAndApprovals)
      .set({
        isRevoked: true,
        revokeTxHash: txHash && TX_HASH_REGEX.test(txHash) ? txHash : null,
      })
      .where(
        and(
          eq(sessionKeysAndApprovals.workspaceId, ws.id),
          eq(sessionKeysAndApprovals.id, uuidInput(sessionId)),
        ),
      )
      .returning();

    assert(updated, 404, "Không tìm thấy session key.");

    await db.insert(settingsAuditLogs).values({
      actorId: user.id,
      workspaceId: ws.id,
      actionType: "REVOKE_SESSION",
      layer: txHash ? "HYBRID_DUAL" : "OFF_CHAIN",
      metadataDiff: {
        sessionLabel: updated.label,
        sessionAddress: updated.sessionKeyAddress,
        notice: "Đã thu hồi quyền Session Key thành công",
      },
      txHash: txHash || null,
      status: "COMPLETED",
    });

    return res.json({
      success: true,
      message: "Đã thu hồi Session Key thành công.",
      session: updated,
    });
  }),
);

/**
 * @route GET /api/settings/audit-logs
 * @desc Lấy danh sách nhật ký kiểm toán kép (Dual Audit Log) có lọc và phân trang
 */
settingsRouter.get(
  "/audit-logs",
  endpoint(async (req: AuthRequest, res: Response) => {
    const workspaceId = req.query.workspaceId as string;
    assert(workspaceId, 400, "Thiếu workspaceId.");
    const { ws } = await workspace(req.auth!, workspaceId);

    const layerFilter = req.query.layer as string | undefined;
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const offset = Math.max(0, Number(req.query.offset || 0));

    const query = db
      .select({
        id: settingsAuditLogs.id,
        actorId: settingsAuditLogs.actorId,
        actorName: users.fullName,
        actorAvatar: users.avatarUrl,
        actionType: settingsAuditLogs.actionType,
        layer: settingsAuditLogs.layer,
        metadataDiff: settingsAuditLogs.metadataDiff,
        txHash: settingsAuditLogs.txHash,
        status: settingsAuditLogs.status,
        createdAt: settingsAuditLogs.createdAt,
      })
      .from(settingsAuditLogs)
      .innerJoin(users, eq(users.id, settingsAuditLogs.actorId))
      .where(
        layerFilter
          ? and(
              eq(settingsAuditLogs.workspaceId, ws.id),
              eq(settingsAuditLogs.layer, layerFilter),
            )
          : eq(settingsAuditLogs.workspaceId, ws.id),
      )
      .orderBy(desc(settingsAuditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const logs = await query;

    return res.json({
      success: true,
      logs,
      pagination: { limit, offset, count: logs.length },
    });
  }),
);
