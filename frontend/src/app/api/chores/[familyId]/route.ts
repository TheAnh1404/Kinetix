import { NextRequest, NextResponse } from "next/server";
import { FamilyService } from "@/lib/familyService";

export async function GET(
  req: NextRequest,
  { params }: { params: { familyId: string } }
) {
  try {
    const { familyId } = params;
    if (!familyId) {
      return NextResponse.json({ error: "familyId is required" }, { status: 400 });
    }

    const chores = await FamilyService.getFamilyChores(familyId);
    return NextResponse.json({ success: true, data: chores });
  } catch (error: any) {
    console.error("Lỗi GET /api/chores/[familyId]:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
