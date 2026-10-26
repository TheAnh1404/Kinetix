import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {
  FamilyHub,
  FamilyYieldVault,
  MockTeleporterMessenger,
} from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Kinetix - Family Finance OS on Avalanche", function () {
  let admin: HardhatEthersSigner;
  let guardian1: HardhatEthersSigner;
  let guardian2: HardhatEthersSigner;
  let guardian3: HardhatEthersSigner;
  let grandparent: HardhatEthersSigner;
  let kid: HardhatEthersSigner;
  let outsider: HardhatEthersSigner;

  let mockTeleporter: MockTeleporterMessenger;
  let familyHub: FamilyHub;
  let yieldVault: FamilyYieldVault;

  const C_CHAIN_BLOCKCHAIN_ID = ethers.keccak256(ethers.toUtf8Bytes("Avalanche-Fuji-C-Chain"));

  beforeEach(async function () {
    [admin, guardian1, guardian2, guardian3, grandparent, kid, outsider] =
      await ethers.getSigners();

    // 1. Triển khai Mock Teleporter Messenger
    const MockTeleporterFactory = await ethers.getContractFactory("MockTeleporterMessenger");
    mockTeleporter = (await MockTeleporterFactory.deploy()) as MockTeleporterMessenger;
    await mockTeleporter.waitForDeployment();

    // 2. Triển khai FamilyYieldVault trên C-Chain
    const YieldVaultFactory = await ethers.getContractFactory("FamilyYieldVault");
    yieldVault = (await YieldVaultFactory.deploy(
      await mockTeleporter.getAddress(),
      ethers.ZeroHash, // Sẽ cập nhật sau khi có FamilyHub
      ethers.ZeroAddress
    )) as FamilyYieldVault;
    await yieldVault.waitForDeployment();

    // 3. Triển khai FamilyHub trên Family L1
    const initialGuardians = [guardian1.address, guardian2.address, guardian3.address];
    const FamilyHubFactory = await ethers.getContractFactory("FamilyHub");
    familyHub = (await FamilyHubFactory.deploy(
      admin.address,
      initialGuardians,
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

    // 5. Đăng ký ông bà và con nhỏ làm thành viên gia đình
    await familyHub.setMemberStatus(grandparent.address, true);
    await familyHub.setMemberStatus(kid.address, true);
  });

  // =================================================================
  // 1. KIỂM THỬ KHỞI TẠO & PHÂN QUYỀN GIA ĐÌNH
  // =================================================================
  describe("1. Phân quyền và Quản lý thành viên", function () {
    it("Khởi tạo đúng Admin và 3 Guardians ban đầu", async function () {
      expect(await familyHub.familyAdmin()).to.equal(admin.address);
      expect(await familyHub.isGuardian(guardian1.address)).to.be.true;
      expect(await familyHub.isGuardian(guardian2.address)).to.be.true;
      expect(await familyHub.isGuardian(guardian3.address)).to.be.true;
      expect(await familyHub.isGuardian(outsider.address)).to.be.false;

      const guardians = await familyHub.getGuardians();
      expect(guardians.length).to.equal(3);
    });

    it("Từ chối khởi tạo nếu danh sách Guardians ít hơn 3 người", async function () {
      const FamilyHubFactory = await ethers.getContractFactory("FamilyHub");
      await expect(
        FamilyHubFactory.deploy(
          admin.address,
          [guardian1.address, guardian2.address],
          await mockTeleporter.getAddress(),
          C_CHAIN_BLOCKCHAIN_ID,
          await yieldVault.getAddress()
        )
      ).to.be.revertedWithCustomError(familyHub, "MinimumGuardiansRequired");
    });

    it("Chỉ Admin mới có quyền cập nhật thành viên", async function () {
      await expect(
        familyHub.connect(outsider).setMemberStatus(outsider.address, true)
      ).to.be.revertedWithCustomError(familyHub, "NotFamilyAdmin");

      await familyHub.connect(admin).setMemberStatus(outsider.address, true);
      expect(await familyHub.isFamilyMember(outsider.address)).to.be.true;
    });

    it("Quy trình Social Recovery: Khôi phục ví khi mất máy với 2/3 chữ ký Guardians", async function () {
      const newGrandparentWallet = outsider;

      // Guardian 1 đề xuất đổi ví cũ sang ví mới
      await familyHub
        .connect(guardian1)
        .recoverMemberWallet(grandparent.address, newGrandparentWallet.address);

      // Chưa đủ 2 chữ ký -> ví mới chưa được cấp quyền
      expect(await familyHub.isFamilyMember(newGrandparentWallet.address)).to.be.false;

      // Guardian 1 cố tình ký duyệt lần 2 -> Revert AlreadyApproved
      await expect(
        familyHub
          .connect(guardian1)
          .recoverMemberWallet(grandparent.address, newGrandparentWallet.address)
      ).to.be.revertedWithCustomError(familyHub, "AlreadyApproved");

      // Guardian 2 ký duyệt -> Đủ 2/3 chữ ký -> Tự động kích hoạt đổi ví
      await expect(
        familyHub
          .connect(guardian2)
          .recoverMemberWallet(grandparent.address, newGrandparentWallet.address)
      )
        .to.emit(familyHub, "WalletRecovered")
        .withArgs(grandparent.address, newGrandparentWallet.address);

      expect(await familyHub.isFamilyMember(grandparent.address)).to.be.false;
      expect(await familyHub.isFamilyMember(newGrandparentWallet.address)).to.be.true;
    });
  });

  // =================================================================
  // 2. KIỂM THỬ NẠP TIỀN & ĐỆM THANH KHOẢN 10/90
  // =================================================================
  describe("2. Cơ chế Đệm thanh khoản 10/90 (Fractional Buffer)", function () {
    it("Phân bổ chính xác 10% tại L1 và 90% gửi C-Chain không mất mát số dư", async function () {
      const depositAmount = ethers.parseEther("100"); // 100 AVAX

      // Nạp vào Hũ Hưu Trí (RetirementShield = 0)
      await expect(
        familyHub.connect(admin).depositToVault(0, { value: depositAmount })
      )
        .to.emit(familyHub, "FundsDeposited")
        .withArgs(
          0,
          admin.address,
          depositAmount,
          ethers.parseEther("10"), // 10% giữ L1
          ethers.parseEther("90")  // 90% gửi C-Chain
        );

      const [localBuffer, remoteYield, total] = await familyHub.getVaultOverview(0);
      expect(localBuffer).to.equal(ethers.parseEther("10"));
      expect(remoteYield).to.equal(ethers.parseEther("90"));
      expect(total).to.equal(depositAmount);

      // Kiểm tra không làm tròn số học với số lẻ (ví dụ 333 wei)
      const oddAmount = 333n;
      await familyHub.connect(admin).depositToVault(1, { value: oddAmount });
      const [local1, remote1, total1] = await familyHub.getVaultOverview(1);
      expect(local1 + remote1).to.equal(oddAmount);
      expect(total1).to.equal(oddAmount);
    });

    it("Từ chối giao dịch nạp 0 giá trị", async function () {
      await expect(
        familyHub.connect(admin).depositToVault(0, { value: 0 })
      ).to.be.revertedWithCustomError(familyHub, "ZeroAmount");
    });
  });

  // =================================================================
  // 3. KIỂM THỬ RÚT TIỀN NHANH DƯỚI HẠN MỨC (FAST WITHDRAWAL)
  // =================================================================
  describe("3. Rút tiền nhanh chống lừa đảo (Fast Withdrawal)", function () {
    beforeEach(async function () {
      // Nạp 200 AVAX vào Hũ Hưu Trí -> 20 AVAX ở buffer L1
      await familyHub.connect(admin).depositToVault(0, { value: ethers.parseEther("200") });
    });

    it("Ông bà rút tiền nhỏ (<= 50 AVAX) giải ngân tức thì từ bộ đệm L1", async function () {
      const withdrawAmount = ethers.parseEther("15"); // 15 AVAX <= 20 AVAX buffer và <= 50 limit
      const initialBalance = await ethers.provider.getBalance(grandparent.address);

      await expect(
        familyHub.connect(grandparent).fastWithdraw(0, withdrawAmount, grandparent.address)
      )
        .to.emit(familyHub, "FastWithdrawalExecuted")
        .withArgs(0, grandparent.address, withdrawAmount);

      const finalBalance = await ethers.provider.getBalance(grandparent.address);
      expect(finalBalance).to.be.greaterThan(initialBalance);

      const [localBuffer] = await familyHub.getVaultOverview(0);
      expect(localBuffer).to.equal(ethers.parseEther("5"));
    });

    it("Chặn ngay nếu rút vượt hạn mức nhanh an toàn (> 50 AVAX)", async function () {
      const overLimit = ethers.parseEther("55");
      await expect(
        familyHub.connect(grandparent).fastWithdraw(0, overLimit, grandparent.address)
      ).to.be.revertedWithCustomError(familyHub, "ExceedsFastLimit");
    });

    it("Chặn nếu số dư bộ đệm tại chỗ không đủ", async function () {
      // Bộ đệm chỉ còn 20 AVAX, thử rút 25 AVAX
      const overBuffer = ethers.parseEther("25");
      await expect(
        familyHub.connect(grandparent).fastWithdraw(0, overBuffer, grandparent.address)
      ).to.be.revertedWithCustomError(familyHub, "InsufficientLocalBuffer");
    });
  });

  // =================================================================
  // 4. KIỂM THỬ ĐA CHỮ KÝ PHÂN TẦNG CHO KHOẢN RÚT LỚN (MULTISIG)
  // =================================================================
  describe("4. Đa chữ ký phân tầng (Tiered Multisig 2/3 Guardians)", function () {
    beforeEach(async function () {
      // Nạp 500 AVAX -> 50 AVAX ở L1, 450 AVAX ở C-Chain
      await familyHub.connect(admin).depositToVault(0, { value: ethers.parseEther("500") });
    });

    it("Quy trình hoàn chỉnh: Tạo yêu cầu lớn -> Thu thập đủ 2 chữ ký -> Tự động giải ngân", async function () {
      const largeAmount = ethers.parseEther("40"); // Yêu cầu rút 40 AVAX từ hũ hưu trí
      const recipient = grandparent.address;

      // 1. Ông/bà tạo yêu cầu rút tiền lớn
      const tx = await familyHub
        .connect(grandparent)
        .requestLargeWithdrawal(0, largeAmount, recipient, "Viện phí định kỳ");
      
      await expect(tx)
        .to.emit(familyHub, "WithdrawalRequested");

      const req = await familyHub.withdrawalRequests(1);
      expect(req.approvalsCount).to.equal(0);
      expect(req.executed).to.be.false;

      // 2. Con trưởng (Guardian 1) ký duyệt
      await expect(familyHub.connect(guardian1).approveWithdrawal(1))
        .to.emit(familyHub, "WithdrawalApproved")
        .withArgs(1, guardian1.address, 1);

      // Chưa đủ 2 chữ ký nên chưa giải ngân
      let reqAfter1 = await familyHub.withdrawalRequests(1);
      expect(reqAfter1.approvalsCount).to.equal(1);
      expect(reqAfter1.executed).to.be.false;

      // Guardian 1 ký lần nữa -> Revert AlreadyApproved
      await expect(
        familyHub.connect(guardian1).approveWithdrawal(1)
      ).to.be.revertedWithCustomError(familyHub, "AlreadyApproved");

      // Kẻ ngoài cố tình ký -> Revert NotGuardian
      await expect(
        familyHub.connect(outsider).approveWithdrawal(1)
      ).to.be.revertedWithCustomError(familyHub, "NotGuardian");

      // 3. Con thứ (Guardian 2) ký duyệt -> Đủ 2/3 chữ ký -> Tự động giải ngân
      const recipientBalBefore = await ethers.provider.getBalance(recipient);
      await expect(familyHub.connect(guardian2).approveWithdrawal(1))
        .to.emit(familyHub, "WithdrawalExecuted")
        .withArgs(1, recipient, largeAmount, true);

      const recipientBalAfter = await ethers.provider.getBalance(recipient);
      expect(recipientBalAfter - recipientBalBefore).to.equal(largeAmount);

      const reqAfter2 = await familyHub.withdrawalRequests(1);
      expect(reqAfter2.executed).to.be.true;

      // Đã giải ngân rồi thì không được duyệt tiếp
      await expect(
        familyHub.connect(guardian3).approveWithdrawal(1)
      ).to.be.revertedWithCustomError(familyHub, "RequestAlreadyExecuted");
    });

    it("Yêu cầu rút tiền quá hạn (sau 48h) sẽ bị từ chối ký duyệt", async function () {
      await familyHub
        .connect(grandparent)
        .requestLargeWithdrawal(0, ethers.parseEther("30"), grandparent.address, "Mua sắm");

      // Tăng thời gian thêm 49 giờ
      await time.increase(49 * 3600);

      await expect(
        familyHub.connect(guardian1).approveWithdrawal(1)
      ).to.be.revertedWithCustomError(familyHub, "RequestExpired");
    });
  });

  // =================================================================
  // 5. KIỂM THỬ GIÁO DỤC TÀI CHÍNH TRẺ EM (CHORE-TO-EARN)
  // =================================================================
  describe("5. Chương trình Chore-to-Earn cho con trẻ", function () {
    beforeEach(async function () {
      // Nạp tiền vào hũ KidsSavings (VaultType 1)
      await familyHub.connect(admin).depositToVault(1, { value: ethers.parseEther("50") });
    });

    it("Chu trình chuẩn: Tạo việc nhà -> Con nộp báo cáo -> Bố mẹ duyệt trả thưởng", async function () {
      const reward = ethers.parseEther("2");

      // 1. Bố mẹ tạo nhiệm vụ
      await expect(
        familyHub.connect(admin).createChore("Rửa bát và dọn bàn ăn", reward, kid.address)
      )
        .to.emit(familyHub, "ChoreCreated")
        .withArgs(1, "Rửa bát và dọn bàn ăn", reward, kid.address);

      // Người khác mạo danh nộp -> Revert KidAddressMismatch
      await expect(
        familyHub.connect(outsider).claimChoreCompleted(1)
      ).to.be.revertedWithCustomError(familyHub, "KidAddressMismatch");

      // 2. Con báo cáo hoàn thành
      await expect(familyHub.connect(kid).claimChoreCompleted(1))
        .to.emit(familyHub, "ChoreClaimed")
        .withArgs(1, kid.address);

      // 3. Bố mẹ xác nhận và trả thưởng
      const kidBalBefore = await ethers.provider.getBalance(kid.address);
      await expect(familyHub.connect(admin).verifyAndRewardChore(1))
        .to.emit(familyHub, "ChoreRewarded")
        .withArgs(1, kid.address, reward);

      const kidBalAfter = await ethers.provider.getBalance(kid.address);
      expect(kidBalAfter - kidBalBefore).to.equal(reward);

      // Thử trả thưởng lần 2 -> Revert TaskAlreadyRewarded
      await expect(
        familyHub.connect(admin).verifyAndRewardChore(1)
      ).to.be.revertedWithCustomError(familyHub, "TaskAlreadyRewarded");
    });
  });

  // =================================================================
  // 6. KIỂM THỬ SINH LỜI THỰC TẾ TRÊN FUJI C-CHAIN (REAL YIELD)
  // =================================================================
  describe("6. Tích lũy lợi suất thực tế trên Avalanche Fuji C-Chain", function () {
    it("Tính toán chính xác lãi suất 8% APY dựa trên block.timestamp thực tế", async function () {
      const principal = ethers.parseEther("1000"); // 1000 AVAX

      // Nạp trực tiếp vào C-Chain Vault
      await yieldVault.connect(admin).depositPrincipal(admin.address, { value: principal });
      expect(await yieldVault.principalBalances(admin.address)).to.equal(principal);

      // Ngay tại thời điểm nạp, lợi suất bằng 0
      expect(await yieldVault.calculateAccruedYield(admin.address)).to.equal(0);

      // Sau nửa năm (182.5 ngày = 182.5 * 86400s): Lãi đạt ~4%
      await time.increase(182.5 * 24 * 3600);
      const yieldHalfYear = await yieldVault.calculateAccruedYield(admin.address);
      // Kỳ vọng: 1000 * 8% * 0.5 = 40 AVAX
      const expectedHalfYear = ethers.parseEther("40");
      expect(yieldHalfYear).to.be.closeTo(expectedHalfYear, ethers.parseEther("0.1"));

      // Sau tròn 1 năm (thêm 182.5 ngày): Lãi đạt đúng 8% = 80 AVAX
      await time.increase(182.5 * 24 * 3600);
      const yieldFullYear = await yieldVault.calculateAccruedYield(admin.address);
      const expectedFullYear = ethers.parseEther("80");
      expect(yieldFullYear).to.be.closeTo(expectedFullYear, ethers.parseEther("0.1"));
    });

    it("Cơ chế tái đầu tư lợi nhuận (Compound Yield) cộng dồn lãi vào vốn gốc", async function () {
      const principal = ethers.parseEther("1000");
      await yieldVault.connect(admin).depositPrincipal(admin.address, { value: principal });

      // Trôi qua 1 năm
      await time.increase(365 * 24 * 3600);

      // Thực hiện Compound
      await yieldVault.connect(admin).compoundYield(admin.address);

      // Vốn gốc mới phải tăng lên ~1080 AVAX
      const newPrincipal = await yieldVault.principalBalances(admin.address);
      expect(newPrincipal).to.be.closeTo(ethers.parseEther("1080"), ethers.parseEther("0.1"));
    });
  });
});
