import { NextRequest, NextResponse } from "next/server";
import { FamilyService } from "@/lib/familyService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requestId, guardianWallet } = body;

    if (!requestId) {
      return NextResponse.json({ error: "requestId is required" }, { status: 400 });
    }

    const result = await FamilyService.approveWithdrawal(requestId, guardianWallet);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Lỗi POST /api/withdrawals/approve:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
