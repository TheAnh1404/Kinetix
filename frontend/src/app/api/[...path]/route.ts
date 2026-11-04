import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function proxy(
  req: NextRequest,
  context: { params: { path: string[] } },
) {
  const method = req.method;
  const origin = process.env.APP_ORIGIN || req.nextUrl.origin;
  if (
    !["GET", "HEAD", "OPTIONS"].includes(method) &&
    req.headers.get("origin") !== origin
  ) {
    return NextResponse.json(
      { success: false, error: "Nguồn yêu cầu không hợp lệ." },
      { status: 403 },
    );
  }
  const base = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:4000";
  const url = new URL(
    `/api/${context.params.path.map(encodeURIComponent).join("/")}`,
    base,
  );
  url.search = req.nextUrl.search;
  const headers = new Headers();
  for (const name of ["cookie", "content-type", "origin", "idempotency-key"]) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  const secret = process.env.BFF_SHARED_SECRET;
  const clientIp =
    req.ip ||
    (process.env.BFF_TRUST_PROXY_IP_HEADER === "true"
      ? req.headers.get("x-real-ip")
      : null);
  if (secret && secret.length >= 32 && clientIp) {
    const timestamp = Date.now().toString();
    headers.set("X-Kinetix-Client-IP", clientIp);
    headers.set("X-Kinetix-Timestamp", timestamp);
    headers.set(
      "X-Kinetix-Signature",
      createHmac("sha256", secret)
        .update(
          `${method}\n${url.pathname}${url.search}\n${timestamp}\n${clientIp}`,
        )
        .digest("hex"),
    );
  }
  // No client-controlled user ID, role or forwarding headers are treated as identity.
  try {
    const body = ["GET", "HEAD"].includes(method)
      ? undefined
      : await req.text();
    if (body && new TextEncoder().encode(body).length > 1048576)
      return NextResponse.json({ error: "Yêu cầu quá lớn." }, { status: 413 });
    const upstream = await fetch(url, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    const response = new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
    const cookies = (
      upstream.headers as Headers & { getSetCookie(): string[] }
    ).getSetCookie();
    for (const cookie of cookies) response.headers.append("Set-Cookie", cookie);
    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại.",
      },
      { status: 503 },
    );
  }
}
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
