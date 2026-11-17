import { expect } from "chai";
import { AddressInfo } from "net";
import type { Server } from "http";
import { toWeiString } from "../backend/src/services/groupFinanceService";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
process.env.DATABASE_URL =
  testDatabaseUrl ||
  "postgresql://isolated:isolated@127.0.0.1:1/kinetix_auth_tests";
process.env.NODE_ENV = "test";
process.env.APP_ORIGIN = "http://localhost:3000";

const app = require("../backend/src/server").default;
const { pool } = require("../backend/src/db") as typeof import("../backend/src/db");

let server: Server;
let base: string;

class Browser {
  cookies = new Map<string, string>();
  async request(
    path: string,
    body?: unknown,
    method = "POST",
    extraHeaders: Record<string, string> = {},
  ) {
    const response = await fetch(`${base}/api${path}`, {
      method,
      headers: {
        Origin: process.env.APP_ORIGIN!,
        "Content-Type": "application/json",
        Cookie: [...this.cookies]
          .map(([key, value]) => `${key}=${value}`)
          .join("; "),
        ...extraHeaders,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0];
      const equal = pair.indexOf("=");
      this.cookies.set(pair.slice(0, equal), pair.slice(equal + 1));
    }
    return {
      status: response.status,
      data: await response.json(),
      headers: response.headers,
    };
  }
}

before(async () => {
  server = await new Promise<Server>((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (server)
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("Group Finance HTTP Guards & API Endpoints", () => {
  it("rejects unauthenticated access to group finance endpoints", async () => {
    const browser = new Browser();
    const protectedPaths = [
      "/groups/00000000-0000-4000-8000-000000000001",
      "/groups/00000000-0000-4000-8000-000000000001/funds",
      "/groups/00000000-0000-4000-8000-000000000001/funds/00000000-0000-4000-8000-000000000002",
      "/groups/00000000-0000-4000-8000-000000000001/funds/00000000-0000-4000-8000-000000000002/expenses",
      "/groups/00000000-0000-4000-8000-000000000001/funds/00000000-0000-4000-8000-000000000002/obligations",
      "/groups/00000000-0000-4000-8000-000000000001/audit",
    ];

    for (const p of protectedPaths) {
      const res = await browser.request(p, undefined, "GET");
      expect(res.status).to.equal(401);
      expect(res.data.success).to.be.false;
    }
  });

  it("parses and validates wei strings with strict positive integer check", () => {
    expect(toWeiString("1000000000000000000")).to.equal("1000000000000000000");
    expect(toWeiString(1000000n)).to.equal("1000000");
    expect(toWeiString(500)).to.equal("500");
    expect(() => toWeiString("-500")).to.throw();
    expect(() => toWeiString("abc")).to.throw();
    expect(() => toWeiString("1.5")).to.throw();
  });
});
