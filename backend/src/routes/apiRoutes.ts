import { Router, Request, Response } from "express";
import { FamilyService } from "../services/familyService";
import { db } from "../db";
import { families, workspaces, vaults, users, notifications } from "../db/schema";
import { eq } from "drizzle-orm";

export const apiRouter = Router();

/**
 * POST /api/auth/sync-wallet
 * Đồng bộ hoặc khởi tạo thành viên theo ví Avalanche Core
 */
apiRouter.post("/auth/sync-wallet", async (req: Request, res: Response) => {
  try {
    const { walletAddress, fullName } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress is required" });
    }

    const result = await FamilyService.syncWallet(walletAddress, fullName);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Lỗi sync-wallet:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

/**
 * POST /api/withdrawals/create
 * Tạo yêu cầu rút tiền mới
 */
apiRouter.post("/withdrawals/create", async (req: Request, res: Response) => {
  try {
    const { familyId, requesterId, amount, vault, reason, onchainRequestId } = req.body;

    if (!familyId || !requesterId || amount === undefined || !vault || !reason) {
      return res.status(400).json({
        error: "Missing required fields: familyId, requesterId, amount, vault, reason",
      });
    }

    const result = await FamilyService.createWithdrawalRequest({
      familyId,
      requesterId,
      amount: Number(amount),
      vault,
      reason,
      onchainRequestId: onchainRequestId ? Number(onchainRequestId) : undefined,
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Lỗi create withdrawal:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

/**
 * POST /api/withdrawals/approve
 * Guardian ký duyệt yêu cầu rút tiền lớn
 */
apiRouter.post("/withdrawals/approve", async (req: Request, res: Response) => {
  try {
    const { requestId, guardianWallet } = req.body;
    if (!requestId) {
      return res.status(400).json({ error: "requestId is required" });
    }

    const result = await FamilyService.approveWithdrawal(requestId, guardianWallet);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Lỗi approve withdrawal:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

/**
 * POST /api/chores/submit
 * Trẻ em nộp bằng chứng hoàn thành việc nhà
 */
apiRouter.post("/chores/submit", async (req: Request, res: Response) => {
  try {
    const { choreId, proofImageUrl } = req.body;
    if (!choreId) {
      return res.status(400).json({ error: "choreId is required" });
    }

    const result = await FamilyService.submitChore(choreId, proofImageUrl);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Lỗi submit chore:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

/**
 * POST /api/chores/verify
 * Bố mẹ xác nhận và trả thưởng cho con
 */
apiRouter.post("/chores/verify", async (req: Request, res: Response) => {
  try {
    const { choreId } = req.body;
    if (!choreId) {
      return res.status(400).json({ error: "choreId is required" });
    }

    const result = await FamilyService.verifyAndRewardChore(choreId);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Lỗi verify chore:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

/**
 * GET /api/families/:id
 * Lấy thông tin gia đình kèm danh sách thành viên
 */
apiRouter.get("/families/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [family] = await db.select().from(families).where(eq(families.id, id));

    if (!family) {
      return res.status(404).json({ error: "Family not found" });
    }

    const members = await db.select().from(users).where(eq(users.familyId, id));

    return res.status(200).json({
      success: true,
      data: {
        family,
        members,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/withdrawals/:familyId
 * Danh sách yêu cầu rút tiền của gia đình
 */
apiRouter.get("/withdrawals/:familyId", async (req: Request, res: Response) => {
  try {
    const { familyId } = req.params;
    const list = await FamilyService.getFamilyWithdrawals(familyId);
    return res.status(200).json({ success: true, data: list });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/chores/:familyId
 * Danh sách việc nhà của gia đình
 */
apiRouter.get("/chores/:familyId", async (req: Request, res: Response) => {
  try {
    const { familyId } = req.params;
    const list = await FamilyService.getFamilyChores(familyId);
    return res.status(200).json({ success: true, data: list });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/notifications/:userId
 * Danh sách thông báo của người dùng
 */
apiRouter.get("/notifications/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const list = await FamilyService.getUserNotifications(userId);
    return res.status(200).json({ success: true, data: list });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Đánh dấu thông báo đã đọc
 */
apiRouter.patch("/notifications/:id/read", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workspaces
 */
apiRouter.get("/workspaces", async (req: Request, res: Response) => {
  try {
    const list = await db.select().from(workspaces);
    return res.status(200).json({ success: true, workspaces: list });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workspaces/:id
 */
apiRouter.get("/workspaces/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const details = await FamilyService.getWorkspaceDetails(id);
    if (!details) {
      return res.status(404).json({ error: "Workspace not found" });
    }
    return res.status(200).json({ success: true, data: details });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/vaults
 */
apiRouter.get("/vaults", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    if (workspaceId && typeof workspaceId === "string") {
      const list = await db.select().from(vaults).where(eq(vaults.workspaceId, workspaceId));
      return res.status(200).json({ success: true, vaults: list });
    }
    const list = await db.select().from(vaults);
    return res.status(200).json({ success: true, vaults: list });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/vaults
 * Cập nhật số dư Hũ tiền (Nạp / Rút / Đồng bộ)
 */
apiRouter.patch("/vaults", async (req: Request, res: Response) => {
  try {
    const { vaultId, onchainVaultId, action, amount, newTotalBalance, newL1Buffer, newCChainYield } = req.body;
    const updated = await FamilyService.updateVaultBalance({
      vaultId,
      onchainVaultId: onchainVaultId !== undefined ? Number(onchainVaultId) : undefined,
      action,
      amount: amount !== undefined ? Number(amount) : undefined,
      newTotalBalance,
      newL1Buffer,
      newCChainYield,
    });
    return res.status(200).json({ success: true, vault: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

