import { db } from "@/db";
import {
  workspaces,
  users,
  workspaceMembers,
  vaults,
  vaultMembers,
  withdrawalRequests,
  chores,
  notifications,
  User,
  Workspace,
  WorkspaceMember,
  Vault,
  WithdrawalRequest,
  Chore,
  Notification,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * @title FamilyService
 * @notice Service xử lý toàn bộ logic nghiệp vụ backend của Kinetix (Multi-Space & Dynamic Vaults) trong Next.js API Routes
 */
export class FamilyService {
  /**
   * 1. Đồng bộ ví người dùng (Avalanche Core Wallet)
   */
  static async syncWallet(walletAddress: string, preferredFullName?: string): Promise<{
    user: User;
    family: Workspace;
    workspaces: Workspace[];
  }> {
    const normalizedWallet = walletAddress.toLowerCase();

    const existingUsers = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.walletAddress}) = ${normalizedWallet}`);

    if (existingUsers.length > 0) {
      const user = existingUsers[0];

      const memberRows = await db
        .select({
          workspace: workspaces,
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(eq(workspaceMembers.userId, user.id));

      let userWorkspaces = memberRows.map((r) => r.workspace);

      if (userWorkspaces.length === 0 && user.familyId) {
        const [defaultFam] = await db
          .select()
          .from(workspaces)
          .where(eq(workspaces.id, user.familyId));
        if (defaultFam) {
          userWorkspaces = [defaultFam];
        }
      }

      let currentFamily = userWorkspaces[0];
      if (!currentFamily) {
        const [firstFam] = await db.select().from(workspaces).limit(1);
        currentFamily = firstFam;
        if (currentFamily) {
          userWorkspaces = [currentFamily];
          await db.insert(workspaceMembers).values({
            workspaceId: currentFamily.id,
            userId: user.id,
            role: user.role,
          });
        }
      }

      return { user, family: currentFamily, workspaces: userWorkspaces };
    }

    let targetWorkspace: Workspace;
    const existingWorkspaces = await db.select().from(workspaces).limit(1);

    if (existingWorkspaces.length > 0) {
      targetWorkspace = existingWorkspaces[0];
    } else {
      const [newWs] = await db
        .insert(workspaces)
        .values({
          name: "Đại Gia Đình Kinetix",
          workspaceCode: `KNTX-${Math.floor(1000 + Math.random() * 9000)}`,
          type: "FAMILY",
          creatorWallet: walletAddress,
        })
        .returning();
      targetWorkspace = newWs;
    }

    const [newUser] = await db
      .insert(users)
      .values({
        familyId: targetWorkspace.id,
        fullName: preferredFullName || `Thành viên (${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)})`,
        role: "GUARDIAN",
        defaultRole: "GUARDIAN",
        walletAddress: walletAddress,
        authMethod: "CORE_WALLET",
        isAllowlisted: true,
      })
      .returning();

    await db.insert(workspaceMembers).values({
      workspaceId: targetWorkspace.id,
      userId: newUser.id,
      role: "GUARDIAN",
    });

    return { user: newUser, family: targetWorkspace, workspaces: [targetWorkspace] };
  }

  /**
   * 2. Lấy danh sách Workspaces của một User
   */
  static async getWorkspacesByUser(userId: string): Promise<Workspace[]> {
    const rows = await db
      .select({
        workspace: workspaces,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, userId));

    return rows.map((r) => r.workspace);
  }

  /**
   * 3. Lấy chi tiết Workspace kèm danh sách Hũ Động và Thành viên
   */
  static async getWorkspaceDetails(workspaceId: string) {
    const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
    if (!ws) return null;

    const memberRows = await db
      .select({
        user: users,
        role: workspaceMembers.role,
        joinedAt: workspaceMembers.joinedAt,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, workspaceId));

    const vaultList = await db
      .select()
      .from(vaults)
      .where(eq(vaults.workspaceId, workspaceId));

    return {
      workspace: ws,
      members: memberRows,
      vaults: vaultList,
    };
  }

  /**
   * 4. Tạo Hũ tiền Động (Dynamic Vault)
   */
  static async createCustomVault(params: {
    workspaceId: string;
    onchainVaultId: number;
    name: string;
    description?: string;
    ruleTemplate: "SHIELD" | "MILESTONE" | "ROSCA" | "SHARED_GOAL";
    bufferRatioBps?: number;
    fastWithdrawLimit?: number;
    requiredApprovals?: number;
    creatorUserId?: string;
    guardianUserIds?: string[];
    beneficiaryUserIds?: string[];
  }): Promise<Vault> {
    const [newVault] = await db
      .insert(vaults)
      .values({
        workspaceId: params.workspaceId,
        onchainVaultId: params.onchainVaultId,
        name: params.name,
        description: params.description || "",
        ruleTemplate: params.ruleTemplate,
        bufferRatioBps: params.bufferRatioBps ?? 1000,
        fastWithdrawLimit: (params.fastWithdrawLimit ?? 50).toString(),
        requiredApprovals: params.requiredApprovals ?? 2,
        cachedTotalBalance: "0",
        cachedL1Buffer: "0",
        cachedCChainYield: "0",
        isActive: true,
      })
      .returning();

    if (params.guardianUserIds && params.guardianUserIds.length > 0) {
      for (const gId of params.guardianUserIds) {
        await db.insert(vaultMembers).values({
          vaultId: newVault.id,
          userId: gId,
          vaultRole: "GUARDIAN",
        });
      }
    }

    if (params.beneficiaryUserIds && params.beneficiaryUserIds.length > 0) {
      for (const bId of params.beneficiaryUserIds) {
        await db.insert(vaultMembers).values({
          vaultId: newVault.id,
          userId: bId,
          vaultRole: "BENEFICIARY",
        });
      }
    }

    return newVault;
  }

  /**
   * 5. Khởi tạo yêu cầu rút tiền (Withdrawal Request)
   */
  static async createWithdrawalRequest(params: {
    familyId: string;
    requesterId: string;
    amount: number;
    vault?: string;
    vaultId?: string;
    reason: string;
    onchainRequestId?: number;
  }): Promise<{
    request: WithdrawalRequest;
    isFastWithdraw: boolean;
  }> {
    let fastLimit = 50;
    let requiredApprovals = 2;

    if (params.vaultId) {
      const [v] = await db.select().from(vaults).where(eq(vaults.id, params.vaultId));
      if (v) {
        fastLimit = Number(v.fastWithdrawLimit);
        requiredApprovals = v.requiredApprovals;
      }
    }

    const isLargeWithdrawal = params.amount > fastLimit;
    const initialStatus = isLargeWithdrawal ? "PENDING" : "EXECUTED";

    const [request] = await db
      .insert(withdrawalRequests)
      .values({
        familyId: params.familyId,
        vaultId: params.vaultId || null,
        requesterId: params.requesterId,
        amount: params.amount.toFixed(6),
        vault: params.vault || "SHIELD",
        reason: params.reason,
        onchainRequestId: params.onchainRequestId || null,
        approvalsCount: isLargeWithdrawal ? 0 : requiredApprovals,
        requiredApprovals: requiredApprovals,
        status: initialStatus,
      })
      .returning();

    if (isLargeWithdrawal) {
      const guardians = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.familyId, params.familyId),
            sql`${users.role} IN ('ADMIN', 'GUARDIAN')`
          )
        );

      const [requester] = await db
        .select()
        .from(users)
        .where(eq(users.id, params.requesterId));

      const requesterName = requester ? requester.fullName : "Người thân";

      for (const guardian of guardians) {
        await db.insert(notifications).values({
          familyId: params.familyId,
          userId: guardian.id,
          title: "🚨 CẢNH BÁO RÚT TIỀN LỚN!",
          message: `Phát hiện lệnh rút ${params.amount} AVAX từ ${requesterName} (Hũ ${params.vault || "Bảo vệ"}). Lý do: '${params.reason}'. Hãy kiểm tra và ký duyệt bảo vệ tài sản!`,
          type: "ALERT_SCAM",
          isRead: false,
        });
      }
    }

    return { request, isFastWithdraw: !isLargeWithdrawal };
  }

  /**
   * 6. Guardian ký duyệt yêu cầu rút tiền lớn (Multisig Approval)
   */
  static async approveWithdrawal(requestId: string, guardianWallet?: string): Promise<{
    request: WithdrawalRequest;
    isReadyToExecute: boolean;
  }> {
    const [existing] = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.id, requestId));

    if (!existing) {
      throw new Error(`Withdrawal request with ID ${requestId} not found.`);
    }

    if (existing.status === "EXECUTED") {
      throw new Error("Request has already been executed on-chain.");
    }

    const nextApprovals = existing.approvalsCount + 1;
    const isApproved = nextApprovals >= existing.requiredApprovals;
    const updatedStatus = isApproved ? "APPROVED" : "PENDING";

    const [updated] = await db
      .update(withdrawalRequests)
      .set({
        approvalsCount: nextApprovals,
        status: updatedStatus,
      })
      .where(eq(withdrawalRequests.id, requestId))
      .returning();

    const [requester] = await db
      .select()
      .from(users)
      .where(eq(users.id, existing.requesterId));

    if (requester) {
      await db.insert(notifications).values({
        familyId: existing.familyId,
        userId: requester.id,
        title: isApproved ? "✅ YÊU CẦU ĐÃ ĐƯỢC PHÊ DUYỆT ĐỦ CHỮ KÝ" : "⏳ TIẾN TRÌNH KÝ DUYỆT MỚI",
        message: isApproved
          ? `Yêu cầu rút ${existing.amount} AVAX của bạn đã được các con phê duyệt đủ ${existing.requiredApprovals} chữ ký. Tiền đang được giải ngân về ví!`
          : `Yêu cầu rút ${existing.amount} AVAX vừa nhận thêm 1 chữ ký bảo hộ (${nextApprovals}/${existing.requiredApprovals}).`,
        type: "APPROVAL_NEEDED",
        isRead: false,
      });
    }

    return { request: updated, isReadyToExecute: isApproved };
  }

  /**
   * 7. Tạo nhiệm vụ việc nhà mới (Chore-to-Earn gắn liền với Hũ MILESTONE)
   */
  static async createChore(params: {
    familyId: string;
    vaultId?: string;
    childId: string;
    title: string;
    description?: string;
    rewardAmount: number;
    onchainTaskId?: number;
  }): Promise<Chore> {
    const [newChore] = await db
      .insert(chores)
      .values({
        familyId: params.familyId,
        vaultId: params.vaultId || null,
        childId: params.childId,
        title: params.title,
        description: params.description || null,
        rewardAmount: params.rewardAmount.toFixed(6),
        onchainTaskId: params.onchainTaskId || null,
        status: "TODO",
      })
      .returning();
    return newChore;
  }

  /**
   * 8. Trẻ em nộp báo cáo hoàn thành việc nhà (Chore-to-Earn)
   */
  static async submitChore(choreId: string, proofImageUrl?: string): Promise<Chore> {
    const [existing] = await db
      .select()
      .from(chores)
      .where(eq(chores.id, choreId));

    if (!existing) {
      throw new Error(`Chore with ID ${choreId} not found.`);
    }

    const [updated] = await db
      .update(chores)
      .set({
        status: "SUBMITTED",
        proofImageUrl: proofImageUrl || existing.proofImageUrl,
      })
      .where(eq(chores.id, choreId))
      .returning();

    const admins = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.familyId, existing.familyId),
          eq(users.role, "ADMIN")
        )
      );

    const [child] = await db
      .select()
      .from(users)
      .where(eq(users.id, existing.childId));

    for (const admin of admins) {
      await db.insert(notifications).values({
        familyId: existing.familyId,
        userId: admin.id,
        title: "🎒 BÉ NỘP BÁO CÁO VIỆC NHÀ",
        message: `Bé ${child?.fullName || "Na"} vừa hoàn thành việc nhà '${existing.title}'. Hãy xác nhận để trả thưởng ${existing.rewardAmount} AVAX!`,
        type: "TASK_COMPLETED",
        isRead: false,
      });
    }

    return updated;
  }

  /**
   * 8. Bố mẹ nghiệm thu và trả thưởng việc nhà
   */
  static async verifyAndRewardChore(choreId: string): Promise<Chore> {
    const [existing] = await db
      .select()
      .from(chores)
      .where(eq(chores.id, choreId));

    if (!existing) {
      throw new Error(`Chore with ID ${choreId} not found.`);
    }

    const [updated] = await db
      .update(chores)
      .set({
        status: "REWARDED",
      })
      .where(eq(chores.id, choreId))
      .returning();

    await db.insert(notifications).values({
      familyId: existing.familyId,
      userId: existing.childId,
      title: "🎉 NHẬN THƯỞNG VIỆC NHÀ THÀNH CÔNG!",
      message: `Bố mẹ đã duyệt nhiệm vụ '${existing.title}'. Tiền thưởng ${existing.rewardAmount} AVAX đã được tích lũy vào ví của bạn!`,
      type: "TASK_COMPLETED",
      isRead: false,
    });

    return updated;
  }

  /**
   * 9. Lấy danh sách thông báo theo User
   */
  static async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  /**
   * 10. Lấy danh sách yêu cầu rút tiền của Không gian / Gia đình
   */
  static async getFamilyWithdrawals(familyId: string) {
    return await db
      .select({
        id: withdrawalRequests.id,
        familyId: withdrawalRequests.familyId,
        vaultId: withdrawalRequests.vaultId,
        requesterId: withdrawalRequests.requesterId,
        amount: withdrawalRequests.amount,
        vault: withdrawalRequests.vault,
        reason: withdrawalRequests.reason,
        onchainRequestId: withdrawalRequests.onchainRequestId,
        approvalsCount: withdrawalRequests.approvalsCount,
        requiredApprovals: withdrawalRequests.requiredApprovals,
        status: withdrawalRequests.status,
        txHash: withdrawalRequests.txHash,
        createdAt: withdrawalRequests.createdAt,
      })
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.familyId, familyId))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  /**
   * 11. Lấy danh sách nhiệm vụ Chore-to-Earn của Không gian / Gia đình
   */
  static async getFamilyChores(familyId: string) {
    return await db
      .select()
      .from(chores)
      .where(eq(chores.familyId, familyId))
      .orderBy(desc(chores.createdAt));
  }
}
