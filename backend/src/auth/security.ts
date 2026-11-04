import * as crypto from "node:crypto";
import type { Request } from "express";

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "AUTH_ERROR",
  ) {
    super(message);
  }
}
export function assert(
  condition: unknown,
  status: number,
  message: string,
  code?: string,
): asserts condition {
  if (!condition) throw new AuthError(status, message, code);
}
export const digest = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");
export const randomToken = () => crypto.randomBytes(32).toString("base64url");
export function requestIp(req: Request): string {
  const secret = process.env.BFF_SHARED_SECRET;
  const address = req.get("X-Kinetix-Client-IP");
  const timestamp = req.get("X-Kinetix-Timestamp");
  const signature = req.get("X-Kinetix-Signature");
  if (
    secret &&
    secret.length >= 32 &&
    address &&
    address.length <= 64 &&
    timestamp &&
    Math.abs(Date.now() - Number(timestamp)) < 30000 &&
    signature &&
    /^[a-f0-9]{64}$/.test(signature)
  ) {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${req.method}\n${req.originalUrl}\n${timestamp}\n${address}`)
      .digest();
    if (crypto.timingSafeEqual(expected, Buffer.from(signature, "hex")))
      return address;
  }
  return req.ip || "unknown";
}
export function normalizeUsername(value: unknown): string {
  assert(typeof value === "string", 400, "Tên đăng nhập không hợp lệ.");
  const username = value.trim().toLowerCase();
  assert(
    /^[a-z0-9][a-z0-9._-]{2,49}$/.test(username),
    400,
    "Tên đăng nhập cần 3–50 ký tự: a-z, 0-9, dấu chấm, gạch dưới hoặc gạch ngang.",
  );
  return username;
}
export function validatePassword(value: unknown): asserts value is string {
  assert(
    typeof value === "string" &&
      value.length >= 12 &&
      value.length <= 128 &&
      Buffer.byteLength(value) <= 512,
    400,
    "Mật khẩu cần từ 12 đến 128 ký tự.",
  );
  assert(
    !/^(.)\1+$/.test(value) &&
      ![
        "password1234",
        "123456789012",
        "abcdefghijkl",
        "kinetix123456",
      ].includes(value.toLowerCase()),
    400,
    "Hãy chọn mật khẩu khó đoán hơn.",
  );
}
// Node 24.7+ native Argon2id. Explicit runtime requirement, with no weaker fallback.
const params = { parallelism: 1, passes: 2, memory: 19456, tagLength: 32 };
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const argon2 = (crypto as unknown as { argon2: Function }).argon2;
    if (!argon2)
      return reject(
        new Error(
          "Authentication requires Node.js >=24.7 with native Argon2id.",
        ),
      );
    argon2(
      "argon2id",
      { ...params, message: password, nonce: salt },
      (error: Error | null, key: Buffer) =>
        error ? reject(error) : resolve(key),
    );
  });
}
export async function hashPassword(password: string): Promise<string> {
  validatePassword(password);
  const salt = crypto.randomBytes(16);
  const key = await derive(password, salt);
  return `$argon2id$v=19$m=${params.memory},t=${params.passes},p=1$${salt.toString("base64")}$${key.toString("base64")}`;
}
export async function verifyPassword(
  hash: string,
  password: unknown,
): Promise<boolean> {
  if (
    typeof password !== "string" ||
    password.length > 128 ||
    Buffer.byteLength(password) > 512
  )
    return false;
  const parts = hash.split("$");
  if (
    parts.length !== 6 ||
    parts[1] !== "argon2id" ||
    parts[2] !== "v=19" ||
    parts[3] !== "m=19456,t=2,p=1"
  )
    return false;
  const expected = Buffer.from(parts[5], "base64");
  const key = await derive(password, Buffer.from(parts[4], "base64"));
  return (
    expected.length === key.length && crypto.timingSafeEqual(expected, key)
  );
}
export function applicationOrigin(): URL {
  const value = process.env.APP_ORIGIN;
  assert(value, 503, "APP_ORIGIN chưa được cấu hình.");
  const url = new URL(value);
  assert(
    url.origin === value &&
      (url.protocol === "https:" ||
        (process.env.NODE_ENV !== "production" && url.protocol === "http:")),
    503,
    "APP_ORIGIN không hợp lệ.",
  );
  return url;
}
export function allowedChains(): number[] {
  return [43113, Number(process.env.FAMILY_L1_CHAIN_ID || 99999)];
}
export type ChallengePurpose = "REGISTER" | "LOGIN" | "LINK" | "REAUTH";
export function siweMessage(
  address: string,
  nonce: string,
  chainId: number,
  purpose: ChallengePurpose,
  issuedAt: Date,
  expiresAt: Date,
): string {
  const origin = applicationOrigin();
  const statements: Record<ChallengePurpose, string> = {
    REGISTER:
      "Create a Kinetix guardian account. Workspace access requires an authorized invitation or creation of a new workspace.",
    LOGIN: "Sign in to your existing Kinetix guardian account.",
    LINK: "Link this personal Core wallet to your signed-in Kinetix account. This does not send a transaction.",
    REAUTH: "Confirm your identity for a sensitive Kinetix account operation.",
  };
  return `${origin.host} wants you to sign in with your Ethereum account:\n${address}\n\n${statements[purpose]}\n\nURI: ${origin.origin}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${issuedAt.toISOString()}\nExpiration Time: ${expiresAt.toISOString()}`;
}
export function textInput(value: unknown, max = 100): string {
  assert(
    typeof value === "string" &&
      value.trim().length > 0 &&
      value.trim().length <= max,
    400,
    "Thông tin không hợp lệ.",
  );
  return value.trim();
}
export function uuidInput(value: string): string {
  assert(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    ),
    400,
    "ID không hợp lệ.",
  );
  return value;
}
