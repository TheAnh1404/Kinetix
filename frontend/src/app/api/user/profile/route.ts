import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyAuthToken, SESSION_COOKIE_NAME } from "@/lib/jwt";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/profile
 * Lấy thông tin hồ sơ người dùng đang đăng nhập
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    const payload = await verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ success: false, error: "Phiên đăng nhập không hợp lệ" }, { status: 401 });
    }

    const [user] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        walletAddress: users.walletAddress,
        authMethod: users.authMethod,
        avatarUrl: users.avatarUrl,
        phoneNumber: users.phoneNumber,
        isAllowlisted: users.isAllowlisted,
        defaultRole: users.defaultRole,
        role: users.role,
        hasPin: users.pinCode,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, payload.userId));

    if (!user) {
      return NextResponse.json({ success: false, error: "Không tìm thấy người dùng" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile: {
        ...user,
        hasPin: !!user.hasPin,
      },
    });
  } catch (error: any) {
    console.error("Lỗi GET /api/user/profile:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/user/profile
 * Cập nhật hồ sơ cá nhân, đổi mã PIN 4 số và vai trò mặc định
 */
export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }

    const payload = await verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ success: false, error: "Phiên đăng nhập không hợp lệ" }, { status: 401 });
    }

    const body = await req.json();
    const { fullName, avatarUrl, phoneNumber, pinCode, defaultRole } = body;

    const updateData: Record<string, any> = {};

    if (fullName !== undefined && typeof fullName === "string") {
      updateData.fullName = fullName.trim();
    }
    if (avatarUrl !== undefined && typeof avatarUrl === "string") {
      updateData.avatarUrl = avatarUrl.trim();
    }
    if (phoneNumber !== undefined) {
      updateData.phoneNumber = phoneNumber ? String(phoneNumber).trim() : null;
    }
    if (defaultRole !== undefined && ["ADMIN", "GUARDIAN", "ELDERLY", "CHILD"].includes(defaultRole)) {
      updateData.defaultRole = defaultRole;
      updateData.role = defaultRole;
    }
    if (pinCode !== undefined && pinCode !== null && pinCode !== "") {
      const pinStr = String(pinCode).trim();
      if (!/^\d{4}$/.test(pinStr)) {
        return NextResponse.json(
          { success: false, error: "Mã PIN phải bao gồm đúng 4 chữ số." },
          { status: 400 }
        );
      }
      updateData.pinCode = pinStr;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: "Không có dữ liệu cập nhật" }, { status: 400 });
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, payload.userId))
      .returning({
        id: users.id,
        fullName: users.fullName,
        walletAddress: users.walletAddress,
        avatarUrl: users.avatarUrl,
        phoneNumber: users.phoneNumber,
        defaultRole: users.defaultRole,
        role: users.role,
        isAllowlisted: users.isAllowlisted,
      });

    return NextResponse.json({
      success: true,
      message: "Cập nhật hồ sơ cá nhân thành công!",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Lỗi PUT /api/user/profile:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
