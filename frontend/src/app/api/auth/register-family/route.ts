import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import { db } from "@/db";
import { users, families } from "@/db/schema";
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
 * Đăng ký Gia đình mới kèm tài khoản Quản trị viên (Admin) qua xác thực SIWE
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
    // Đảm bảo không trùng mã gia đình
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

    // 5. Lưu Gia đình mới vào cơ sở dữ liệu
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

    // 7. Ký JWT Session Token
    const token = await signAuthToken({
      userId: adminUser.id,
      familyId: family.id,
      fullName: adminUser.fullName,
      role: adminUser.role,
      walletAddress: adminUser.walletAddress,
      avatarUrl: adminUser.avatarUrl,
    });

    // 8. Thiết lập HTTP-Only Cookie an toàn
    const response = NextResponse.json({
      success: true,
      message: `Khởi tạo gia đình '${family.name}' thành công!`,
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
