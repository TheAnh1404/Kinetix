import { NextRequest, NextResponse } from "next/server";
import { FamilyService } from "@/lib/familyService";

export const dynamic = "force-dynamic";

/**
 * POST /api/vaults/rosca-payout
 * Giải ngân kỳ hụi xoay vòng cho Hũ ROSCA
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vaultId } = body;

    if (!vaultId) {
      return NextResponse.json(
        { success: false, error: "Vui lòng cung cấp vaultId" },
        { status: 400 }
      );
    }

    const result = await FamilyService.payoutRoscaRound(vaultId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Lỗi POST /api/vaults/rosca-payout:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
