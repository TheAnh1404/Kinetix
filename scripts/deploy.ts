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

  const C_CHAIN_ID = 43113;
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

    // Danh sách 3 Guardians mẫu (nếu deploy thật, lấy từ ví các con trong gia đình)
    const guardianAddresses = [
      process.env.GUARDIAN_1 || deployer.address,
      process.env.GUARDIAN_2 || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      process.env.GUARDIAN_3 || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
    ];

    const FamilyHubFactory = await ethers.getContractFactory("FamilyHub");
    const familyHub = await FamilyHubFactory.deploy(
      deployer.address,
      guardianAddresses,
      FUJI_TELEPORTER_MESSENGER,
      cChainBlockchainId,
      existingVaultAddress
    );
    await familyHub.waitForDeployment();
    const hubAddress = await familyHub.getAddress();

    console.log(`✅ FamilyHub đã triển khai thành công tại: ${hubAddress}`);
    console.log(`👉 Hãy cập nhật vào .env: FAMILY_HUB_ADDRESS=${hubAddress}\n`);

  } else {
    // -----------------------------------------------------------------
    // 3. MÔI TRƯỜNG LOCAL / HARDHAT NETWORK (DEMO TỔNG THỂ)
    // -----------------------------------------------------------------
    console.log("🛠️ Triển khai toàn bộ hệ thống trên Hardhat Local Network...");

    const MockTeleporterFactory = await ethers.getContractFactory("MockTeleporterMessenger");
    const mockTeleporter = await MockTeleporterFactory.deploy();
    await mockTeleporter.waitForDeployment();
    console.log(`📍 MockTeleporter:  ${await mockTeleporter.getAddress()}`);

    const YieldVaultFactory = await ethers.getContractFactory("FamilyYieldVault");
    const yieldVault = await YieldVaultFactory.deploy(
      await mockTeleporter.getAddress(),
      ethers.ZeroHash,
      ethers.ZeroAddress
    );
    await yieldVault.waitForDeployment();
    console.log(`📍 FamilyYieldVault: ${await yieldVault.getAddress()}`);

    const signers = await ethers.getSigners();
    const guardians = [signers[1].address, signers[2].address, signers[3].address];

    const FamilyHubFactory = await ethers.getContractFactory("FamilyHub");
    const familyHub = await FamilyHubFactory.deploy(
      deployer.address,
      guardians,
      await mockTeleporter.getAddress(),
      ethers.keccak256(ethers.toUtf8Bytes("Fuji")),
      await yieldVault.getAddress()
    );
    await familyHub.waitForDeployment();
    console.log(`📍 FamilyHub:        ${await familyHub.getAddress()}`);

    console.log("\n🎉 Triển khai thử nghiệm thành công!");
  }
}

main().catch((error) => {
  console.error("❌ Lỗi khi triển khai hợp đồng:", error);
  process.exitCode = 1;
});
