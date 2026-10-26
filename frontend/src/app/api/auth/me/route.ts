import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, workspaces, workspaceMembers, vaults } from "@/db/schema";
import { verifyAuthToken, SESSION_COOKIE_NAME } from "@/lib/jwt";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me
 * Lấy thông tin phiên đăng nhập, Workspaces và Dynamic Vaults thực tế từ Neon Database
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
        workspaces: [],
        vaults: [],
      });
    }

    const payload = await verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json({
        success: false,
        isAuthenticated: false,
        user: null,
        family: null,
        workspaces: [],
        vaults: [],
      });
    }

    // Truy vấn dữ liệu mới nhất từ Neon DB
    let currentUser: any = payload;
    let currentFamily: any = null;
    let userWorkspaces: any[] = [];
    let workspaceVaults: any[] = [];

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
          defaultRole: dbUser.defaultRole,
          walletAddress: dbUser.walletAddress,
          avatarUrl: dbUser.avatarUrl,
          phoneNumber: dbUser.phoneNumber,
        };

        // Lấy danh sách Workspaces mà user tham gia
        const memberRows = await db
          .select({
            workspace: workspaces,
            memberRole: workspaceMembers.role,
          })
          .from(workspaceMembers)
          .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
          .where(eq(workspaceMembers.userId, dbUser.id));

        userWorkspaces = memberRows.map((r) => ({
          ...r.workspace,
          userRole: r.memberRole,
        }));

        // Nếu chưa có trong workspace_members, fallback kiểm tra user.familyId
        if (userWorkspaces.length === 0 && dbUser.familyId) {
          const [dbFam] = await db
            .select()
            .from(workspaces)
            .where(eq(workspaces.id, dbUser.familyId));
          if (dbFam) {
            userWorkspaces = [{ ...dbFam, userRole: dbUser.role }];
          }
        }

        // Nếu vẫn trống, lấy workspace đầu tiên
        if (userWorkspaces.length === 0) {
          const [firstFam] = await db.select().from(workspaces).limit(1);
          if (firstFam) {
            userWorkspaces = [{ ...firstFam, userRole: dbUser.role }];
          }
        }

        currentFamily = userWorkspaces[0] || null;

        // Lấy danh sách Dynamic Vaults của Workspace hiện tại
        if (currentFamily?.id) {
          workspaceVaults = await db
            .select()
            .from(vaults)
            .where(eq(vaults.workspaceId, currentFamily.id));
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
      workspaces: userWorkspaces,
      vaults: workspaceVaults,
    });
  } catch (error: any) {
    console.error("Lỗi get /api/auth/me:", error);
    return NextResponse.json({
      success: false,
      isAuthenticated: false,
      user: null,
      family: null,
      workspaces: [],
      vaults: [],
    });
  }
}
