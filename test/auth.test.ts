import { expect } from "chai";
import { signAuthToken, verifyAuthToken } from "../frontend/src/lib/jwt";
import { verifyMessage } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { db } from "../backend/src/db";
import { users, authNonces } from "../backend/src/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

describe("Kinetix Full-Stack Auth & SIWE Verification", function () {
  this.timeout(10000);

  it("1. signAuthToken & verifyAuthToken: Mã hóa và giải mã JWT token an toàn", async () => {
    const mockPayload = {
      userId: "user-123",
      familyId: "family-456",
      fullName: "Bố Ba (Admin)",
      role: "ADMIN" as const,
      walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      avatarUrl: "https://example.com/avatar.jpg",
    };

    const token = await signAuthToken(mockPayload);
    expect(token).to.be.a("string").and.have.length.greaterThan(20);

    const verified = await verifyAuthToken(token);
    expect(verified).to.not.be.null;
    expect(verified?.userId).to.equal(mockPayload.userId);
    expect(verified?.role).to.equal("ADMIN");
    expect(verified?.fullName).to.equal(mockPayload.fullName);
    expect(verified?.walletAddress).to.equal(mockPayload.walletAddress);
  });

  it("2. verifyAuthToken: Từ chối token giả mạo hoặc sai chữ ký", async () => {
    const forgedToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake_signature";
    const verified = await verifyAuthToken(forgedToken);
    expect(verified).to.be.null;
  });

  it("3. Viem SIWE: Ký thông điệp EIP-4361 và xác thực chữ ký mật mã chuẩn xác", async () => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);

    const nonce = crypto.randomBytes(16).toString("hex");
    const domain = "localhost:3000";
    const message = `${domain} wants you to sign in with your Ethereum account:
${account.address}

Sign in to Kinetix - The Multi-Generational Family Finance OS on Avalanche

URI: http://${domain}
Version: 1
Chain ID: 43114
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;

    // Ký thông điệp bằng ví
    const signature = await account.signMessage({ message });

    // Xác thực chữ ký bằng Viem
    const isValid = await verifyMessage({
      address: account.address,
      message,
      signature,
    });
    expect(isValid).to.be.true;

    // Chữ ký sai hoặc địa chỉ khác phải bị từ chối
    const fakeAccount = privateKeyToAccount(generatePrivateKey());
    const isFakeValid = await verifyMessage({
      address: fakeAccount.address,
      message,
      signature,
    });
    expect(isFakeValid).to.be.false;
  });

  it("4. authNonces: Lưu và đối soát mã nonce chống Replay Attack trên Neon DB", async () => {
    const testNonce = `test-nonce-${Date.now()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    // Lưu nonce vào database
    await db.insert(authNonces).values({
      nonce: testNonce,
      createdAt: now,
      expiresAt,
    });

    // Truy vấn kiểm tra
    const [saved] = await db
      .select()
      .from(authNonces)
      .where(eq(authNonces.nonce, testNonce));
    expect(saved).to.exist;
    expect(saved.nonce).to.equal(testNonce);

    // Xóa nonce (single-use)
    await db.delete(authNonces).where(eq(authNonces.nonce, testNonce));
    const [deleted] = await db
      .select()
      .from(authNonces)
      .where(eq(authNonces.nonce, testNonce));
    expect(deleted).to.be.undefined;
  });

  it("5. Family Login: Xác thực mã PIN của thành viên Ông Nội và Bé Na", async () => {
    const [elderly] = await db
      .select()
      .from(users)
      .where(eq(users.role, "ELDERLY"));
    expect(elderly).to.exist;
    expect(elderly.pinCode).to.equal("1234");

    const [child] = await db
      .select()
      .from(users)
      .where(eq(users.role, "CHILD"));
    expect(child).to.exist;
    expect(child.pinCode).to.equal("1234");
  });
});
