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

    // Nếu workspace thiếu các vai trò đa thế hệ (Ông Bà, Con Trẻ, Guardians), tự động liên kết thành viên
    const hasElderly = memberRows.some((m) => m.role === "ELDERLY");
    const hasChild = memberRows.some((m) => m.role === "CHILD");
    const hasGuardian = memberRows.some((m) => m.role === "GUARDIAN");

    if (!hasElderly || !hasChild || !hasGuardian) {
      const allSystemUsers = await db.select().from(users);
      const elderlyUser = allSystemUsers.find((u) => u.role === "ELDERLY");
      const childUser = allSystemUsers.find((u) => u.role === "CHILD");
      const guardianUsers = allSystemUsers.filter((u) => u.role === "GUARDIAN");

      const toAdd = [];
      if (!hasElderly && elderlyUser) toAdd.push({ user: elderlyUser, role: "ELDERLY" as const });
      if (!hasChild && childUser) toAdd.push({ user: childUser, role: "CHILD" as const });
      if (!hasGuardian && guardianUsers.length > 0) {
        guardianUsers.forEach((g) => toAdd.push({ user: g, role: "GUARDIAN" as const }));
      }

      for (const item of toAdd) {
        try {
          await db.insert(workspaceMembers).values({
            workspaceId: id,
            userId: item.user.id,
            role: item.role,
          });
          memberRows.push({
            id: item.user.id,
            fullName: item.user.fullName,
            walletAddress: item.user.walletAddress,
            role: item.role,
            authMethod: item.user.authMethod,
            avatarUrl: item.user.avatarUrl,
            phoneNumber: item.user.phoneNumber,
            joinedAt: new Date(),
          });
        } catch (e) {
          // ignore duplicate
        }
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
