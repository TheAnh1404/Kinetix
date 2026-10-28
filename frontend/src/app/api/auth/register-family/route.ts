import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import { db } from "@/db";
import { users, families, workspaceMembers, vaults, vaultMembers } from "@/db/schema";
import { signAuthToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/jwt";

export const dynamic = "force-dynamic";

/**
 * Tạo mã gia đình duy nhất (VD: KNTX-8A2F)
 */
function generateFamilyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `KNTX-${suffix}`;
}

/**
 * Trích xuất các trường từ thông điệp chuẩn SIWE EIP-4361
 */
function parseSiweAddress(message: string): string | undefined {
  const addressMatch = message.match(/0x[a-fA-F0-9]{40}/i);
  return addressMatch ? addressMatch[0].toLowerCase() : undefined;
}

/**
 * POST /api/auth/register-family
 * Đăng ký Không gian / Gia đình mới kèm tài khoản Quản trị viên (Admin) và khởi tạo Hũ Động
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      familyName,
      adminName,
      phoneNumber,
      pinCode,
      walletAddress,
      message,
      signature,
    } = body;

    // 1. Kiểm tra đầu vào bắt buộc
    if (!familyName || !adminName || !walletAddress || !message || !signature) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ: Tên gia đình, Họ tên Admin, và ký duyệt ví." },
        { status: 400 }
      );
    }

    const normalizedWallet = walletAddress.toLowerCase();

    // 2. Xác thực chữ ký mật mã SIWE EIP-4361
    const messageAddress = parseSiweAddress(message);
    if (!messageAddress || messageAddress !== normalizedWallet) {
      return NextResponse.json(
        { error: "Địa chỉ ví trong thông điệp SIWE không khớp với ví kết nối." },
        { status: 400 }
      );
    }

    const isValidSignature = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Chữ ký mật mã không hợp lệ hoặc đã bị chỉnh sửa." },
        { status: 401 }
      );
    }

    // 3. Kiểm tra xem ví này đã được đăng ký trong hệ thống chưa
    const existing = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.walletAddress}) = ${normalizedWallet}`);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Địa chỉ ví này đã được đăng ký trong hệ thống. Vui lòng chọn Đăng Nhập." },
        { status: 409 }
      );
    }

    // 4. Sinh mã gia đình duy nhất
    let familyCode = generateFamilyCode();
    let codeExists = true;
    for (let attempts = 0; attempts < 5 && codeExists; attempts++) {
      const found = await db
        .select()
        .from(families)
        .where(sql`LOWER(${families.familyCode}) = ${familyCode.toLowerCase()}`);
      if (found.length === 0) {
        codeExists = false;
      } else {
        familyCode = generateFamilyCode();
      }
    }

    // 5. Lưu Gia đình / Không gian mới vào cơ sở dữ liệu
    const [family] = await db
      .insert(families)
      .values({
        name: familyName.trim(),
        familyCode: familyCode,
        adminWallet: walletAddress,
        l1HubAddress: process.env.FAMILY_HUB_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
        cchainVaultAddress: process.env.FAMILY_YIELD_VAULT_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      })
      .returning();

    // 6. Tạo tài khoản Admin đại diện gia đình
    const [adminUser] = await db
      .insert(users)
      .values({
        familyId: family.id,
        fullName: adminName.trim(),
        role: "ADMIN",
        walletAddress: walletAddress,
        authMethod: "CORE_WALLET",
        pinCode: pinCode ? pinCode.trim() : "1234",
        phoneNumber: phoneNumber ? phoneNumber.trim() : null,
        avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
        isAllowlisted: true,
      })
      .returning();

    // 7. Thêm Admin vào bảng workspace_members
    await db.insert(workspaceMembers).values({
      workspaceId: family.id,
      userId: adminUser.id,
      role: "ADMIN",
    });

    // 8. Tự động khởi tạo 3 Hũ Động tiêu chuẩn cho Không gian mới
    const createdVaults = await db.insert(vaults).values([
      {
        workspaceId: family.id,
        onchainVaultId: 0,
        name: "Hũ Báo Hiếu & Dưỡng Già Ông Bà",
        description: "Bộ quy tắc SHIELD: Rút nhỏ <= 50 USDC giải ngân tức thì 0 gas từ đệm L1; rút lớn cần 2/3 Guardians duyệt.",
        ruleTemplate: "SHIELD",
        bufferRatioBps: 1000,
        fastWithdrawLimit: "50",
        requiredApprovals: 2,
        cachedTotalBalance: "1200",
        cachedL1Buffer: "120",
        cachedCChainYield: "86.4",
        isActive: true,
      },
      {
        workspaceId: family.id,
        onchainVaultId: 1,
        name: "Hũ Tiết Kiệm Khởi Nghiệp Trẻ Nhỏ",
        description: "Bộ quy tắc MILESTONE: Quỹ việc nhà Chore-to-Earn, vốn sinh lời 8% APY trên C-Chain.",
        ruleTemplate: "MILESTONE",
        bufferRatioBps: 2000,
        fastWithdrawLimit: "20",
        requiredApprovals: 2,
        cachedTotalBalance: "450",
        cachedL1Buffer: "90",
        cachedCChainYield: "28.8",
        isActive: true,
      },
      {
        workspaceId: family.id,
        onchainVaultId: 2,
        name: "Hũ Tương Trợ Dòng Họ",
        description: "Bộ quy tắc ROSCA: Góp vốn xoay vòng 4 kỳ, vốn nhàn rỗi sinh lời DeFi 8% APY trên C-Chain.",
        ruleTemplate: "ROSCA",
        bufferRatioBps: 0,
        fastWithdrawLimit: "1000",
        requiredApprovals: 3,
        cachedTotalBalance: "3000",
        cachedL1Buffer: "0",
        cachedCChainYield: "240",
        isActive: true,
      },
    ]).returning();

    // 8b. Tự động liên kết các thành viên đa thế hệ (Ông Bà, Con Trẻ, Guardians) vào gia đình mới
    try {
      const allSystemUsers = await db.select().from(users);
      const elderlyUser = allSystemUsers.find((u) => u.role === "ELDERLY");
      const childUser = allSystemUsers.find((u) => u.role === "CHILD");
      const guardianUsers = allSystemUsers.filter((u) => u.role === "GUARDIAN");

      if (elderlyUser) {
        await db.insert(workspaceMembers).values({ workspaceId: family.id, userId: elderlyUser.id, role: "ELDERLY" }).catch(() => {});
      }
      if (childUser) {
        await db.insert(workspaceMembers).values({ workspaceId: family.id, userId: childUser.id, role: "CHILD" }).catch(() => {});
      }
      for (const g of guardianUsers) {
        await db.insert(workspaceMembers).values({ workspaceId: family.id, userId: g.id, role: "GUARDIAN" }).catch(() => {});
      }

      // Liên kết vault_members
      for (const v of createdVaults) {
        if (v.ruleTemplate === "SHIELD") {
          await db.insert(vaultMembers).values({ vaultId: v.id, userId: adminUser.id, vaultRole: "GUARDIAN" });
          for (const g of guardianUsers) {
            await db.insert(vaultMembers).values({ vaultId: v.id, userId: g.id, vaultRole: "GUARDIAN" }).catch(() => {});
          }
          if (elderlyUser) {
            await db.insert(vaultMembers).values({ vaultId: v.id, userId: elderlyUser.id, vaultRole: "BENEFICIARY" }).catch(() => {});
          }
        } else if (v.ruleTemplate === "MILESTONE") {
          await db.insert(vaultMembers).values({ vaultId: v.id, userId: adminUser.id, vaultRole: "GUARDIAN" });
          if (childUser) {
            await db.insert(vaultMembers).values({ vaultId: v.id, userId: childUser.id, vaultRole: "BENEFICIARY" }).catch(() => {});
          }
        }
      }
    } catch (linkErr) {
      console.warn("Lỗi tự động liên kết thành viên gia đình:", linkErr);
    }

    // 9. Ký JWT Session Token
    const token = await signAuthToken({
      userId: adminUser.id,
      familyId: family.id,
      fullName: adminUser.fullName,
      role: adminUser.role,
      walletAddress: adminUser.walletAddress,
      avatarUrl: adminUser.avatarUrl,
    });

    // 10. Thiết lập HTTP-Only Cookie an toàn
    const response = NextResponse.json({
      success: true,
      message: `Khởi tạo không gian '${family.name}' thành công!`,
      family: {
        id: family.id,
        name: family.name,
        familyCode: family.familyCode,
      },
      user: {
        id: adminUser.id,
        familyId: adminUser.familyId,
        fullName: adminUser.fullName,
        role: adminUser.role,
        walletAddress: adminUser.walletAddress,
        avatarUrl: adminUser.avatarUrl,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch (error: any) {
    console.error("Lỗi register-family:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi xử lý đăng ký gia đình mới" },
      { status: 500 }
    );
  }
}
