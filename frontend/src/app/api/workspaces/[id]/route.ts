import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workspaces, workspaceMembers, users, vaults } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/workspaces/[id]
 * Lấy thông tin Workspace kèm danh sách Thành viên và Hũ Động
 * Tự động đồng bộ và khởi tạo nếu dữ liệu bị thiếu
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Thiếu định danh Workspace" },
        { status: 400 }
      );
    }

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

    // 1. Lấy danh sách thành viên từ workspace_members
    let memberRows = await db
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

    // Nếu chưa có thành viên trong workspace_members, tự động liên kết từ users.familyId
    if (memberRows.length === 0) {
      const familyUsers = await db
        .select()
        .from(users)
        .where(eq(users.familyId, id));

      if (familyUsers.length > 0) {
        for (const u of familyUsers) {
          try {
            await db.insert(workspaceMembers).values({
              workspaceId: id,
              userId: u.id,
              role: u.role || "ADMIN",
            });
          } catch (e) {
            // bỏ qua nếu đã tồn tại
          }
        }

        memberRows = familyUsers.map((u) => ({
          id: u.id,
          fullName: u.fullName,
          walletAddress: u.walletAddress,
          role: u.role,
          authMethod: u.authMethod,
          avatarUrl: u.avatarUrl,
          phoneNumber: u.phoneNumber,
          joinedAt: u.createdAt,
        }));
      }
    }

    // 2. Lấy danh sách Hũ Động
    let workspaceVaults = await db
      .select()
      .from(vaults)
      .where(eq(vaults.workspaceId, id));

    // Nếu Workspace chưa có Hũ nào, tự động khởi tạo 3 Hũ Động tiêu chuẩn
    if (workspaceVaults.length === 0) {
      try {
        const seededVaults = await db
          .insert(vaults)
          .values([
            {
              workspaceId: id,
              onchainVaultId: 0,
              name: "Hũ Báo Hiếu & Dưỡng Già Ông Bà",
              description: "Bộ quy tắc SHIELD: Rút nhanh thường nhật từ đệm L1, rút lớn cần 2 Guardians duyệt.",
              ruleTemplate: "SHIELD",
              bufferRatioBps: 1000,
              fastWithdrawLimit: "50",
              requiredApprovals: 2,
              cachedTotalBalance: "1200",
              cachedL1Buffer: "120",
              cachedCChainYield: "1080",
              isActive: true,
            },
            {
              workspaceId: id,
              onchainVaultId: 1,
              name: "Hũ Tiết Kiệm Khởi Nghiệp Trẻ Nhỏ",
              description: "Bộ quy tắc MILESTONE: Quỹ việc nhà Chore-to-Earn, vốn sinh lời 8% APY trên C-Chain.",
              ruleTemplate: "MILESTONE",
              bufferRatioBps: 2000,
              fastWithdrawLimit: "20",
              requiredApprovals: 2,
              cachedTotalBalance: "450",
              cachedL1Buffer: "90",
              cachedCChainYield: "360",
              isActive: true,
            },
            {
              workspaceId: id,
              onchainVaultId: 2,
              name: "Hũ Tương Trợ Dòng Họ",
              description: "Bộ quy tắc ROSCA: Góp vốn xoay vòng 4 kỳ, vốn nhàn rỗi sinh lời DeFi trên C-Chain.",
              ruleTemplate: "ROSCA",
              bufferRatioBps: 0,
              fastWithdrawLimit: "1000",
              requiredApprovals: 3,
              cachedTotalBalance: "3000",
              cachedL1Buffer: "0",
              cachedCChainYield: "3000",
              isActive: true,
            },
          ])
          .returning();
        workspaceVaults = seededVaults;
      } catch (seedErr) {
        console.warn("Tự động seed hũ thất bại:", seedErr);
      }
    }

    return NextResponse.json({
      success: true,
      workspace: ws,
      members: memberRows,
      vaults: workspaceVaults,
    });
  } catch (error: any) {
    console.error("Lỗi GET /api/workspaces/[id]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi truy vấn Workspace" },
      { status: 500 }
    );
  }
}
