import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  FamilyHub,
  FamilyYieldVault,
  VaultCashflow,
  KinetixForwarder,
  MockTeleporterMessenger,
  MockERC20,
} from "../typechain-types";

describe("Kinetix Advanced Flows: Gasless Forwarder, EIP-712 Multisig & Token Storage", function () {
  let admin: SignerWithAddress;
  let guardian1: SignerWithAddress;
  let guardian2: SignerWithAddress;
  let elderly: SignerWithAddress;
  let child: SignerWithAddress;
  let relayer: SignerWithAddress;
  let stranger: SignerWithAddress;

  let teleporter: MockTeleporterMessenger;
  let yieldVault: FamilyYieldVault;
  let hub: FamilyHub;
  let cashflow: VaultCashflow;
  let forwarder: KinetixForwarder;
  let mockUsdc: MockERC20;

  const cChainBlockchainId = ethers.keccak256(ethers.toUtf8Bytes("Fuji-C-Chain-43113"));
  const familyL1BlockchainId = ethers.keccak256(ethers.toUtf8Bytes("Family-L1-Subnet"));

  beforeEach(async () => {
    [admin, guardian1, guardian2, elderly, child, relayer, stranger] = await ethers.getSigners();

    // 1. Triển khai Mock Teleporter
    const MockTeleporterFactory = await ethers.getContractFactory("MockTeleporterMessenger");
    teleporter = await MockTeleporterFactory.deploy();
    await teleporter.waitForDeployment();

    // 2. Triển khai FamilyYieldVault trên C-Chain
    const YieldVaultFactory = await ethers.getContractFactory("FamilyYieldVault");
    yieldVault = await YieldVaultFactory.deploy(
      await teleporter.getAddress(),
      familyL1BlockchainId,
      ethers.ZeroAddress
    );
    await yieldVault.waitForDeployment();

    // 3. Triển khai FamilyHub trên Family L1
    const HubFactory = await ethers.getContractFactory("FamilyHub");
    hub = await HubFactory.deploy(
      admin.address,
      await teleporter.getAddress(),
      cChainBlockchainId,
      await yieldVault.getAddress()
    );
    await hub.waitForDeployment();

    // 4. Triển khai VaultCashflow (Treasury Core)
    const CashflowFactory = await ethers.getContractFactory("VaultCashflow");
    cashflow = await CashflowFactory.deploy(
      admin.address,
      await hub.getAddress(),
      await teleporter.getAddress(),
      cChainBlockchainId,
      await yieldVault.getAddress()
    );
    await cashflow.waitForDeployment();
    await hub.connect(admin).setVaultCashflow(await cashflow.getAddress());

    // 5. Triển khai KinetixForwarder EIP-2771
    const ForwarderFactory = await ethers.getContractFactory("KinetixForwarder");
    forwarder = await ForwarderFactory.deploy();
    await forwarder.waitForDeployment();
    await hub.connect(admin).setTrustedForwarder(await forwarder.getAddress());

    // 6. Triển khai Mock USDC
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockUsdc = await MockERC20Factory.deploy("USD Coin", "USDC");
    await mockUsdc.waitForDeployment();

    // Cập nhật cấu hình C-Chain
    await yieldVault.updateTeleporterConfig(
      await teleporter.getAddress(),
      familyL1BlockchainId,
      await hub.getAddress()
    );
  });

  describe("1. KinetixForwarder EIP-2771 Meta-Transactions (0 Gas cho Ông Bà & Con Nhỏ)", () => {
    let vaultId: number;

    beforeEach(async () => {
      // Tạo Hũ SHIELD với Ông Bà là Beneficiary, rút nhanh tối đa 50 AVAX
      const tx = await hub.createCustomVault(
        "Hũ Hưu Trí Ông Bà",
        0, // SHIELD
        1000, // 10% L1 buffer
        ethers.parseEther("50"),
        2,
        [admin.address, guardian1.address, guardian2.address],
        [elderly.address]
      );
      const receipt = await tx.wait();
      vaultId = 1;

      // Nạp 500 AVAX vào Hũ (10% L1 buffer = 50 AVAX khả dụng cho fast withdraw)
      await hub.connect(admin).depositToVault(vaultId, { value: ethers.parseEther("500") });
    });

    it("Ông Bà ký EIP-712 off-chain, Relayer phát tx giúp Ông Bà rút nhanh 20 AVAX thành công", async () => {
      const elderlyInitialBalance = await ethers.provider.getBalance(elderly.address);

      // Chuẩn bị calldata cho fastWithdraw(vaultId, 20 AVAX)
      const hubInterface = hub.interface;
      const data = hubInterface.encodeFunctionData("fastWithdraw", [
        BigInt(vaultId),
        ethers.parseEther("20"),
      ]);

      const forwarderAddress = await forwarder.getAddress();
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const nonce = await forwarder.getNonce(elderly.address);
      const currentBlock = await ethers.provider.getBlock("latest");
      const deadline = currentBlock!.timestamp + 3600;

      const req = {
        from: elderly.address,
        to: await hub.getAddress(),
        value: 0n,
        gas: 500000n,
        nonce,
        deadline: BigInt(deadline),
        data,
      };

      // Ký EIP-712 Typed Data bằng ví Ông Bà (Off-chain)
      const domain = {
        name: "KinetixForwarder",
        version: "1",
        chainId,
        verifyingContract: forwarderAddress,
      };

      const types = {
        ForwardRequest: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
      };

      const signature = await elderly.signTypedData(domain, types, req);

      // Xác minh tính hợp lệ trên Forwarder
      const isValid = await forwarder.verify(req, signature);
      expect(isValid).to.be.true;

      // Relayer gửi giao dịch thay mặt Ông Bà (Ông Bà không tốn gas, không gửi tx)
      await forwarder.connect(relayer).execute(req, signature);

      // Kiểm tra số dư ví Ông Bà nhận đủ 20 AVAX
      const elderlyFinalBalance = await ethers.provider.getBalance(elderly.address);
      expect(elderlyFinalBalance - elderlyInitialBalance).to.equal(ethers.parseEther("20"));

      // Nonce của Ông Bà đã tăng lên 1
      expect(await forwarder.getNonce(elderly.address)).to.equal(1n);
    });

    it("Từ chối Meta-Transaction nếu chữ ký không khớp với req.from", async () => {
      const data = hub.interface.encodeFunctionData("fastWithdraw", [
        BigInt(vaultId),
        ethers.parseEther("10"),
      ]);
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const nonce = await forwarder.getNonce(elderly.address);

      const latestBlock = await ethers.provider.getBlock("latest");
      const req = {
        from: elderly.address,
        to: await hub.getAddress(),
        value: 0n,
        gas: 500000n,
        nonce,
        deadline: BigInt(latestBlock!.timestamp + 3600),
        data,
      };

      const domain = {
        name: "KinetixForwarder",
        version: "1",
        chainId,
        verifyingContract: await forwarder.getAddress(),
      };
      const types = {
        ForwardRequest: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
      };

      // Kẻ lạ (stranger) ký mạo danh
      const fakeSig = await stranger.signTypedData(domain, types, req);

      await expect(
        forwarder.connect(relayer).execute(req, fakeSig)
      ).to.be.revertedWithCustomError(forwarder, "InvalidSigner");
    });
  });

  describe("2. Chức Năng Gom Đa Chữ Ký EIP-712 Cho Lệnh Rút Lớn (executeWithdrawalWithSignatures)", () => {
    let vaultId: number;
    let requestId: number;

    beforeEach(async () => {
      // Hũ SHIELD cần 2/3 chữ ký Guardians
      await hub.createCustomVault(
        "Hũ Gia Đình Đa Chữ Ký",
        0, // SHIELD
        2000, // 20% L1 buffer
        ethers.parseEther("50"),
        2, // Cần 2 chữ ký
        [admin.address, guardian1.address, guardian2.address],
        [elderly.address]
      );
      vaultId = 1;

      // Nạp 200 AVAX
      await hub.connect(admin).depositToVault(vaultId, { value: ethers.parseEther("200") });

      // Ông Bà tạo yêu cầu rút lớn 80 AVAX (> 50 AVAX limit)
      const tx = await hub.connect(elderly).requestLargeWithdrawal(
        vaultId,
        ethers.parseEther("80"),
        "Sửa chữa mái nhà mùa mưa"
      );
      await tx.wait();
      requestId = 1;
    });

    it("Gom 2 chữ ký EIP-712 từ guardian1 và guardian2 để giải ngân 80 AVAX trong 1 tx duy nhất", async () => {
      const elderlyInitialBalance = await ethers.provider.getBalance(elderly.address);
      const hubAddress = await hub.getAddress();
      const chainId = (await ethers.provider.getNetwork()).chainId;

      const domain = {
        name: "FamilyHub",
        version: "1",
        chainId,
        verifyingContract: hubAddress,
      };

      const types = {
        WithdrawalApproval: [
          { name: "requestId", type: "uint256" },
          { name: "vaultId", type: "uint256" },
          { name: "recipient", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "nonce", type: "uint256" },
        ],
      };

      const approvalData = {
        requestId: BigInt(requestId),
        vaultId: BigInt(vaultId),
        recipient: elderly.address,
        amount: ethers.parseEther("80"),
        nonce: BigInt(requestId),
      };

      // 1. Guardian1 ký số off-chain
      const sig1 = await guardian1.signTypedData(domain, types, approvalData);

      // 2. Guardian2 ký số off-chain
      const sig2 = await guardian2.signTypedData(domain, types, approvalData);

      // 3. Người thụ hưởng hoặc Relayer nộp cả 2 chữ ký vào FamilyHub
      const tx = await hub.connect(elderly).executeWithdrawalWithSignatures(
        requestId,
        [sig1, sig2]
      );
      await tx.wait();

      // Kiểm tra trạng thái đã giải ngân
      const req = await hub.withdrawalRequests(requestId);
      expect(req.executed).to.be.true;
      expect(req.approvalsCount).to.equal(2n);

      // Ông Bà nhận đủ 80 AVAX (trừ một ít gas nếu tự gửi, hoặc nhận trọn nếu relayer gửi)
      const elderlyFinalBalance = await ethers.provider.getBalance(elderly.address);
      expect(elderlyFinalBalance).to.be.greaterThan(elderlyInitialBalance + ethers.parseEther("79"));
    });

    it("Từ chối giải ngân nếu chữ ký không đủ ngưỡng M/N (chỉ có 1 chữ ký hợp lệ)", async () => {
      const hubAddress = await hub.getAddress();
      const chainId = (await ethers.provider.getNetwork()).chainId;

      const domain = {
        name: "FamilyHub",
        version: "1",
        chainId,
        verifyingContract: hubAddress,
      };

      const types = {
        WithdrawalApproval: [
          { name: "requestId", type: "uint256" },
          { name: "vaultId", type: "uint256" },
          { name: "recipient", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "nonce", type: "uint256" },
        ],
      };

      const approvalData = {
        requestId: BigInt(requestId),
        vaultId: BigInt(vaultId),
        recipient: elderly.address,
        amount: ethers.parseEther("80"),
        nonce: BigInt(requestId),
      };

      // Chỉ có chữ ký của guardian1 và người ngoài (stranger)
      const sig1 = await guardian1.signTypedData(domain, types, approvalData);
      const fakeSig = await stranger.signTypedData(domain, types, approvalData);

      await expect(
        hub.connect(elderly).executeWithdrawalWithSignatures(requestId, [sig1, fakeSig])
      ).to.be.revertedWithCustomError(hub, "InvalidApprovalThreshold");
    });
  });

  describe("3. Hạn Mức Rút Nhanh Hàng Ngày (Daily Spending Window cho SHIELD)", () => {
    let vaultId: number;

    beforeEach(async () => {
      await hub.createCustomVault(
        "Hũ An Toàn Chi Tiêu",
        0, // SHIELD
        2000,
        ethers.parseEther("50"), // Fast limit 50 AVAX
        2,
        [admin.address, guardian1.address],
        [elderly.address]
      );
      vaultId = 1;
      await hub.connect(admin).depositToVault(vaultId, { value: ethers.parseEther("500") });

      // Đặt hạn mức chi tiêu mỗi ngày tối đa là 70 AVAX
      await hub.connect(guardian1).setVaultDailyLimit(vaultId, ethers.parseEther("70"));
    });

    it("Rút nhanh lần 1 (40 AVAX) thành công, lần 2 (35 AVAX) vượt hạn mức ngày 70 AVAX bị revert", async () => {
      // Lần 1: Rút 40 AVAX (< 50 fast limit và < 70 daily limit) -> Thành công
      await hub.connect(elderly).fastWithdraw(vaultId, ethers.parseEther("40"));

      // Lần 2: Cố rút thêm 35 AVAX (tổng 75 AVAX > 70 AVAX daily limit) -> Revert ExceedsDailyLimit
      await expect(
        hub.connect(elderly).fastWithdraw(vaultId, ethers.parseEther("35"))
      ).to.be.revertedWithCustomError(hub, "ExceedsDailyLimit");
    });

    it("Qua ngày mới (sau 24h), hạn mức rút nhanh tự động được làm mới", async () => {
      // Ngày 1: Rút 50 AVAX
      await hub.connect(elderly).fastWithdraw(vaultId, ethers.parseEther("50"));

      // Tăng thời gian thêm 25 giờ
      await ethers.provider.send("evm_increaseTime", [25 * 3600]);
      await ethers.provider.send("evm_mine", []);

      // Ngày 2: Rút tiếp 40 AVAX -> Thành công trơn tru
      await expect(
        hub.connect(elderly).fastWithdraw(vaultId, ethers.parseEther("40"))
      ).to.not.be.reverted;
    });
  });

  describe("4. Sổ Cái Đóng Hụi On-Chain Cho Hũ ROSCA (contributeRoscaRound)", () => {
    let vaultId: number;

    beforeEach(async () => {
      // Khởi tạo Hũ ROSCA chu kỳ 7 ngày, mức đóng 10 AVAX/kỳ
      await hub.createAdvancedVault(
        "Hội Họ Hụi Tương Trợ",
        2, // ROSCA
        0, // 100% C-Chain
        0,
        2,
        [admin.address, guardian1.address],
        [guardian1.address, elderly.address, child.address],
        0,
        0,
        7 * 24 * 3600,
        ethers.parseEther("10")
      );
      vaultId = 1;
    });

    it("Thành viên đóng đúng mức 10 AVAX, hệ thống ghi nhận sổ cái và tăng đếm", async () => {
      // Guardian1 đóng 10 AVAX cho vòng 0
      await expect(
        hub.connect(guardian1).contributeRoscaRound(vaultId, { value: ethers.parseEther("10") })
      )
        .to.emit(hub, "RoscaRoundContributed")
        .withArgs(vaultId, 0, guardian1.address, ethers.parseEther("10"));

      expect(await hub.hasContributedRosca(vaultId, 0, guardian1.address)).to.be.true;
      expect(await hub.roscaRoundContributionsCount(vaultId, 0)).to.equal(1n);

      // Đóng trùng trong cùng 1 vòng bị revert
      await expect(
        hub.connect(guardian1).contributeRoscaRound(vaultId, { value: ethers.parseEther("10") })
      ).to.be.revertedWithCustomError(hub, "RoscaAlreadyContributed");
    });

    it("Từ chối đóng hụi sai số tiền yêu cầu", async () => {
      await expect(
        hub.connect(guardian1).contributeRoscaRound(vaultId, { value: ethers.parseEther("5") })
      ).to.be.revertedWithCustomError(hub, "RoscaContributionMismatch");
    });
  });

  describe("5. Lưu Trữ Tiền Token ERC-20 (USDC Vault Storage)", () => {
    let vaultId: number;

    beforeEach(async () => {
      await hub.createCustomVault(
        "Hũ Tiết Kiệm Bằng USDC",
        0, // SHIELD
        2000,
        ethers.parseEther("100"),
        2,
        [admin.address, guardian1.address],
        [elderly.address]
      );
      vaultId = 1;

      // Cấp 500 USDC cho Admin
      await mockUsdc.mint(admin.address, ethers.parseUnits("500", 18));
      await mockUsdc.connect(admin).approve(await hub.getAddress(), ethers.parseUnits("500", 18));
    });

    it("Nạp 300 USDC vào Hũ và Beneficiary rút nhanh 50 USDC thành công", async () => {
      const usdcAddress = await mockUsdc.getAddress();

      // 1. Admin nạp 300 USDC vào Hũ qua FamilyHub
      await expect(
        hub.connect(admin).depositTokenToVault(vaultId, usdcAddress, ethers.parseUnits("300", 18))
      )
        .to.emit(hub, "TokenDepositedToVault")
        .withArgs(vaultId, usdcAddress, admin.address, ethers.parseUnits("300", 18));

      // Kiểm tra số dư trên VaultCashflow
      expect(await cashflow.getTokenBalance(vaultId, usdcAddress)).to.equal(
        ethers.parseUnits("300", 18)
      );

      // 2. Beneficiary (Ông Bà) rút 50 USDC
      await expect(
        hub.connect(elderly).fastWithdrawToken(vaultId, usdcAddress, ethers.parseUnits("50", 18))
      )
        .to.emit(hub, "TokenFastWithdrawn")
        .withArgs(vaultId, usdcAddress, elderly.address, ethers.parseUnits("50", 18));

      // Số dư ví Ông Bà nhận đủ 50 USDC
      expect(await mockUsdc.balanceOf(elderly.address)).to.equal(ethers.parseUnits("50", 18));

      // Số dư Hũ còn lại 250 USDC
      expect(await cashflow.getTokenBalance(vaultId, usdcAddress)).to.equal(
        ethers.parseUnits("250", 18)
      );
    });
  });
});
