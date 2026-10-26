/**
 * JWT Authentication Utility using `jose`
 * Tương thích 100% với Next.js 14 App Router & Edge Middleware
 */

import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

export interface AuthTokenPayload {
  userId: string;
  familyId: string;
  fullName: string;
  role: "ADMIN" | "GUARDIAN" | "ELDERLY" | "CHILD";
  walletAddress: string;
  avatarUrl?: string | null;
}

const JWT_SECRET = process.env.JWT_SECRET || "kinetix-family-finance-os-super-secret-key-2026-unihack";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

export const SESSION_COOKIE_NAME = "kinetix_session";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 ngày (tính bằng giây)

/**
 * Ký và tạo chuỗi JWT mã hóa an toàn
 */
export async function signAuthToken(payload: AuthTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

/**
 * Xác thực và giải mã JWT token
 */
export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ["HS256"],
    });
    return payload as unknown as AuthTokenPayload;
  } catch (error) {
    return null;
  }
}
