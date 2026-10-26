import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyAuthToken, SESSION_COOKIE_NAME } from "@/lib/jwt";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me
 * Lấy thông tin phiên đăng nhập và quyền truy cập hiện tại từ Cookie
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({
        success: false,
        isAuthenticated: false,
        user: null,
      });
    }

    const payload = await verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json({
        success: false,
        isAuthenticated: false,
        user: null,
      });
    }

    // Truy vấn dữ liệu mới nhất từ Neon DB
    let currentUser: any = payload;
    try {
      const [dbUser] = await db.select().from(users).where(eq(users.id, payload.userId));
      if (dbUser) {
        currentUser = {
          id: dbUser.id,
          familyId: dbUser.familyId,
          fullName: dbUser.fullName,
          role: dbUser.role,
          walletAddress: dbUser.walletAddress,
          avatarUrl: dbUser.avatarUrl,
        };
      }
    } catch (dbErr) {
      // Dùng dữ liệu trong token nếu DB không phản hồi
    }

    return NextResponse.json({
      success: true,
      isAuthenticated: true,
      user: currentUser,
    });
  } catch (error: any) {
    console.error("Lỗi get /api/auth/me:", error);
    return NextResponse.json({
      success: false,
      isAuthenticated: false,
      user: null,
    });
  }
}
