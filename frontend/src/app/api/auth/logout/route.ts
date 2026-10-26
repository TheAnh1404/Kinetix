import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/jwt";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/logout
 * Đăng xuất và xóa phiên làm việc cookie
 */
export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Đăng xuất phiên làm việc thành công",
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
  });

  return response;
}
