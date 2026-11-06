import { expect } from "chai";
import { NextRequest } from "../frontend/node_modules/next/server";
import { middleware } from "../frontend/src/middleware";

describe("Start page middleware routing and server workspace scope", () => {
  const workspace = "00000000-0000-4000-8000-000000000001";
  let originalFetch: typeof fetch;
  let identity: any;
  let backendStatus: number;
  let requests: { url: string; cookie: string }[];
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    backendStatus = 200;
    identity = {
      onboarding: "READY",
      user: { role: "ADMIN" },
      startRequired: true,
      redirectUrl: `/start?workspace=${workspace}`,
    };
    requests = [];
    globalThis.fetch = (async (url: any, init: any) => {
      requests.push({ url: String(url), cookie: init.headers.cookie });
      return Response.json(identity, { status: backendStatus });
    }) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });
  const request = (path: string, signedIn = true) =>
    new NextRequest(`http://localhost:3000${path}`, {
      headers: signedIn
        ? {
            Cookie: `kinetix_session=test-session; kinetix_workspace=actor.${workspace}`,
          }
        : {},
    });
  it("protects the new route before authentication and preserves security activation", async () => {
    expect(
      (await middleware(request("/start", false))).headers.get("location"),
    ).to.equal("http://localhost:3000/login");
    expect(requests).to.have.length(0);
    identity.onboarding = "LINK_WALLET";
    expect(
      (await middleware(request("/start"))).headers.get("location"),
    ).to.equal("http://localhost:3000/activate");
    expect((await middleware(request("/activate"))).status).to.equal(200);
  });
  it("redirects direct dashboard access to start but never redirects start to itself", async () => {
    expect(
      (await middleware(request("/dashboard/guardian"))).headers.get(
        "location",
      ),
    ).to.equal(`http://localhost:3000/start?workspace=${workspace}`);
    expect(
      (await middleware(request(`/start?workspace=${workspace}`))).status,
    ).to.equal(200);
  });
  it("lets a completed or deferred account enter its dashboard and reopen the guide", async () => {
    identity.startRequired = false;
    identity.redirectUrl = `/dashboard/guardian?workspace=${workspace}`;
    expect((await middleware(request("/dashboard/guardian"))).status).to.equal(
      200,
    );
    expect((await middleware(request("/start"))).status).to.equal(200);
    expect(
      (await middleware(request("/login"))).headers.get("location"),
    ).to.equal(
      `http://localhost:3000/dashboard/guardian?workspace=${workspace}`,
    );
  });
  it("passes the explicit workspace and account-bound preference to the authenticated server", async () => {
    await middleware(request(`/start?workspace=${workspace}`));
    expect(new URL(requests[0].url).pathname).to.equal("/api/auth/me");
    expect(new URL(requests[0].url).searchParams.get("workspace")).to.equal(
      workspace,
    );
    expect(requests[0].cookie).to.include(
      `kinetix_workspace=actor.${workspace}`,
    );
  });
  it("does not turn a forbidden workspace or unavailable auth server into a redirect loop", async () => {
    backendStatus = 403;
    const denied = await middleware(request(`/start?workspace=${workspace}`));
    expect(denied.status).to.equal(403);
    expect(denied.headers.has("location")).to.equal(false);
    backendStatus = 503;
    expect((await middleware(request("/start"))).status).to.equal(503);
    globalThis.fetch = (async () => {
      throw new Error("private backend failure");
    }) as typeof fetch;
    const failed = await middleware(request("/start"));
    expect(failed.status).to.equal(503);
    expect(await failed.text()).not.to.include("private backend failure");
  });
});
