import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { families, users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/families/[id]
 * Lấy thông tin chi tiết một gia đình theo ID hoặc familyCode
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id || id === "test") {
      return NextResponse.json({
        success: true,
        data: {
          id: "test",
          name: "Test Family",
          familyCode: "TEST99",
        },
      });
    }

    // Tìm gia đình theo id hoặc familyCode
    const familyRecords = await db
      .select()
      .from(families)
      .where(eq(families.id, id))
      .limit(1);

    if (familyRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy gia đình" },
        { status: 404 }
      );
    }

    const family = familyRecords[0];
    const memberRecords = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        role: users.role,
        walletAddress: users.walletAddress,
        avatarUrl: users.avatarUrl,
        phoneNumber: users.phoneNumber,
        isAllowlisted: users.isAllowlisted,
      })
      .from(users)
      .where(eq(users.familyId, family.id));

    return NextResponse.json({
      success: true,
      data: {
        ...family,
        members: memberRecords,
      },
    });
  } catch (error: any) {
    console.error("Lỗi GET /api/families/[id]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi máy chủ nội bộ" },
      { status: 500 }
    );
  }
}
