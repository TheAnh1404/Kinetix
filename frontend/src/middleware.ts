import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, SESSION_COOKIE_NAME } from "@/lib/jwt";

/**
 * Lấy tab mặc định theo vai trò thành viên
 */
function getDefaultTabForRole(role?: string): string {
  switch (role) {
    case "ELDERLY":
      return "kinetix-shield";
    case "CHILD":
      return "kinetix-kids";
    case "ADMIN":
    case "GUARDIAN":
    default:
      return "quan-tri-cha-me";
  }
}

/**
 * Next.js Edge Middleware
 * Bảo vệ route, chống 404 và phân quyền thông minh dựa trên vai trò gia đình
 */
export async function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl;

    // 1. Tuyệt đối bỏ qua các file tĩnh, bundle chunks, Next.js assets và API routes
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/favicon.ico") ||
      pathname.includes(".")
    ) {
      return NextResponse.next();
    }

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const payload = token ? await verifyAuthToken(token) : null;

    // 2. Nếu đang ở trang login và đã đăng nhập hợp lệ -> chuyển hướng vào ứng dụng
    if (pathname === "/login") {
      if (payload) {
        return NextResponse.redirect(
          new URL(`/?tab=${getDefaultTabForRole(payload.role)}`, req.url)
        );
      }
      return NextResponse.next();
    }

    // 3. Xử lý các route Dashboard và shortcut phân quyền (chống 404 hoàn toàn)
    const isDashboardRoute =
      pathname.startsWith("/dashboard") ||
      pathname === "/guardian" ||
      pathname === "/admin" ||
      pathname === "/shield" ||
      pathname === "/elderly" ||
      pathname === "/kids" ||
      pathname === "/rosca" ||
      pathname === "/vault" ||
      pathname === "/chores";

    if (isDashboardRoute) {
      // Chưa đăng nhập -> Chuyển về trang đăng nhập với tham số 'from'
      if (!payload) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("from", pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Đã đăng nhập -> Điều hướng thông minh về tab tương ứng (tránh 404 do thiếu file)
      if (
        pathname.startsWith("/dashboard/guardian") ||
        pathname.startsWith("/dashboard/admin") ||
        pathname === "/guardian" ||
        pathname === "/admin" ||
        pathname === "/vault"
      ) {
        if (payload.role === "ELDERLY") {
          return NextResponse.redirect(new URL("/?tab=kinetix-shield", req.url));
        }
        if (payload.role === "CHILD") {
          return NextResponse.redirect(new URL("/?tab=kinetix-kids", req.url));
        }
        return NextResponse.redirect(new URL("/?tab=quan-tri-cha-me", req.url));
      }

      if (
        pathname.startsWith("/dashboard/elderly") ||
        pathname.startsWith("/dashboard/shield") ||
        pathname === "/shield" ||
        pathname === "/elderly"
      ) {
        return NextResponse.redirect(new URL("/?tab=kinetix-shield", req.url));
      }

      if (
        pathname.startsWith("/dashboard/kids") ||
        pathname === "/kids" ||
        pathname === "/chores"
      ) {
        return NextResponse.redirect(new URL("/?tab=kinetix-kids", req.url));
      }

      if (pathname.startsWith("/dashboard/rosca") || pathname === "/rosca") {
        return NextResponse.redirect(new URL("/?tab=quy-rosca", req.url));
      }

      // /dashboard chung -> chuyển về tab theo vai trò hiện tại
      return NextResponse.redirect(
        new URL(`/?tab=${getDefaultTabForRole(payload.role)}`, req.url)
      );
    }

    return NextResponse.next();
  } catch (err) {
    console.error("Middleware bypass on error:", err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder or files with extensions (.svg, .png, .jpg, .css, .js)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
