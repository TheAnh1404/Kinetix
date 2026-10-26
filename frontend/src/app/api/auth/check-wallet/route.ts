import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, families } from "@/db/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/check-wallet?address=0x...
 * Kiểm tra trạng thái đăng ký của địa chỉ ví trong cơ sở dữ liệu
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp địa chỉ ví (address)" },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase();

    // Tìm kiếm user theo địa chỉ ví (không phân biệt chữ hoa/thường)
    const [existingUser] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.walletAddress}) = ${normalizedAddress}`);

    if (!existingUser) {
      return NextResponse.json({
        isRegistered: false,
        message: "Địa chỉ ví chưa đăng ký trong bất kỳ gia đình nào.",
      });
    }

    // Lấy thông tin gia đình của user
    let family = null;
    if (existingUser.familyId) {
      const [f] = await db
        .select()
        .from(families)
        .where(eq(families.id, existingUser.familyId));
      family = f;
    }

    return NextResponse.json({
      isRegistered: true,
      user: {
        id: existingUser.id,
        fullName: existingUser.fullName,
        role: existingUser.role,
        walletAddress: existingUser.walletAddress,
        avatarUrl: existingUser.avatarUrl,
      },
      family: family
        ? {
            id: family.id,
            name: family.name,
            familyCode: family.familyCode,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Lỗi check-wallet:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi kiểm tra trạng thái ví" },
      { status: 500 }
    );
  }
}
