import { NextRequest, NextResponse } from "next/server";
import { FamilyService } from "@/lib/familyService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { familyId, requesterId, amount, vault, vaultId, reason, onchainRequestId } = body;

    if (!familyId || !requesterId || amount === undefined || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: familyId, requesterId, amount, reason" },
        { status: 400 }
      );
    }

    const result = await FamilyService.createWithdrawalRequest({
      familyId,
      requesterId,
      amount: Number(amount),
      vault: vault || "SHIELD",
      vaultId: vaultId || undefined,
      reason,
      onchainRequestId: onchainRequestId ? Number(onchainRequestId) : undefined,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error("Lỗi POST /api/withdrawals/create:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
