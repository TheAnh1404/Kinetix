import { expect } from "chai";
import { NextRequest } from "../frontend/node_modules/next/server";
import { GET, POST } from "../frontend/src/app/api/[...path]/route";

describe("Same-origin Next BFF", () => {
  let originalFetch: typeof fetch;
  let calls: { url: string; init?: RequestInit }[];
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    calls = [];
    process.env.APP_ORIGIN = "http://localhost:3000";
    process.env.BACKEND_INTERNAL_URL = "http://127.0.0.1:4000";
    globalThis.fetch = (async (url: any, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      const headers = new Headers({ "Content-Type": "application/json" });
      headers.append(
        "Set-Cookie",
        "kinetix_session=opaque; Path=/; HttpOnly; SameSite=Lax",
      );
      headers.append(
        "Set-Cookie",
        "kinetix_challenge=browser; Path=/; HttpOnly; SameSite=Lax",
      );
      return new Response(JSON.stringify({ success: true }), { headers });
    }) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });
  it("forwards only the session and explicit request metadata, and preserves separate cookies", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        Origin: "http://localhost:3000",
        "Content-Type": "application/json",
        Cookie: "kinetix_session=old",
        "X-User-Id": "admin",
        "X-Forwarded-For": "spoofed",
      },
      body: JSON.stringify({
        username: "member",
        password: "secret not logged",
      }),
    });
    const response = await POST(req, { params: { path: ["auth", "login"] } });
    expect(response.status).to.equal(200);
    expect(calls[0].url).to.equal("http://127.0.0.1:4000/api/auth/login");
    const headers = new Headers(calls[0].init?.headers);
    expect(headers.get("cookie")).to.equal("kinetix_session=old");
    expect(headers.has("x-user-id")).to.equal(false);
    expect(headers.has("x-forwarded-for")).to.equal(false);
    expect(response.headers.getSetCookie()).to.have.length(2);
    expect(response.headers.get("cache-control")).to.equal("no-store");
  });
  it("rejects cross-origin mutations before contacting Express", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { Origin: "https://evil.example" },
    });
    expect(
      (await POST(req, { params: { path: ["auth", "login"] } })).status,
    ).to.equal(403);
    expect(calls).to.have.length(0);
  });
  it("preserves query scope and fails closed when backend is unavailable", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/vaults?workspaceId=family-a",
    );
    await GET(req, { params: { path: ["vaults"] } });
    expect(calls[0].url).to.include("workspaceId=family-a");
    globalThis.fetch = (async () => {
      throw new Error("private connection details");
    }) as typeof fetch;
    const response = await GET(req, { params: { path: ["vaults"] } });
    expect(response.status).to.equal(503);
    expect(await response.text()).not.to.include("private connection details");
  });
});
