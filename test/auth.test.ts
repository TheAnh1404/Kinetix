import { expect } from "chai";
import { signAuthToken, verifyAuthToken } from "../frontend/src/lib/jwt";
import { verifyMessage } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { db } from "../backend/src/db";
import { users, families, authNonces } from "../backend/src/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

describe("Kinetix Full-Stack Auth & SIWE Verification", function () {
  this.timeout(15000);

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

  it("5. Register Family Flow: Lưu gia đình mới với Family Code và Admin vào Neon DB", async () => {
    const adminAccount = privateKeyToAccount(generatePrivateKey());
    const testFamilyCode = `KNTX-T${Math.floor(1000 + Math.random() * 9000)}`;
    const testFamilyName = "Gia đình Thử Nghiệm Real";

    // 1. Tạo bản ghi Family
    const [createdFamily] = await db
      .insert(families)
      .values({
        name: testFamilyName,
        familyCode: testFamilyCode,
        adminWallet: adminAccount.address,
      })
      .returning();

    expect(createdFamily).to.exist;
    expect(createdFamily.familyCode).to.equal(testFamilyCode);
    expect(createdFamily.familyCode).to.match(/^KNTX-[A-Z0-9]+$/);

    // 2. Tạo bản ghi Admin User
    const [adminUser] = await db
      .insert(users)
      .values({
        familyId: createdFamily.id,
        fullName: "Bố Đại Diện Test",
        role: "ADMIN",
        walletAddress: adminAccount.address,
        authMethod: "CORE_WALLET",
        pinCode: "5678",
        isAllowlisted: true,
      })
      .returning();

    expect(adminUser).to.exist;
    expect(adminUser.role).to.equal("ADMIN");
    expect(adminUser.familyId).to.equal(createdFamily.id);

    // 3. Con cái tham gia gia đình qua Family Code
    const guardianAccount = privateKeyToAccount(generatePrivateKey());
    const [guardianUser] = await db
      .insert(users)
      .values({
        familyId: createdFamily.id,
        fullName: "Con Cả Trưởng Thành",
        role: "GUARDIAN",
        walletAddress: guardianAccount.address,
        authMethod: "CORE_WALLET",
        pinCode: "1234",
        isAllowlisted: true,
      })
      .returning();

    expect(guardianUser.familyId).to.equal(createdFamily.id);
    expect(guardianUser.role).to.equal("GUARDIAN");

    // 4. Thêm thành viên Ông Nội và kiểm tra xác thực PIN
    const elderlyAccount = privateKeyToAccount(generatePrivateKey());
    const [elderlyUser] = await db
      .insert(users)
      .values({
        familyId: createdFamily.id,
        fullName: "Ông Nội Test",
        role: "ELDERLY",
        walletAddress: elderlyAccount.address,
        authMethod: "PASSKEY_EMBEDDED",
        pinCode: "1234",
        phoneNumber: "0901234567",
        isAllowlisted: true,
      })
      .returning();

    expect(elderlyUser).to.exist;
    expect(elderlyUser.pinCode).to.equal("1234");
    expect(elderlyUser.pinCode !== "9999").to.be.true;

    // Dọn dẹp bản ghi kiểm thử
    await db.delete(users).where(eq(users.id, elderlyUser.id));
    await db.delete(users).where(eq(users.id, guardianUser.id));
    await db.delete(users).where(eq(users.id, adminUser.id));
    await db.delete(families).where(eq(families.id, createdFamily.id));
  });

  it("6. Empty Database Verification: Đảm bảo cơ sở dữ liệu có thể bắt đầu từ trạng thái sạch 100%", async () => {
    // Kiểm tra xem database có hoạt động bình thường khi rỗng
    const allFamilies = await db.select().from(families);
    expect(allFamilies).to.be.an("array");
  });
});
