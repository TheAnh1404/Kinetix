import { NextRequest, NextResponse } from "next/server";
import { sql, and } from "drizzle-orm";
import { db } from "@/db";
import { users, families } from "@/db/schema";
import { signAuthToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/jwt";

export const dynamic = "force-dynamic";

/**
 * Điều hướng theo vai trò thành viên
 */
function getRedirectPathByRole(role: string): string {
  switch (role) {
    case "ELDERLY":
      return "/?tab=kinetix-shield";
    case "CHILD":
      return "/?tab=kinetix-kids";
    case "ADMIN":
    case "GUARDIAN":
    default:
      return "/?tab=quan-tri-cha-me";
  }
}

/**
 * POST /api/auth/member-login
 * Đăng nhập thành viên gia đình (Ông Bà, Con Trẻ, Người thân) bằng Mã Gia Đình + Tên/SĐT + PIN
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { familyCode, identifier, pinCode } = body;

    if (!familyCode || !identifier || !pinCode) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ Mã Gia Đình, Tên đăng nhập/SĐT và Mã PIN." },
        { status: 400 }
      );
    }

    const cleanCode = familyCode.trim().toUpperCase();
    const cleanId = identifier.trim();
    const cleanPin = pinCode.trim();

    // 1. Tra cứu Gia đình theo Family Code
    const [family] = await db
      .select()
      .from(families)
      .where(sql`UPPER(${families.familyCode}) = ${cleanCode}`);

    if (!family) {
      return NextResponse.json(
        { error: `Không tìm thấy gia đình với mã '${cleanCode}'. Vui lòng kiểm tra lại!` },
        { status: 404 }
      );
    }

    // 2. Tra cứu thành viên trong gia đình theo SĐT, Tên đăng nhập hoặc Họ tên
    const familyMembers = await db
      .select()
      .from(users)
      .where(
        and(
          sql`${users.familyId} = ${family.id}`,
          sql`(
            ${users.phoneNumber} = ${cleanId}
            OR LOWER(${users.fullName}) = LOWER(${cleanId})
            OR LOWER(${users.username}) = LOWER(${cleanId})
            OR LOWER(${users.fullName}) LIKE LOWER(${'%' + cleanId + '%'})
          )`
        )
      );

    if (familyMembers.length === 0) {
      return NextResponse.json(
        {
          error: `Không tìm thấy thành viên '${cleanId}' trong gia đình ${family.name}. Vui lòng liên hệ Người quản trị để được thêm vào gia đình.`,
        },
        { status: 404 }
      );
    }

    // Chọn thành viên khớp nhất
    const targetUser = familyMembers[0];

    // 3. Xác thực mã PIN bảo mật
    if (targetUser.pinCode) {
      if (cleanPin !== targetUser.pinCode) {
        return NextResponse.json(
          { error: "Mã PIN không chính xác. Vui lòng thử lại!" },
          { status: 401 }
        );
      }
    }

    // 4. Cấp JWT Session Cookie
    const token = await signAuthToken({
      userId: targetUser.id,
      familyId: family.id,
      fullName: targetUser.fullName,
      role: targetUser.role,
      walletAddress: targetUser.walletAddress,
      avatarUrl: targetUser.avatarUrl,
    });

    const redirectUrl = getRedirectPathByRole(targetUser.role);

    const response = NextResponse.json({
      success: true,
      message: `Đăng nhập thành công với vai trò ${targetUser.fullName}!`,
      redirectUrl,
      family: {
        id: family.id,
        name: family.name,
        familyCode: family.familyCode,
      },
      user: {
        id: targetUser.id,
        familyId: targetUser.familyId,
        fullName: targetUser.fullName,
        role: targetUser.role,
        walletAddress: targetUser.walletAddress,
        avatarUrl: targetUser.avatarUrl,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch (error: any) {
    console.error("Lỗi member-login:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi xử lý đăng nhập thành viên" },
      { status: 500 }
    );
  }
}
