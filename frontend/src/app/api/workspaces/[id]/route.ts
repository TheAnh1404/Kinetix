import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workspaces, workspaceMembers, users, vaults } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/workspaces/[id]
 * Lấy thông tin Workspace kèm danh sách Thành viên và Hũ Động
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const [ws] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id));

    if (!ws) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy Workspace" },
        { status: 404 }
      );
    }

    // Lấy thành viên
    const memberRows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        walletAddress: users.walletAddress,
        role: workspaceMembers.role,
        authMethod: users.authMethod,
        avatarUrl: users.avatarUrl,
        phoneNumber: users.phoneNumber,
        joinedAt: workspaceMembers.joinedAt,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, id));

    // Lấy các Hũ Động
    const workspaceVaults = await db
      .select()
      .from(vaults)
      .where(eq(vaults.workspaceId, id));

    return NextResponse.json({
      success: true,
      workspace: ws,
      members: memberRows,
      vaults: workspaceVaults,
    });
  } catch (error: any) {
    console.error("Lỗi GET /api/workspaces/[id]:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
