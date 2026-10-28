import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("====================================================");
  console.log("🚀 KINETIX - TRIỂN KHAI FAMILYHUB TRÊN AVALANCHE FUJI");
  console.log("====================================================");

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer:   ${deployer.address}`);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Số dư:      ${ethers.formatEther(balance)} AVAX`);
  console.log(`🌐 Mạng:       ${network.name} (ChainID: ${(await ethers.provider.getNetwork()).chainId})`);

  if (balance === 0n) {
    throw new Error("Số dư tài khoản Deployer bằng 0. Vui lòng nhận faucet tại https://core.app/tools/testnet-faucet/");
  }

  const cChainBlockchainId = ethers.keccak256(ethers.toUtf8Bytes("Fuji-C-Chain-43113"));

  const existingHub = "0x2873c3B76364E6377912F174e3754AFdfCeae1F6";
  const FamilyHubFactory = await ethers.getContractFactory("FamilyHub");
  const familyHub = FamilyHubFactory.attach(existingHub) as any;
  const hubAddress = existingHub;
  console.log(`✅ Sử dụng FamilyHub đã deploy tại: ${hubAddress}`);

  // Cấp quyền allowlist cho tài khoản người dùng thực tế
  const theAnhWallet = "0xaE99976eEd7D65BfedCAD26D1aF41deCe7004238";
  console.log(`\n🔑 Cấp quyền Allowlist cho ví Core Wallet người dùng: ${theAnhWallet}...`);
  const txAllow = await familyHub.setAllowlistStatus(theAnhWallet, true);
  await txAllow.wait();
  console.log(`✅ Đã cấp quyền allowlist thành công (Tx: ${txAllow.hash})`);

  // Khởi tạo 4 Hũ tiền chuẩn on-chain
  console.log("\n🏦 Đang khởi tạo 4 Hũ tiền chuẩn on-chain...");

  const guardians = [deployer.address, theAnhWallet];
  const beneficiaries = [theAnhWallet];

  // Hũ 1: SHIELD (Hưu trí & Báo hiếu)
  console.log("1. Tạo Hũ #1: Quỹ Hưu Trí & Báo Hiếu (SHIELD, 10% L1 đệm)...");
  const tx1 = await familyHub.createAdvancedVault(
    "Quỹ Hưu Trí & Báo Hiếu (Ông Bà)",
    0, // SHIELD
    1000, // 10% L1 buffer
    ethers.parseEther("50"),
    2,
    guardians,
    beneficiaries,
    0,
    0,
    0,
    0
  );
  await tx1.wait();

  // Hũ 2: MILESTONE (Chore-to-Earn)
  console.log("2. Tạo Hũ #2: Quỹ Cột Mốc & Lì Xì (MILESTONE, 20% L1 đệm)...");
  const tx2 = await familyHub.createAdvancedVault(
    "Quỹ Cột Mốc & Lì Xì (Bé Na)",
    1, // MILESTONE
    2000, // 20% L1 buffer
    ethers.parseEther("20"),
    2,
    guardians,
    beneficiaries,
    0,
    0,
    0,
    0
  );
  await tx2.wait();

  // Hũ 3: ROSCA (Góp vốn xoay vòng)
  console.log("3. Tạo Hũ #3: Hụi Họ Thân Tộc (ROSCA, 0% L1 đệm, 100% C-Chain)...");
  const tx3 = await familyHub.createAdvancedVault(
    "Hụi Họ Thân Tộc",
    2, // ROSCA
    0, // 0% L1 buffer
    ethers.parseEther("1000"),
    2,
    guardians,
    beneficiaries,
    0,
    0,
    7 * 86400, // 7 ngày
    ethers.parseEther("10")
  );
  await tx3.wait();

  // Hũ 4: SHARED_GOAL (Mục tiêu chung)
  console.log("4. Tạo Hũ #4: Quỹ Du Lịch Đà Lạt Cùng Bạn (SHARED_GOAL)...");
  const tx4 = await familyHub.createAdvancedVault(
    "Quỹ Du Lịch Đà Lạt Cùng Bạn",
    3, // SHARED_GOAL
    1500, // 15% L1 buffer
    ethers.parseEther("100"),
    2,
    guardians,
    beneficiaries,
    ethers.parseEther("100"), // Target 100 AVAX
    Math.floor(Date.now() / 1000) + 30 * 86400,
    0,
    0
  );
  await tx4.wait();

  console.log("\n🎉 Khởi tạo 4 Hũ tiền on-chain hoàn tất!");
  console.log("====================================================");
  console.log(`📍 FAMILY_HUB_ADDRESS: ${hubAddress}`);
  console.log(`🔍 Tra cứu Hợp đồng:   https://testnet.snowtrace.io/address/${hubAddress}`);
  console.log("====================================================");

  // Cập nhật file .env
  const envPath = path.resolve(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf-8");
    envContent = envContent.replace(
      /FAMILY_HUB_ADDRESS=".*"/,
      `FAMILY_HUB_ADDRESS="${hubAddress}"`
    );
    fs.writeFileSync(envPath, envContent);
    console.log("📝 Đã cập nhật FAMILY_HUB_ADDRESS vào .env");
  }

  // Cập nhật file frontend/.env.local
  const frontendEnvPath = path.resolve(__dirname, "../frontend/.env.local");
  if (fs.existsSync(frontendEnvPath)) {
    let fEnv = fs.readFileSync(frontendEnvPath, "utf-8");
    if (fEnv.includes("NEXT_PUBLIC_FAMILY_HUB_ADDRESS")) {
      fEnv = fEnv.replace(
        /NEXT_PUBLIC_FAMILY_HUB_ADDRESS=".*"/,
        `NEXT_PUBLIC_FAMILY_HUB_ADDRESS="${hubAddress}"`
      );
    } else {
      fEnv += `\nNEXT_PUBLIC_FAMILY_HUB_ADDRESS="${hubAddress}"\n`;
    }
    fs.writeFileSync(frontendEnvPath, fEnv);
    console.log("📝 Đã cập nhật NEXT_PUBLIC_FAMILY_HUB_ADDRESS vào frontend/.env.local");
  }

  return hubAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Lỗi triển khai:", error);
    process.exit(1);
  });
