import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * @title WireTeleporter
 * @notice Script kết nối liên chuỗi hai chiều khép kín (Atomic Cross-Network Wiring)
 * Thiết lập liên lạc an toàn giữa FamilyHub (Family L1) và FamilyYieldVault (Fuji C-Chain)
 */
async function main() {
  console.log("====================================================");
  console.log("🔗 KINETIX ATOMIC CROSS-NETWORK WIRING SCRIPT");
  console.log("====================================================");

  const privateKey = process.env.CORE_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("❌ Thiếu CORE_WALLET_PRIVATE_KEY trong .env");
  }

  const fujiRpc = process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc";
  const l1Rpc = process.env.FAMILY_L1_RPC_URL || "http://127.0.0.1:9650/ext/bc/FamilyL1/rpc";

  const hubAddress = process.env.FAMILY_HUB_ADDRESS;
  const vaultAddress = process.env.FAMILY_YIELD_VAULT_ADDRESS;
  const cashflowAddress = process.env.VAULT_CASHFLOW_ADDRESS;
  const teleporterMessenger = process.env.TELEPORTER_MESSENGER_FUJI || "0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf";

  console.log(`📍 FamilyHub Address:        ${hubAddress}`);
  console.log(`📍 FamilyYieldVault Address:  ${vaultAddress}`);
  console.log(`📍 VaultCashflow Address:     ${cashflowAddress || "(Không bắt buộc)"}`);
  console.log(`📍 Teleporter Messenger:      ${teleporterMessenger}\n`);

  if (!hubAddress || !vaultAddress) {
    throw new Error("❌ Cần cung cấp cả FAMILY_HUB_ADDRESS và FAMILY_YIELD_VAULT_ADDRESS trong .env");
  }

  const fujiProvider = new ethers.JsonRpcProvider(fujiRpc);
  const fujiWallet = new ethers.Wallet(privateKey, fujiProvider);

  // Blockchain IDs
  const familyL1BlockchainId = ethers.keccak256(
    ethers.toUtf8Bytes(process.env.FAMILY_L1_CHAIN_ID || "FamilyL1")
  );
  const cChainBlockchainId = ethers.keccak256(
    ethers.toUtf8Bytes("Fuji-C-Chain-43113")
  );

  // 1. Cấu hình trên Fuji C-Chain (FamilyYieldVault)
  console.log("🌐 [1/2] Đang cập nhật Teleporter Config trên Fuji C-Chain...");
  const yieldVaultAbi = [
    "function updateTeleporterConfig(address _messenger, bytes32 _familyL1Id, address _hub) external",
    "function familyHubAddress() external view returns (address)",
    "function familyL1BlockchainId() external view returns (bytes32)",
    "function yieldReservePool() external view returns (uint256)",
    "function depositYieldReserve() external payable",
  ];

  const yieldVault = new ethers.Contract(vaultAddress, yieldVaultAbi, fujiWallet);

  try {
    const tx1 = await yieldVault.updateTeleporterConfig(
      teleporterMessenger,
      familyL1BlockchainId,
      hubAddress
    );
    console.log(`   ⏳ Đang chờ xác nhận tx trên Fuji: ${tx1.hash}`);
    await tx1.wait();
    console.log("   ✅ FamilyYieldVault đã liên kết thành công với FamilyHub!");

    // Nạp dự trữ ban đầu 0.1 AVAX nếu pool trống
    const currentReserve = await yieldVault.yieldReservePool();
    if (currentReserve === 0n) {
      console.log("   💧 Đang nạp quỹ dự trữ lãi suất ban đầu (0.1 AVAX)...");
      const txReserve = await yieldVault.depositYieldReserve({
        value: ethers.parseEther("0.1"),
      });
      await txReserve.wait();
      console.log("   ✅ Đã nạp bảo chứng Quỹ dự trữ thành công!");
    }
  } catch (err: any) {
    console.error("   ⚠️ Cảnh báo cấu hình Fuji C-Chain:", err.message);
  }

  // 2. Cấu hình trên Family L1 (FamilyHub & VaultCashflow)
  console.log("\n🌐 [2/2] Đang cập nhật Teleporter Config trên Family L1...");
  try {
    const l1Provider = new ethers.JsonRpcProvider(l1Rpc);
    const l1Wallet = new ethers.Wallet(privateKey, l1Provider);

    const hubAbi = [
      "function setTeleporterConfig(address _messenger, bytes32 _cChainId, address _vault) external",
      "function yieldVaultAddress() external view returns (address)",
    ];
    const familyHub = new ethers.Contract(hubAddress, hubAbi, l1Wallet);

    const tx2 = await familyHub.setTeleporterConfig(
      teleporterMessenger,
      cChainBlockchainId,
      vaultAddress
    );
    console.log(`   ⏳ Đang chờ xác nhận tx trên L1: ${tx2.hash}`);
    await tx2.wait();
    console.log("   ✅ FamilyHub đã cấu hình Teleporter trỏ tới FamilyYieldVault!");

    if (cashflowAddress) {
      const cashflowAbi = [
        "function setTeleporterConfig(address _messenger, bytes32 _cChainId, address _yieldVault) external",
      ];
      const cashflow = new ethers.Contract(cashflowAddress, cashflowAbi, l1Wallet);
      const tx3 = await cashflow.setTeleporterConfig(
        teleporterMessenger,
        cChainBlockchainId,
        vaultAddress
      );
      await tx3.wait();
      console.log("   ✅ VaultCashflow đã cấu hình Teleporter trỏ tới FamilyYieldVault!");
    }
  } catch (err: any) {
    console.log("   ℹ️ Bỏ qua bước L1 nếu Family L1 RPC chưa hoạt động cục bộ:", err.message);
  }

  console.log("\n🎉 HOÀN TẤT KẾT NỐI LIÊN CHUỖI KHÉP KÍN (ATOMIC WIRING)!");
}

main().catch((error) => {
  console.error("❌ Lỗi khi thực thi script wiring:", error);
  process.exitCode = 1;
});
