import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("====================================================");
  console.log("🚀 KINETIX SMART CONTRACT DEPLOYMENT SCRIPT");
  console.log("====================================================");
  console.log(`👤 Deployer Address: ${deployer.address}`);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Deployer Balance: ${ethers.formatEther(balance)} AVAX`);
  console.log(`🌐 Target Network:   ${network.name} (ChainID: ${(await ethers.provider.getNetwork()).chainId})`);
  console.log("----------------------------------------------------\n");

  const FUJI_TELEPORTER_MESSENGER = process.env.TELEPORTER_MESSENGER_FUJI || "0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf";

  if (network.name === "fuji") {
    // -----------------------------------------------------------------
    // 1. TRIỂN KHAI TRÊN AVALANCHE FUJI C-CHAIN
    // -----------------------------------------------------------------
    console.log("📦 [1/2] Đang triển khai FamilyYieldVault trên Fuji C-Chain...");

    const familyL1IdBytes32 = ethers.keccak256(
      ethers.toUtf8Bytes(process.env.FAMILY_L1_CHAIN_ID || "FamilyL1")
    );
    const existingHubAddress = process.env.FAMILY_HUB_ADDRESS || ethers.ZeroAddress;

    const YieldVaultFactory = await ethers.getContractFactory("FamilyYieldVault");
    const yieldVault = await YieldVaultFactory.deploy(
      FUJI_TELEPORTER_MESSENGER,
      familyL1IdBytes32,
      existingHubAddress
    );
    await yieldVault.waitForDeployment();
    const vaultAddress = await yieldVault.getAddress();

    console.log(`✅ FamilyYieldVault đã triển khai thành công tại: ${vaultAddress}`);
    console.log(`👉 Hãy cập nhật vào .env: FAMILY_YIELD_VAULT_ADDRESS=${vaultAddress}\n`);

  } else if (network.name === "familyL1") {
    // -----------------------------------------------------------------
    // 2. TRIỂN KHAI TRÊN AVALANCHE FAMILY L1 (GASLESS SUBNET)
    // -----------------------------------------------------------------
    console.log("📦 [2/2] Đang triển khai FamilyHub trên Family L1 (Gas = 0)...");

    const existingVaultAddress = process.env.FAMILY_YIELD_VAULT_ADDRESS || ethers.ZeroAddress;
    const cChainBlockchainId = ethers.keccak256(ethers.toUtf8Bytes("Fuji-C-Chain-43113"));

    const FamilyHubFactory = await ethers.getContractFactory("FamilyHub");
    const familyHub = await FamilyHubFactory.deploy(
      deployer.address,
      FUJI_TELEPORTER_MESSENGER,
      cChainBlockchainId,
      existingVaultAddress
    );
    await familyHub.waitForDeployment();
    const hubAddress = await familyHub.getAddress();

    console.log(`✅ FamilyHub đã triển khai thành công tại: ${hubAddress}`);

    // Triển khai VaultCashflow
    const VaultCashflowFactory = await ethers.getContractFactory("VaultCashflow");
    const vaultCashflow = await VaultCashflowFactory.deploy(
      deployer.address,
      hubAddress,
      FUJI_TELEPORTER_MESSENGER,
      cChainBlockchainId,
      existingVaultAddress
    );
    await vaultCashflow.waitForDeployment();
    const cashflowAddress = await vaultCashflow.getAddress();
    console.log(`✅ VaultCashflow đã triển khai thành công tại: ${cashflowAddress}`);

    await familyHub.setVaultCashflow(cashflowAddress);
    console.log(`🔗 Đã kết nối FamilyHub <-> VaultCashflow`);
    console.log(`👉 Cập nhật vào .env: FAMILY_HUB_ADDRESS=${hubAddress}`);
    console.log(`👉 Cập nhật vào .env: VAULT_CASHFLOW_ADDRESS=${cashflowAddress}\n`);

  } else {
    // -----------------------------------------------------------------
    // 3. MÔI TRƯỜNG LOCAL / HARDHAT NETWORK (DEMO TỔNG THỂ)
    // -----------------------------------------------------------------
    console.log("🛠️ Triển khai toàn bộ hệ thống trên Hardhat Local Network...");

    const MockTeleporterFactory = await ethers.getContractFactory("MockTeleporterMessenger");
    const mockTeleporter = await MockTeleporterFactory.deploy();
    await mockTeleporter.waitForDeployment();
    const mockTeleporterAddress = await mockTeleporter.getAddress();
    console.log(`📍 MockTeleporter:  ${mockTeleporterAddress}`);

    const YieldVaultFactory = await ethers.getContractFactory("FamilyYieldVault");
    const yieldVault = await YieldVaultFactory.deploy(
      mockTeleporterAddress,
      ethers.ZeroHash,
      ethers.ZeroAddress
    );
    await yieldVault.waitForDeployment();
    const yieldVaultAddress = await yieldVault.getAddress();
    console.log(`📍 FamilyYieldVault: ${yieldVaultAddress}`);

    const cChainBlockchainId = ethers.keccak256(ethers.toUtf8Bytes("Fuji-C-Chain-43113"));
    const FamilyHubFactory = await ethers.getContractFactory("FamilyHub");
    const familyHub = await FamilyHubFactory.deploy(
      deployer.address,
      mockTeleporterAddress,
      cChainBlockchainId,
      yieldVaultAddress
    );
    await familyHub.waitForDeployment();
    const familyHubAddress = await familyHub.getAddress();
    console.log(`📍 FamilyHub:        ${familyHubAddress}`);

    const VaultCashflowFactory = await ethers.getContractFactory("VaultCashflow");
    const vaultCashflow = await VaultCashflowFactory.deploy(
      deployer.address,
      familyHubAddress,
      mockTeleporterAddress,
      cChainBlockchainId,
      yieldVaultAddress
    );
    await vaultCashflow.waitForDeployment();
    const vaultCashflowAddress = await vaultCashflow.getAddress();
    console.log(`📍 VaultCashflow:     ${vaultCashflowAddress}`);

    await familyHub.setVaultCashflow(vaultCashflowAddress);
    console.log(`🔗 Đã liên kết FamilyHub <-> VaultCashflow`);

    // Cập nhật cấu hình liên chuỗi cho YieldVault
    await yieldVault.updateTeleporterConfig(
      mockTeleporterAddress,
      ethers.keccak256(ethers.toUtf8Bytes("Family-L1")),
      familyHubAddress
    );

    // Khởi tạo 4 Hũ tiền mẫu đại diện cho 4 cách sử dụng
    console.log("\n📦 Khởi tạo 4 Hũ mẫu với kiến trúc Hũ Dòng Tiền Hợp Nhất...");
    const signers = await ethers.getSigners();
    const guardian1 = signers[1] || deployer;
    const guardian2 = signers[2] || deployer;
    const beneficiary1 = signers[3] || deployer;

    // Hũ 1: SHIELD (Bảo vệ & Hưu trí)
    await familyHub.createCustomVault(
      "Hũ Báo Hiếu Ông Bà",
      0, // SHIELD
      1000, // 10% L1 buffer
      ethers.parseEther("50"),
      2,
      [deployer.address, guardian1.address, guardian2.address],
      [beneficiary1.address]
    );

    // Hũ 2: MILESTONE (Việc nhà & Cột mốc)
    await familyHub.createCustomVault(
      "Hũ Lì Xì & Việc Nhà Bé Na",
      1, // MILESTONE
      1000,
      0,
      1,
      [deployer.address],
      [beneficiary1.address]
    );

    // Hũ 3: ROSCA (Họ Hụi Góp Vốn Xoay Vòng)
    await familyHub.createAdvancedVault(
      "Quỹ Góp Vốn Họ Hụi Anh Em",
      2, // ROSCA
      0, // 100% C-Chain sinh lời
      0,
      2,
      [deployer.address, guardian1.address],
      [deployer.address, guardian1.address, beneficiary1.address],
      0,
      0,
      7 * 24 * 3600, // 7 ngày/kỳ
      ethers.parseEther("10") // 10 AVAX mỗi kỳ
    );

    // Hũ 4: SHARED_GOAL (Mục tiêu chung)
    await familyHub.createAdvancedVault(
      "Quỹ Du Lịch Đà Lạt Cả Nhà",
      3, // SHARED_GOAL
      2000, // 20% L1 buffer
      0,
      2,
      [deployer.address, guardian1.address],
      [deployer.address, guardian1.address, beneficiary1.address],
      ethers.parseEther("200"), // Mục tiêu 200 AVAX
      Math.floor(Date.now() / 1000) + 90 * 24 * 3600, // Hạn chót 90 ngày
      0,
      0
    );

    console.log("✅ Đã khởi tạo 4 Hũ tiền mẫu thành công (SHIELD, MILESTONE, ROSCA, SHARED_GOAL)!");
    console.log("\n🎉 Triển khai thử nghiệm toàn diện thành công!");
  }
}

main().catch((error) => {
  console.error("❌ Lỗi khi triển khai hợp đồng:", error);
  process.exitCode = 1;
});
