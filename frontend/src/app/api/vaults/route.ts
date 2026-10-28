import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vaults, vaultMembers, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/vaults?workspaceId=...
 * Lấy danh sách Dynamic Vaults của một Workspace
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      const allVaults = await db.select().from(vaults).orderBy(desc(vaults.createdAt));
      return NextResponse.json({ success: true, vaults: allVaults });
    }

    const workspaceVaults = await db
      .select()
      .from(vaults)
      .where(eq(vaults.workspaceId, workspaceId))
      .orderBy(vaults.onchainVaultId);

    return NextResponse.json({
      success: true,
      vaults: workspaceVaults,
    });
  } catch (error: any) {
    console.error("Lỗi GET /api/vaults:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vaults
 * Khởi tạo Hũ Động mới trong Workspace (đồng bộ với smart contract)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      workspaceId,
      onchainVaultId,
      name,
      description,
      ruleTemplate,
      bufferRatioBps,
      fastWithdrawLimit,
      requiredApprovals,
      guardianWallets,
      beneficiaryWallets,
      targetGoalAmount,
      targetDeadline,
      roscaRoundDuration,
      roscaRoundContribution,
    } = body;

    if (!workspaceId || !name || !ruleTemplate) {
      return NextResponse.json(
        { success: false, error: "Vui lòng điền đầy đủ thông tin Hũ Động" },
        { status: 400 }
      );
    }

    // Nếu không truyền onchainVaultId, tự sinh tiếp theo số lượng vaults hiện có
    let nextOnchainId = onchainVaultId;
    if (!nextOnchainId) {
      const existing = await db
        .select()
        .from(vaults)
        .where(eq(vaults.workspaceId, workspaceId));
      nextOnchainId = existing.length + 1;
    }

    const [newVault] = await db
      .insert(vaults)
      .values({
        workspaceId,
        onchainVaultId: Number(nextOnchainId),
        name,
        description: description || "",
        ruleTemplate,
        bufferRatioBps: bufferRatioBps !== undefined ? Number(bufferRatioBps) : 1000,
        fastWithdrawLimit: (fastWithdrawLimit !== undefined ? fastWithdrawLimit : 50).toString(),
        requiredApprovals: requiredApprovals !== undefined ? Number(requiredApprovals) : 2,
        cachedTotalBalance: "0",
        cachedL1Buffer: "0",
        cachedCChainYield: "0",
        targetGoalAmount: (targetGoalAmount !== undefined ? targetGoalAmount : 0).toString(),
        targetDeadline: targetDeadline ? new Date(targetDeadline) : null,
        roscaRoundDuration: roscaRoundDuration !== undefined ? Number(roscaRoundDuration) : 0,
        roscaRoundContribution: (roscaRoundContribution !== undefined ? roscaRoundContribution : 0).toString(),
        roscaCurrentRound: 0,
        roscaLastRoundTimestamp: new Date(),
        isActive: true,
      })
      .returning();

    // Map địa chỉ ví người bảo hộ (guardians)
    if (guardianWallets && Array.isArray(guardianWallets)) {
      for (const wallet of guardianWallets) {
        const [u] = await db
          .select()
          .from(users)
          .where(eq(users.walletAddress, wallet));
        if (u) {
          await db.insert(vaultMembers).values({
            vaultId: newVault.id,
            userId: u.id,
            vaultRole: "GUARDIAN",
          });
        }
      }
    }

    // Map địa chỉ ví người thụ hưởng (beneficiaries)
    if (beneficiaryWallets && Array.isArray(beneficiaryWallets)) {
      for (const wallet of beneficiaryWallets) {
        const [u] = await db
          .select()
          .from(users)
          .where(eq(users.walletAddress, wallet));
        if (u) {
          await db.insert(vaultMembers).values({
            vaultId: newVault.id,
            userId: u.id,
            vaultRole: "BENEFICIARY",
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      vault: newVault,
    });
  } catch (error: any) {
    console.error("Lỗi POST /api/vaults:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
