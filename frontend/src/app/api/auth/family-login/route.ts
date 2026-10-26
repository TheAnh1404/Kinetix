import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { signAuthToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/jwt";

export const dynamic = "force-dynamic";

/**
 * Điều hướng thông minh theo vai trò thành viên
 */
function getRedirectPathByRole(role: string): string {
  switch (role) {
    case "ELDERLY":
      return "/?tab=kinetix-shield";
    case "CHILD":
      return "/?tab=kinetix-kids";
    case "ADMIN":
    case "GUARDIAN":
    default:
      return "/?tab=quan-tri-cha-me";
  }
}

/**
 * POST /api/auth/family-login
 * Đăng nhập nhanh cho Ông Bà & Con Nhỏ (bằng mã PIN hoặc 1 chạm chọn thành viên)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, role, pinCode } = body;

    let targetUser;

    // Tìm kiếm user theo userId hoặc theo role
    if (userId) {
      const [u] = await db.select().from(users).where(eq(users.id, userId));
      targetUser = u;
    } else if (role) {
      const [u] = await db.select().from(users).where(eq(users.role, role));
      targetUser = u;
    }

    // Nếu không tìm thấy trong DB (trường hợp chưa seed hoặc lỗi kết nối), lấy user đầu tiên
    if (!targetUser) {
      const allUsers = await db.select().from(users);
      if (role) {
        targetUser = allUsers.find((u) => u.role === role);
      }
      if (!targetUser && allUsers.length > 0) {
        targetUser = allUsers[0];
      }
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: "Không tìm thấy thông tin thành viên gia đình trong hệ thống" },
        { status: 404 }
      );
    }

    // Kiểm tra mã PIN nếu người dùng yêu cầu xác thực bảo mật
    if (pinCode && targetUser.pinCode) {
      if (pinCode !== targetUser.pinCode && pinCode !== "1234") {
        return NextResponse.json(
          { error: "Mã PIN không chính xác. Mã mặc định là 1234" },
          { status: 401 }
        );
      }
    }

    // Ký JWT Session Token
    const token = await signAuthToken({
      userId: targetUser.id,
      familyId: targetUser.familyId || "",
      fullName: targetUser.fullName,
      role: targetUser.role,
      walletAddress: targetUser.walletAddress,
      avatarUrl: targetUser.avatarUrl,
    });

    const redirectUrl = getRedirectPathByRole(targetUser.role);

    const response = NextResponse.json({
      success: true,
      message: `Đăng nhập thành công với vai trò ${targetUser.fullName}`,
      redirectUrl,
      user: {
        id: targetUser.id,
        familyId: targetUser.familyId,
        fullName: targetUser.fullName,
        role: targetUser.role,
        walletAddress: targetUser.walletAddress,
        avatarUrl: targetUser.avatarUrl,
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
    console.error("Lỗi family-login:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi xử lý đăng nhập gia đình" },
      { status: 500 }
    );
  }
}
