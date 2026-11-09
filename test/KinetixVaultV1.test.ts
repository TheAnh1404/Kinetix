import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { KinetixVaultV1, KinetixVaultFactoryV1 } from "../typechain-types";

describe("KinetixVaultV1 & KinetixVaultFactoryV1 (EIP-1167 Minimal Clones)", () => {
  async function deployFixture() {
    const [owner, guardian1, guardian2, guardian3, beneficiary1, child, recipient, outsider] =
      await ethers.getSigners();

    // 1. Deploy KinetixVaultV1 Implementation
    const VaultImplFactory = await ethers.getContractFactory("KinetixVaultV1");
    const implementation = await VaultImplFactory.deploy();
    await implementation.waitForDeployment();

    // 2. Deploy KinetixVaultFactoryV1
    const FactoryContract = await ethers.getContractFactory("KinetixVaultFactoryV1");
    const factory = await FactoryContract.deploy(await implementation.getAddress());
    await factory.waitForDeployment();

    return {
      implementation,
      factory,
      owner,
      guardian1,
      guardian2,
      guardian3,
      beneficiary1,
      child,
      recipient,
      outsider,
    };
  }

  describe("1. Khởi tạo Factory & Khóa Implementation (Security Initialization)", () => {
    it("Khóa bản thiết kế gốc (implementation) ngăn không cho bất kỳ ai khởi tạo trực tiếp", async () => {
      const { implementation, owner } = await deployFixture();
      await expect(
        implementation.initialize(
          owner.address,
          owner.address,
          0,
          1,
          ethers.parseEther("1"),
          0,
          0,
          0,
          0,
          [owner.address],
          []
        )
      ).to.be.revertedWithCustomError(implementation, "AlreadyInitialized");
    });

    it("Factory kiểm tra chặt chẽ tham số đầu vào khi tạo Hũ", async () => {
      const { factory, owner } = await deployFixture();
      const configHash = ethers.keccak256(ethers.toUtf8Bytes("config-v1"));

      // Zero guardians
      await expect(
        factory.createVault(
          {
            template: 0,
            requiredApprovals: 1,
            fastWithdrawLimit: ethers.parseEther("1"),
            targetGoalAmount: 0,
            targetDeadline: 0,
            roscaRoundContribution: 0,
            roscaRoundDuration: 0,
            guardians: [],
            beneficiaries: [],
          },
          configHash
        )
      ).to.be.revertedWithCustomError(factory, "ZeroGuardians");

      // Quorum > số lượng guardians
      await expect(
        factory.createVault(
          {
            template: 0,
            requiredApprovals: 2,
            fastWithdrawLimit: ethers.parseEther("1"),
            targetGoalAmount: 0,
            targetDeadline: 0,
            roscaRoundContribution: 0,
            roscaRoundDuration: 0,
            guardians: [owner.address],
            beneficiaries: [],
          },
          configHash
        )
      ).to.be.revertedWithCustomError(factory, "InvalidQuorum");
    });

    it("Factory tạo clone thành công, gọi initialize nguyên tử và đăng ký vào registry", async () => {
      const { factory, guardian1, guardian2, beneficiary1 } = await deployFixture();
      const configHash = ethers.keccak256(ethers.toUtf8Bytes("config-v1"));

      const tx = await factory.connect(guardian1).createVault(
        {
          template: 0, // SHIELD
          requiredApprovals: 2,
          fastWithdrawLimit: ethers.parseEther("0.5"),
          targetGoalAmount: 0,
          targetDeadline: 0,
          roscaRoundContribution: 0,
          roscaRoundDuration: 0,
          guardians: [guardian1.address, guardian2.address],
          beneficiaries: [beneficiary1.address],
        },
        configHash
      );

      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;

      const vaultCount = await factory.getVaultCount();
      expect(vaultCount).to.equal(1n);

      const cloneAddress = await factory.allVaults(0);
      expect(await factory.isVault(cloneAddress)).to.be.true;

      const vault = await ethers.getContractAt("KinetixVaultV1", cloneAddress);
      expect(await vault.factory()).to.equal(await factory.getAddress());
      expect(await vault.creator()).to.equal(guardian1.address);
      expect(await vault.ruleTemplate()).to.equal(0); // SHIELD
      expect(await vault.requiredApprovals()).to.equal(2n);
      expect(await vault.fastWithdrawLimit()).to.equal(ethers.parseEther("0.5"));
      expect(await vault.isGuardian(guardian1.address)).to.be.true;
      expect(await vault.isGuardian(guardian2.address)).to.be.true;
      expect(await vault.isBeneficiary(beneficiary1.address)).to.be.true;

      // Không cho phép tái khởi tạo clone
      await expect(
        vault.initialize(
          cloneAddress,
          guardian1.address,
          0,
          1,
          0,
          0,
          0,
          0,
          0,
          [guardian1.address],
          []
        )
      ).to.be.revertedWithCustomError(vault, "AlreadyInitialized");
    });
  });

  describe("2. Lưu Trữ Native AVAX & Bất Biến Tài Sản (Native Asset Invariant)", () => {
    it("Hũ tự giữ native AVAX tại địa chỉ contract và cập nhật accountedVaultBalance", async () => {
      const { factory, guardian1, guardian2, beneficiary1, outsider } = await deployFixture();
      const configHash = ethers.keccak256(ethers.toUtf8Bytes("shield-test"));

      const tx = await factory.connect(guardian1).createVault(
        {
          template: 0,
          requiredApprovals: 2,
          fastWithdrawLimit: ethers.parseEther("1"),
          targetGoalAmount: 0,
          targetDeadline: 0,
          roscaRoundContribution: 0,
          roscaRoundDuration: 0,
          guardians: [guardian1.address, guardian2.address],
          beneficiaries: [beneficiary1.address],
        },
        configHash
      );
      await tx.wait();

      const cloneAddress = await factory.allVaults(0);
      const vault = await ethers.getContractAt("KinetixVaultV1", cloneAddress);

      // Nạp AVAX từ người ngoài
      const depositAmount = ethers.parseEther("5");
      await expect(vault.connect(outsider).deposit({ value: depositAmount }))
        .to.emit(vault, "Deposited")
        .withArgs(outsider.address, depositAmount, depositAmount);

      expect(await vault.accountedVaultBalance()).to.equal(depositAmount);
      expect(await vault.availableBalance()).to.equal(depositAmount);
      expect(await ethers.provider.getBalance(cloneAddress)).to.equal(depositAmount);

      // Nạp 0 wei bị từ chối
      await expect(vault.connect(outsider).deposit({ value: 0n })).to.be.revertedWithCustomError(
        vault,
        "ZeroAmount"
      );
    });

    it("Từ chối nhận AVAX chuyển trực tiếp không qua hàm deposit() để chống ô nhiễm sổ cái", async () => {
      const { factory, guardian1, outsider } = await deployFixture();
      const configHash = ethers.keccak256(ethers.toUtf8Bytes("shield-test"));

      await factory.connect(guardian1).createVault(
        {
          template: 0,
          requiredApprovals: 1,
          fastWithdrawLimit: ethers.parseEther("1"),
          targetGoalAmount: 0,
          targetDeadline: 0,
          roscaRoundContribution: 0,
          roscaRoundDuration: 0,
          guardians: [guardian1.address],
          beneficiaries: [],
        },
        configHash
      );

      const cloneAddress = await factory.allVaults(0);

      await expect(
        outsider.sendTransaction({
          to: cloneAddress,
          value: ethers.parseEther("1"),
        })
      ).to.be.revertedWith("Kinetix: use deposit() to send AVAX");
    });
  });

  describe("3. Quy Tắc SHIELD: Rút Nhanh & Hạn Mức Ngày (Fast Withdrawal)", () => {
    it("Người thụ hưởng rút nhanh tức thì trong hạn mức, tuân thủ ngân sách ngày", async () => {
      const { factory, guardian1, beneficiary1, recipient } = await deployFixture();
      const configHash = ethers.keccak256(ethers.toUtf8Bytes("shield-flow"));

      const fastLimit = ethers.parseEther("1");
      await factory.connect(guardian1).createVault(
        {
          template: 0,
          requiredApprovals: 1,
          fastWithdrawLimit: fastLimit,
          targetGoalAmount: 0,
          targetDeadline: 0,
          roscaRoundContribution: 0,
          roscaRoundDuration: 0,
          guardians: [guardian1.address],
          beneficiaries: [beneficiary1.address],
        },
        configHash
      );

      const cloneAddress = await factory.allVaults(0);
      const vault = await ethers.getContractAt("KinetixVaultV1", cloneAddress);

      // Nạp 5 AVAX
      await vault.deposit({ value: ethers.parseEther("5") });

      // Rút nhanh 1 AVAX về ví recipient
      await expect(
        vault.connect(beneficiary1).withdrawFast(ethers.parseEther("1"), recipient.address)
      ).to.changeEtherBalance(recipient, ethers.parseEther("1"));

      expect(await vault.accountedVaultBalance()).to.equal(ethers.parseEther("4"));

      // Rút nhanh lần 2 trong cùng ngày (1 AVAX nữa, chạm daily limit = 2 AVAX)
      await expect(
        vault.connect(beneficiary1).withdrawFast(ethers.parseEther("1"), recipient.address)
      ).to.changeEtherBalance(recipient, ethers.parseEther("1"));

      expect(await vault.accountedVaultBalance()).to.equal(ethers.parseEther("3"));

      // Lần 3 vượt hạn mức ngày -> Revert ExceedsDailyLimit
      await expect(
        vault.connect(beneficiary1).withdrawFast(ethers.parseEther("0.1"), recipient.address)
      ).to.be.revertedWithCustomError(vault, "ExceedsDailyLimit");

      // Vượt qua 1 ngày (86401 giây)
      await time.increase(86401);

      // Sau 24h hạn mức ngày được reset và rút tiếp thành công
      await expect(
        vault.connect(beneficiary1).withdrawFast(ethers.parseEther("0.5"), recipient.address)
      ).to.changeEtherBalance(recipient, ethers.parseEther("0.5"));

      expect(await vault.accountedVaultBalance()).to.equal(ethers.parseEther("2.5"));
    });

    it("Chặn người lạ hoặc vượt hạn mức một lần", async () => {
      const { factory, guardian1, beneficiary1, outsider, recipient } = await deployFixture();
      const configHash = ethers.keccak256(ethers.toUtf8Bytes("shield-revert"));

      await factory.connect(guardian1).createVault(
        {
          template: 0,
          requiredApprovals: 1,
          fastWithdrawLimit: ethers.parseEther("1"),
          targetGoalAmount: 0,
          targetDeadline: 0,
          roscaRoundContribution: 0,
          roscaRoundDuration: 0,
          guardians: [guardian1.address],
          beneficiaries: [beneficiary1.address],
        },
        configHash
      );

      const cloneAddress = await factory.allVaults(0);
      const vault = await ethers.getContractAt("KinetixVaultV1", cloneAddress);
      await vault.deposit({ value: ethers.parseEther("5") });

      // Người lạ gọi rút nhanh -> revert NotBeneficiary
      await expect(
        vault.connect(outsider).withdrawFast(ethers.parseEther("0.5"), recipient.address)
      ).to.be.revertedWithCustomError(vault, "NotBeneficiary");

      // Rút vượt fastWithdrawLimit một lần (2 AVAX > 1 AVAX) -> revert ExceedsFastWithdrawLimit
      await expect(
        vault.connect(beneficiary1).withdrawFast(ethers.parseEther("2"), recipient.address)
      ).to.be.revertedWithCustomError(vault, "ExceedsFastWithdrawLimit");
    });
  });

  describe("4. Rút Tiền Lớn Đa Chữ Ký (M/N Multisig)", () => {
    it("Quy trình hoàn chỉnh: Đề xuất, Khóa giữ chỗ, Ký duyệt M/N, và Giải ngân", async () => {
      const { factory, guardian1, guardian2, guardian3, beneficiary1, recipient } =
        await deployFixture();
      const configHash = ethers.keccak256(ethers.toUtf8Bytes("multisig-flow"));

      // 2-of-3 Guardians
      await factory.connect(guardian1).createVault(
        {
          template: 0,
          requiredApprovals: 2,
          fastWithdrawLimit: ethers.parseEther("0.5"),
          targetGoalAmount: 0,
          targetDeadline: 0,
          roscaRoundContribution: 0,
          roscaRoundDuration: 0,
          guardians: [guardian1.address, guardian2.address, guardian3.address],
          beneficiaries: [beneficiary1.address],
        },
        configHash
      );

      const cloneAddress = await factory.allVaults(0);
      const vault = await ethers.getContractAt("KinetixVaultV1", cloneAddress);

      // Nạp 10 AVAX
      await vault.deposit({ value: ethers.parseEther("10") });

      // Beneficiary tạo yêu cầu rút 4 AVAX
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("HocPhiDaiHoc"));
      const reqTx = await vault
        .connect(beneficiary1)
        .requestWithdrawal(ethers.parseEther("4"), recipient.address, memoHash);
      await reqTx.wait();

      // Kiểm tra trạng thái yêu cầu và giữ chỗ tiền
      expect(await vault.reservedBalance()).to.equal(ethers.parseEther("4"));
      expect(await vault.availableBalance()).to.equal(ethers.parseEther("6"));

      const reqInfo = await vault.getWithdrawalRequest(1);
      expect(reqInfo.amount).to.equal(ethers.parseEther("4"));
      expect(reqInfo.recipient).to.equal(recipient.address);
      expect(reqInfo.status).to.equal(0); // PENDING
      expect(reqInfo.approvalsCount).to.equal(0n);

      // Thực thi khi chưa đủ chữ ký -> Revert RequestNotApproved
      await expect(vault.executeWithdrawal(1)).to.be.revertedWithCustomError(
        vault,
        "RequestNotApproved"
      );

      // Guardian 1 ký duyệt
      await expect(vault.connect(guardian1).approveWithdrawal(1))
        .to.emit(vault, "WithdrawalApproved")
        .withArgs(1, guardian1.address, 1, 2);

      // Ký duyệt trùng lặp -> Revert AlreadyApproved
      await expect(
        vault.connect(guardian1).approveWithdrawal(1)
      ).to.be.revertedWithCustomError(vault, "AlreadyApproved");

      // Guardian 2 ký duyệt -> Đủ 2/3 chữ ký -> Trở thành APPROVED
      await vault.connect(guardian2).approveWithdrawal(1);
      const updatedReq = await vault.getWithdrawalRequest(1);
      expect(updatedReq.status).to.equal(1); // APPROVED
      expect(updatedReq.approvalsCount).to.equal(2n);

      // Thực thi giải ngân
      await expect(vault.executeWithdrawal(1)).to.changeEtherBalance(
        recipient,
        ethers.parseEther("4")
      );

      // Kiểm tra sổ cái sau giải ngân
      expect(await vault.accountedVaultBalance()).to.equal(ethers.parseEther("6"));
      expect(await vault.reservedBalance()).to.equal(0n);
      expect(await vault.availableBalance()).to.equal(ethers.parseEther("6"));
      expect(await ethers.provider.getBalance(cloneAddress)).to.equal(ethers.parseEther("6"));

      // Ngăn chặn thực thi lại (Replay Attack)
      await expect(vault.executeWithdrawal(1)).to.be.revertedWithCustomError(
        vault,
        "RequestAlreadyExecuted"
      );
    });

    it("Hủy yêu cầu rút tiền giải phóng số dư giữ chỗ an toàn", async () => {
      const { factory, guardian1, guardian2, recipient } = await deployFixture();
      const configHash = ethers.keccak256(ethers.toUtf8Bytes("cancel-test"));

      await factory.connect(guardian1).createVault(
        {
          template: 0,
          requiredApprovals: 2,
          fastWithdrawLimit: ethers.parseEther("0.5"),
          targetGoalAmount: 0,
          targetDeadline: 0,
          roscaRoundContribution: 0,
          roscaRoundDuration: 0,
          guardians: [guardian1.address, guardian2.address],
          beneficiaries: [],
        },
        configHash
      );

      const cloneAddress = await factory.allVaults(0);
      const vault = await ethers.getContractAt("KinetixVaultV1", cloneAddress);
      await vault.deposit({ value: ethers.parseEther("5") });

      // Guardian 1 tạo yêu cầu rút 3 AVAX
      await vault
        .connect(guardian1)
        .requestWithdrawal(
          ethers.parseEther("3"),
          recipient.address,
          ethers.ZeroHash
        );

      expect(await vault.reservedBalance()).to.equal(ethers.parseEther("3"));
      expect(await vault.availableBalance()).to.equal(ethers.parseEther("2"));

      // Guardian 2 hủy yêu cầu
      await expect(vault.connect(guardian2).cancelWithdrawal(1))
        .to.emit(vault, "WithdrawalCancelled")
        .withArgs(1);

      // Khoản giữ chỗ được hoàn lại cho available balance
      expect(await vault.reservedBalance()).to.equal(0n);
      expect(await vault.availableBalance()).to.equal(ethers.parseEther("5"));
    });
  });

  describe("5. Quy Tắc MILESTONE: Nhiệm Vụ Việc Nhà (Chore-to-Earn)", () => {
    it("Guardian tạo việc nhà, giữ chỗ quỹ thưởng, con báo cáo và nhận thưởng sau phê duyệt", async () => {
      const { factory, guardian1, child } = await deployFixture();
      const configHash = ethers.keccak256(ethers.toUtf8Bytes("chore-flow"));

      await factory.connect(guardian1).createVault(
        {
          template: 1, // MILESTONE
          requiredApprovals: 1,
          fastWithdrawLimit: 0,
          targetGoalAmount: 0,
          targetDeadline: 0,
          roscaRoundContribution: 0,
          roscaRoundDuration: 0,
          guardians: [guardian1.address],
          beneficiaries: [child.address],
        },
        configHash
      );

      const cloneAddress = await factory.allVaults(0);
      const vault = await ethers.getContractAt("KinetixVaultV1", cloneAddress);
      await vault.deposit({ value: ethers.parseEther("2") });

      // Guardian tạo nhiệm vụ quét nhà thưởng 0.5 AVAX
      const memoHash = ethers.keccak256(ethers.toUtf8Bytes("QuetNhaVaRuaBat"));
      await expect(
        vault.connect(guardian1).createChore(ethers.parseEther("0.5"), child.address, memoHash)
      )
        .to.emit(vault, "ChoreCreated")
        .withArgs(1, child.address, ethers.parseEther("0.5"), memoHash);

      expect(await vault.reservedBalance()).to.equal(ethers.parseEther("0.5"));
      expect(await vault.availableBalance()).to.equal(ethers.parseEther("1.5"));

      // Con báo cáo hoàn thành
      await expect(vault.connect(child).claimChore(1))
        .to.emit(vault, "ChoreClaimed")
        .withArgs(1, child.address);

      // Con không được tự duyệt nhiệm vụ của mình
      await expect(vault.connect(child).approveChore(1)).to.be.revertedWithCustomError(
        vault,
        "NotGuardian"
      );

      // Guardian duyệt và tiền thưởng tự động chuyển vào ví con
      await expect(vault.connect(guardian1).approveChore(1)).to.changeEtherBalance(
        child,
        ethers.parseEther("0.5")
      );

      // Số dư sổ cái và giữ chỗ được cập nhật chính xác
      expect(await vault.accountedVaultBalance()).to.equal(ethers.parseEther("1.5"));
      expect(await vault.reservedBalance()).to.equal(0n);
      expect(await vault.availableBalance()).to.equal(ethers.parseEther("1.5"));
    });
  });

  describe("6. Quy Tắc ROSCA: Góp Vốn Xoay Vòng", () => {
    it("Các thành viên góp vốn theo vòng tròn và giải ngân đúng lịch hẹn", async () => {
      const { factory, guardian1, guardian2, guardian3 } = await deployFixture();
      const configHash = ethers.keccak256(ethers.toUtf8Bytes("rosca-flow"));

      const roundContribution = ethers.parseEther("1");
      await factory.connect(guardian1).createVault(
        {
          template: 2, // ROSCA
          requiredApprovals: 1,
          fastWithdrawLimit: 0,
          targetGoalAmount: 0,
          targetDeadline: 0,
          roscaRoundContribution: roundContribution,
          roscaRoundDuration: 7 * 86400,
          guardians: [guardian1.address, guardian2.address, guardian3.address],
          beneficiaries: [],
        },
        configHash
      );

      const cloneAddress = await factory.allVaults(0);
      const vault = await ethers.getContractAt("KinetixVaultV1", cloneAddress);

      // Thành viên 1 góp 1 AVAX
      await vault.connect(guardian1).contributeRosca({ value: roundContribution });

      // Đóng trùng trong 1 kỳ bị chặn
      await expect(
        vault.connect(guardian1).contributeRosca({ value: roundContribution })
      ).to.be.revertedWithCustomError(vault, "RoscaAlreadyContributed");

      // Thành viên 2 góp 1 AVAX
      await vault.connect(guardian2).contributeRosca({ value: roundContribution });

      // Chưa đủ người góp mà đòi giải ngân -> Revert RoscaRoundNotReady
      await expect(vault.payoutRoscaRound()).to.be.revertedWithCustomError(
        vault,
        "RoscaRoundNotReady"
      );

      // Thành viên 3 góp 1 AVAX (đủ 3 người)
      await vault.connect(guardian3).contributeRosca({ value: roundContribution });

      // Giải ngân kỳ 0 cho Guardian 1 (người đầu tiên trong danh sách xoay vòng)
      await expect(vault.payoutRoscaRound()).to.changeEtherBalance(
        guardian1,
        ethers.parseEther("3")
      );

      // Kỳ hiện tại đã tăng lên 1
      expect(await vault.roscaCurrentRound()).to.equal(1n);
      expect(await vault.accountedVaultBalance()).to.equal(0n);
    });
  });

  describe("7. Quy Tắc SHARED_GOAL: Mục Tiêu Chung", () => {
    it("Chỉ giải ngân khi đã đạt đủ mục tiêu tiền tiết kiệm hoặc quá hạn thời gian", async () => {
      const { factory, guardian1, recipient } = await deployFixture();
      const configHash = ethers.keccak256(ethers.toUtf8Bytes("goal-flow"));

      const targetGoal = ethers.parseEther("10");
      const targetDeadline = (await time.latest()) + 86400; // 1 ngày tới

      await factory.connect(guardian1).createVault(
        {
          template: 3, // SHARED_GOAL
          requiredApprovals: 1,
          fastWithdrawLimit: 0,
          targetGoalAmount: targetGoal,
          targetDeadline: targetDeadline,
          roscaRoundContribution: 0,
          roscaRoundDuration: 0,
          guardians: [guardian1.address],
          beneficiaries: [],
        },
        configHash
      );

      const cloneAddress = await factory.allVaults(0);
      const vault = await ethers.getContractAt("KinetixVaultV1", cloneAddress);

      // Mới nạp 4 AVAX (chưa đạt 10 AVAX)
      await vault.deposit({ value: ethers.parseEther("4") });

      // Tạo yêu cầu rút 4 AVAX
      await vault
        .connect(guardian1)
        .requestWithdrawal(ethers.parseEther("4"), recipient.address, ethers.ZeroHash);

      // Giải ngân mục tiêu khi chưa đạt mục tiêu và chưa hết hạn -> Revert GoalNotReached
      await expect(vault.executeGoalWithdrawal(1)).to.be.revertedWithCustomError(
        vault,
        "GoalNotReached"
      );

      // Nạp tiếp 6 AVAX (đạt trúng 10 AVAX)
      await vault.deposit({ value: ethers.parseEther("6") });

      // Lúc này đạt mục tiêu -> giải ngân thành công
      await expect(vault.executeGoalWithdrawal(1)).to.changeEtherBalance(
        recipient,
        ethers.parseEther("4")
      );

      expect(await vault.accountedVaultBalance()).to.equal(ethers.parseEther("6"));
    });
  });

  describe("8. Chuyển Tiền Giữa Các Hũ (Inter-Vault Transfer)", () => {
    it("Chuyển AVAX trực tiếp và nguyên tử giữa 2 Hũ do Factory tạo ra", async () => {
      const { factory, guardian1, outsider } = await deployFixture();

      // Tạo Hũ A
      await factory.connect(guardian1).createVault(
        {
          template: 0,
          requiredApprovals: 1,
          fastWithdrawLimit: ethers.parseEther("1"),
          targetGoalAmount: 0,
          targetDeadline: 0,
          roscaRoundContribution: 0,
          roscaRoundDuration: 0,
          guardians: [guardian1.address],
          beneficiaries: [],
        },
        ethers.ZeroHash
      );
      const vaultAAddress = await factory.allVaults(0);
      const vaultA = await ethers.getContractAt("KinetixVaultV1", vaultAAddress);

      // Tạo Hũ B
      await factory.connect(guardian1).createVault(
        {
          template: 0,
          requiredApprovals: 1,
          fastWithdrawLimit: ethers.parseEther("1"),
          targetGoalAmount: 0,
          targetDeadline: 0,
          roscaRoundContribution: 0,
          roscaRoundDuration: 0,
          guardians: [guardian1.address],
          beneficiaries: [],
        },
        ethers.ZeroHash
      );
      const vaultBAddress = await factory.allVaults(1);
      const vaultB = await ethers.getContractAt("KinetixVaultV1", vaultBAddress);

      // Nạp 5 AVAX vào Hũ A
      await vaultA.deposit({ value: ethers.parseEther("5") });

      // Chuyển 2 AVAX từ Hũ A sang Hũ B
      const transferId = ethers.keccak256(ethers.toUtf8Bytes("transfer-1"));
      await expect(
        vaultA.connect(guardian1).executeVaultTransfer(vaultBAddress, ethers.parseEther("2"), transferId)
      )
        .to.emit(vaultA, "VaultTransferOut")
        .withArgs(vaultBAddress, ethers.parseEther("2"), transferId)
        .and.to.emit(vaultB, "VaultTransferIn")
        .withArgs(vaultAAddress, ethers.parseEther("2"), transferId);

      expect(await vaultA.accountedVaultBalance()).to.equal(ethers.parseEther("3"));
      expect(await vaultB.accountedVaultBalance()).to.equal(ethers.parseEther("2"));
      expect(await ethers.provider.getBalance(vaultAAddress)).to.equal(ethers.parseEther("3"));
      expect(await ethers.provider.getBalance(vaultBAddress)).to.equal(ethers.parseEther("2"));

      // Chuyển sang địa chỉ ngoài factory -> Revert InvalidTargetVault
      await expect(
        vaultA.connect(guardian1).executeVaultTransfer(outsider.address, ethers.parseEther("1"), transferId)
      ).to.be.revertedWithCustomError(vaultA, "InvalidTargetVault");
    });
  });

  describe("9. Bảo Mật Nâng Cao: Reentrancy, Receiver Revert, Expiration & Epoch Invalidation", () => {
    it("Chặn đứng Reentrancy Attack khi rút tiền", async () => {
      const { factory, guardian1 } = await deployFixture();

      // Tạo Hũ SHIELD
      await factory.connect(guardian1).createVault(
        {
          template: 0,
          requiredApprovals: 1,
          fastWithdrawLimit: ethers.parseEther("1"),
          targetGoalAmount: 0,
          targetDeadline: 0,
          roscaRoundContribution: 0,
          roscaRoundDuration: 0,
          guardians: [guardian1.address],
          beneficiaries: [],
        },
        ethers.ZeroHash
      );
      const cloneAddress = await factory.allVaults(0);
      const vault = await ethers.getContractAt("KinetixVaultV1", cloneAddress);
      await vault.deposit({ value: ethers.parseEther("5") });

      // Deploy Malicious Receiver
      const MaliciousFactory = await ethers.getContractFactory("VaultV1MaliciousReceiver");
      const maliciousReceiver = await MaliciousFactory.deploy(cloneAddress);
      await maliciousReceiver.waitForDeployment();
      const maliciousAddr = await maliciousReceiver.getAddress();

      // Thêm malicious receiver làm beneficiary
      await vault.connect(guardian1).addBeneficiary(maliciousAddr);

      // Cấu hình malicious receiver để cố reenter khi nhận tiền
      await maliciousReceiver.setAttemptReenter(true);

      // Rút nhanh về malicious receiver: do ReentrancyGuard, lời gọi reenter bên trong receive() phải thất bại
      await vault.connect(guardian1).withdrawFast(ethers.parseEther("1"), maliciousAddr);

      expect(await maliciousReceiver.reenterSuccess()).to.be.false;
      expect(await vault.accountedVaultBalance()).to.equal(ethers.parseEther("4"));
    });

    it("Khi recipient từ chối nhận AVAX, toàn bộ giao dịch revert và số dư được bảo toàn nguyên vẹn", async () => {
      const { factory, guardian1 } = await deployFixture();

      await factory.connect(guardian1).createVault(
        {
          template: 0,
          requiredApprovals: 1,
          fastWithdrawLimit: ethers.parseEther("1"),
          targetGoalAmount: 0,
          targetDeadline: 0,
          roscaRoundContribution: 0,
          roscaRoundDuration: 0,
          guardians: [guardian1.address],
          beneficiaries: [],
        },
        ethers.ZeroHash
      );
      const cloneAddress = await factory.allVaults(0);
      const vault = await ethers.getContractAt("KinetixVaultV1", cloneAddress);
      await vault.deposit({ value: ethers.parseEther("5") });

      const MaliciousFactory = await ethers.getContractFactory("VaultV1MaliciousReceiver");
      const maliciousReceiver = await MaliciousFactory.deploy(cloneAddress);
      await maliciousReceiver.waitForDeployment();
      const maliciousAddr = await maliciousReceiver.getAddress();

      // Cấu hình receiver từ chối nhận tiền (revert)
      await maliciousReceiver.setShouldRevert(true);

      // Thử rút nhanh -> Phải revert TransferFailed
      await expect(
        vault.connect(guardian1).withdrawFast(ethers.parseEther("1"), maliciousAddr)
      ).to.be.revertedWithCustomError(vault, "TransferFailed");

      // Số dư không bị suy suyển (giữ nguyên 5 AVAX)
      expect(await vault.accountedVaultBalance()).to.equal(ethers.parseEther("5"));
      expect(await ethers.provider.getBalance(cloneAddress)).to.equal(ethers.parseEther("5"));
    });

    it("Yêu cầu rút tiền quá hạn 48 giờ không thể thực thi và có thể hủy để giải phóng tiền giữ chỗ", async () => {
      const { factory, guardian1, recipient } = await deployFixture();

      await factory.connect(guardian1).createVault(
        {
          template: 0,
          requiredApprovals: 1,
          fastWithdrawLimit: ethers.parseEther("1"),
          targetGoalAmount: 0,
          targetDeadline: 0,
          roscaRoundContribution: 0,
          roscaRoundDuration: 0,
          guardians: [guardian1.address],
          beneficiaries: [],
        },
        ethers.ZeroHash
      );
      const cloneAddress = await factory.allVaults(0);
      const vault = await ethers.getContractAt("KinetixVaultV1", cloneAddress);
      await vault.deposit({ value: ethers.parseEther("5") });

      await vault.connect(guardian1).requestWithdrawal(ethers.parseEther("2"), recipient.address, ethers.ZeroHash);
      expect(await vault.reservedBalance()).to.equal(ethers.parseEther("2"));

      // Tua qua 49 giờ (> 48 giờ deadline)
      await time.increase(49 * 3600);

      // Thực thi bị chặn vì hết hạn
      await expect(vault.executeWithdrawal(1)).to.be.revertedWithCustomError(vault, "RequestExpired");

      // Hủy yêu cầu quá hạn để giải phóng reservedBalance
      await vault.cancelWithdrawal(1);
      expect(await vault.reservedBalance()).to.equal(0n);
      expect(await vault.availableBalance()).to.equal(ethers.parseEther("5"));
    });

    it("Thay đổi thành viên tăng membershipEpoch và vô hiệu hóa yêu cầu rút tiền của epoch cũ", async () => {
      const { factory, guardian1, guardian2, recipient } = await deployFixture();

      await factory.connect(guardian1).createVault(
        {
          template: 0,
          requiredApprovals: 1,
          fastWithdrawLimit: ethers.parseEther("1"),
          targetGoalAmount: 0,
          targetDeadline: 0,
          roscaRoundContribution: 0,
          roscaRoundDuration: 0,
          guardians: [guardian1.address],
          beneficiaries: [],
        },
        ethers.ZeroHash
      );
      const cloneAddress = await factory.allVaults(0);
      const vault = await ethers.getContractAt("KinetixVaultV1", cloneAddress);
      await vault.deposit({ value: ethers.parseEther("5") });

      // Tạo yêu cầu ở epoch 1
      await vault.connect(guardian1).requestWithdrawal(ethers.parseEther("2"), recipient.address, ethers.ZeroHash);
      expect(await vault.membershipEpoch()).to.equal(1n);

      // Thêm Guardian mới -> membershipEpoch tăng lên 2
      await vault.connect(guardian1).addGuardian(guardian2.address);
      expect(await vault.membershipEpoch()).to.equal(2n);

      // Thực thi yêu cầu cũ ở epoch 1 bị từ chối
      await expect(vault.executeWithdrawal(1)).to.be.revertedWithCustomError(vault, "InvalidState");
    });

    it("Cơ chế tạm dừng (Pause / Unpause) ngăn chặn rút tiền trong tình huống khẩn cấp", async () => {
      const { factory, guardian1, recipient } = await deployFixture();

      await factory.connect(guardian1).createVault(
        {
          template: 0,
          requiredApprovals: 1,
          fastWithdrawLimit: ethers.parseEther("1"),
          targetGoalAmount: 0,
          targetDeadline: 0,
          roscaRoundContribution: 0,
          roscaRoundDuration: 0,
          guardians: [guardian1.address],
          beneficiaries: [],
        },
        ethers.ZeroHash
      );
      const cloneAddress = await factory.allVaults(0);
      const vault = await ethers.getContractAt("KinetixVaultV1", cloneAddress);
      await vault.deposit({ value: ethers.parseEther("5") });

      // Guardian tạm dừng Hũ
      await vault.connect(guardian1).pause();

      // Nạp tiền và rút tiền bị chặn
      await expect(vault.deposit({ value: ethers.parseEther("1") })).to.be.revertedWithCustomError(
        vault,
        "EnforcedPause"
      );
      await expect(
        vault.connect(guardian1).withdrawFast(ethers.parseEther("0.5"), recipient.address)
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");

      // Mở lại hoạt động
      await vault.connect(guardian1).unpause();
      await expect(
        vault.connect(guardian1).withdrawFast(ethers.parseEther("0.5"), recipient.address)
      ).to.changeEtherBalance(recipient, ethers.parseEther("0.5"));
    });
  });
});
