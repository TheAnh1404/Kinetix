import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const token = req.cookies.get("kinetix_session")?.value;
  let identity: { onboarding: string; user: { role: string } } | null = null;
  if (token) {
    try {
      const result = await fetch(
        `${process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:4000"}/api/auth/me`,
        {
          headers: { cookie: `kinetix_session=${encodeURIComponent(token)}` },
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        },
      );
      if (result.ok) identity = await result.json();
      else if (result.status >= 500)
        return new NextResponse("Dịch vụ xác thực tạm thời chưa sẵn sàng.", {
          status: 503,
        });
    } catch {
      return new NextResponse("Dịch vụ xác thực tạm thời chưa sẵn sàng.", {
        status: 503,
      });
    }
  }
  if (!identity) {
    if (path === "/login") return NextResponse.next();
    return NextResponse.redirect(
      new URL(
        path === "/register" ? "/login?mode=register" : "/login",
        req.url,
      ),
    );
  }
  if (identity.onboarding !== "READY")
    return path === "/activate"
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/activate", req.url));
  if (path === "/login" || path === "/activate" || path === "/register")
    return NextResponse.redirect(new URL("/dashboard", req.url));
  return NextResponse.next();
}
export const config = {
  matcher: ["/dashboard/:path*", "/login", "/activate", "/register"],
};
