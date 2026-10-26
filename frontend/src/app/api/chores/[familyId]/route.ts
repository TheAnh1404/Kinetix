import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chores, users } from "@/db/schema";
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

    const choreList = await db
      .select({
        id: chores.id,
        familyId: chores.familyId,
        childId: chores.childId,
        childName: users.fullName,
        childAvatar: users.avatarUrl,
        title: chores.title,
        rewardAmount: chores.rewardAmount,
        status: chores.status,
        proofImageUrl: chores.proofImageUrl,
        createdAt: chores.createdAt,
      })
      .from(chores)
      .leftJoin(users, eq(chores.childId, users.id))
      .where(eq(chores.familyId, familyId))
      .orderBy(desc(chores.createdAt));

    return NextResponse.json({ success: true, data: choreList });
  } catch (error: any) {
    console.error("Lỗi GET /api/chores/[familyId]:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
