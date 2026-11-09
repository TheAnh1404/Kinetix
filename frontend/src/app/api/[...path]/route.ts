import http from "node:http";
import https from "node:https";
import dns from "node:dns";

// Ngăn lỗi IPv6 Happy Eyeballs gây timeout kết nối upstream Express Backend trên Windows
try {
  dns.setDefaultResultOrder("ipv4first");
  (http.globalAgent as any).options.autoSelectFamily = false;
  (https.globalAgent as any).options.autoSelectFamily = false;
} catch {}

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * BFF Proxy chuyển tiếp mọi yêu cầu từ Next.js Client sang Express Backend.
 * Kèm chữ ký HMAC bảo vệ nếu BFF_SHARED_SECRET được cấu hình.
 */
async function proxy(
  req: NextRequest,
  context: { params: { path: string[] } },
) {
  const method = req.method;
  const origin = process.env.APP_ORIGIN || req.nextUrl.origin;
  const reqOrigin = req.headers.get("origin");
  const isDev = process.env.NODE_ENV !== "production";
  // Chấp nhận nguồn localhost và 127.0.0.1 tương đương nhau trong môi trường dev
  const isEquivalentLocal =
    isDev &&
    reqOrigin &&
    ((origin === "http://localhost:3000" && reqOrigin === "http://127.0.0.1:3000") ||
      (origin === "http://127.0.0.1:3000" && reqOrigin === "http://localhost:3000"));

  if (
    !["GET", "HEAD", "OPTIONS"].includes(method) &&
    reqOrigin !== origin &&
    !isEquivalentLocal
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

  try {
    const body = ["GET", "HEAD"].includes(method)
      ? undefined
      : await req.text();
    if (body && new TextEncoder().encode(body).length > 1048576)
      return NextResponse.json({ error: "Yêu cầu quá lớn." }, { status: 413 });

    const upstream = await fetch(url.toString(), {
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
        "Content-Type": upstream.headers.get("content-type") || "application/json",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });

    const getSetCookieFn = (upstream.headers as any).getSetCookie;
    const cookies: string[] =
      typeof getSetCookieFn === "function"
        ? getSetCookieFn.call(upstream.headers)
        : [];
    for (const cookie of cookies) {
      response.headers.append("Set-Cookie", cookie);
    }

    return response;
  } catch (err: any) {
    console.error(`[BFF Proxy Error -> ${url.toString()}]:`, err);
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
