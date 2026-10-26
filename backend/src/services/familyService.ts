import { db } from "../db";
import {
  families,
  users,
  withdrawalRequests,
  chores,
  notifications,
  User,
  Family,
  WithdrawalRequest,
  Chore,
  Notification,
} from "../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * @title FamilyService
 * @notice Service xử lý toàn bộ logic nghiệp vụ backend của Kinetix
 */
export class FamilyService {
  /**
   * 1. Đồng bộ ví người dùng (Avalanche Core Wallet)
   * Kiểm tra ví kết nối, nếu chưa có thì gán vào gia đình mặc định hoặc tạo mới
   */
  static async syncWallet(walletAddress: string, preferredFullName?: string): Promise<{
    user: User;
    family: Family;
  }> {
    const normalizedWallet = walletAddress.toLowerCase();

    // Tìm kiếm user theo địa chỉ ví (không phân biệt hoa thường)
    const existingUsers = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.walletAddress}) = ${normalizedWallet}`);

    if (existingUsers.length > 0) {
      const user = existingUsers[0];
      const [family] = await db
        .select()
        .from(families)
        .where(eq(families.id, user.familyId));

      return { user, family };
    }

    // Nếu chưa có, tìm gia đình mặc định đầu tiên hoặc tạo gia đình mới
    let targetFamily: Family;
    const existingFamilies = await db.select().from(families).limit(1);

    if (existingFamilies.length > 0) {
      targetFamily = existingFamilies[0];
    } else {
      const [newFam] = await db
        .insert(families)
        .values({
          name: "Gia đình Kinetix",
          familyCode: `KNTX-${Math.floor(1000 + Math.random() * 9000)}`,
          adminWallet: walletAddress,
        })
        .returning();
      targetFamily = newFam;
    }

    // Tạo tài khoản user mới
    const [newUser] = await db
      .insert(users)
      .values({
        familyId: targetFamily.id,
        fullName: preferredFullName || `Thành viên (${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)})`,
        role: "GUARDIAN", // Mặc định là Guardian nếu tự kết nối
        walletAddress: walletAddress,
        authMethod: "CORE_WALLET",
        isAllowlisted: true,
      })
      .returning();

    return { user: newUser, family: targetFamily };
  }

  /**
   * 2. Khởi tạo yêu cầu rút tiền (Withdrawal Request)
   * Tự động phân tầng: <= 50 USDC giải ngân nhanh, > 50 USDC kích hoạt cảnh báo lừa đảo & Multisig
   */
  static async createWithdrawalRequest(params: {
    familyId: string;
    requesterId: string;
    amount: number;
    vault: "RetirementShield" | "KidsSavings" | "FamilyROSCA";
    reason: string;
    onchainRequestId?: number;
  }): Promise<{
    request: WithdrawalRequest;
    isFastWithdraw: boolean;
  }> {
    const isLargeWithdrawal = params.amount > 50;
    const initialStatus = isLargeWithdrawal ? "PENDING" : "EXECUTED";

    // 1. Lưu bản ghi rút tiền
    const [request] = await db
      .insert(withdrawalRequests)
      .values({
        familyId: params.familyId,
        requesterId: params.requesterId,
        amount: params.amount.toFixed(6),
        vault: params.vault,
        reason: params.reason,
        onchainRequestId: params.onchainRequestId || null,
        approvalsCount: isLargeWithdrawal ? 0 : 2,
        requiredApprovals: 2,
        status: initialStatus,
      })
      .returning();

    // 2. Nếu là khoản rút lớn, tự động bắn cảnh báo khẩn cấp cho tất cả Guardians & Admin
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
          message: `Phát hiện lệnh rút ${params.amount} USDC từ ${requesterName} (Hũ ${params.vault}). Lý do: '${params.reason}'. Hãy kiểm tra và ký duyệt phòng chống lừa đảo!`,
          type: "ALERT_SCAM",
          isRead: false,
        });
      }
    }

    return { request, isFastWithdraw: !isLargeWithdrawal };
  }

  /**
   * 3. Guardian ký duyệt yêu cầu rút tiền lớn (Multisig Approval)
   * Tăng số lượng phê duyệt, khi đủ >= 2 chữ ký thì cập nhật trạng thái APPROVED
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

    // Gửi thông báo cập nhật tiến trình phê duyệt
    const [requester] = await db
      .select()
      .from(users)
      .where(eq(users.id, existing.requesterId));

    if (requester) {
      await db.insert(notifications).values({
        familyId: existing.familyId,
        userId: requester.id,
        title: isApproved ? "✅ YÊU CẦU ĐÃ ĐƯỢC PHÊ DUYỆT ĐỦ 2/3" : "⏳ TIẾN TRÌNH KÝ DUYỆT MỚI",
        message: isApproved
          ? `Yêu cầu rút ${existing.amount} USDC của bạn đã được các con phê duyệt đủ 2/3 chữ ký. Tiền đang được chuyển về ví!`
          : `Yêu cầu rút ${existing.amount} USDC vừa nhận thêm 1 chữ ký bảo hộ (${nextApprovals}/${existing.requiredApprovals}).`,
        type: "APPROVAL_NEEDED",
        isRead: false,
      });
    }

    return { request: updated, isReadyToExecute: isApproved };
  }

  /**
   * 4. Trẻ em nộp báo cáo hoàn thành việc nhà (Chore-to-Earn)
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

    // Thông báo cho Bố Mẹ (Admin) kiểm tra bài
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
        message: `Bé ${child?.fullName || "Na"} vừa hoàn thành việc nhà '${existing.title}'. Hãy xác nhận để trả thưởng ${existing.rewardAmount} USDC!`,
        type: "TASK_COMPLETED",
        isRead: false,
      });
    }

    return updated;
  }

  /**
   * 5. Bố Mẹ xác nhận và chuyển thưởng Chore-to-Earn
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

    // Bắn thông báo chúc mừng cho con nhỏ
    await db.insert(notifications).values({
      familyId: existing.familyId,
      userId: existing.childId,
      title: "🎉 CHÚC MỪNG CON NHẬN THƯỞNG!",
      message: `Bố mẹ đã xác nhận nhiệm vụ '${existing.title}'. Phần thưởng ${existing.rewardAmount} USDC đã được chuyển thẳng vào heo đất của con!`,
      type: "YIELD_PAYOUT",
      isRead: false,
    });

    return updated;
  }

  /**
   * 6. Lấy danh sách thông báo của người dùng
   */
  static async getUserNotifications(userId: string): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  /**
   * 7. Lấy danh sách nhiệm vụ Chore của gia đình
   */
  static async getFamilyChores(familyId: string): Promise<Chore[]> {
    return db
      .select()
      .from(chores)
      .where(eq(chores.familyId, familyId))
      .orderBy(desc(chores.createdAt));
  }

  /**
   * 8. Lấy danh sách yêu cầu rút tiền của gia đình
   */
  static async getFamilyWithdrawals(familyId: string): Promise<WithdrawalRequest[]> {
    return db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.familyId, familyId))
      .orderBy(desc(withdrawalRequests.createdAt));
  }
}
