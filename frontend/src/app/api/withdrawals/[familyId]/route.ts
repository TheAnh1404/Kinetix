import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { withdrawalRequests, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { familyId: string } }
) {
  try {
    const { familyId } = params;
    if (!familyId) {
      return NextResponse.json({ error: "familyId is required" }, { status: 400 });
    }

    const withdrawals = await db
      .select({
        id: withdrawalRequests.id,
        familyId: withdrawalRequests.familyId,
        requesterId: withdrawalRequests.requesterId,
        requesterName: users.fullName,
        requesterAddress: users.walletAddress,
        amount: withdrawalRequests.amount,
        vault: withdrawalRequests.vault,
        reason: withdrawalRequests.reason,
        onchainRequestId: withdrawalRequests.onchainRequestId,
        approvalsCount: withdrawalRequests.approvalsCount,
        requiredApprovals: withdrawalRequests.requiredApprovals,
        status: withdrawalRequests.status,
        createdAt: withdrawalRequests.createdAt,
      })
      .from(withdrawalRequests)
      .leftJoin(users, eq(withdrawalRequests.requesterId, users.id))
      .where(eq(withdrawalRequests.familyId, familyId))
      .orderBy(desc(withdrawalRequests.createdAt));

    return NextResponse.json({ success: true, data: withdrawals });
  } catch (error: any) {
    console.error("Lỗi GET /api/withdrawals/[familyId]:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
