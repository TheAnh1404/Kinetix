import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, families, authNonces } from "@/db/schema";
import { signAuthToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/jwt";

export const dynamic = "force-dynamic";

/**
 * Trích xuất các trường từ thông điệp chuẩn SIWE EIP-4361
 */
function parseSiweMessage(message: string): { address?: string; nonce?: string } {
  const addressMatch = message.match(/0x[a-fA-F0-9]{40}/i);
  const nonceMatch = message.match(/Nonce:\s*([a-zA-Z0-9_-]+)/i);

  return {
    address: addressMatch ? addressMatch[0].toLowerCase() : undefined,
    nonce: nonceMatch ? nonceMatch[1] : undefined,
  };
}

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
 * POST /api/auth/verify-siwe
 * Xác thực chữ ký ví Avalanche Core Wallet (EIP-4361 Sign-In with Ethereum)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, signature } = body;

    if (!message || !signature) {
      return NextResponse.json(
        { error: "Thiếu thông điệp message hoặc chữ ký signature." },
        { status: 400 }
      );
    }

    // 1. Phân tích SIWE Message
    const parsed = parseSiweMessage(message);
    const address = (body.address || parsed.address);
    const nonce = parsed.nonce;
    if (!address) {
      return NextResponse.json(
        { error: "Không tìm thấy địa chỉ ví hợp lệ trong SIWE message." },
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
        { error: "Chữ ký mật mã không hợp lệ hoặc không khớp với địa chỉ ví." },
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
              { error: "Mã nonce đã hết hạn. Vui lòng tải lại và thử lại." },
              { status: 400 }
            );
          }
        }
      } catch (nonceErr) {
        console.warn("Lỗi kiểm tra nonce DB:", nonceErr);
      }
    }

    // 4. Truy vấn người dùng trong Neon Database theo địa chỉ ví (case-insensitive)
    const lowerAddress = address.toLowerCase();
    const [existingUser] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.walletAddress}) = ${lowerAddress}`);

    // 5. Nếu ví CHƯA đăng ký trong Database -> Trả về mã WALLET_NOT_REGISTERED
    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          code: "WALLET_NOT_REGISTERED",
          error: "Địa chỉ ví này chưa được đăng ký trong hệ thống Kinetix. Vui lòng chọn 'Tạo Gia Đình Mới' hoặc 'Gia Nhập Gia Đình'.",
          address: lowerAddress,
        },
        { status: 404 }
      );
    }

    // Lấy thông tin gia đình của user
    const [family] = await db
      .select()
      .from(families)
      .where(eq(families.id, existingUser.familyId));

    // 6. Ký JWT Session Token
    const token = await signAuthToken({
      userId: existingUser.id,
      familyId: existingUser.familyId,
      fullName: existingUser.fullName,
      role: existingUser.role,
      walletAddress: existingUser.walletAddress,
      avatarUrl: existingUser.avatarUrl,
    });

    const redirectUrl = getRedirectPathByRole(existingUser.role);

    // 7. Tạo phản hồi và gắn HTTP-Only Secure Cookie
    const response = NextResponse.json({
      success: true,
      message: "Đăng nhập ví Core Wallet thành công!",
      redirectUrl,
      family: family
        ? {
            id: family.id,
            name: family.name,
            familyCode: family.familyCode,
          }
        : null,
      user: {
        id: existingUser.id,
        familyId: existingUser.familyId,
        fullName: existingUser.fullName,
        role: existingUser.role,
        walletAddress: existingUser.walletAddress,
        avatarUrl: existingUser.avatarUrl,
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
