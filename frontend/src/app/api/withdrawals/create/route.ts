import { NextRequest, NextResponse } from "next/server";
import { FamilyService } from "@/lib/familyService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { familyId, requesterId, amount, vault, reason, onchainRequestId } = body;

    if (!familyId || !requesterId || amount === undefined || !vault || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: familyId, requesterId, amount, vault, reason" },
        { status: 400 }
      );
    }

    let normalizedVault: "RetirementShield" | "KidsSavings" | "FamilyROSCA" = "RetirementShield";
    if (vault === "KidsSavings" || vault === "Kids Savings") {
      normalizedVault = "KidsSavings";
    } else if (vault === "FamilyROSCA" || vault === "Family ROSCA") {
      normalizedVault = "FamilyROSCA";
    }

    const result = await FamilyService.createWithdrawalRequest({
      familyId,
      requesterId,
      amount: Number(amount),
      vault: normalizedVault,
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
