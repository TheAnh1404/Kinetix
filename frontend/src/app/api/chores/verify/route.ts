import { NextRequest, NextResponse } from "next/server";
import { FamilyService } from "@/lib/familyService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { choreId } = body;

    if (!choreId) {
      return NextResponse.json({ error: "choreId is required" }, { status: 400 });
    }

    const result = await FamilyService.verifyAndRewardChore(choreId);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Lỗi POST /api/chores/verify:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
