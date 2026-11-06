import { expect } from "chai";
import { AddressInfo } from "net";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { and, eq, sql } from "drizzle-orm";
import type { Server } from "http";

const { assertIsolatedDatabase } = require("../scripts/auth-test-safety.cjs");
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const originalDatabaseUrl = process.env.DATABASE_URL;
if (testDatabaseUrl)
  assertIsolatedDatabase(
    testDatabaseUrl,
    originalDatabaseUrl,
    process.env.AUTH_TEST_ALLOW_RESET,
  );
// Never open the application's configured database during unit/HTTP guard tests.
process.env.DATABASE_URL =
  testDatabaseUrl ||
  "postgresql://isolated:isolated@127.0.0.1:1/kinetix_auth_tests";
process.env.NODE_ENV = "test";
process.env.APP_ORIGIN = "http://localhost:3000";
const app = require("../backend/src/server").default;
const { db, pool } =
  require("../backend/src/db") as typeof import("../backend/src/db");
const schema =
  require("../backend/src/db/schema") as typeof import("../backend/src/db/schema");
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
  await pool.end();
});

describe("HTTP guards without a database", () => {
  it("rejects direct unauthenticated and forged legacy-session access", async () => {
    const browser = new Browser();
    for (const path of [
      "/workspaces",
      "/vaults?workspaceId=anything",
      "/notifications/another-user",
      "/auth/me",
      "/workspaces/00000000-0000-4000-8000-000000000001/first-use",
      "/workspaces/00000000-0000-4000-8000-000000000001/vault-candidates",
      "/workspaces/00000000-0000-4000-8000-000000000001/start",
      "/workspaces/00000000-0000-4000-8000-000000000001/vault-creation",
      "/workspaces/00000000-0000-4000-8000-000000000001/vault-drafts",
    ])
      expect((await browser.request(path, undefined, "GET")).status).to.equal(
        401,
      );
    browser.cookies.set("kinetix_session", "eyJhbGciOiJIUzI1NiJ9.fake.jwt");
    expect(
      (await browser.request("/workspaces", undefined, "GET")).status,
    ).to.equal(401);
    expect((await browser.request("/workspaces/00000000-0000-4000-8000-000000000001/first-use/connect", {})).status).to.equal(401);
  });
  it("retires PIN, family/role fallbacks and address-only wallet sync", async () => {
    for (const path of [
      "family-login",
      "member-login",
      "sync-wallet",
      "join-family",
      "check-wallet",
      "nonce",
    ]) {
      const response = await new Browser().request(`/auth/${path}`, {
        role: "ADMIN",
        userId: "someone",
        pinCode: "1234",
      });
      expect(response.status).to.equal(410);
      expect(response.data).not.to.have.property("user");
    }
  });
  it("rejects malformed invitation previews before any database lookup", async () => {
    for (const token of ["", "short", "!".repeat(43)]) {
      const response = await new Browser().request("/auth/invitations/preview", { token });
      expect(response.status).to.equal(400);
      expect(response.data.code).to.equal("INVITATION_INVALID");
    }
  });
  it("rejects cross-origin, absent Origin and form posts before auth or database work", async () => {
    const browser = new Browser();
    expect(
      (
        await browser.request(
          "/auth/login",
          { username: "admin", password: "whatever" },
          "POST",
          { Origin: "https://attacker.example" },
        )
      ).status,
    ).to.equal(403);
    expect(
      (await browser.request("/auth/login", {}, "POST", { Origin: "" })).status,
    ).to.equal(403);
    expect(
      (
        await browser.request("/auth/login", {}, "POST", {
          "Content-Type": "text/plain",
        })
      ).status,
    ).to.equal(415);
  });
  it("rejects malformed JSON without leaking internals", async () => {
    const response = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: {
        Origin: process.env.APP_ORIGIN!,
        "Content-Type": "application/json",
      },
      body: "{",
    });
    expect(response.status).to.equal(400);
    expect(await response.text()).not.to.include("SyntaxError");
  });
});

(testDatabaseUrl ? describe : describe.skip)(
  "Isolated PostgreSQL HTTP acceptance",
  function () {
    this.timeout(60000);
    let admin: Browser;
    let otherAdmin: Browser;
    let adminAccount: ReturnType<typeof privateKeyToAccount>;
    let workspaceId: string;
    let otherWorkspaceId: string;
    let memberId: string;
    let member: Browser;
    let memberAccount: ReturnType<typeof privateKeyToAccount>;
    let temporaryPassword: string;
    const password = "A private member phrase 2026";
    const signedChallenge = async (
      browser: Browser,
      purpose: string,
      account: ReturnType<typeof privateKeyToAccount>,
    ) => {
      const response = await browser.request("/auth/wallet/challenge", {
        purpose,
        address: account.address,
        chainId: 43113,
      });
      expect(response.status).to.equal(200);
      return {
        challengeId: response.data.challengeId,
        signature: await account.signMessage({
          message: response.data.message,
        }),
        message: response.data.message,
      };
    };
    const register = async (name: string) => {
      const browser = new Browser();
      const account = privateKeyToAccount(generatePrivateKey());
      const proof = await signedChallenge(browser, "REGISTER", account);
      const response = await browser.request("/auth/register-family", {
        ...proof,
        username: name,
        password,
        adminName: name,
        familyName: `Test ${name}`,
      });
      expect(response.status).to.equal(200);
      expect(response.headers.getSetCookie().join(";"))
        .to.include("HttpOnly")
        .and.include("SameSite=Lax");
      return { browser, account, workspaceId: response.data.family.id };
    };
    const createMember = async (name: string) => {
      const response = await admin.request(
        `/workspaces/${workspaceId}/managed-members`,
        { fullName: name, username: name, role: "CHILD" },
        "POST",
        { "Idempotency-Key": require("crypto").randomUUID() },
      );
      expect(response.status).to.equal(201);
      return response.data;
    };
    before(async () => {
      const { migrate } = require("drizzle-orm/neon-serverless/migrator");
      await migrate(db, {
        migrationsFolder: require("path").resolve("backend/drizzle"),
      });
      // Explicit reset opt-in above is mandatory. Only a disposable database is accepted by the runner.
      await db.execute(
        sql`TRUNCATE workspaces, users, auth_rate_limits, auth_challenges CASCADE`,
      );
      const first = await register("guardian_a");
      admin = first.browser;
      adminAccount = first.account;
      workspaceId = first.workspaceId;
      const second = await register("guardian_b");
      otherAdmin = second.browser;
      otherWorkspaceId = second.workspaceId;
    });
    beforeEach(async () => {
      await db.delete(schema.authRateLimits);
    });
    it("saves and restores private vault drafts with deployment disabled, without creating a financial resource", async () => {
      const path = `/workspaces/${workspaceId}/vault-drafts`;
      const id = require("crypto").randomUUID();
      const config = { ...require("../shared/vaultCreation").emptyVaultForm(), description: "Private family metadata" };
      const before = await db.select().from(schema.vaults);
      const context = await admin.request(`/workspaces/${workspaceId}/vault-creation`, undefined, "GET");
      expect(context.status).to.equal(200);
      expect(context.data.data.availability).to.equal("DISABLED");
      expect(context.data.data.candidates[0].permission).to.equal("UNKNOWN");
      const saved = await admin.request(path, { id, config, step: 1 });
      expect(saved.status).to.equal(200);
      expect(saved.data.draft.revision).to.equal(0);
      expect((await admin.request(path, { id, config, step: 1 })).data.draft.id).to.equal(id);
      expect((await admin.request(path, { id, config: { ...config, name: "Different retry" }, step: 1 })).status).to.equal(409);
      expect((await otherAdmin.request(`${path}/${id}`, undefined, "GET")).status).to.equal(403);
      expect((await otherAdmin.request(`/workspaces/${otherWorkspaceId}/vault-drafts/${id}`, undefined, "GET")).status).to.equal(404);
      const second = new Browser();
      expect((await second.request("/auth/login", { username: "guardian_a", password })).status).to.equal(200);
      expect((await second.request(`${path}/${id}`, undefined, "GET")).data.draft.config.description).to.equal(config.description);
      const racing = await Promise.all([admin.request(`${path}/${id}`, { config: { ...config, name: "Tab A" }, step: 2, revision: 0 }, "PATCH"), second.request(`${path}/${id}`, { config: { ...config, name: "Tab B" }, step: 2, revision: 0 }, "PATCH")]);
      expect(racing.map((item) => item.status).sort()).to.deep.equal([200, 409]);
      const latest = (await admin.request(`${path}/${id}`, undefined, "GET")).data.draft;
      expect((await admin.request(`${path}/${id}/preflight`, { revision: latest.revision })).status).to.equal(503);
      expect((await admin.request(`${path}/${id}`, { config: { ...config, unexpected: true }, step: 2, revision: 1 }, "PATCH")).status).to.equal(400);
      expect(await db.select().from(schema.vaults)).to.deep.equal(before);
    });
    it("returns scoped first-use guidance for a fresh account and denies other workspaces", async () => {
      const response = await admin.request(`/workspaces/${workspaceId}/first-use`, undefined, "GET");
      expect(response.status).to.equal(200);
      expect(response.data.data.workspaceId).to.equal(workspaceId);
      expect(response.data.data.steps[0].status).to.equal("DONE");
      expect((await otherAdmin.request(`/workspaces/${workspaceId}/first-use`, undefined, "GET")).status).to.equal(403);
      expect((await otherAdmin.request(`/workspaces/${workspaceId}/first-use/connect`, {})).status).to.equal(403);
    });
    it("persists start progress across password-only sessions and protects against stale concurrent writes", async () => {
      const me = await admin.request("/auth/me", undefined, "GET");
      expect(me.data.startRequired).to.equal(true);
      expect(me.data.redirectUrl).to.equal(`/start?workspace=${workspaceId}`);
      const initial = await admin.request(`/workspaces/${workspaceId}/start`, undefined, "GET");
      expect(initial.data.data.steps).to.deep.equal(["WELCOME", "FAMILY", "READINESS", "FINISH"]);
      expect((await admin.request(`/workspaces/${workspaceId}/start`, { step: "FINISH", status: ["COMPLETED"], revision: 0 }, "PATCH")).status).to.equal(400);
      const saved = await admin.request(`/workspaces/${workspaceId}/start`, { step: "FAMILY", status: "IN_PROGRESS", revision: 0 }, "PATCH");
      expect(saved.status).to.equal(200);
      expect(saved.data.data.progress.revision).to.equal(1);
      const second = new Browser();
      expect((await second.request("/auth/login", { username: "guardian_a", password })).status).to.equal(200);
      const restored = await second.request(`/workspaces/${workspaceId}/start`, undefined, "GET");
      expect(restored.data.data.progress.step).to.equal("FAMILY");
      const racing = await Promise.all([
        admin.request(`/workspaces/${workspaceId}/start`, { step: "READINESS", status: "IN_PROGRESS", revision: 1 }, "PATCH"),
        second.request(`/workspaces/${workspaceId}/start`, { step: "FAMILY", status: "DEFERRED", revision: 1 }, "PATCH"),
      ]);
      expect(racing.map((response) => response.status).sort()).to.deep.equal([200, 409]);
      let current = (await admin.request(`/workspaces/${workspaceId}/start`, undefined, "GET")).data.data.progress;
      const defer = { step: current.step, status: "DEFERRED", revision: current.revision };
      expect((await admin.request(`/workspaces/${workspaceId}/start`, defer, "PATCH")).status).to.equal(200);
      const replay = await admin.request(`/workspaces/${workspaceId}/start`, defer, "PATCH");
      expect(replay.status).to.equal(200);
      expect((await admin.request("/auth/me", undefined, "GET")).data.startRequired).to.equal(false);
      current = replay.data.data.progress;
      const restarted = await admin.request(`/workspaces/${workspaceId}/start`, { step: "WELCOME", status: "IN_PROGRESS", revision: current.revision, restart: true }, "PATCH");
      expect(restarted.status).to.equal(200);
      const done = await admin.request(`/workspaces/${workspaceId}/start`, { step: "FINISH", status: "COMPLETED", revision: restarted.data.data.progress.revision }, "PATCH");
      expect(done.status).to.equal(200);
      expect(done.data.data.progress.completedAt).to.be.a("string");
      const finalMe = await admin.request("/auth/me", undefined, "GET");
      expect(finalMe.data.startRequired).to.equal(false);
      expect(finalMe.data.redirectUrl).to.equal(`/dashboard/guardian?workspace=${workspaceId}`);
    });
    it("keeps presentation scope separate from role, wallet rights and untrusted workspace preferences", async () => {
      expect((await otherAdmin.request(`/workspaces/${workspaceId}/start`, undefined, "GET")).status).to.equal(403);
      expect((await otherAdmin.request(`/workspaces/${workspaceId}/start`, { step: "FINISH", status: "COMPLETED", revision: 0 }, "PATCH")).status).to.equal(403);
      expect((await admin.request(`/workspaces/${workspaceId}/start`, { step: "FINISH", status: "COMPLETED", revision: 0, role: "ADMIN" }, "PATCH")).status).to.equal(400);
      expect((await admin.request(`/auth/me?workspace=${otherWorkspaceId}`, undefined, "GET")).status).to.equal(403);
      const before = (await admin.request("/auth/me", undefined, "GET")).data;
      admin.cookies.set("kinetix_workspace", `${before.user.id}.${otherWorkspaceId}`);
      expect((await admin.request("/auth/me", undefined, "GET")).data.family.id).to.equal(workspaceId);
      admin.cookies.delete("kinetix_workspace");
      const created = await admin.request("/workspaces", { name: "Second start space", type: "FAMILY" });
      expect(created.status).to.equal(201);
      admin.cookies.set("kinetix_workspace", `${before.user.id}.${created.data.workspace.id}`);
      const selected = (await admin.request("/auth/me", undefined, "GET")).data;
      expect(selected.entryWorkspaceId).to.equal(created.data.workspace.id);
      expect(selected.startRequired).to.equal(true);
      expect(selected.linkedWallet.address).to.equal(before.linkedWallet.address);
      admin.cookies.set("kinetix_workspace", `00000000-0000-4000-8000-000000000099.${created.data.workspace.id}`);
      expect((await admin.request("/auth/me", undefined, "GET")).data.family.id).to.equal(workspaceId);
      admin.cookies.delete("kinetix_workspace");
    });
    it("backfills existing memberships as LEGACY without rewriting account or wallet data", async () => {
      const before = (await admin.request("/auth/me", undefined, "GET")).data;
      const marker = new Error("ROLLBACK_TEST_BACKFILL");
      try {
        await db.transaction(async (tx) => {
          await tx.delete(schema.workspaceOnboarding);
          const backfill = require("node:fs").readFileSync("backend/drizzle/0009_workspace_onboarding.sql", "utf8").split("--> statement-breakpoint").at(-1);
          await tx.execute(sql.raw(backfill));
          const records = await tx.select().from(schema.workspaceOnboarding);
          expect(records.length).to.be.greaterThan(0);
          expect(records.every((row) => row.status === "LEGACY")).to.equal(true);
          throw marker;
        });
      } catch (error) { if (error !== marker) throw error; }
      const after = (await admin.request("/auth/me", undefined, "GET")).data;
      expect(after.linkedWallet.address).to.equal(before.linkedWallet.address);
      expect(after.onboarding).to.equal(before.onboarding);
      expect(after.startRequired).to.equal(before.startRequired);
    });
    it("creates only dependent roles, with an idempotent transaction and one-time credential", async () => {
      const key = require("crypto").randomUUID();
      const body = {
        fullName: "Grandma Lan",
        username: "grandma.lan",
        role: "ELDERLY",
      };
      const [first, second] = await Promise.all([
        admin.request(
          `/workspaces/${workspaceId}/managed-members`,
          body,
          "POST",
          { "Idempotency-Key": key },
        ),
        admin.request(
          `/workspaces/${workspaceId}/managed-members`,
          body,
          "POST",
          { "Idempotency-Key": key },
        ),
      ]);
      expect(first.status).to.equal(201);
      expect(second.status).to.equal(201);
      const created = first.data.credential ? first.data : second.data;
      const replayed = first.data.credential ? second.data : first.data;
      expect(replayed.replayed).to.equal(true);
      expect(replayed).not.to.have.property("credential");
      memberId = created.memberId;
      temporaryPassword = created.credential.temporaryPassword;
      expect(first.data.memberId).to.equal(second.data.memberId);
      const [record] = await db
        .select()
        .from(schema.userCredentials)
        .where(eq(schema.userCredentials.userId, memberId));
      expect(record.passwordHash)
        .to.include("$argon2id$")
        .and.not.to.equal(temporaryPassword);
      const forbidden = await admin.request(
        `/workspaces/${workspaceId}/managed-members`,
        { ...body, username: "bad_admin", role: "ADMIN" },
        "POST",
        { "Idempotency-Key": require("crypto").randomUUID() },
      );
      expect(forbidden.status).to.equal(400);
    });
    it("enforces workspace and assigned-manager boundaries", async () => {
      expect(
        (
          await otherAdmin.request(
            `/workspaces/${workspaceId}/managed-members`,
            undefined,
            "GET",
          )
        ).status,
      ).to.equal(403);
      expect(
        (
          await otherAdmin.request(
            `/workspaces/${workspaceId}/managed-members/${memberId}/access`,
            { disabled: true },
            "PATCH",
          )
        ).status,
      ).to.equal(403);
      expect(
        (
          await admin.request(
            `/workspaces/${otherWorkspaceId}`,
            undefined,
            "GET",
          )
        ).status,
      ).to.equal(403);
      const [plainGuardian] = await db
        .insert(schema.users)
        .values({ fullName: "Vault guardian only", role: "GUARDIAN" })
        .returning();
      await db
        .insert(schema.workspaceMembers)
        .values({ userId: plainGuardian.id, workspaceId, role: "GUARDIAN" });
      const {
        hashPassword,
        digest,
        randomToken,
      } = require("../backend/src/auth/security");
      await db.insert(schema.userCredentials).values({
        userId: plainGuardian.id,
        username: "plain_guardian",
        passwordHash: await hashPassword(password),
        mustChangePassword: false,
      });
      await db.insert(schema.userWallets).values({
        userId: plainGuardian.id,
        address:
          privateKeyToAccount(generatePrivateKey()).address.toLowerCase(),
      });
      const browser = new Browser();
      expect(
        (
          await browser.request("/auth/login", {
            username: "plain_guardian",
            password,
          })
        ).status,
      ).to.equal(200);
      expect(
        (
          await browser.request(
            `/workspaces/${workspaceId}/managed-members`,
            undefined,
            "GET",
          )
        ).status,
      ).to.equal(403);
    });
    it("requires exact credentials and restricts onboarding at the API", async () => {
      member = new Browser();
      expect(
        (
          await member.request("/auth/login", {
            username: "Grandma Lan",
            password: temporaryPassword,
          })
        ).status,
      ).to.equal(401);
      const response = await member.request("/auth/login", {
        username: " GRANDMA.LAN ",
        password: temporaryPassword,
      });
      expect(response.status).to.equal(200);
      expect(response.data.onboarding).to.equal("CHANGE_PASSWORD");
      expect((await member.request(`/workspaces/${workspaceId}/start`, undefined, "GET")).status).to.equal(403);
      expect((await member.request(`/workspaces/${workspaceId}/start`, { step: "FINISH", status: "COMPLETED", revision: 0 }, "PATCH")).status).to.equal(403);
      expect((await member.request(`/workspaces/${workspaceId}/first-use`, undefined, "GET")).status).to.equal(403);
      expect((await member.request(`/workspaces/${workspaceId}/first-use/connect`, {})).status).to.equal(403);
      expect(
        (
          await member.request(
            `/vaults?workspaceId=${workspaceId}`,
            undefined,
            "GET",
          )
        ).status,
      ).to.equal(403);
      expect(
        (await member.request("/user/profile", { fullName: "bypass" }, "PUT"))
          .status,
      ).to.equal(403);
      const oldCookie = member.cookies.get("kinetix_session")!;
      const changed = await member.request("/auth/change-password", {
        currentPassword: temporaryPassword,
        newPassword: password,
      });
      expect(changed.status).to.equal(200);
      expect(changed.data.onboarding).to.equal("LINK_WALLET");
      const stale = new Browser();
      stale.cookies.set("kinetix_session", oldCookie);
      expect(
        (await stale.request("/auth/me", undefined, "GET")).status,
      ).to.equal(401);
      expect(
        (
          await new Browser().request("/auth/login", {
            username: "grandma.lan",
            password: temporaryPassword,
          })
        ).status,
      ).to.equal(401);
    });
    it("does not link from connection/address alone, rejects incorrect signature/domain/session/chain/expiry", async () => {
      memberAccount = privateKeyToAccount(generatePrivateKey());
      expect(
        (
          await member.request("/auth/wallet/link", {
            address: memberAccount.address,
          })
        ).status,
      ).to.equal(400);
      expect(
        (
          await member.request("/auth/wallet/challenge", {
            purpose: "LINK",
            address: memberAccount.address,
            chainId: 1,
          })
        ).status,
      ).to.equal(400);
      const proof = await signedChallenge(member, "LINK", memberAccount);
      const wrong = await memberAccount.signMessage({
        message: proof.message.replace("localhost:3000", "evil.example"),
      });
      expect(
        (
          await member.request("/auth/wallet/link", {
            ...proof,
            signature: wrong,
          })
        ).status,
      ).to.equal(401);
      const anotherSession = new Browser();
      await anotherSession.request("/auth/login", {
        username: "grandma.lan",
        password,
      });
      expect(
        (await anotherSession.request("/auth/wallet/link", proof)).status,
      ).to.equal(401);
      await db
        .update(schema.authChallenges)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(schema.authChallenges.id, proof.challengeId));
      expect(
        (await member.request("/auth/wallet/link", proof)).status,
      ).to.equal(401);
      const me = await member.request("/auth/me", undefined, "GET");
      expect(me.data.linkedWallet).to.equal(null);
    });
    it("atomically consumes a challenge under concurrent link attempts and rotates the session", async () => {
      const proof = await signedChallenge(member, "LINK", memberAccount);
      const cookie = member.cookies.get("kinetix_session")!;
      const one = new Browser();
      one.cookies = new Map(member.cookies);
      const two = new Browser();
      two.cookies = new Map(member.cookies);
      const responses = await Promise.all([
        one.request("/auth/wallet/link", proof),
        two.request("/auth/wallet/link", proof),
      ]);
      expect(
        responses.filter((result) => result.status === 200),
      ).to.have.length(1);
      member = responses[0].status === 200 ? one : two;
      expect(
        (await member.request("/auth/me", undefined, "GET")).data.onboarding,
      ).to.equal("READY");
      const stale = new Browser();
      stale.cookies.set("kinetix_session", cookie);
      expect(
        (await stale.request("/auth/me", undefined, "GET")).status,
      ).to.equal(401);
      expect(
        (await member.request("/auth/wallet/link", proof)).status,
      ).not.to.equal(200);
      const wallets = await db
        .select()
        .from(schema.userWallets)
        .where(eq(schema.userWallets.userId, memberId));
      expect(wallets).to.have.length(1);
    });
    it("allows password-only login on a new device and keeps the linked wallet", async () => {
      const device = new Browser();
      const response = await device.request("/auth/login", {
        username: "grandma.lan",
        password,
      });
      expect(response.status).to.equal(200);
      expect(response.data.onboarding).to.equal("READY");
      expect(response.data.redirectUrl).to.equal(`/start?workspace=${workspaceId}`);
      const intro = await device.request(`/workspaces/${workspaceId}/start`, undefined, "GET");
      expect(intro.data.data.steps).to.deep.equal(["WELCOME", "READINESS", "FINISH"]);
      expect((await device.request(`/workspaces/${workspaceId}/start`, { step: "FAMILY", status: "IN_PROGRESS", revision: 0 }, "PATCH")).status).to.equal(400);
      expect((await device.request(`/workspaces/${workspaceId}/start`, { step: "WELCOME", status: "COMPLETED", revision: 0 }, "PATCH")).status).to.equal(400);
      const deferred = await device.request(`/workspaces/${workspaceId}/start`, { step: "WELCOME", status: "DEFERRED", revision: 0 }, "PATCH");
      expect(deferred.status).to.equal(200);
      expect((await device.request("/auth/me", undefined, "GET")).data.redirectUrl).to.equal(`/dashboard/elderly?workspace=${workspaceId}`);
      expect(response.data.linkedWallet.address).to.equal(
        memberAccount.address.toLowerCase(),
      );
      expect(
        (
          await device.request(
            `/vaults?workspaceId=${workspaceId}`,
            undefined,
            "GET",
          )
        ).status,
      ).to.equal(200);
      const browser = new Browser();
      const proof = await signedChallenge(browser, "LOGIN", memberAccount);
      expect(
        (await browser.request("/auth/verify-siwe", proof)).status,
      ).to.equal(403);
    });
    it("never leaks hashes/secrets or changes linked wallets through profile", async () => {
      const response = await admin.request(
        `/workspaces/${workspaceId}/managed-members`,
        undefined,
        "GET",
      );
      const output = JSON.stringify(response.data);
      for (const forbidden of [
        "passwordHash",
        "password_hash",
        "temporaryPassword",
        "tokenHash",
        temporaryPassword,
      ])
        expect(output).not.to.include(forbidden);
      await member.request(
        "/user/profile",
        {
          fullName: "Grandma Lan",
          walletAddress: privateKeyToAccount(generatePrivateKey()).address,
          role: "ADMIN",
          pinCode: "1234",
        },
        "PUT",
      );
      const current = await member.request("/auth/me", undefined, "GET");
      expect(current.data.user.role).to.equal("ELDERLY");
      expect(current.data.linkedWallet.address).to.equal(
        memberAccount.address.toLowerCase(),
      );
    });
    it("requires Core reauthentication for reset, revokes sessions and preserves the wallet", async () => {
      expect(
        (
          await admin.request(
            `/workspaces/${workspaceId}/managed-members/${memberId}/reset-password`,
            {},
          )
        ).status,
      ).to.equal(403);
      const proof = await signedChallenge(admin, "REAUTH", adminAccount);
      expect(
        (await admin.request("/auth/reauthenticate", proof)).status,
      ).to.equal(200);
      const reset = await admin.request(
        `/workspaces/${workspaceId}/managed-members/${memberId}/reset-password`,
        {},
      );
      expect(reset.status).to.equal(200);
      temporaryPassword = reset.data.credential.temporaryPassword;
      expect(
        (await member.request("/auth/me", undefined, "GET")).status,
      ).to.equal(401);
      member = new Browser();
      expect(
        (
          await member.request("/auth/login", {
            username: "grandma.lan",
            password: temporaryPassword,
          })
        ).data.onboarding,
      ).to.equal("CHANGE_PASSWORD");
      expect(
        (
          await member.request("/auth/change-password", {
            currentPassword: temporaryPassword,
            newPassword: password,
          })
        ).data.onboarding,
      ).to.equal("READY");
      expect(
        (await member.request("/auth/me", undefined, "GET")).data.linkedWallet
          .address,
      ).to.equal(memberAccount.address.toLowerCase());
    });
    it("blocks duplicate wallets racing across two users", async () => {
      const first = await createMember("racing_member_one");
      const second = await createMember("racing_member_two");
      const account = privateKeyToAccount(generatePrivateKey());
      const clients = await Promise.all(
        [first, second].map(async (created) => {
          const browser = new Browser();
          await browser.request("/auth/login", {
            username: created.credential.username,
            password: created.credential.temporaryPassword,
          });
          await browser.request("/auth/change-password", {
            currentPassword: created.credential.temporaryPassword,
            newPassword: password,
          });
          return browser;
        }),
      );
      const proofs = await Promise.all(
        clients.map((client) => signedChallenge(client, "LINK", account)),
      );
      const responses = await Promise.all(
        clients.map((client, index) =>
          client.request("/auth/wallet/link", proofs[index]),
        ),
      );
      expect(
        responses.filter((result) => result.status === 200),
      ).to.have.length(1);
      expect(
        responses.filter((result) => result.status === 409),
      ).to.have.length(1);
      const wallets = await db
        .select()
        .from(schema.userWallets)
        .where(eq(schema.userWallets.address, account.address.toLowerCase()));
      expect(wallets).to.have.length(1);
    });
    it("blocks expired temporary credentials and enforces a shared account rate limit", async () => {
      const created = await createMember("expired_member");
      await db
        .update(schema.userCredentials)
        .set({ temporaryExpiresAt: new Date(Date.now() - 1000) })
        .where(eq(schema.userCredentials.userId, created.memberId));
      expect(
        (
          await new Browser().request("/auth/login", {
            username: created.credential.username,
            password: created.credential.temporaryPassword,
          })
        ).status,
      ).to.equal(401);
      const client = new Browser();
      for (let attempt = 0; attempt < 10; attempt++)
        expect(
          (
            await client.request("/auth/login", {
              username: "nonexistent_member",
              password,
            })
          ).status,
        ).to.equal(401);
      expect(
        (
          await client.request("/auth/login", {
            username: "nonexistent_member",
            password,
          })
        ).status,
      ).to.equal(429);
    });
    it("accepts Guardian invitations only for the nominated wallet and grants management separately", async () => {
      const invitedAccount = privateKeyToAccount(generatePrivateKey());
      const proof = await signedChallenge(admin, "REAUTH", adminAccount);
      expect(
        (await admin.request("/auth/reauthenticate", proof)).status,
      ).to.equal(200);
      const invite = await admin.request(
        `/workspaces/${workspaceId}/invitations`,
        { address: invitedAccount.address },
      );
      expect(invite.status).to.equal(201);
      const preview = await new Browser().request("/auth/invitations/preview", { token: invite.data.invitation.token });
      expect(preview.status).to.equal(200);
      expect(preview.data.invitation.expectedWallet).to.equal(invitedAccount.address.toLowerCase());
      expect(preview.data.invitation).not.to.have.property("tokenHash");
      const thief = new Browser();
      const wrong = await signedChallenge(
        thief,
        "REGISTER",
        privateKeyToAccount(generatePrivateKey()),
      );
      expect(
        (
          await thief.request("/auth/register-family", {
            ...wrong,
            username: "wrong_invitee",
            password,
            adminName: "Wrong wallet",
            invitationToken: invite.data.invitation.token,
          })
        ).status,
      ).to.equal(403);
      const invited = new Browser();
      const registration = await signedChallenge(
        invited,
        "REGISTER",
        invitedAccount,
      );
      const result = await invited.request("/auth/register-family", {
        ...registration,
        username: "invited_guardian",
        password,
        adminName: "Invited guardian",
        invitationToken: invite.data.invitation.token,
      });
      expect(result.status).to.equal(200);
      expect(result.data.user.role).to.equal("GUARDIAN");
      expect(result.data.workspaces[0].canManageMembers).to.equal(false);
      expect((await new Browser().request("/auth/invitations/preview", { token: invite.data.invitation.token })).status).to.equal(404);
      expect(
        (
          await invited.request(
            `/workspaces/${workspaceId}/managed-members`,
            undefined,
            "GET",
          )
        ).status,
      ).to.equal(403);
      expect(
        (
          await admin.request(
            `/workspaces/${workspaceId}/management-permissions/${result.data.user.id}`,
            { enabled: true },
            "PATCH",
          )
        ).status,
      ).to.equal(200);
      const listing = await invited.request(
        `/workspaces/${workspaceId}/managed-members`,
        undefined,
        "GET",
      );
      expect(listing.status).to.equal(200);
      expect(listing.data.members).to.have.length(0);
      expect(
        (
          await invited.request(
            `/workspaces/${workspaceId}/managed-members/${memberId}/access`,
            { disabled: true },
            "PATCH",
          )
        ).status,
      ).to.equal(403);
      expect(
        (
          await admin.request(
            `/workspaces/${workspaceId}/management-permissions/${result.data.user.id}`,
            { enabled: false },
            "PATCH",
          )
        ).status,
      ).to.equal(200);
      expect(
        (
          await invited.request(
            `/workspaces/${workspaceId}/managed-members`,
            undefined,
            "GET",
          )
        ).status,
      ).to.equal(403);
    });
    it("enrolls legacy credentials after explicit manager assignment and never replaces an old wallet silently", async () => {
      const oldWallet = privateKeyToAccount(generatePrivateKey());
      const [legacy] = await db
        .insert(schema.users)
        .values({
          fullName: "Legacy member",
          familyId: workspaceId,
          walletAddress: oldWallet.address,
          authMethod: "PASSKEY_EMBEDDED",
          role: "CHILD",
        })
        .returning();
      await db
        .insert(schema.workspaceMembers)
        .values({ userId: legacy.id, workspaceId, role: "CHILD" });
      const identity = await admin.request("/auth/me", undefined, "GET");
      expect(
        (
          await admin.request(
            `/workspaces/${workspaceId}/managed-members/${legacy.id}/enroll`,
            { username: "legacy_member" },
          )
        ).status,
      ).to.equal(403);
      expect(
        (
          await admin.request(
            `/workspaces/${workspaceId}/managed-members/${legacy.id}/manager`,
            { guardianId: identity.data.user.id },
            "PATCH",
          )
        ).status,
      ).to.equal(200);
      const enrolled = await admin.request(
        `/workspaces/${workspaceId}/managed-members/${legacy.id}/enroll`,
        { username: "legacy_member" },
      );
      expect(enrolled.status).to.equal(200);
      const browser = new Browser();
      await browser.request("/auth/login", {
        username: "legacy_member",
        password: enrolled.data.credential.temporaryPassword,
      });
      await browser.request("/auth/change-password", {
        currentPassword: enrolled.data.credential.temporaryPassword,
        newPassword: password,
      });
      const proof = await signedChallenge(
        browser,
        "LINK",
        privateKeyToAccount(generatePrivateKey()),
      );
      const rejected = await browser.request("/auth/wallet/link", proof);
      expect(rejected.status).to.equal(409);
      expect(rejected.data.code).to.equal("LEGACY_WALLET_REVIEW_REQUIRED");
      const [unchanged] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, legacy.id));
      expect(unchanged.walletAddress).to.equal(oldWallet.address);
    });
    it("isolates two children's tasks and private proof even when they share the same vault", async () => {
      const children: { id: string; browser: Browser }[] = [];
      for (const name of ["proof_child_a", "proof_child_b"]) {
        const created = await createMember(name);
        const browser = new Browser();
        await browser.request("/auth/login", {
          username: name,
          password: created.credential.temporaryPassword,
        });
        await browser.request("/auth/change-password", {
          currentPassword: created.credential.temporaryPassword,
          newPassword: password,
        });
        await browser.request(
          "/auth/wallet/link",
          await signedChallenge(
            browser,
            "LINK",
            privateKeyToAccount(generatePrivateKey()),
          ),
        );
        children.push({ id: created.memberId, browser });
      }
      const [vault] = await db
        .insert(schema.vaults)
        .values({
          workspaceId,
          onchainVaultId: 999,
          name: "Shared chores",
          ruleTemplate: "MILESTONE",
        })
        .returning();
      await db
        .insert(schema.vaultMembers)
        .values(
          children.map((child) => ({
            vaultId: vault.id,
            userId: child.id,
            vaultRole: "BENEFICIARY",
          })),
        );
      const tasks = await db
        .insert(schema.chores)
        .values(
          children.map((child, index) => ({
            vaultId: vault.id,
            familyId: workspaceId,
            childId: child.id,
            title: `Private chore ${index}`,
            rewardAmount: "0.000000000000000001",
          })),
        )
        .returning();
      for (let index = 0; index < children.length; index++) {
        const response = await children[index].browser.request(
          `/chores/${workspaceId}`,
          undefined,
          "GET",
        );
        expect(response.status).to.equal(200);
        expect(
          response.data.data.map((task: any) => task.childId),
        ).to.deep.equal([children[index].id]);
        expect(response.data.data[0].rewardAmount).to.equal(
          "0.000000000000000001",
        );
      }
      // Tạo attachment trực tiếp trong DB cô lập để kiểm endpoint đọc, không upload ảnh thật.
      const [attachment] = await db
        .insert(schema.proofAttachments)
        .values({
          choreId: tasks[0].id,
          ownerId: children[0].id,
          content: "iVBORw0KGgo=",
          expiresAt: new Date(Date.now() + 86400000),
        })
        .returning();
      const blocked = await children[1].browser.request(
        `/member/attachments/${attachment.id}`,
        undefined,
        "GET",
      );
      expect(blocked.status).to.equal(403);
      expect(
        (
          await otherAdmin.request(
            `/member/attachments/${attachment.id}`,
            undefined,
            "GET",
          )
        ).status,
      ).to.equal(403);
      const assigned = await children[0].browser.request(
        `/member/guardians?workspaceId=${workspaceId}`,
        undefined,
        "GET",
      );
      expect(assigned.status).to.equal(200);
      expect(assigned.data.data.length).to.be.greaterThan(0);
      expect(
        assigned.data.data.some(
          (contact: any) => contact.id === children[1].id,
        ),
      ).to.equal(false);
    });
    it("limits dependent withdrawal history to the actor even in a shared vault", async () => {
      const [vault] = await db
        .insert(schema.vaults)
        .values({
          workspaceId,
          onchainVaultId: 1000,
          name: "Shared shield",
          ruleTemplate: "SHIELD",
        })
        .returning();
      await db
        .insert(schema.vaultMembers)
        .values({
          vaultId: vault.id,
          userId: memberId,
          vaultRole: "BENEFICIARY",
        });
      const adminIdentity = await admin.request("/auth/me", undefined, "GET");
      await db.insert(schema.withdrawalRequests).values([
        {
          familyId: workspaceId,
          vaultId: vault.id,
          requesterId: memberId,
          amount: "0.1",
          reason: "Daily",
        },
        {
          familyId: workspaceId,
          vaultId: vault.id,
          requesterId: adminIdentity.data.user.id,
          amount: "0.2",
          reason: "Other",
        },
      ]);
      const response = await member.request(
        `/withdrawals/${workspaceId}`,
        undefined,
        "GET",
      );
      expect(response.status).to.equal(200);
      expect(
        response.data.data.every(
          (request: any) => request.requesterId === memberId,
        ),
      ).to.equal(true);
      expect(
        response.data.data.some((request: any) => request.reason === "Other"),
      ).to.equal(false);
    });
    it("locks only one workspace and respects session revocation/logout", async () => {
      await db.insert(schema.workspaceMembers).values({
        workspaceId: otherWorkspaceId,
        userId: memberId,
        role: "ELDERLY",
      });
      expect(
        (
          await admin.request(
            `/workspaces/${workspaceId}/managed-members/${memberId}/access`,
            { disabled: true },
            "PATCH",
          )
        ).status,
      ).to.equal(200);
      expect(
        (await member.request(`/workspaces/${workspaceId}`, undefined, "GET"))
          .status,
      ).to.equal(403);
      expect(
        (
          await member.request(
            `/workspaces/${otherWorkspaceId}`,
            undefined,
            "GET",
          )
        ).status,
      ).to.equal(200);
      const list = await member.request("/auth/sessions", undefined, "GET");
      expect(list.status).to.equal(200);
      expect(list.data.sessions.length).to.be.greaterThan(0);
      const current = list.data.currentSessionId;
      expect(
        (await member.request(`/auth/sessions/${current}`, {}, "DELETE"))
          .status,
      ).to.equal(200);
      expect(
        (await member.request("/auth/me", undefined, "GET")).status,
      ).to.equal(401);
      expect((await otherAdmin.request("/auth/logout", {})).status).to.equal(
        200,
      );
      expect(
        (await otherAdmin.request("/auth/me", undefined, "GET")).status,
      ).to.equal(401);
    });
  },
);
