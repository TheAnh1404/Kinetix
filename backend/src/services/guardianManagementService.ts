import { db } from "../db";
import {
  users,
  workspaceMembers,
  userCredentials,
  guardianMemberLinks,
  auditLogs,
  sessions,
  userWallets,
} from "../db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  assert,
  normalizeUsername,
  validatePassword,
  hashPassword,
} from "../auth/security";
import * as crypto from "node:crypto";

/**
 * @notice Sinh mật khẩu tạm ngẫu nhiên an toàn, độ dài 16 ký tự, dễ đọc
 * Đảm bảo đáp ứng đầy đủ tiêu chí bảo mật của validatePassword
 */
export function generateTemporaryPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  const randomBytes = crypto.randomBytes(10);
  for (let i = 0; i < 10; i++) {
    randomPart += chars[randomBytes[i] % chars.length];
  }
  return `Kntx#${randomPart}`;
}

export interface CreateManagedMemberParams {
  actorId: string;
  workspaceId: string;
  fullName: string;
  username: string;
  role: "ELDERLY" | "CHILD";
  phoneNumber?: string;
  customInitialPassword?: string;
}

export interface ResetPasswordParams {
  actorId: string;
  workspaceId: string;
  memberId: string;
  customPassword?: string;
}

export interface ToggleAccessParams {
  actorId: string;
  workspaceId: string;
  memberId: string;
  disabled: boolean;
}

/**
 * @notice Dịch vụ quản lý tài khoản thành viên phụ thuộc (Ông Bà & Trẻ Nhỏ) do Người bảo hộ quản lý
 * Tuân thủ nghiêm ngặt quy trình KINETIX_AUTH_PLAN.md
 */
export class GuardianManagementService {
  /**
   * @notice Kiểm tra thẩm quyền quản lý thành viên của Actor trong Workspace
   */
  private static async verifyActorPermission(actorId: string, workspaceId: string): Promise<void> {
    const [membership] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.userId, actorId),
          eq(workspaceMembers.workspaceId, workspaceId)
        )
      );

    assert(
      membership,
      403,
      "Bạn không phải là thành viên của Không gian (Workspace) này.",
      "NOT_WORKSPACE_MEMBER"
    );

    assert(
      membership.accessDisabledAt === null,
      403,
      "Quyền truy cập của bạn vào Không gian này đã bị tạm khóa.",
      "WORKSPACE_ACCESS_DISABLED"
    );

    const hasPermission =
      membership.canManageMembers ||
      membership.role === "ADMIN" ||
      membership.role === "GUARDIAN";

    assert(
      hasPermission,
      403,
      "Chỉ Quản trị viên (Admin) hoặc Người bảo hộ (Guardian) mới có quyền quản lý thành viên.",
      "INSUFFICIENT_MANAGEMENT_PERMISSION"
    );
  }

  /**
   * @notice Người bảo hộ tạo tài khoản mới cho Ông Bà hoặc Trẻ Nhỏ
   * Thực hiện tạo User, Credential tạm (Argon2id), Membership và Liên kết Guardian trong 1 Transaction
   */
  static async createManagedMember(params: CreateManagedMemberParams) {
    const { actorId, workspaceId, fullName, role, phoneNumber, customInitialPassword } = params;

    // 1. Kiểm tra thẩm quyền của Actor
    await this.verifyActorPermission(actorId, workspaceId);

    // 2. Ràng buộc nghiệp vụ: Chỉ cho phép tạo tài khoản ELDERLY hoặc CHILD qua API này
    assert(
      role === "ELDERLY" || role === "CHILD",
      400,
      "Chỉ được phép tạo tài khoản quản lý cho Ông Bà (ELDERLY) hoặc Trẻ Nhỏ (CHILD).",
      "INVALID_MANAGED_ROLE"
    );

    assert(
      typeof fullName === "string" && fullName.trim().length >= 2,
      400,
      "Họ tên thành viên cần có ít nhất 2 ký tự.",
      "INVALID_FULLNAME"
    );

    // 3. Chuẩn hóa và kiểm tra tên đăng nhập
    const cleanUsername = normalizeUsername(params.username);

    // Kiểm tra tên đăng nhập đã tồn tại trong bảng credentials chưa
    const [existingCred] = await db
      .select({ id: userCredentials.userId })
      .from(userCredentials)
      .where(eq(userCredentials.username, cleanUsername));

    assert(!existingCred, 409, `Tên đăng nhập "${cleanUsername}" đã tồn tại trên hệ thống.`, "USERNAME_TAKEN");

    // 4. Khởi tạo mật khẩu tạm thời
    const tempPassword = customInitialPassword && customInitialPassword.trim()
      ? customInitialPassword.trim()
      : generateTemporaryPassword();

    validatePassword(tempPassword);
    const passwordHash = await hashPassword(tempPassword);

    // Thời hạn mật khẩu tạm: 72 giờ (3 ngày) kể từ thời điểm khởi tạo
    const temporaryExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    // 5. Thực thi Transaction đảm bảo tính toàn vẹn dữ liệu
    return await db.transaction(async (tx) => {
      // 5.1 Tạo bản ghi User mới
      const [newUser] = await tx
        .insert(users)
        .values({
          fullName: fullName.trim(),
          username: cleanUsername,
          role,
          authMethod: "CORE_WALLET",
          phoneNumber: phoneNumber ? phoneNumber.trim() : null,
          avatarUrl:
            role === "ELDERLY"
              ? "https://lh3.googleusercontent.com/aida-public/AB6AXuB9RXFgUn83eP41jg2weE3YA8vd83fsVimUf5y0OcZS7SOQ3XPOzG_gbODV_xJIXeRQye9NHAh2TXP_28Oz-bPHhWTfscJFCZWXYRXq2gQAAtwAVTc1yseRsDx3GBa94HVhTHAal40UzoVwN7YY1IXQ5EmMOe0WhhEvzu4V7ZNBtixA0ZiaR61Ad1UJUADoRuNzug0ggIZW8eO5XEiktIZD-zCJ4THMAqG0i7Z1ivkCGPnUrjsBJg"
              : "https://lh3.googleusercontent.com/aida-public/AB6AXuAc1UhNj0E3eKWwrEAv9WJ4KTtp_4pnR4-fyhwEHSKncOxXMGgdr5EdEkF7AMpuaguOYSWTwC-3Ovp1jhOZtflnABlKorh-7E9pPfvKLow6TvFQHGxmf0EgQh_J7eX2WyhgY_obtzgCtT892o3CCd1-TKpF3WABb42fGzxm4wVTK6S7fWG0bKJKRZGbEsWybndKRK3uK6Aix2ehMS1hOr8zRyDG3ZRA0ODbqcIHWiDv1p2ayRMtyQ",
        })
        .returning();

      // 5.2 Lưu thông tin xác thực ban đầu (Credential tạm)
      await tx.insert(userCredentials).values({
        userId: newUser.id,
        username: cleanUsername,
        passwordHash,
        mustChangePassword: true,
        temporaryExpiresAt,
      });

      // 5.3 Gán thành viên vào Không gian (Workspace)
      await tx.insert(workspaceMembers).values({
        workspaceId,
        userId: newUser.id,
        role,
        canManageMembers: false,
      });

      // 5.4 Tạo liên kết giám hộ giữa Người bảo hộ (Guardian) và Thành viên (Member)
      await tx.insert(guardianMemberLinks).values({
        guardianId: actorId,
        memberId: newUser.id,
        workspaceId,
        createdBy: actorId,
        active: true,
      });

      // 5.5 Ghi nhật ký kiểm toán (Audit Log)
      await tx.insert(auditLogs).values({
        actorId,
        subjectId: newUser.id,
        workspaceId,
        action: `MEMBER_CREATED: ${cleanUsername} (${role})`,
      });

      return {
        member: {
          id: newUser.id,
          fullName: newUser.fullName,
          username: cleanUsername,
          role: newUser.role,
          avatarUrl: newUser.avatarUrl,
          phoneNumber: newUser.phoneNumber,
          walletAddress: newUser.walletAddress,
          createdAt: newUser.createdAt,
        },
        credentials: {
          username: cleanUsername,
          temporaryPassword: tempPassword,
          expiresAt: temporaryExpiresAt,
          note: "Mật khẩu tạm thời có hạn dùng 72 giờ. Thành viên phải đổi mật khẩu và liên kết ví Core ở lần đăng nhập đầu tiên.",
        },
      };
    });
  }

  /**
   * @notice Lấy danh sách thành viên được quản lý trong Workspace
   */
  static async getManagedMembers(actorId: string, workspaceId: string) {
    // 1. Kiểm tra thẩm quyền của Actor
    await this.verifyActorPermission(actorId, workspaceId);

    // 2. Tìm tất cả liên kết giám hộ trong Không gian
    const links = await db
      .select({
        memberId: guardianMemberLinks.memberId,
        guardianId: guardianMemberLinks.guardianId,
        active: guardianMemberLinks.active,
      })
      .from(guardianMemberLinks)
      .where(
        and(
          eq(guardianMemberLinks.workspaceId, workspaceId),
          eq(guardianMemberLinks.active, true)
        )
      );

    if (links.length === 0) {
      return [];
    }

    const memberIds = [...new Set(links.map((l) => l.memberId))];

    // 3. Lấy thông tin user, membership và credentials của các thành viên này
    const memberUsers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        role: users.role,
        avatarUrl: users.avatarUrl,
        phoneNumber: users.phoneNumber,
        walletAddress: users.walletAddress,
        createdAt: users.createdAt,
        accessDisabledAt: workspaceMembers.accessDisabledAt,
        joinedAt: workspaceMembers.joinedAt,
      })
      .from(users)
      .innerJoin(workspaceMembers, and(
        eq(workspaceMembers.userId, users.id),
        eq(workspaceMembers.workspaceId, workspaceId)
      ))
      .where(inArray(users.id, memberIds));

    // 4. Lấy trạng thái credentials và ví liên kết
    const credList = await db
      .select({
        userId: userCredentials.userId,
        mustChangePassword: userCredentials.mustChangePassword,
        temporaryExpiresAt: userCredentials.temporaryExpiresAt,
        changedAt: userCredentials.changedAt,
      })
      .from(userCredentials)
      .where(inArray(userCredentials.userId, memberIds));

    const credMap = new Map(credList.map((c) => [c.userId, c]));

    const walletList = await db
      .select({
        userId: userWallets.userId,
        address: userWallets.address,
        verifiedAt: userWallets.verifiedAt,
      })
      .from(userWallets)
      .where(inArray(userWallets.userId, memberIds));

    const walletMap = new Map(walletList.map((w) => [w.userId, w]));

    // 5. Kết hợp dữ liệu và chuẩn hóa trạng thái hiển thị
    return memberUsers.map((m) => {
      const cred = credMap.get(m.id);
      const verifiedWallet = walletMap.get(m.id);

      // Trạng thái tài khoản:
      // - PENDING_ACTIVATION: Vẫn đang dùng mật khẩu tạm, chưa đổi mật khẩu
      // - WAITING_WALLET_LINK: Đã đổi mật khẩu nhưng chưa liên kết ví Core
      // - ACTIVE: Đã đổi mật khẩu và liên kết ví Core an toàn
      // - DISABLED: Đã bị người bảo hộ tạm khóa quyền truy cập
      let status: "PENDING_ACTIVATION" | "WAITING_WALLET_LINK" | "ACTIVE" | "DISABLED" = "ACTIVE";
      if (m.accessDisabledAt) {
        status = "DISABLED";
      } else if (cred?.mustChangePassword) {
        status = "PENDING_ACTIVATION";
      } else if (!verifiedWallet?.address && !m.walletAddress) {
        status = "WAITING_WALLET_LINK";
      }

      return {
        id: m.id,
        fullName: m.fullName,
        username: m.username,
        role: m.role,
        avatarUrl: m.avatarUrl,
        phoneNumber: m.phoneNumber,
        linkedWallet: verifiedWallet?.address || m.walletAddress || null,
        status,
        accessDisabledAt: m.accessDisabledAt,
        joinedAt: m.joinedAt,
        mustChangePassword: cred?.mustChangePassword ?? false,
        temporaryExpiresAt: cred?.temporaryExpiresAt ?? null,
      };
    });
  }

  /**
   * @notice Cấp lại mật khẩu tạm thời cho thành viên phụ thuộc
   * Tự động thu hồi phiên đăng nhập hiện tại và yêu cầu đổi mật khẩu ở lần đăng nhập tiếp theo
   */
  static async resetMemberPassword(params: ResetPasswordParams) {
    const { actorId, workspaceId, memberId, customPassword } = params;

    // 1. Kiểm tra quyền của Actor
    await this.verifyActorPermission(actorId, workspaceId);

    // 2. Kiểm tra thành viên tồn tại trong Không gian
    const [membership] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.userId, memberId),
          eq(workspaceMembers.workspaceId, workspaceId)
        )
      );

    assert(membership, 404, "Không tìm thấy thành viên trong Không gian này.", "MEMBER_NOT_FOUND");

    // 3. Khởi tạo mật khẩu tạm mới
    const newTempPassword = customPassword && customPassword.trim()
      ? customPassword.trim()
      : generateTemporaryPassword();

    validatePassword(newTempPassword);
    const passwordHash = await hashPassword(newTempPassword);
    const temporaryExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    return await db.transaction(async (tx) => {
      // 3.1 Cập nhật thông tin credentials
      await tx
        .update(userCredentials)
        .set({
          passwordHash,
          mustChangePassword: true,
          temporaryExpiresAt,
          changedAt: new Date(),
        })
        .where(eq(userCredentials.userId, memberId));

      // 3.2 Thu hồi tất cả phiên đăng nhập đang hoạt động của thành viên này
      await tx
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(eq(sessions.userId, memberId));

      // 3.3 Ghi nhận nhật ký kiểm toán
      await tx.insert(auditLogs).values({
        actorId,
        subjectId: memberId,
        workspaceId,
        action: "PASSWORD_RESET_TEMPORARY",
      });

      return {
        success: true,
        temporaryPassword: newTempPassword,
        expiresAt: temporaryExpiresAt,
        note: "Mật khẩu tạm mới đã được kích hoạt. Các phiên đăng nhập cũ của thành viên đã được thu hồi an toàn.",
      };
    });
  }

  /**
   * @notice Khóa hoặc Mở khóa quyền truy cập ứng dụng của thành viên trong Workspace
   */
  static async toggleMemberAccess(params: ToggleAccessParams) {
    const { actorId, workspaceId, memberId, disabled } = params;

    // 1. Kiểm tra quyền của Actor
    await this.verifyActorPermission(actorId, workspaceId);

    // Không cho phép tự khóa chính mình
    assert(actorId !== memberId, 400, "Bạn không thể tự khóa quyền truy cập của chính mình.", "CANNOT_LOCK_SELF");

    return await db.transaction(async (tx) => {
      // 2. Cập nhật accessDisabledAt trên workspaceMembers
      const now = new Date();
      const [updated] = await tx
        .update(workspaceMembers)
        .set({
          accessDisabledAt: disabled ? now : null,
        })
        .where(
          and(
            eq(workspaceMembers.userId, memberId),
            eq(workspaceMembers.workspaceId, workspaceId)
          )
        )
        .returning();

      assert(updated, 404, "Không tìm thấy thành viên trong Không gian này.", "MEMBER_NOT_FOUND");

      // 3. Nếu khóa: Thu hồi toàn bộ sessions đang hoạt động
      if (disabled) {
        await tx
          .update(sessions)
          .set({ revokedAt: now })
          .where(eq(sessions.userId, memberId));
      }

      // 4. Ghi audit log
      await tx.insert(auditLogs).values({
        actorId,
        subjectId: memberId,
        workspaceId,
        action: disabled ? "MEMBER_ACCESS_DISABLED" : "MEMBER_ACCESS_ENABLED",
      });

      return {
        success: true,
        memberId,
        disabled,
        accessDisabledAt: updated.accessDisabledAt,
      };
    });
  }

  /**
   * @notice Lấy danh sách lịch sử kiểm toán bảo mật trong Không gian
   */
  static async getAuditLogs(actorId: string, workspaceId: string, limit = 20) {
    await this.verifyActorPermission(actorId, workspaceId);

    const logs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        createdAt: auditLogs.createdAt,
        actorId: auditLogs.actorId,
        subjectId: auditLogs.subjectId,
      })
      .from(auditLogs)
      .where(eq(auditLogs.workspaceId, workspaceId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return logs;
  }
}
