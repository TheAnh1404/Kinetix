import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { db } from "@/db";
import { users, families } from "@/db/schema";
import { verifyAuthToken, SESSION_COOKIE_NAME } from "@/lib/jwt";

export const dynamic = "force-dynamic";

/**
 * GET /api/families/[id]/members
 * Lấy danh sách thành viên thực tế của gia đình từ PostgreSQL
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const familyId = params.id;
    if (!familyId) {
      return NextResponse.json({ error: "Thiếu familyId" }, { status: 400 });
    }

    const memberList = await db
      .select({
        id: users.id,
        familyId: users.familyId,
        fullName: users.fullName,
        username: users.username,
        role: users.role,
        walletAddress: users.walletAddress,
        authMethod: users.authMethod,
        avatarUrl: users.avatarUrl,
        phoneNumber: users.phoneNumber,
        isAllowlisted: users.isAllowlisted,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.familyId, familyId))
      .orderBy(desc(users.createdAt));

    return NextResponse.json({
      success: true,
      members: memberList,
    });
  } catch (error: any) {
    console.error("Lỗi get family members:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi lấy danh sách thành viên" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/families/[id]/members
 * Thêm thành viên mới vào gia đình (Admin tạo cho Ông Bà, Con Nhỏ hoặc Guardian)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const familyId = params.id;
    if (!familyId) {
      return NextResponse.json({ error: "Thiếu familyId" }, { status: 400 });
    }

    // Kiểm tra quyền Admin từ cookie
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    const session = await verifyAuthToken(token);
    if (!session || (session.role !== "ADMIN" && session.role !== "GUARDIAN")) {
      return NextResponse.json(
        { error: "Chỉ Người quản trị (Admin) mới có quyền thêm thành viên." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { fullName, role, phoneNumber, pinCode, walletAddress, avatarUrl } = body;

    if (!fullName || !role) {
      return NextResponse.json(
        { error: "Vui lòng nhập Họ tên và chọn Vai trò cho thành viên." },
        { status: 400 }
      );
    }

    // Nếu không truyền ví (thành viên là Ông Bà / Con Nhỏ), tự động sinh địa chỉ ví Family L1
    let assignedWallet = walletAddress;
    let authMethod: "CORE_WALLET" | "PASSKEY_EMBEDDED" = "CORE_WALLET";

    if (!assignedWallet) {
      const privateKey = generatePrivateKey();
      const account = privateKeyToAccount(privateKey);
      assignedWallet = account.address;
      authMethod = "PASSKEY_EMBEDDED";
    }

    // Chọn avatar mặc định theo vai trò nếu không có
    let defaultAvatar = avatarUrl;
    if (!defaultAvatar) {
      if (role === "ELDERLY") {
        defaultAvatar =
          "https://lh3.googleusercontent.com/aida-public/AB6AXuB9RXFgUn83eP41jg2weE3YA8vd83fsVimUf5y0OcZS7SOQ3XPOzG_gbODV_xJIXeRQye9NHAh2TXP_28Oz-bPHhWTfscJFCZWXYRXq2gQAAtwAVTc1yseRsDx3GBa94HVhTHAal40UzoVwN7YY1IXQ5EmMOe0WhhEvzu4V7ZNBtixA0ZiaR61Ad1UJUADoRuNzug0ggIZW8eO5XEiktIZD-zCJ4THMAqG0i7Z1ivkCGPnUrjsBJg";
      } else if (role === "CHILD") {
        defaultAvatar =
          "https://lh3.googleusercontent.com/aida-public/AB6AXuAc1UhNj0E3eKWwrEAv9WJ4KTtp_4pnR4-fyhwEHSKncOxXMGgdr5EdEkF7AMpuaguOYSWTwC-3Ovp1jhOZtflnABlKorh-7E9pPfvKLow6TvFQHGxmf0EgQh_J7eX2WyhgY_obtzgCtT892o3CCd1-TKpF3WABb42fGzxm4wVTK6S7fWG0bKJKRZGbEsWybndKRK3uK6Aix2ehMS1hOr8zRyDG3ZRA0ODbqcIHWiDv1p2ayRMtyQ";
      } else {
        defaultAvatar =
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150";
      }
    }

    const [newMember] = await db
      .insert(users)
      .values({
        familyId,
        fullName: fullName.trim(),
        role,
        walletAddress: assignedWallet,
        authMethod,
        pinCode: pinCode ? pinCode.trim() : "1234",
        phoneNumber: phoneNumber ? phoneNumber.trim() : null,
        avatarUrl: defaultAvatar,
        isAllowlisted: true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: `Đã thêm thành viên '${newMember.fullName}' vào gia đình!`,
      member: newMember,
    });
  } catch (error: any) {
    console.error("Lỗi add member:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi tạo thành viên gia đình" },
      { status: 500 }
    );
  }
}
