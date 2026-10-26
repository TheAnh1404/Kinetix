import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workspaces, workspaceMembers, users } from "@/db/schema";
import { verifyAuthToken, SESSION_COOKIE_NAME } from "@/lib/jwt";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/workspaces
 * Lấy danh sách tất cả Workspaces hoặc Workspaces của user hiện tại
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const payload = token ? await verifyAuthToken(token) : null;

    if (payload?.userId) {
      const memberRows = await db
        .select({
          workspace: workspaces,
          role: workspaceMembers.role,
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(eq(workspaceMembers.userId, payload.userId));

      const userWorkspaces = memberRows.map((r) => ({
        ...r.workspace,
        userRole: r.role,
      }));

      return NextResponse.json({
        success: true,
        workspaces: userWorkspaces,
      });
    }

    const allWorkspaces = await db.select().from(workspaces);
    return NextResponse.json({
      success: true,
      workspaces: allWorkspaces,
    });
  } catch (error: any) {
    console.error("Lỗi GET /api/workspaces:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspaces
 * Tạo Không gian chung mới (Workspace)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type, creatorWallet } = body;

    if (!name || !creatorWallet) {
      return NextResponse.json(
        { success: false, error: "Vui lòng cung cấp đầy đủ tên Không gian và địa chỉ ví tạo" },
        { status: 400 }
      );
    }

    const code = `KNTX-${Math.floor(1000 + Math.random() * 9000)}`;

    const [newWs] = await db
      .insert(workspaces)
      .values({
        name,
        type: type || "FAMILY",
        workspaceCode: code,
        creatorWallet,
      })
      .returning();

    // Tìm user tương ứng với creatorWallet để add vào workspace_members
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, creatorWallet));

    if (user) {
      await db.insert(workspaceMembers).values({
        workspaceId: newWs.id,
        userId: user.id,
        role: "ADMIN",
      });
    }

    return NextResponse.json({
      success: true,
      workspace: newWs,
    });
  } catch (error: any) {
    console.error("Lỗi POST /api/workspaces:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
