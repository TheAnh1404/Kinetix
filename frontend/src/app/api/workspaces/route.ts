import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workspaces, workspaceMembers, users, vaults } from "@/db/schema";
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

    // Tự động khởi tạo 3 Hũ Động tiêu chuẩn cho Workspace mới
    await db.insert(vaults).values([
      {
        workspaceId: newWs.id,
        onchainVaultId: 0,
        name: "Hũ Báo Hiếu & Dưỡng Già",
        description: "Bộ quy tắc SHIELD: Rút nhanh <= 0.05 AVAX giải ngân tức thì 0 gas từ đệm L1.",
        ruleTemplate: "SHIELD",
        bufferRatioBps: 1000,
        fastWithdrawLimit: "0.05",
        requiredApprovals: 2,
        cachedTotalBalance: "0.100",
        cachedL1Buffer: "0.010",
        cachedCChainYield: "0.090",
        isActive: true,
      },
      {
        workspaceId: newWs.id,
        onchainVaultId: 1,
        name: "Hũ Nhiệm Vụ & Cột Mốc",
        description: "Bộ quy tắc MILESTONE: Quỹ việc nhà và cột mốc, vốn sinh lời 8% APY trên C-Chain.",
        ruleTemplate: "MILESTONE",
        bufferRatioBps: 2000,
        fastWithdrawLimit: "0.02",
        requiredApprovals: 2,
        cachedTotalBalance: "0.050",
        cachedL1Buffer: "0.010",
        cachedCChainYield: "0.040",
        isActive: true,
      },
      {
        workspaceId: newWs.id,
        onchainVaultId: 2,
        name: "Hũ Góp Vốn Xoay Vòng",
        description: "Bộ quy tắc ROSCA: Góp vốn định kỳ, vốn nhàn rỗi sinh lời DeFi 8% APY trên C-Chain.",
        ruleTemplate: "ROSCA",
        bufferRatioBps: 0,
        fastWithdrawLimit: "0.1",
        requiredApprovals: 3,
        cachedTotalBalance: "0.200",
        cachedL1Buffer: "0",
        cachedCChainYield: "0.200",
        isActive: true,
      },
    ]);

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
