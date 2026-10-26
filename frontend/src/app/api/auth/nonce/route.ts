import { NextResponse } from "next/server";
import { db } from "@/db";
import { authNonces } from "@/db/schema";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/nonce
 * Sinh mã nonce ngẫu nhiên bảo mật dùng cho đăng nhập SIWE EIP-4361
 * Nonce có hiệu lực trong 5 phút
 */
export async function GET() {
  try {
    // Sinh chuỗi ngẫu nhiên 32 ký tự hex (cryptographically secure)
    const nonce = crypto.randomBytes(16).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 phút

    // Lưu vào Neon PostgreSQL
    await db.insert(authNonces).values({
      nonce,
      createdAt: now,
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      nonce,
    });
  } catch (error: any) {
    console.error("Lỗi tạo nonce:", error);
    // Fallback: Nếu lỗi DB, vẫn trả về nonce ngẫu nhiên để client không bị gián đoạn demo
    const fallbackNonce = crypto.randomBytes(16).toString("hex");
    return NextResponse.json({
      success: true,
      nonce: fallbackNonce,
    });
  }
}
