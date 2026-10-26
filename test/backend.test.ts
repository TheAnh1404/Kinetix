import { expect } from "chai";
import { FamilyService } from "../backend/src/services/familyService";
import { db } from "../backend/src/db";
import { families, users, withdrawalRequests, chores, notifications } from "../backend/src/db/schema";
import { eq } from "drizzle-orm";

describe("Kinetix Backend Services & Neon Database Integration", function () {
  this.timeout(20000); // 20s cho cloud database roundtrips

  let familyId: string;
  let adminUserId: string;
  let guardianUserId: string;
  let elderlyUserId: string;
  let childUserId: string;

  before(async function () {
    // Lấy thông tin gia đình mẫu đã seed
    const [family] = await db.select().from(families).limit(1);
    expect(family).to.not.be.undefined;
    familyId = family.id;

    const allUsers = await db.select().from(users).where(eq(users.familyId, familyId));
    expect(allUsers.length).to.be.greaterThanOrEqual(5);

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

  it("1. syncWallet: Nhận diện ví Core Wallet đã có trong hệ thống", async function () {
    const adminWallet = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const res = await FamilyService.syncWallet(adminWallet);

    expect(res.user.role).to.equal("ADMIN");
    expect(res.user.fullName).to.include("Bố Ba");
    expect(res.family.id).to.equal(familyId);
  });

  it("2. syncWallet: Tự động đăng ký ví mới vào gia đình Kinetix", async function () {
    const randomWallet = "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const res = await FamilyService.syncWallet(randomWallet, "Người thân mới");

    expect(res.user.walletAddress.toLowerCase()).to.equal(randomWallet.toLowerCase());
    expect(res.user.fullName).to.equal("Người thân mới");
    expect(res.family.id).to.equal(familyId);
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
});
