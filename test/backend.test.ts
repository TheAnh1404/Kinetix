import { expect } from "chai";
import { FamilyService } from "../backend/src/services/familyService";
import { db } from "../backend/src/db";
import { families, users, withdrawalRequests, chores, notifications, vaults, vaultMembers } from "../backend/src/db/schema";
import { eq } from "drizzle-orm";

describe("Kinetix Backend Services & Neon Database Integration", function () {
  this.timeout(20000); // 20s cho cloud database roundtrips

  let familyId: string;
  let adminUserId: string;
  let guardianUserId: string;
  let elderlyUserId: string;
  let childUserId: string;

  let isTemporaryFixture = false;

  const testAdminWallet = "0x1111111111111111111111111111111111111111";
  const testGuardianWallet = "0x2222222222222222222222222222222222222222";
  const testElderlyWallet = "0x3333333333333333333333333333333333333333";
  const testChildWallet = "0x4444444444444444444444444444444444444444";

  before(async function () {
    // Khởi tạo một gia đình kiểm thử riêng biệt để đảm bảo cô lập 100%
    isTemporaryFixture = true;
    const [family] = await db
      .insert(families)
      .values({
        name: `Gia đình Backend Test ${Date.now()}`,
        familyCode: `BTST-${Math.floor(1000 + Math.random() * 9000)}`,
        adminWallet: testAdminWallet,
      })
      .returning();

    // Tạo các thành viên phục vụ kiểm thử
    await db.insert(users).values([
      {
        familyId: family.id,
        fullName: "Bố Ba (Admin)",
        role: "ADMIN",
        walletAddress: testAdminWallet,
        pinCode: "1234",
        isAllowlisted: true,
      },
      {
        familyId: family.id,
        fullName: "Cô Út (Guardian)",
        role: "GUARDIAN",
        walletAddress: testGuardianWallet,
        pinCode: "1234",
        isAllowlisted: true,
      },
      {
        familyId: family.id,
        fullName: "Ông Nội",
        role: "ELDERLY",
        walletAddress: testElderlyWallet,
        pinCode: "1234",
        isAllowlisted: true,
      },
      {
        familyId: family.id,
        fullName: "Bé Na",
        role: "CHILD",
        walletAddress: testChildWallet,
        authMethod: "PASSKEY_EMBEDDED",
        pinCode: "1234",
        isAllowlisted: true,
      },
    ]);

    familyId = family.id;
    const allUsers = await db.select().from(users).where(eq(users.familyId, familyId));

    const admin = allUsers.find((u) => u.role === "ADMIN");
    const guardian = allUsers.find((u) => u.role === "GUARDIAN");
    const elderly = allUsers.find((u) => u.role === "ELDERLY");
    const child = allUsers.find((u) => u.role === "CHILD");

    expect(admin).to.not.be.undefined;
    expect(guardian).to.not.be.undefined;
    expect(elderly).to.not.be.undefined;
    expect(child).to.not.be.undefined;

    adminUserId = admin!.id;
    guardianUserId = guardian!.id;
    elderlyUserId = elderly!.id;
    childUserId = child!.id;
  });

  after(async function () {
    if (isTemporaryFixture && familyId) {
      await db.delete(notifications).where(eq(notifications.familyId, familyId));
      await db.delete(chores).where(eq(chores.familyId, familyId));
      await db.delete(withdrawalRequests).where(eq(withdrawalRequests.familyId, familyId));
      await db.delete(users).where(eq(users.familyId, familyId));
      await db.delete(families).where(eq(families.id, familyId));
    }
  });

  it("1. syncWallet: Nhận diện ví Core Wallet đã có trong hệ thống", async function () {
    const res = await FamilyService.syncWallet(testAdminWallet);

    expect(res.user.role).to.equal("ADMIN");
    expect(res.user.fullName).to.include("Bố Ba");
    expect(res.family.id).to.equal(familyId);
  });

  it("2. syncWallet: Tự động đăng ký ví mới vào gia đình Kinetix", async function () {
    const randomWallet = "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const res = await FamilyService.syncWallet(randomWallet, "Người thân mới");

    expect(res.user.walletAddress.toLowerCase()).to.equal(randomWallet.toLowerCase());
    expect(res.user.fullName).to.equal("Người thân mới");
    expect(res.family.id).to.be.a("string");

    // Dọn dẹp user vừa tự động khởi tạo
    await db.delete(users).where(eq(users.id, res.user.id));
  });

  it("3. createWithdrawalRequest: Rút nhỏ <= 50 USDC giải ngân tức thì (EXECUTED)", async function () {
    const res = await FamilyService.createWithdrawalRequest({
      familyId,
      requesterId: elderlyUserId,
      amount: 25,
      vault: "RetirementShield",
      reason: "Tiền mua thức ăn hàng ngày",
    });

    expect(res.isFastWithdraw).to.be.true;
    expect(res.request.status).to.equal("EXECUTED");
    expect(res.request.approvalsCount).to.equal(2);
  });

  it("4. createWithdrawalRequest & approveWithdrawal: Rút lớn > 50 USDC kích hoạt PENDING và đủ 2/3 chữ ký thành APPROVED", async function () {
    // 1. Tạo khoản rút lớn 800 USDC
    const res = await FamilyService.createWithdrawalRequest({
      familyId,
      requesterId: elderlyUserId,
      amount: 800,
      vault: "RetirementShield",
      reason: "Mua thiết bị y tế",
    });

    expect(res.isFastWithdraw).to.be.false;
    expect(res.request.status).to.equal("PENDING");
    expect(res.request.approvalsCount).to.equal(0);

    const requestId = res.request.id;

    // 2. Chữ ký 1: Tăng approvalsCount lên 1
    const step1 = await FamilyService.approveWithdrawal(requestId);
    expect(step1.isReadyToExecute).to.be.false;
    expect(step1.request.approvalsCount).to.equal(1);
    expect(step1.request.status).to.equal("PENDING");

    // 3. Chữ ký 2: Đạt 2/3 chữ ký -> APPROVED
    const step2 = await FamilyService.approveWithdrawal(requestId);
    expect(step2.isReadyToExecute).to.be.true;
    expect(step2.request.approvalsCount).to.equal(2);
    expect(step2.request.status).to.equal("APPROVED");
  });

  it("5. Chore-to-Earn: Chu trình nộp bài và nhận thưởng của con nhỏ", async function () {
    // Tạo chore mới để test
    const [chore] = await db
      .insert(chores)
      .values({
        familyId,
        childId: childUserId,
        title: "Tưới cây ban công",
        rewardAmount: "3.000000",
        status: "TODO",
      })
      .returning();

    // Bé nộp bằng chứng
    const submitted = await FamilyService.submitChore(chore.id, "https://example.com/tree.jpg");
    expect(submitted.status).to.equal("SUBMITTED");
    expect(submitted.proofImageUrl).to.equal("https://example.com/tree.jpg");

    // Bố mẹ xác nhận và trả thưởng
    const rewarded = await FamilyService.verifyAndRewardChore(chore.id);
    expect(rewarded.status).to.equal("REWARDED");
  });

  it("6. getUserNotifications: Lấy danh sách cảnh báo tức thời gửi tới Guardians", async function () {
    const list = await FamilyService.getUserNotifications(guardianUserId);
    expect(list.length).to.be.greaterThan(0);
    expect(list[0].type).to.be.oneOf(["ALERT_SCAM", "APPROVAL_NEEDED", "TASK_COMPLETED", "YIELD_PAYOUT"]);
  });

  it("7. Dynamic Vaults: Tạo Hũ động mới với cấu hình tùy biến (RuleTemplate SHARED_GOAL)", async function () {
    const vault = await FamilyService.createCustomVault({
      workspaceId: familyId,
      onchainVaultId: 99,
      name: "Quỹ Đi Phượt Xuyên Việt",
      description: "Tích lũy mua sắm đồ phượt và cắm trại",
      ruleTemplate: "SHARED_GOAL",
      bufferRatioBps: 1500, // 15% L1 / 85% C-Chain
      fastWithdrawLimit: 100, // Rút nhanh lên tới 100 AVAX
      requiredApprovals: 2,
      guardianUserIds: [adminUserId, guardianUserId],
      beneficiaryUserIds: [elderlyUserId],
    });

    expect(vault.name).to.equal("Quỹ Đi Phượt Xuyên Việt");
    expect(vault.ruleTemplate).to.equal("SHARED_GOAL");
    expect(vault.bufferRatioBps).to.equal(1500);
    expect(Number(vault.fastWithdrawLimit)).to.equal(100);

    const details = await FamilyService.getWorkspaceDetails(familyId);
    expect(details).to.not.be.null;
    expect(details?.vaults.some((v) => v.name === "Quỹ Đi Phượt Xuyên Việt")).to.be.true;
  });

  it("8. Dynamic Vault Withdrawal: Kiểm tra hạn mức rút nhanh lấy từ Dynamic Vault (<=100 EXECUTED, >100 PENDING)", async function () {
    const details = await FamilyService.getWorkspaceDetails(familyId);
    const customVault = details?.vaults.find((v) => v.name === "Quỹ Đi Phượt Xuyên Việt");
    expect(customVault).to.not.be.undefined;

    // Rút 80 AVAX (<= 100 AVAX limit của hũ này) -> giải ngân tức thì
    const fastRes = await FamilyService.createWithdrawalRequest({
      familyId,
      vaultId: customVault!.id,
      requesterId: elderlyUserId,
      amount: 80,
      reason: "Mua lều cắm trại",
    });
    expect(fastRes.isFastWithdraw).to.be.true;
    expect(fastRes.request.status).to.equal("EXECUTED");

    // Rút 120 AVAX (> 100 AVAX limit) -> kích hoạt Multisig PENDING
    const slowRes = await FamilyService.createWithdrawalRequest({
      familyId,
      vaultId: customVault!.id,
      requesterId: elderlyUserId,
      amount: 120,
      reason: "Mua xe máy cào cào",
    });
    expect(slowRes.isFastWithdraw).to.be.false;
    expect(slowRes.request.status).to.equal("PENDING");
  });

  it("9. payoutRoscaRound: Giải ngân kỳ hụi xoay vòng cho Hũ ROSCA và chuyển sang vòng tiếp theo", async function () {
    const roscaVault = await FamilyService.createCustomVault({
      workspaceId: familyId,
      onchainVaultId: 101,
      name: "Quỹ Họ Hụi Backend Test",
      ruleTemplate: "ROSCA",
      bufferRatioBps: 0,
      fastWithdrawLimit: 0,
      requiredApprovals: 2,
      guardianUserIds: [adminUserId, guardianUserId],
      beneficiaryUserIds: [guardianUserId, elderlyUserId],
      roscaRoundDuration: 7 * 86400,
      roscaRoundContribution: 50,
    });

    const payout = await FamilyService.payoutRoscaRound(roscaVault.id);
    expect(payout.roundIndex).to.equal(0);
    expect(payout.vault.roscaCurrentRound).to.equal(1);
    expect(payout.recipientUser).to.not.be.null;

    // Dọn dẹp hũ vừa test
    await db.delete(withdrawalRequests).where(eq(withdrawalRequests.vaultId, roscaVault.id));
    await db.delete(vaultMembers).where(eq(vaultMembers.vaultId, roscaVault.id));
    await db.delete(vaults).where(eq(vaults.id, roscaVault.id));
  });

  it("10. SHARED_GOAL Lock: Chặn yêu cầu rút tiền khi chưa gom đủ mục tiêu", async function () {
    const goalVault = await FamilyService.createCustomVault({
      workspaceId: familyId,
      onchainVaultId: 102,
      name: "Quỹ Du Lịch Tokyo",
      ruleTemplate: "SHARED_GOAL",
      bufferRatioBps: 1000,
      fastWithdrawLimit: 0,
      requiredApprovals: 2,
      guardianUserIds: [adminUserId],
      beneficiaryUserIds: [elderlyUserId],
      targetGoalAmount: 500, // Mục tiêu 500 AVAX
      targetDeadline: new Date(Date.now() + 30 * 86400 * 1000), // Hạn 30 ngày
    });

    // Thử rút tiền khi cachedTotalBalance = 0 (< 500 AVAX)
    let errorCaught = false;
    try {
      await FamilyService.createWithdrawalRequest({
        familyId,
        vaultId: goalVault.id,
        requesterId: elderlyUserId,
        amount: 50,
        reason: "Rút đi du lịch trước",
      });
    } catch (err: any) {
      errorCaught = true;
      expect(err.message.toLowerCase()).to.include("chưa đạt số tiền mục tiêu 500 avax");
    }
    expect(errorCaught).to.be.true;

    // Dọn dẹp
    await db.delete(vaultMembers).where(eq(vaultMembers.vaultId, goalVault.id));
    await db.delete(vaults).where(eq(vaults.id, goalVault.id));
  });
});
