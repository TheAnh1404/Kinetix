import { NextRequest, NextResponse } from "next/server";
import { FamilyService } from "@/lib/familyService";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const notifs = await FamilyService.getUserNotifications(id);
    return NextResponse.json({ success: true, data: notifs });
  } catch (error: any) {
    console.error("Lỗi GET /api/notifications/[id]:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
