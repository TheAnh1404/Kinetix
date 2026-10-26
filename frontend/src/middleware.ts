import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, SESSION_COOKIE_NAME } from "@/lib/jwt";

/**
 * Next.js Edge Middleware
 * Bảo vệ route và phân quyền thông minh dựa trên vai trò gia đình
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bỏ qua các file tĩnh và API xác thực
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const payload = token ? await verifyAuthToken(token) : null;

  // 1. Nếu đang ở trang login và đã đăng nhập hợp lệ -> chuyển hướng vào ứng dụng
  if (pathname === "/login") {
    if (payload) {
      if (payload.role === "ELDERLY") {
        return NextResponse.redirect(new URL("/?tab=kinetix-shield", req.url));
      }
      if (payload.role === "CHILD") {
        return NextResponse.redirect(new URL("/?tab=kinetix-kids", req.url));
      }
      return NextResponse.redirect(new URL("/?tab=quan-tri-cha-me", req.url));
    }
    return NextResponse.next();
  }

  // 2. Bảo vệ các route Dashboard riêng biệt (/dashboard/*)
  if (pathname.startsWith("/dashboard")) {
    if (!payload) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Kiểm tra phân quyền truy cập theo vai trò
    if (pathname.startsWith("/dashboard/guardian") || pathname.startsWith("/dashboard/admin")) {
      if (payload.role !== "ADMIN" && payload.role !== "GUARDIAN") {
        // Nếu Ông Bà hoặc Con Nhỏ cố vào trang Quản trị -> redirect về giao diện riêng
        if (payload.role === "ELDERLY") {
          return NextResponse.redirect(new URL("/?tab=kinetix-shield", req.url));
        }
        if (payload.role === "CHILD") {
          return NextResponse.redirect(new URL("/?tab=kinetix-kids", req.url));
        }
      }
    }

    if (pathname.startsWith("/dashboard/elderly")) {
      if (payload.role !== "ELDERLY" && payload.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/?tab=quan-tri-cha-me", req.url));
      }
    }

    if (pathname.startsWith("/dashboard/kids")) {
      if (payload.role !== "CHILD" && payload.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/?tab=quan-tri-cha-me", req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
