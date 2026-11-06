import { NextRequest, NextResponse } from "next/server";

import { startRedirect } from "../../shared/startFlow";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const token = req.cookies.get("kinetix_session")?.value;
  let identity: {
    onboarding: string;
    user: { role: string };
    startRequired?: boolean;
    redirectUrl?: string;
  } | null = null;
  if (token) {
    try {
      const url = new URL(
        "/api/auth/me",
        process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:4000",
      );
      const workspace = req.nextUrl.searchParams.get("workspace");
      if (workspace) url.searchParams.set("workspace", workspace);
      const preference = req.cookies.get("kinetix_workspace")?.value;
      const result = await fetch(url.toString(), {
        headers: {
          cookie: `kinetix_session=${encodeURIComponent(token)}${preference ? `; kinetix_workspace=${encodeURIComponent(preference)}` : ""}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (result.ok) identity = await result.json();
      else if (result.status === 403 || result.status === 400)
        return new NextResponse(
          "Không gian được chọn không hợp lệ hoặc bạn không có quyền truy cập.",
          { status: result.status },
        );
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
  const redirect = startRedirect(path, identity);
  if (redirect) return NextResponse.redirect(new URL(redirect, req.url));
  return NextResponse.next();
}
export const config = {
  matcher: ["/dashboard/:path*", "/login", "/activate", "/register", "/start"],
};
