import { NextRequest, NextResponse } from "next/server";
import { FamilyService } from "@/lib/familyService";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { familyId, title, rewardAmount } = body;
    let { childId } = body;

    if (!familyId || !title || rewardAmount === undefined) {
      return NextResponse.json(
        { error: "familyId, title and rewardAmount are required" },
        { status: 400 }
      );
    }

    // Nếu không có childId, tìm user có role 'CHILD' đầu tiên trong gia đình
    if (!childId) {
      const childUsers = await db
        .select()
        .from(users)
        .where(and(eq(users.familyId, familyId), eq(users.role, "CHILD")))
        .limit(1);

      if (childUsers.length > 0) {
        childId = childUsers[0].id;
      } else {
        // Fallback: Lấy user đầu tiên trong gia đình
        const anyUser = await db
          .select()
          .from(users)
          .where(eq(users.familyId, familyId))
          .limit(1);

        if (anyUser.length > 0) {
          childId = anyUser[0].id;
        } else {
          return NextResponse.json(
            { error: "Không tìm thấy thành viên trong gia đình để giao việc" },
            { status: 400 }
          );
        }
      }
    }

    const chore = await FamilyService.createChore({
      familyId,
      childId,
      title,
      rewardAmount: Number(rewardAmount),
    });

    return NextResponse.json({ success: true, data: chore }, { status: 201 });
  } catch (error: any) {
    console.error("Lỗi POST /api/chores/create:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
