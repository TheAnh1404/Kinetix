import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {
  FamilyHub,
  FamilyYieldVault,
  MockTeleporterMessenger,
  VaultCashflow,
} from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Kinetix - Dynamic & Composable Multi-Space Vaults on Avalanche", function () {
  let admin: HardhatEthersSigner;
  let guardian1: HardhatEthersSigner;
  let guardian2: HardhatEthersSigner;
  let guardian3: HardhatEthersSigner;
  let grandparent: HardhatEthersSigner;
  let kid: HardhatEthersSigner;
  let outsider: HardhatEthersSigner;
  let newWallet: HardhatEthersSigner;

  let mockTeleporter: MockTeleporterMessenger;
  let familyHub: FamilyHub;
  let yieldVault: FamilyYieldVault;

  const C_CHAIN_BLOCKCHAIN_ID = ethers.keccak256(ethers.toUtf8Bytes("Avalanche-Fuji-C-Chain"));

  // RuleTemplate Enum values
  const SHIELD = 0;
  const MILESTONE = 1;
  const ROSCA = 2;
  const SHARED_GOAL = 3;

  beforeEach(async function () {
    [admin, guardian1, guardian2, guardian3, grandparent, kid, outsider, newWallet] =
      await ethers.getSigners();

    // 1. Triển khai Mock Teleporter Messenger
    const MockTeleporterFactory = await ethers.getContractFactory("MockTeleporterMessenger");
    mockTeleporter = (await MockTeleporterFactory.deploy()) as MockTeleporterMessenger;
    await mockTeleporter.waitForDeployment();

    // 2. Triển khai FamilyYieldVault trên C-Chain
    const YieldVaultFactory = await ethers.getContractFactory("FamilyYieldVault");
    yieldVault = (await YieldVaultFactory.deploy(
      await mockTeleporter.getAddress(),
      ethers.ZeroHash,
      ethers.ZeroAddress
    )) as FamilyYieldVault;
    await yieldVault.waitForDeployment();

    // 3. Triển khai FamilyHub trên Family L1
    const FamilyHubFactory = await ethers.getContractFactory("FamilyHub");
    familyHub = (await FamilyHubFactory.deploy(
      admin.address,
      await mockTeleporter.getAddress(),
      C_CHAIN_BLOCKCHAIN_ID,
      await yieldVault.getAddress()
    )) as FamilyHub;
    await familyHub.waitForDeployment();

    // 4. Cập nhật cấu hình liên chuỗi cho YieldVault
    await yieldVault.updateTeleporterConfig(
      await mockTeleporter.getAddress(),
      ethers.keccak256(ethers.toUtf8Bytes("Family-L1")),
      await familyHub.getAddress()
    );

    // 5. Khởi tạo 4 Hũ tiền động mẫu với các RuleTemplate khác nhau
    // Hũ 1: SHIELD - Báo hiếu & Trợ cấp Ông Bà (10/90, hạn mức rút nhanh 50 AVAX, duyệt 2/3 Guardians)
    await familyHub.connect(admin).createCustomVault(
      "Hũ Báo Hiếu Ông Bà",
      SHIELD,
      1000, // 10% L1 buffer / 90% C-Chain
      ethers.parseEther("50"),
      2, // 2/3 Guardians
      [guardian1.address, guardian2.address, guardian3.address],
      [grandparent.address]
    );

    // Hũ 2: MILESTONE - Lì xì & Nhiệm vụ Trẻ Em (10/90, không rút nhanh, duyệt 1/1 Admin)
    await familyHub.connect(admin).createCustomVault(
      "Hũ Lì Xì & Việc Nhà Bé Na",
      MILESTONE,
      1000,
      0,
      1,
      [admin.address],
      [kid.address]
    );

    // Hũ 3: ROSCA - Quỹ Họ Hụi Anh Em (0/100: 100% gửi C-Chain lấy lãi tối đa, duyệt 2/2)
    await familyHub.connect(guardian1).createCustomVault(
      "Quỹ Góp Vốn Họ Hụi",
      ROSCA,
      0, // 0% L1 / 100% C-Chain
      0,
      2,
      [guardian1.address, guardian2.address],
      [guardian1.address, guardian2.address, guardian3.address]
    );

    // Hũ 4: SHARED_GOAL - Quỹ Du Lịch Nhóm Bạn (20/80: 20% giữ L1, duyệt 3/3)
    await familyHub.connect(admin).createCustomVault(
      "Quỹ Du Lịch Đà Lạt",
      SHARED_GOAL,
      2000, // 20% L1 / 80% C-Chain
      0,
      3,
      [guardian1.address, guardian2.address, guardian3.address],
      [admin.address, guardian1.address, guardian2.address, guardian3.address]
    );
  });

  // =================================================================
  // 1. KIỂM THỬ KHỞI TẠO & PHÂN QUYỀN HŨ TIỀN ĐỘNG
  // =================================================================
  describe("1. Khởi tạo và Phân quyền Hũ Động (Dynamic Vaults)", function () {
    it("Khởi tạo đúng số lượng và thuộc tính của các Hũ động", async function () {
      expect(await familyHub.vaultCounter()).to.equal(4);

      const vault1 = await familyHub.getVault(1);
      expect(vault1.name).to.equal("Hũ Báo Hiếu Ông Bà");
      expect(vault1.ruleType).to.equal(SHIELD);
      expect(vault1.bufferRatioBps).to.equal(1000);
      expect(vault1.fastWithdrawLimit).to.equal(ethers.parseEther("50"));
      expect(vault1.requiredApprovals).to.equal(2);
      expect(vault1.isActive).to.be.true;

      const vault3 = await familyHub.getVault(3);
      expect(vault3.name).to.equal("Quỹ Góp Vốn Họ Hụi");
      expect(vault3.ruleType).to.equal(ROSCA);
      expect(vault3.bufferRatioBps).to.equal(0);
    });

    it("Kiểm tra mapping phân quyền Guardian và Beneficiary theo từng Hũ", async function () {
      // Hũ 1: Guardians là guardian1, guardian2, guardian3; Beneficiary là grandparent
      expect(await familyHub.isVaultGuardian(1, guardian1.address)).to.be.true;
      expect(await familyHub.isVaultGuardian(1, guardian2.address)).to.be.true;
      expect(await familyHub.isVaultGuardian(1, guardian3.address)).to.be.true;
      expect(await familyHub.isVaultGuardian(1, grandparent.address)).to.be.false;

      expect(await familyHub.isVaultBeneficiary(1, grandparent.address)).to.be.true;
      expect(await familyHub.isVaultBeneficiary(1, outsider.address)).to.be.false;

      // Danh sách Hũ của grandparent
      const gpVaults = await familyHub.getUserVaultIds(grandparent.address);
      expect(gpVaults).to.include(BigInt(1));
    });

    it("Từ chối tạo Hũ nếu tỷ lệ đệm > 100% (10000 bps)", async function () {
      await expect(
        familyHub.createCustomVault(
          "Hũ Lỗi",
          SHIELD,
          10001, // Lỗi vượt 100%
          0,
          1,
          [guardian1.address],
          [grandparent.address]
        )
      ).to.be.revertedWithCustomError(familyHub, "InvalidBufferRatio");
    });

    it("Từ chối tạo Hũ nếu số chữ ký duyệt requiredApprovals không hợp lệ", async function () {
      // requiredApprovals = 0
      await expect(
        familyHub.createCustomVault(
          "Hũ Lỗi",
          SHIELD,
          1000,
          0,
          0, // Lỗi
          [guardian1.address],
          [grandparent.address]
        )
      ).to.be.revertedWithCustomError(familyHub, "InvalidApprovalThreshold");

      // requiredApprovals > guardians.length
      await expect(
        familyHub.createCustomVault(
          "Hũ Lỗi",
          SHIELD,
          1000,
          0,
          3, // Cần 3 nhưng chỉ cung cấp 2 guardians
          [guardian1.address, guardian2.address],
          [grandparent.address]
        )
      ).to.be.revertedWithCustomError(familyHub, "InvalidApprovalThreshold");
    });
  });

  // =================================================================
  // 2. CƠ CHẾ ĐỆM THANH KHOẢN TÙY BIẾN THEO HŨ (BUFFER RATIO)
  // =================================================================
  describe("2. Cơ chế Đệm Thanh Khoản Tùy Biến (Custom Buffer Ratio)", function () {
    it("Phân bổ chính xác đệm 10/90 cho Hũ 1", async function () {
      const depositAmount = ethers.parseEther("100");
      await familyHub.connect(admin).depositToVault(1, { value: depositAmount });

      const vault1 = await familyHub.getVault(1);
      // 10% giữ lại L1 = 10 AVAX
      expect(vault1.l1BufferBalance).to.equal(ethers.parseEther("10"));
      // 90% gửi sang C-Chain = 90 AVAX
      expect(vault1.cChainPrincipal).to.equal(ethers.parseEther("90"));
      expect(vault1.totalBalance).to.equal(depositAmount);
    });

    it("Phân bổ chính xác đệm 20/80 cho Hũ 4 (SHARED_GOAL)", async function () {
      const depositAmount = ethers.parseEther("100");
      await familyHub.connect(admin).depositToVault(4, { value: depositAmount });

      const vault4 = await familyHub.getVault(4);
      // 20% giữ lại L1 = 20 AVAX
      expect(vault4.l1BufferBalance).to.equal(ethers.parseEther("20"));
      // 80% gửi sang C-Chain = 80 AVAX
      expect(vault4.cChainPrincipal).to.equal(ethers.parseEther("80"));
      expect(vault4.totalBalance).to.equal(depositAmount);
    });

    it("Phân bổ chính xác đệm 0/100 cho Hũ 3 (ROSCA - 100% C-Chain)", async function () {
      const depositAmount = ethers.parseEther("50");
      await familyHub.connect(guardian1).depositToVault(3, { value: depositAmount });

      const vault3 = await familyHub.getVault(3);
      expect(vault3.l1BufferBalance).to.equal(0);
      expect(vault3.cChainPrincipal).to.equal(depositAmount);
      expect(vault3.totalBalance).to.equal(depositAmount);
    });

    it("Từ chối nạp tiền với giá trị 0", async function () {
      await expect(
        familyHub.connect(admin).depositToVault(1, { value: 0 })
      ).to.be.revertedWithCustomError(familyHub, "ZeroAmount");
    });
  });

  // =================================================================
  // 3. RÚT TIỀN NHANH DÀNH CHO BỆNH/TIÊU DÙNG (FAST WITHDRAWAL)
  // =================================================================
  describe("3. Rút tiền nhanh không cần duyệt (Fast Withdrawal <= limit)", function () {
    beforeEach(async function () {
      // Nạp 500 AVAX vào Hũ 1 (10% = 50 AVAX tại L1)
      await familyHub.connect(admin).depositToVault(1, { value: ethers.parseEther("500") });
    });

    it("Beneficiary (Ông Bà) rút 30 AVAX (<= 50 AVAX limit) giải ngân tức thì", async function () {
      const withdrawAmount = ethers.parseEther("30");
      const balanceBefore = await ethers.provider.getBalance(grandparent.address);

      const tx = await familyHub.connect(grandparent).fastWithdraw(1, withdrawAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(grandparent.address);
      expect(balanceAfter + gasUsed - balanceBefore).to.equal(withdrawAmount);

      const vault1 = await familyHub.getVault(1);
      // Đệm L1 giảm từ 50 xuống 20 AVAX
      expect(vault1.l1BufferBalance).to.equal(ethers.parseEther("20"));
      expect(vault1.totalBalance).to.equal(ethers.parseEther("470"));
    });

    it("Từ chối nếu rút vượt hạn mức nhanh an toàn (vd rút 51 AVAX > 50 AVAX limit)", async function () {
      await expect(
        familyHub.connect(grandparent).fastWithdraw(1, ethers.parseEther("51"))
      ).to.be.revertedWithCustomError(familyHub, "ExceedsFastLimit");
    });

    it("Từ chối nếu người rút không phải Beneficiary của Hũ", async function () {
      await expect(
        familyHub.connect(outsider).fastWithdraw(1, ethers.parseEther("10"))
      ).to.be.revertedWithCustomError(familyHub, "NotVaultBeneficiary");
    });
  });

  // =================================================================
  // 4. ĐA CHỮ KÝ PHÂN TẦNG THEO HŨ (TIERED MULTISIG M/N)
  // =================================================================
  describe("4. Đa chữ ký phân tầng riêng biệt theo Hũ (Tiered Multisig M/N)", function () {
    beforeEach(async function () {
      // Nạp 1,000 AVAX vào Hũ 1 (Đệm L1: 100 AVAX, C-Chain: 900 AVAX)
      await familyHub.connect(admin).depositToVault(1, { value: ethers.parseEther("1000") });
    });

    it("Quy trình hoàn chỉnh: Tạo yêu cầu rút lớn -> Ký đủ 2/3 Guardians -> Giải ngân", async function () {
      const withdrawAmount = ethers.parseEther("80"); // Rút 80 AVAX (> 50 limit)
      const recipient = grandparent.address;

      // 1. Tạo yêu cầu rút tiền lớn
      const tx = await familyHub.connect(grandparent).requestLargeWithdrawal(
        1,
        withdrawAmount,
        "Khám bệnh đột xuất tại Bệnh viện TW"
      );
      await tx.wait();

      const req = await familyHub.withdrawalRequests(1);
      expect(req.vaultId).to.equal(1);
      expect(req.amount).to.equal(withdrawAmount);
      expect(req.approvalsCount).to.equal(0);
      expect(req.executed).to.be.false;

      // 2. Guardian 1 ký duyệt
      await familyHub.connect(guardian1).approveWithdrawal(1);
      let reqAfter1 = await familyHub.withdrawalRequests(1);
      expect(reqAfter1.approvalsCount).to.equal(1);
      expect(reqAfter1.executed).to.be.false;

      // Ký trùng lặp sẽ bị chặn
      await expect(
        familyHub.connect(guardian1).approveWithdrawal(1)
      ).to.be.revertedWithCustomError(familyHub, "AlreadyApproved");

      // 3. Guardian 2 ký duyệt (đạt 2/3 chữ ký) -> Tự động giải ngân
      const balanceBefore = await ethers.provider.getBalance(recipient);
      await familyHub.connect(guardian2).approveWithdrawal(1);

      const reqAfter2 = await familyHub.withdrawalRequests(1);
      expect(reqAfter2.approvalsCount).to.equal(2);
      expect(reqAfter2.executed).to.be.true;

      const balanceAfter = await ethers.provider.getBalance(recipient);
      expect(balanceAfter - balanceBefore).to.equal(withdrawAmount);
    });

    it("Chặn người lạ hoặc Guardian của Hũ khác ký duyệt", async function () {
      await familyHub.connect(grandparent).requestLargeWithdrawal(
        1,
        ethers.parseEther("80"),
        "Mua sắm thuốc"
      );

      // outsider không thuộc guardians của Hũ 1
      await expect(
        familyHub.connect(outsider).approveWithdrawal(1)
      ).to.be.revertedWithCustomError(familyHub, "NotVaultGuardian");
    });

    it("Yêu cầu rút tiền quá hạn sau 48h sẽ bị từ chối ký duyệt", async function () {
      await familyHub.connect(grandparent).requestLargeWithdrawal(
        1,
        ethers.parseEther("80"),
        "Chi phí viện phí"
      );

      // Tua thời gian qua 48h + 1s
      await time.increase(48 * 3600 + 1);

      await expect(
        familyHub.connect(guardian1).approveWithdrawal(1)
      ).to.be.revertedWithCustomError(familyHub, "RequestExpired");
    });
  });

  // =================================================================
  // 5. CHORE-TO-EARN CHO HŨ MILESTONE
  // =================================================================
  describe("5. Chương trình Chore-to-Earn gắn với Hũ MILESTONE", function () {
    beforeEach(async function () {
      // Nạp 100 AVAX vào Hũ 2 (Lì xì & Việc nhà Bé Na)
      await familyHub.connect(admin).depositToVault(2, { value: ethers.parseEther("100") });
    });

    it("Chu trình chuẩn: Tạo việc nhà -> Con nộp báo cáo -> Bố mẹ duyệt thưởng", async function () {
      const reward = ethers.parseEther("5");

      // 1. Admin tạo việc nhà
      await familyHub.connect(admin).createChore(2, "Đạt điểm 10 kiểm tra Toán", reward, kid.address);
      const task = await familyHub.tasks(1);
      expect(task.vaultId).to.equal(2);
      expect(task.rewardAmount).to.equal(reward);
      expect(task.assignee).to.equal(kid.address);
      expect(task.isCompleted).to.be.false;

      // 2. Người khác không thể báo cáo thay con
      await expect(
        familyHub.connect(outsider).claimChoreCompleted(1)
      ).to.be.revertedWithCustomError(familyHub, "AssigneeMismatch");

      // Con báo cáo hoàn thành
      await familyHub.connect(kid).claimChoreCompleted(1);
      const taskCompleted = await familyHub.tasks(1);
      expect(taskCompleted.isCompleted).to.be.true;

      // 3. Bố mẹ duyệt thưởng
      const balanceBefore = await ethers.provider.getBalance(kid.address);
      await familyHub.connect(admin).verifyAndRewardChore(1);
      const balanceAfter = await ethers.provider.getBalance(kid.address);

      expect(balanceAfter - balanceBefore).to.equal(reward);

      const taskRewarded = await familyHub.tasks(1);
      expect(taskRewarded.isRewarded).to.be.true;

      // Thưởng lần 2 sẽ bị từ chối
      await expect(
        familyHub.connect(admin).verifyAndRewardChore(1)
      ).to.be.revertedWithCustomError(familyHub, "TaskAlreadyRewarded");
    });
  });

  // =================================================================
  // 6. SOCIAL RECOVERY THEO HŨ
  // =================================================================
  describe("6. Khôi phục ví xã hội theo từng Hũ (Social Recovery)", function () {
    it("Khôi phục ví Beneficiary của Hũ 1 khi mất máy với đủ chữ ký Guardians", async function () {
      // Guardian 1 ký xác nhận đổi ví grandparent -> newWallet
      await familyHub.connect(guardian1).recoverMemberWallet(1, grandparent.address, newWallet.address);
      expect(await familyHub.isVaultBeneficiary(1, grandparent.address)).to.be.true;

      // Guardian 2 ký xác nhận (đạt 2/3 chữ ký) -> Thực thi
      await familyHub.connect(guardian2).recoverMemberWallet(1, grandparent.address, newWallet.address);

      // Ví cũ bị xóa quyền, ví mới được cấp quyền
      expect(await familyHub.isVaultBeneficiary(1, grandparent.address)).to.be.false;
      expect(await familyHub.isVaultBeneficiary(1, newWallet.address)).to.be.true;
      expect(await familyHub.isAllowlisted(newWallet.address)).to.be.true;
    });
  });

  // =================================================================
  // 7. TÍCH LŨY LỢI SUẤT THỰC TẾ TRÊN C-CHAIN (FAMILY YIELD VAULT)
  // =================================================================
  describe("7. Tích lũy lợi suất thực tế trên Avalanche Fuji C-Chain (8% APY)", function () {
    it("Tính toán chính xác lãi suất 8% APY dựa trên block.timestamp thực tế theo vaultId", async function () {
      const depositAmount = ethers.parseEther("100");
      // Nạp trực tiếp 100 AVAX vào Hũ 1 trên YieldVault
      await yieldVault.connect(admin).depositPrincipal(1, { value: depositAmount });

      expect(await yieldVault.vaultPrincipals(1)).to.equal(depositAmount);

      // Tua thời gian 1 năm thực tế (365 ngày)
      await time.increase(365 * 24 * 3600);

      // 8% APY của 100 AVAX sau 1 năm là 8 AVAX
      const yieldAccrued = await yieldVault.calculateTotalYield(1);
      const expectedYield = ethers.parseEther("8");
      expect(yieldAccrued).to.be.closeTo(expectedYield, ethers.parseEther("0.01"));

      // Tái đầu tư lợi nhuận (Compound Yield) cộng dồn lãi vào vốn gốc
      await yieldVault.connect(admin).compoundYield(1);
      const newPrincipal = await yieldVault.vaultPrincipals(1);
      expect(newPrincipal).to.be.closeTo(ethers.parseEther("108"), ethers.parseEther("0.01"));
    });
  });

  // =================================================================
  // 8. HŨ DÒNG TIỀN HỢP NHẤT: RÚT LỚN VƯỢT ĐỆM VẪN GIẢI NGÂN TRỌN VẸN
  // =================================================================
  describe("8. Unified Cashflow Solvency (Rút tiền vượt đệm L1 giải ngân trọn vẹn)", function () {
    it("Rút 70 AVAX khi đệm L1 chỉ có 10 AVAX: Nhận đủ 70 AVAX tại L1 và trừ 60 AVAX C-Chain", async function () {
      // Nạp 100 AVAX vào Hũ 1 (10 AVAX đệm L1, 90 AVAX C-Chain)
      await familyHub.connect(admin).depositToVault(1, { value: ethers.parseEther("100") });

      const vaultBefore = await familyHub.getVault(1);
      expect(vaultBefore.l1BufferBalance).to.equal(ethers.parseEther("10"));
      expect(vaultBefore.cChainPrincipal).to.equal(ethers.parseEther("90"));

      // Grandparent tạo yêu cầu rút 70 AVAX (vượt quá 10 AVAX đệm L1)
      await familyHub.connect(grandparent).requestLargeWithdrawal(1, ethers.parseEther("70"), "Phẫu thuật y tế");

      const balanceBefore = await ethers.provider.getBalance(grandparent.address);
      // Guardian 1 & Guardian 2 duyệt
      await familyHub.connect(guardian1).approveWithdrawal(1);
      await familyHub.connect(guardian2).approveWithdrawal(1);

      const balanceAfter = await ethers.provider.getBalance(grandparent.address);
      // Nhận trọn vẹn 70 AVAX tại L1
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("70"));

      // Trạng thái Hũ: đệm L1 về 0, C-Chain còn 30 AVAX, tổng số dư còn 30 AVAX
      const vaultAfter = await familyHub.getVault(1);
      expect(vaultAfter.l1BufferBalance).to.equal(0);
      expect(vaultAfter.cChainPrincipal).to.equal(ethers.parseEther("30"));
      expect(vaultAfter.totalBalance).to.equal(ethers.parseEther("30"));
    });

    it("Chore-to-Earn: Thưởng nhiệm vụ thành công ngay cả khi đệm L1 cạn kiệt (fallback an toàn)", async function () {
      // Tạo Hũ MILESTONE 5 với 0% đệm L1 (100% C-Chain)
      const vaultId = await familyHub.connect(admin).createCustomVault.staticCall(
        "Hũ Cột Mốc 100% C-Chain",
        MILESTONE,
        0, // 0% L1 buffer
        0,
        1,
        [admin.address],
        [kid.address]
      );
      await familyHub.connect(admin).createCustomVault(
        "Hũ Cột Mốc 100% C-Chain",
        MILESTONE,
        0,
        0,
        1,
        [admin.address],
        [kid.address]
      );

      // Nạp 50 AVAX (đệm L1 = 0, C-Chain = 50)
      await familyHub.connect(admin).depositToVault(vaultId, { value: ethers.parseEther("50") });

      // Admin tạo chore thưởng 10 AVAX
      const taskId = await familyHub.connect(admin).createChore.staticCall(vaultId, "Luyện thi Olympic", ethers.parseEther("10"), kid.address);
      await familyHub.connect(admin).createChore(vaultId, "Luyện thi Olympic", ethers.parseEther("10"), kid.address);

      // Kid báo cáo hoàn thành
      await familyHub.connect(kid).claimChoreCompleted(taskId);

      // Admin duyệt thưởng: Dù đệm L1 = 0, hệ thống tự trích từ Escrow/C-Chain trả đủ 10 AVAX cho con
      const balanceBefore = await ethers.provider.getBalance(kid.address);
      await familyHub.connect(admin).verifyAndRewardChore(taskId);
      const balanceAfter = await ethers.provider.getBalance(kid.address);

      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("10"));
    });
  });

  // =================================================================
  // 9. CHÍNH SÁCH ROSCA: GÓP VỐN VÀ GIẢI NGÂN XOAY VÒNG THEO KỲ
  // =================================================================
  describe("9. Chính sách ROSCA (Góp vốn họ hụi & giải ngân xoay vòng theo kỳ)", function () {
    let roscaVaultId: bigint;
    const roundDuration = 7 * 24 * 3600; // 7 ngày
    const contribution = ethers.parseEther("10"); // 10 AVAX / người

    beforeEach(async function () {
      roscaVaultId = await familyHub.connect(admin).createAdvancedVault.staticCall(
        "Họ Hụi Bốn Mùa",
        ROSCA,
        0, // 100% sinh lời
        0,
        2,
        [guardian1.address, guardian2.address],
        [guardian1.address, guardian2.address, guardian3.address], // 3 thành viên
        0,
        0,
        roundDuration,
        contribution
      );

      await familyHub.connect(admin).createAdvancedVault(
        "Họ Hụi Bốn Mùa",
        ROSCA,
        0,
        0,
        2,
        [guardian1.address, guardian2.address],
        [guardian1.address, guardian2.address, guardian3.address],
        0,
        0,
        roundDuration,
        contribution
      );

      // 3 thành viên mỗi người nạp 10 AVAX (tổng quỹ kỳ 1 = 30 AVAX)
      await familyHub.connect(guardian1).depositToVault(roscaVaultId, { value: contribution });
      await familyHub.connect(guardian2).depositToVault(roscaVaultId, { value: contribution });
      await familyHub.connect(guardian3).depositToVault(roscaVaultId, { value: contribution });
    });

    it("Chặn giải ngân nếu chưa tới hạn chu kỳ (7 ngày)", async function () {
      await expect(
        familyHub.payoutRoscaRound(roscaVaultId)
      ).to.be.revertedWithCustomError(familyHub, "RoscaRoundNotReady");
    });

    it("Đến hạn chu kỳ: Giải ngân 30 AVAX cho thành viên đầu tiên (guardian1) và sang kỳ 2", async function () {
      // Tua qua 7 ngày
      await time.increase(roundDuration + 1);

      const balanceBefore = await ethers.provider.getBalance(guardian1.address);
      await familyHub.payoutRoscaRound(roscaVaultId);
      const balanceAfter = await ethers.provider.getBalance(guardian1.address);

      // Guardian 1 nhận đủ 30 AVAX của kỳ 1
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("30"));

      // Hũ cập nhật sang round 1 (chu kỳ tiếp theo thuộc về guardian2)
      const vault = await familyHub.getVault(roscaVaultId);
      expect(vault.roscaCurrentRound).to.equal(1);
    });
  });

  // =================================================================
  // 10. CHÍNH SÁCH SHARED_GOAL: MỤC TIÊU CHUNG & KHÓA RÚT TIỀN
  // =================================================================
  describe("10. Chính sách SHARED_GOAL (Khóa giải ngân cho tới khi đạt mục tiêu)", function () {
    let goalVaultId: bigint;
    const targetAmount = ethers.parseEther("100");

    beforeEach(async function () {
      const deadline = (await time.latest()) + 30 * 24 * 3600;
      goalVaultId = await familyHub.connect(admin).createAdvancedVault.staticCall(
        "Quỹ Du Lịch Xuyên Việt",
        SHARED_GOAL,
        2000, // 20% đệm L1
        0,
        2,
        [guardian1.address, guardian2.address],
        [grandparent.address],
        targetAmount, // 100 AVAX
        deadline,
        0,
        0
      );

      await familyHub.connect(admin).createAdvancedVault(
        "Quỹ Du Lịch Xuyên Việt",
        SHARED_GOAL,
        2000,
        0,
        2,
        [guardian1.address, guardian2.address],
        [grandparent.address],
        targetAmount,
        deadline,
        0,
        0
      );
    });

    it("Chặn tạo phiếu rút tiền nếu chưa gom đủ 100 AVAX mục tiêu", async function () {
      // Mới nạp 40 AVAX (< 100 AVAX)
      await familyHub.connect(admin).depositToVault(goalVaultId, { value: ethers.parseEther("40") });

      await expect(
        familyHub.connect(grandparent).requestLargeWithdrawal(goalVaultId, ethers.parseEther("30"), "Đi du lịch")
      ).to.be.revertedWithCustomError(familyHub, "GoalNotReached");
    });

    it("Nạp đủ 100 AVAX mục tiêu -> Mở khóa tạo yêu cầu và giải ngân thành công", async function () {
      // Nạp thêm 100 AVAX (tổng 100 AVAX)
      await familyHub.connect(admin).depositToVault(goalVaultId, { value: ethers.parseEther("100") });

      // Tạo yêu cầu rút thành công
      await familyHub.connect(grandparent).requestLargeWithdrawal(goalVaultId, ethers.parseEther("100"), "Đi du lịch");

      // 2 Guardians duyệt -> giải ngân thành công
      const balanceBefore = await ethers.provider.getBalance(grandparent.address);
      await familyHub.connect(guardian1).approveWithdrawal(1);
      await familyHub.connect(guardian2).approveWithdrawal(1);
      const balanceAfter = await ethers.provider.getBalance(grandparent.address);

      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("100"));
    });
  });

  // =================================================================
  // 11. BẢO MẬT & TẠM DỪNG KHẨN CẤP (PAUSABLE & CREATOR RECOVERY)
  // =================================================================
  describe("11. Cơ chế Tạm Dừng Khẩn Cấp (Pausable) & Chuyển giao Creator", function () {
    it("Admin kích hoạt Pause: Đóng băng nạp và rút tiền; Unpause mở khóa lại bình thường", async function () {
      await familyHub.connect(admin).pause();

      // Nạp tiền bị chặn khi Pause
      await expect(
        familyHub.connect(admin).depositToVault(1, { value: ethers.parseEther("10") })
      ).to.be.revertedWithCustomError(familyHub, "EnforcedPause");

      // Unpause mở khóa lại
      await familyHub.connect(admin).unpause();
      await expect(
        familyHub.connect(admin).depositToVault(1, { value: ethers.parseEther("10") })
      ).to.not.be.reverted;
    });

    it("Social Recovery chuyển giao cả vai trò Creator cho ví mới", async function () {
      // Tạo một hũ mới do guardian3 làm creator
      const vId = await familyHub.connect(guardian3).createCustomVault.staticCall(
        "Hũ Riêng Guardian3",
        SHIELD,
        1000,
        0,
        2,
        [guardian1.address, guardian2.address],
        [guardian3.address]
      );
      await familyHub.connect(guardian3).createCustomVault(
        "Hũ Riêng Guardian3",
        SHIELD,
        1000,
        0,
        2,
        [guardian1.address, guardian2.address],
        [guardian3.address]
      );

      const vaultBefore = await familyHub.getVault(vId);
      expect(vaultBefore.creator).to.equal(guardian3.address);

      // Guardian 1 & 2 khôi phục ví guardian3 -> newWallet
      await familyHub.connect(guardian1).recoverMemberWallet(vId, guardian3.address, newWallet.address);
      await familyHub.connect(guardian2).recoverMemberWallet(vId, guardian3.address, newWallet.address);

      // Creator của hũ đã được đổi sang newWallet
      const vaultAfter = await familyHub.getVault(vId);
      expect(vaultAfter.creator).to.equal(newWallet.address);
    });
  });

  // =================================================================
  // 12. KIẾN TRÚC HŨ DÒNG TIỀN ĐỘC LẬP (VAULT CASHFLOW / TREASURY CORE)
  // =================================================================
  describe("12. Kiến Trúc Hũ Dòng Tiền Độc Lập (VaultCashflow / Treasury Core)", function () {
    let vaultCashflow: VaultCashflow;
    let modularVaultId: bigint;

    beforeEach(async function () {
      // Triển khai kho tiền chuyên biệt VaultCashflow
      const VaultCashflowFactory = await ethers.getContractFactory("VaultCashflow");
      vaultCashflow = (await VaultCashflowFactory.deploy(
        admin.address,
        await familyHub.getAddress(),
        await mockTeleporter.getAddress(),
        C_CHAIN_BLOCKCHAIN_ID,
        await yieldVault.getAddress()
      )) as VaultCashflow;
      await vaultCashflow.waitForDeployment();

      // Liên kết FamilyHub <-> VaultCashflow
      await familyHub.connect(admin).setVaultCashflow(await vaultCashflow.getAddress());

      // Tạo một Hũ tiền mới sau khi đã kết nối VaultCashflow
      const tx = await familyHub.connect(admin).createCustomVault(
        "Hũ Quỹ Gia Đình Modular",
        SHIELD,
        1000, // 10% L1 / 90% C-Chain
        ethers.parseEther("20"), // fast withdraw limit 20 AVAX
        2, // 2 chữ ký
        [guardian1.address, guardian2.address, guardian3.address],
        [grandparent.address]
      );
      const receipt = await tx.wait();
      // Lấy vaultId từ biến đếm
      modularVaultId = await familyHub.vaultCounter();
    });

    it("Kiểm tra phân quyền: Chỉ Controller hoặc Owner mới được phát lệnh giải ngân từ VaultCashflow", async function () {
      // Người ngoài gọi trực tiếp executeWithdrawal sẽ bị từ chối
      await expect(
        vaultCashflow.connect(outsider).executeWithdrawal(modularVaultId, outsider.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(vaultCashflow, "NotController");

      // Controller là FamilyHub hoặc Owner
      expect(await vaultCashflow.controller()).to.equal(await familyHub.getAddress());
      expect(await vaultCashflow.owner()).to.equal(admin.address);
    });

    it("Nạp tiền ủy thác qua FamilyHub: Tự động tách đệm L1/C-Chain và cập nhật sổ cái VaultCashflow", async function () {
      // Nạp 100 AVAX vào Hũ thông qua FamilyHub
      await familyHub.connect(admin).depositToVault(modularVaultId, { value: ethers.parseEther("100") });

      // Kiểm tra số dư trên VaultCashflow
      const ledger = await vaultCashflow.getVaultLedger(modularVaultId);
      expect(ledger.totalBalance).to.equal(ethers.parseEther("100"));
      expect(ledger.l1BufferBalance).to.equal(ethers.parseEther("10")); // 10%
      expect(ledger.cChainPrincipal).to.equal(ethers.parseEther("90")); // 90%

      // Kiểm tra FamilyHub đọc qua VaultCashflow đồng bộ 100%
      const overview = await familyHub.getVaultOverview(modularVaultId);
      expect(overview.total).to.equal(ethers.parseEther("100"));
      expect(overview.l1Buffer).to.equal(ethers.parseEther("10"));
      expect(overview.cChainPrincipal).to.equal(ethers.parseEther("90"));
    });

    it("Rút tiền nhanh qua FamilyHub: VaultCashflow giải ngân Native AVAX trực tiếp cho người nhận", async function () {
      // Nạp 100 AVAX
      await familyHub.connect(admin).depositToVault(modularVaultId, { value: ethers.parseEther("100") });

      // Beneficiary (grandparent) rút nhanh 5 AVAX (<= limit 20 AVAX)
      const withdrawAmount = ethers.parseEther("5");
      const balanceBefore = await ethers.provider.getBalance(grandparent.address);
      const tx = await familyHub.connect(grandparent).fastWithdraw(modularVaultId, withdrawAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(grandparent.address);

      // Grandparent nhận đúng 5 AVAX (sau khi bù gas mạng local)
      expect(balanceAfter + gasUsed - balanceBefore).to.equal(withdrawAmount);

      // Đệm L1 trên VaultCashflow giảm còn 5 AVAX
      const ledger = await vaultCashflow.getVaultLedger(modularVaultId);
      expect(ledger.l1BufferBalance).to.equal(ethers.parseEther("5"));
      expect(ledger.totalBalance).to.equal(ethers.parseEther("95"));
    });

    it("Rút lớn Multisig vượt đệm L1: VaultCashflow rút cạn đệm L1 và trừ C-Chain principal, người nhận nhận trọn vẹn", async function () {
      // Nạp 100 AVAX (L1 buffer = 10 AVAX, C-Chain = 90 AVAX)
      await familyHub.connect(admin).depositToVault(modularVaultId, { value: ethers.parseEther("100") });

      // Yêu cầu rút lớn 40 AVAX (> limit 20 AVAX, và > đệm L1 10 AVAX)
      await familyHub.connect(grandparent).requestLargeWithdrawal(
        modularVaultId,
        ethers.parseEther("40"),
        "Rút viện phí cấp cứu"
      );

      const reqId = await familyHub.requestCounter();

      // Guardian 1 và Guardian 2 ký duyệt
      const balanceBefore = await ethers.provider.getBalance(grandparent.address);
      await familyHub.connect(guardian1).approveWithdrawal(reqId);
      await familyHub.connect(guardian2).approveWithdrawal(reqId);
      const balanceAfter = await ethers.provider.getBalance(grandparent.address);

      // Grandparent nhận trọn vẹn 40 AVAX
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("40"));

      // Sổ cái VaultCashflow: Đệm L1 cạn = 0, C-Chain principal giảm 30 AVAX (còn 60 AVAX), Tổng còn 60 AVAX
      const ledger = await vaultCashflow.getVaultLedger(modularVaultId);
      expect(ledger.l1BufferBalance).to.equal(0n);
      expect(ledger.cChainPrincipal).to.equal(ethers.parseEther("60"));
      expect(ledger.totalBalance).to.equal(ethers.parseEther("60"));
    });

    it("Nạp tiền trực tiếp vào VaultCashflow: Tự động phân bổ và FamilyHub view phản ánh ngay lập tức", async function () {
      // Nạp thẳng vào VaultCashflow mà không qua FamilyHub
      await vaultCashflow.connect(admin).deposit(modularVaultId, admin.address, {
        value: ethers.parseEther("50"),
      });

      const overview = await familyHub.getVaultOverview(modularVaultId);
      expect(overview.total).to.equal(ethers.parseEther("50"));
      expect(overview.l1Buffer).to.equal(ethers.parseEther("5")); // 10%
      expect(overview.cChainPrincipal).to.equal(ethers.parseEther("45")); // 90%
    });

    it("Tạm dừng khẩn cấp trên VaultCashflow: Chặn đứng nạp và rút tiền", async function () {
      await vaultCashflow.connect(admin).pause();

      // Nạp tiền vào VaultCashflow bị chặn
      await expect(
        vaultCashflow.connect(admin).deposit(modularVaultId, admin.address, { value: ethers.parseEther("10") })
      ).to.be.revertedWithCustomError(vaultCashflow, "EnforcedPause");

      // Unpause mở lại
      await vaultCashflow.connect(admin).unpause();
      await expect(
        vaultCashflow.connect(admin).deposit(modularVaultId, admin.address, { value: ethers.parseEther("10") })
      ).to.not.be.reverted;
    });
  });
});
