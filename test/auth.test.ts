import { expect } from "chai";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { verifyMessage } from "viem";
import {
  hashPassword,
  verifyPassword,
  normalizeUsername,
  validatePassword,
  siweMessage,
  randomToken,
  digest,
  applicationOrigin,
  requestIp,
} from "../backend/src/auth/security";
import { createHmac } from "crypto";

describe("Account security primitives", function () {
  this.timeout(15000);
  before(() => {
    process.env.APP_ORIGIN = "http://localhost:3000";
  });
  it("refuses application-database aliases and requires explicit disposable-test opt-in", () => {
    const { assertIsolatedDatabase } = require("../scripts/auth-test-safety.cjs");
    const application = "postgresql://app:secret@ep-family.region.neon.tech/neondb?sslmode=require";
    expect(() => assertIsolatedDatabase("postgres://tester:different@ep-family-pooler.region.neon.tech:5432/neondb?application_name=test", application, "true")).to.throw("application database");
    expect(() => assertIsolatedDatabase("postgresql://tester:test@ep-isolated.region.neon.tech/neondb", application, "false")).to.throw("AUTH_TEST_ALLOW_RESET");
    expect(() => assertIsolatedDatabase("postgresql://tester:test@ep-isolated.region.neon.tech/neondb", application, "true")).not.to.throw();
  });
  it("hashes with salted Argon2id and rejects wrong or oversized passwords", async () => {
    const password = "A private family phrase 2026";
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    expect(first).to.match(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(first).not.to.equal(second);
    expect(first).not.to.include(password);
    expect(await verifyPassword(first, password)).to.equal(true);
    expect(await verifyPassword(first, "wrong password")).to.equal(false);
    expect(await verifyPassword(first, "x".repeat(129))).to.equal(false);
    expect(await verifyPassword("1234", password)).to.equal(false);
  });
  it("normalizes exact usernames and never accepts names or PINs as aliases", () => {
    expect(normalizeUsername("  Grandma.Lan_01 ")).to.equal("grandma.lan_01");
    for (const value of [
      "Bà Lan",
      "a",
      "admin@example.com",
      {},
      null,
      "user/other",
    ])
      expect(() => normalizeUsername(value)).to.throw();
    for (const value of [
      "1234",
      "123456789012",
      "password1234",
      "a".repeat(12),
      "a".repeat(129),
    ])
      expect(() => validatePassword(value)).to.throw();
    expect(() =>
      validatePassword("Nhà mình luôn bên nhau 2026"),
    ).not.to.throw();
  });
  it("keeps password whitespace as part of the secret", async () => {
    const hash = await hashPassword("  a long private phrase  ");
    expect(await verifyPassword(hash, "a long private phrase")).to.equal(false);
    expect(await verifyPassword(hash, "  a long private phrase  ")).to.equal(
      true,
    );
  });
  it("creates unpredictable opaque secrets and stores only digests", () => {
    const token = randomToken();
    expect(token).to.match(/^[a-zA-Z0-9_-]{43}$/);
    expect(randomToken()).not.to.equal(token);
    expect(digest(token)).to.have.length(64).and.not.equal(token);
  });
  it("binds wallet proofs to domain, purpose, chain, nonce and expiration", async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const issued = new Date("2026-11-04T00:00:00Z");
    const expires = new Date("2026-11-04T00:05:00Z");
    const message = siweMessage(
      account.address,
      "aBc0123456789",
      43113,
      "LINK",
      issued,
      expires,
    );
    const signature = await account.signMessage({ message });
    expect(message)
      .to.include("localhost:3000 wants you to sign in")
      .and.include("URI: http://localhost:3000")
      .and.include("Chain ID: 43113")
      .and.include("Expiration Time: 2026-11-04T00:05:00.000Z");
    expect(
      await verifyMessage({ address: account.address, message, signature }),
    ).to.equal(true);
    for (const changed of [
      message.replace("localhost:3000", "evil.example"),
      message.replace("Chain ID: 43113", "Chain ID: 1"),
      message.replace("Nonce: aBc0123456789", "Nonce: other"),
      siweMessage(
        account.address,
        "aBc0123456789",
        43113,
        "LOGIN",
        issued,
        expires,
      ),
    ]) {
      expect(
        await verifyMessage({
          address: account.address,
          message: changed,
          signature,
        }),
      ).to.equal(false);
    }
  });
  it("fails closed when origin configuration is absent or malformed", () => {
    const saved = process.env.APP_ORIGIN;
    delete process.env.APP_ORIGIN;
    expect(() => applicationOrigin()).to.throw();
    process.env.APP_ORIGIN = "http://localhost:3000/extra";
    expect(() => applicationOrigin()).to.throw();
    process.env.APP_ORIGIN = saved;
  });
  it("accepts client IP metadata only with a fresh BFF signature bound to the exact request", () => {
    const previous = process.env.BFF_SHARED_SECRET;
    const secret = randomToken();
    process.env.BFF_SHARED_SECRET = secret;
    const headers: Record<string, string> = {
      "X-Kinetix-Client-IP": "192.0.2.10",
      "X-Kinetix-Timestamp": Date.now().toString(),
    };
    const req: any = {
      method: "POST",
      originalUrl: "/api/auth/login",
      ip: "127.0.0.1",
      get: (key: string) => headers[key],
    };
    headers["X-Kinetix-Signature"] = "0".repeat(64);
    expect(requestIp(req)).to.equal("127.0.0.1");
    headers["X-Kinetix-Signature"] = createHmac("sha256", secret)
      .update(
        `${req.method}\n${req.originalUrl}\n${headers["X-Kinetix-Timestamp"]}\n${headers["X-Kinetix-Client-IP"]}`,
      )
      .digest("hex");
    expect(requestIp(req)).to.equal("192.0.2.10");
    req.originalUrl = "/api/auth/register-family";
    expect(requestIp(req)).to.equal("127.0.0.1");
    if (previous === undefined) delete process.env.BFF_SHARED_SECRET;
    else process.env.BFF_SHARED_SECRET = previous;
  });
});
