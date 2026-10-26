import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users, families, workspaceMembers } from "@/db/schema";
import { signAuthToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/jwt";

export const dynamic = "force-dynamic";

function parseSiweAddress(message: string): string | undefined {
  const addressMatch = message.match(/0x[a-fA-F0-9]{40}/i);
  return addressMatch ? addressMatch[0].toLowerCase() : undefined;
}

/**
 * POST /api/auth/join-family
 * Người bảo hộ (Guardian) kết nối ví và tham gia gia đình bằng Family Code
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      familyCode,
      memberName,
      phoneNumber,
      pinCode,
      walletAddress,
      message,
      signature,
    } = body;

    if (!familyCode || !memberName || !walletAddress || !message || !signature) {
      return NextResponse.json(
        { error: "Vui lòng nhập Mã gia đình, Họ tên của bạn, và ký duyệt ví." },
        { status: 400 }
      );
    }

    const normalizedWallet = walletAddress.toLowerCase();

    // 1. Xác thực chữ ký SIWE
    const messageAddress = parseSiweAddress(message);
    if (!messageAddress || messageAddress !== normalizedWallet) {
      return NextResponse.json(
        { error: "Địa chỉ ví trong thông điệp SIWE không khớp." },
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
        { error: "Chữ ký mật mã không hợp lệ." },
        { status: 401 }
      );
    }

    // 2. Tra cứu gia đình theo Family Code
    const cleanCode = familyCode.trim().toUpperCase();
    const [targetFamily] = await db
      .select()
      .from(families)
      .where(sql`UPPER(${families.familyCode}) = ${cleanCode}`);

    if (!targetFamily) {
      return NextResponse.json(
        { error: `Không tìm thấy gia đình với mã '${cleanCode}'. Vui lòng kiểm tra lại mã từ người quản trị.` },
        { status: 404 }
      );
    }

    // 3. Kiểm tra xem ví này đã thuộc gia đình nào chưa
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

    // 4. Tạo tài khoản người bảo hộ (GUARDIAN) trong gia đình
    const [newUser] = await db
      .insert(users)
      .values({
        familyId: targetFamily.id,
        fullName: memberName.trim(),
        role: "GUARDIAN",
        walletAddress: walletAddress,
        authMethod: "CORE_WALLET",
        pinCode: pinCode ? pinCode.trim() : "1234",
        phoneNumber: phoneNumber ? phoneNumber.trim() : null,
        avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
        isAllowlisted: true,
      })
      .returning();

    // Thêm vào bảng workspace_members
    await db.insert(workspaceMembers).values({
      workspaceId: targetFamily.id,
      userId: newUser.id,
      role: "GUARDIAN",
    });

    // 5. Cấp JWT Session
    const token = await signAuthToken({
      userId: newUser.id,
      familyId: targetFamily.id,
      fullName: newUser.fullName,
      role: newUser.role,
      walletAddress: newUser.walletAddress,
      avatarUrl: newUser.avatarUrl,
    });

    const response = NextResponse.json({
      success: true,
      message: `Chào mừng bạn đã gia nhập '${targetFamily.name}'!`,
      family: {
        id: targetFamily.id,
        name: targetFamily.name,
        familyCode: targetFamily.familyCode,
      },
      user: {
        id: newUser.id,
        familyId: newUser.familyId,
        fullName: newUser.fullName,
        role: newUser.role,
        walletAddress: newUser.walletAddress,
        avatarUrl: newUser.avatarUrl,
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
    console.error("Lỗi join-family:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi xử lý tham gia gia đình" },
      { status: 500 }
    );
  }
}
