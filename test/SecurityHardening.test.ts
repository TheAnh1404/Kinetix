import { expect } from "chai";
import { ethers } from "hardhat";
import {
  FamilyYieldVault,
  MockTeleporterMessenger,
} from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Kinetix Security Hardening & Audit Verification", function () {
  let owner: HardhatEthersSigner;
  let fakeHub: HardhatEthersSigner;
  let attacker: HardhatEthersSigner;
  let recipient: HardhatEthersSigner;
  let sponsor: HardhatEthersSigner;

  let mockTeleporter: MockTeleporterMessenger;
  let yieldVault: FamilyYieldVault;

  const VALID_L1_CHAIN_ID = ethers.keccak256(ethers.toUtf8Bytes("Family-L1"));
  const FAKE_CHAIN_ID = ethers.keccak256(ethers.toUtf8Bytes("Attacker-Subnet-666"));

  beforeEach(async function () {
    [owner, fakeHub, attacker, recipient, sponsor] = await ethers.getSigners();

    // 1. Triển khai Mock Teleporter Messenger
    const MockTeleporterFactory = await ethers.getContractFactory("MockTeleporterMessenger");
    mockTeleporter = (await MockTeleporterFactory.deploy()) as MockTeleporterMessenger;
    await mockTeleporter.waitForDeployment();

    // 2. Triển khai FamilyYieldVault với cấu hình hợp lệ
    const YieldVaultFactory = await ethers.getContractFactory("FamilyYieldVault");
    yieldVault = (await YieldVaultFactory.deploy(
      await mockTeleporter.getAddress(),
      VALID_L1_CHAIN_ID,
      fakeHub.address
    )) as FamilyYieldVault;
    await yieldVault.waitForDeployment();
  });

  // =================================================================
  // 1. KIỂM THỬ XÁC THỰC ORIGIN CHAIN ID (STRICT CHAIN ID CHECK)
  // =================================================================
  describe("1. Xác thực Origin Chain ID (Chống giả mạo chuỗi gốc)", function () {
    it("Từ chối tin nhắn nếu originChainID không khớp với familyL1BlockchainId", async function () {
      const depositPayload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint8", "uint256", "uint256", "address"],
        [0, 1, ethers.parseEther("100"), attacker.address] // DEPOSIT
      );

      // Kẻ tấn công phát tin qua Teleporter nhưng từ chain khác
      await expect(
        mockTeleporter.deliverMockMessage(
          await yieldVault.getAddress(),
          FAKE_CHAIN_ID,
          fakeHub.address,
          depositPayload
        )
      ).to.be.revertedWithCustomError(yieldVault, "InvalidChainID");
    });

    it("Chấp nhận tin nhắn khi originChainID khớp chính xác với familyL1BlockchainId", async function () {
      const depositPayload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint8", "uint256", "uint256", "address"],
        [0, 1, ethers.parseEther("50"), recipient.address] // DEPOSIT
      );

      await expect(
        mockTeleporter.deliverMockMessage(
          await yieldVault.getAddress(),
          VALID_L1_CHAIN_ID,
          fakeHub.address,
          depositPayload
        )
      ).to.emit(yieldVault, "PrincipalDeposited");

      expect(await yieldVault.vaultPrincipals(1)).to.equal(ethers.parseEther("50"));
    });
  });

  // =================================================================
  // 2. KIỂM THỬ XÁC THỰC CALLER & SENDER (CHỐNG BYPASS AUTHENTICATION)
  // =================================================================
  describe("2. Xác thực Caller & Origin Sender (Chống Bypass Authentication)", function () {
    it("Từ chối khi EOA hoặc hợp đồng lạ gọi trực tiếp receiveTeleporterMessage", async function () {
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint8", "uint256", "uint256", "address"],
        [0, 1, ethers.parseEther("10"), attacker.address]
      );

      await expect(
        yieldVault.connect(attacker).receiveTeleporterMessage(
          VALID_L1_CHAIN_ID,
          fakeHub.address,
          payload
        )
      ).to.be.revertedWithCustomError(yieldVault, "OnlyTeleporterMessenger");
    });

    it("Từ chối khi originSenderAddress không phải là FamilyHub đã cấu hình", async function () {
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint8", "uint256", "uint256", "address"],
        [0, 1, ethers.parseEther("10"), attacker.address]
      );

      await expect(
        mockTeleporter.deliverMockMessage(
          await yieldVault.getAddress(),
          VALID_L1_CHAIN_ID,
          attacker.address, // Sender giả mạo
          payload
        )
      ).to.be.revertedWithCustomError(yieldVault, "UnauthorizedSender");
    });

    it("Từ chối cấu hình Teleporter nếu truyền address(0) hoặc bytes32(0)", async function () {
      await expect(
        yieldVault.updateTeleporterConfig(ethers.ZeroAddress, VALID_L1_CHAIN_ID, fakeHub.address)
      ).to.be.revertedWithCustomError(yieldVault, "ZeroAddress");

      await expect(
        yieldVault.updateTeleporterConfig(await mockTeleporter.getAddress(), ethers.ZeroHash, fakeHub.address)
      ).to.be.revertedWithCustomError(yieldVault, "InvalidChainID");

      await expect(
        yieldVault.updateTeleporterConfig(await mockTeleporter.getAddress(), VALID_L1_CHAIN_ID, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(yieldVault, "ZeroAddress");
    });
  });

  // =================================================================
  // 3. KIỂM THỬ CEI & BẢO VỆ SỐ DƯ KHI THIẾU THANH KHOẢN (SILENT FAILURE FIX)
  // =================================================================
  describe("3. CEI & Bảo vệ Số dư khi Thiếu Thanh khoản (Sửa lỗi Silent Failure)", function () {
    it("Revert với InsufficientContractBalance nếu số dư hợp đồng không đủ chi trả, không trừ sổ cái", async function () {
      // 1. Ghi nhận nạp 100 AVAX vào sổ cái Hũ 1 (qua Teleporter message giả lập không gửi kèm AVAX)
      const depositPayload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint8", "uint256", "uint256", "address"],
        [0, 1, ethers.parseEther("100"), recipient.address]
      );
      await mockTeleporter.deliverMockMessage(
        await yieldVault.getAddress(),
        VALID_L1_CHAIN_ID,
        fakeHub.address,
        depositPayload
      );

      expect(await yieldVault.vaultPrincipals(1)).to.equal(ethers.parseEther("100"));
      expect(await ethers.provider.getBalance(await yieldVault.getAddress())).to.equal(0n);

      // 2. Yêu cầu rút 50 AVAX khi hợp đồng có balance = 0
      const withdrawPayload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint8", "uint256", "uint256", "address"],
        [1, 1, ethers.parseEther("50"), recipient.address] // WITHDRAW
      );

      // Phải REVERT thay vì âm thầm bỏ qua transfer
      await expect(
        mockTeleporter.deliverMockMessage(
          await yieldVault.getAddress(),
          VALID_L1_CHAIN_ID,
          fakeHub.address,
          withdrawPayload
        )
      ).to.be.revertedWithCustomError(yieldVault, "InsufficientContractBalance");

      // Số dư sổ cái Hũ 1 vẫn được bảo toàn nguyên vẹn 100 AVAX
      expect(await yieldVault.vaultPrincipals(1)).to.equal(ethers.parseEther("100"));
    });

    it("Giải ngân thành công và cập nhật đúng số dư khi hợp đồng có đủ thanh khoản", async function () {
      // Nạp 100 AVAX thực tế kèm Native AVAX vào contract
      await yieldVault.connect(recipient).depositPrincipal(1, { value: ethers.parseEther("100") });

      expect(await yieldVault.vaultPrincipals(1)).to.equal(ethers.parseEther("100"));
      expect(await ethers.provider.getBalance(await yieldVault.getAddress())).to.equal(ethers.parseEther("100"));

      // Rút 40 AVAX thông qua FamilyHub
      const withdrawPayload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint8", "uint256", "uint256", "address"],
        [1, 1, ethers.parseEther("40"), recipient.address]
      );

      const balBefore = await ethers.provider.getBalance(recipient.address);
      await mockTeleporter.deliverMockMessage(
        await yieldVault.getAddress(),
        VALID_L1_CHAIN_ID,
        fakeHub.address,
        withdrawPayload
      );
      const balAfter = await ethers.provider.getBalance(recipient.address);

      expect(balAfter - balBefore).to.equal(ethers.parseEther("40"));
      expect(await yieldVault.vaultPrincipals(1)).to.equal(ethers.parseEther("60"));
    });
  });

  // =================================================================
  // 4. KIỂM THỬ QUỸ DỰ TRỮ BẢO CHỨNG TRẢ LÃI (YIELD RESERVE POOL)
  // =================================================================
  describe("4. Quỹ Dự Trữ Lãi Suất (Yield Reserve Pool)", function () {
    it("Cho phép Sponsor nạp bảo chứng vào yieldReservePool qua depositYieldReserve", async function () {
      await expect(
        yieldVault.connect(sponsor).depositYieldReserve({ value: ethers.parseEther("10") })
      )
        .to.emit(yieldVault, "YieldReserveDeposited")
        .withArgs(sponsor.address, ethers.parseEther("10"));

      expect(await yieldVault.yieldReservePool()).to.equal(ethers.parseEther("10"));
    });

    it("Nạp trực tiếp qua receive() tự động cộng vào yieldReservePool", async function () {
      await sponsor.sendTransaction({
        to: await yieldVault.getAddress(),
        value: ethers.parseEther("5"),
      });

      expect(await yieldVault.yieldReservePool()).to.equal(ethers.parseEther("5"));
    });
  });
});
