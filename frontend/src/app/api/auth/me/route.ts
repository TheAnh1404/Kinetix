import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, families } from "@/db/schema";
import { verifyAuthToken, SESSION_COOKIE_NAME } from "@/lib/jwt";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me
 * Lấy thông tin phiên đăng nhập và dữ liệu Gia Đình thực tế từ Neon Database
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({
        success: false,
        isAuthenticated: false,
        user: null,
        family: null,
      });
    }

    const payload = await verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json({
        success: false,
        isAuthenticated: false,
        user: null,
        family: null,
      });
    }

    // Truy vấn dữ liệu mới nhất từ Neon DB
    let currentUser: any = payload;
    let currentFamily: any = null;

    try {
      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId));

      if (dbUser) {
        currentUser = {
          id: dbUser.id,
          familyId: dbUser.familyId,
          fullName: dbUser.fullName,
          role: dbUser.role,
          walletAddress: dbUser.walletAddress,
          avatarUrl: dbUser.avatarUrl,
          phoneNumber: dbUser.phoneNumber,
        };

        const [dbFamily] = await db
          .select()
          .from(families)
          .where(eq(families.id, dbUser.familyId));

        if (dbFamily) {
          currentFamily = {
            id: dbFamily.id,
            name: dbFamily.name,
            familyCode: dbFamily.familyCode,
            adminWallet: dbFamily.adminWallet,
            l1HubAddress: dbFamily.l1HubAddress,
            cchainVaultAddress: dbFamily.cchainVaultAddress,
          };
        }
      }
    } catch (dbErr) {
      console.warn("DB query warning in /api/auth/me:", dbErr);
    }

    return NextResponse.json({
      success: true,
      isAuthenticated: true,
      user: currentUser,
      family: currentFamily,
    });
  } catch (error: any) {
    console.error("Lỗi get /api/auth/me:", error);
    return NextResponse.json({
      success: false,
      isAuthenticated: false,
      user: null,
      family: null,
    });
  }
}
