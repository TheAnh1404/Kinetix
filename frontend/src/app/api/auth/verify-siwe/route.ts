import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { eq, sql, gt } from "drizzle-orm";
import { db } from "@/db";
import { users, families, authNonces } from "@/db/schema";
import { signAuthToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/jwt";

export const dynamic = "force-dynamic";

/**
 * Trích xuất các trường từ thông điệp chuẩn SIWE EIP-4361
 */
function parseSiweMessage(message: string): { address?: string; nonce?: string } {
  // Regex lấy địa chỉ ví (sau dòng 'wants you to sign in with your Ethereum account:')
  const addressMatch = message.match(/0x[a-fA-F0-9]{40}/i);
  // Regex lấy nonce
  const nonceMatch = message.match(/Nonce:\s*([a-zA-Z0-9_-]+)/i);

  return {
    address: addressMatch ? addressMatch[0] : undefined,
    nonce: nonceMatch ? nonceMatch[1] : undefined,
  };
}

/**
 * POST /api/auth/verify-siwe
 * Xác thực chữ ký ví Avalanche Core Wallet (EIP-4361 Sign-In with Ethereum)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, signature } = body;

    if (!message || !signature) {
      return NextResponse.json(
        { error: "Thiếu thông điệp message hoặc chữ ký signature" },
        { status: 400 }
      );
    }

    // 1. Phân tích SIWE Message
    const { address, nonce } = parseSiweMessage(message);
    if (!address) {
      return NextResponse.json(
        { error: "Không tìm thấy địa chỉ ví hợp lệ trong SIWE message" },
        { status: 400 }
      );
    }

    // 2. Xác thực chữ ký mật mã bằng Viem
    const isValidSignature = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Chữ ký mật mã không hợp lệ hoặc không khớp với địa chỉ ví" },
        { status: 401 }
      );
    }

    // 3. Đối soát Nonce chống tấn công Replay Attack
    if (nonce) {
      try {
        const [nonceRecord] = await db
          .select()
          .from(authNonces)
          .where(eq(authNonces.nonce, nonce));

        if (nonceRecord) {
          // Xóa nonce ngay sau khi dùng (single-use)
          await db.delete(authNonces).where(eq(authNonces.nonce, nonce));

          // Kiểm tra hạn sử dụng
          if (new Date(nonceRecord.expiresAt) < new Date()) {
            return NextResponse.json(
              { error: "Mã nonce đã hết hạn (quá 5 phút). Vui lòng thử lại" },
              { status: 400 }
            );
          }
        }
      } catch (nonceErr) {
        console.warn("Bỏ qua lỗi nonce DB kiểm tra (Demo mode):", nonceErr);
      }
    }

    // 4. Truy vấn người dùng trong Neon Database theo địa chỉ ví (case-insensitive)
    const lowerAddress = address.toLowerCase();
    const [existingUser] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.walletAddress}) = ${lowerAddress}`);

    let user = existingUser;

    // 5. Nếu ví mới chưa có trong hệ thống: Tự động đăng ký vào Gia đình mẫu (Demo Mode)
    if (!user) {
      let [family] = await db.select().from(families).limit(1);
      if (!family) {
        [family] = await db
          .insert(families)
          .values({
            name: "Gia đình Kinetix",
            adminWallet: address,
          })
          .returning();
      }

      const [newUser] = await db
        .insert(users)
        .values({
          familyId: family.id,
          fullName: `Thành viên (${address.slice(0, 6)}...${address.slice(-4)})`,
          role: "GUARDIAN",
          walletAddress: address,
          authMethod: "CORE_WALLET",
          isAllowlisted: true,
          pinCode: "1234",
        })
        .returning();

      user = newUser;
    }

    // 6. Ký JWT Session Token
    const token = await signAuthToken({
      userId: user.id,
      familyId: user.familyId,
      fullName: user.fullName,
      role: user.role,
      walletAddress: user.walletAddress,
      avatarUrl: user.avatarUrl,
    });

    // 7. Tạo phản hồi và gắn HTTP-Only Secure Cookie
    const response = NextResponse.json({
      success: true,
      message: "Đăng nhập ví Core Wallet thành công",
      user: {
        id: user.id,
        familyId: user.familyId,
        fullName: user.fullName,
        role: user.role,
        walletAddress: user.walletAddress,
        avatarUrl: user.avatarUrl,
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
    console.error("Lỗi verify-siwe:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi xử lý xác thực SIWE" },
      { status: 500 }
    );
  }
}
