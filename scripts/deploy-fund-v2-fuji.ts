import { ethers, network } from "hardhat";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * @notice Triển khai Kinetix Fund V2 (Factory và Implementation) trên Avalanche Fuji Testnet (Chain ID 43113).
 * Lưu chứng thực triển khai vào shared/deployment-v2.json và thư mục deployments/.
 */
async function main() {
  console.log("=================================================================");
  console.log("  KINETIX FUND V2 - DEPLOYMENT SCRIPT (AVALANCHE FUJI C-CHAIN)   ");
  console.log("=================================================================");

  const chain = await ethers.provider.getNetwork();
  const chainId = Number(chain.chainId);

  const isFuji = chainId === 43113;
  const isSimulation = chainId === 31337 || process.argv.includes("--simulate");

  if (!isFuji && !isSimulation) {
    throw new Error(
      `Mạng không hợp lệ (Chain ID: ${chainId}). Script triển khai V2 chỉ hỗ trợ Avalanche Fuji (43113) hoặc Hardhat simulation (31337).`,
    );
  }

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("Không tìm thấy Signer cấu hình để thực hiện giao dịch.");
  }

  const deployerAddress = await deployer.getAddress();
  if (
    isFuji &&
    deployerAddress.toLowerCase() ===
      "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
  ) {
    throw new Error(
      "PUBLIC_DEVELOPMENT_SIGNER_FORBIDDEN: Không sử dụng ví dev mặc định trên mạng Fuji.",
    );
  }

  const balance = await ethers.provider.getBalance(deployerAddress);
  console.log(`- Mạng: ${network.name} (Chain ID: ${chainId})`);
  console.log(`- Địa chỉ Deployer: ${deployerAddress}`);
  console.log(`- Số dư khả dụng: ${ethers.formatEther(balance)} AVAX`);

  if (balance === 0n) {
    throw new Error(
      "Số dư Deployer bằng 0. Vui lòng nạp AVAX testnet vào ví trước khi triển khai.",
    );
  }

  console.log("\n[1/3] Đang gửi transaction triển khai KinetixFundFactoryV2...");
  const factoryArtifact = await ethers.getContractFactory(
    "KinetixFundFactoryV2",
    deployer,
  );
  const factory = await factoryArtifact.deploy();
  const deploymentTx = factory.deploymentTransaction();
  if (!deploymentTx) throw new Error("Không tạo được deployment transaction.");

  console.log(`  -> Giao dịch đã phát: ${deploymentTx.hash}`);
  const confirmations = isFuji ? 2 : 1;
  console.log(`  -> Đang chờ ${confirmations} khối xác nhận...`);

  const receipt = await deploymentTx.wait(confirmations);
  if (!receipt || receipt.status !== 1) {
    throw new Error("Giao dịch triển khai thất bại trên mạng blockchain.");
  }

  const factoryAddress = await factory.getAddress();
  const implementationAddress = await factory.implementation();

  console.log("\n[2/3] Kiểm tra bytecode runtime trên blockchain...");
  const factoryCode = await ethers.provider.getCode(factoryAddress);
  const implementationCode = await ethers.provider.getCode(
    implementationAddress,
  );

  if (factoryCode === "0x" || implementationCode === "0x") {
    throw new Error(
      "Bytecode runtime không tồn tại trên mạng sau khi triển khai.",
    );
  }

  const factoryRuntimeHash = ethers.keccak256(factoryCode);
  const implementationRuntimeHash = ethers.keccak256(implementationCode);

  console.log(`  -> KinetixFundFactoryV2: ${factoryAddress}`);
  console.log(`  -> KinetixFundV2 (Implementation): ${implementationAddress}`);
  console.log(`  -> Block Number: ${receipt.blockNumber}`);
  console.log(`  -> Gas Used: ${receipt.gasUsed.toString()}`);

  console.log("\n[3/3] Xuất chứng thực triển khai...");
  const rpcUrl =
    process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc";
  const explorerUrl = "https://testnet.snowtrace.io";

  const evidence = {
    schemaVersion: 2,
    version: "2.0.0",
    status: "verified",
    enabled: true,
    network: isFuji ? "fuji" : "hardhat-sim",
    chainId,
    rpcUrl: isFuji ? rpcUrl : "http://127.0.0.1:8545",
    explorerUrl: isFuji ? explorerUrl : "",
    factory: factoryAddress,
    implementation: implementationAddress,
    deployer: deployerAddress,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber.toString(),
    blockHash: receipt.blockHash,
    factoryRuntimeHash,
    implementationRuntimeHash,
    contracts: {
      factory: {
        address: factoryAddress,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber.toString(),
        runtimeCodeHash: factoryRuntimeHash,
      },
      implementation: {
        address: implementationAddress,
        runtimeCodeHash: implementationRuntimeHash,
      },
    },
    features: {
      native: true,
      erc20: false,
      crossChain: false,
      yield: false,
      relayer: false,
    },
    asset: "native",
    verification: "receipt-and-code-presence-only",
    deployedAt: new Date().toISOString(),
    note: "Kinetix Shared Funds V2 verified on Avalanche Fuji C-Chain.",
  };

  // Lưu vào shared/deployment-v2.json
  const sharedPath = resolve("shared/deployment-v2.json");
  writeFileSync(sharedPath, JSON.stringify(evidence, null, 2) + "\n");
  console.log(`  -> Đã cập nhật file: ${sharedPath}`);

  // Lưu bản lưu trữ vào deployments/
  const deploymentsDir = resolve("deployments");
  mkdirSync(deploymentsDir, { recursive: true });
  const archivePath = resolve(
    deploymentsDir,
    `fund-v2-${isFuji ? "fuji" : "hardhat"}-${receipt.hash}.json`,
  );
  writeFileSync(archivePath, JSON.stringify(evidence, null, 2) + "\n");
  console.log(`  -> Đã lưu bản lưu trữ: ${archivePath}`);

  if (isFuji) {
    console.log("\nSnowtrace Explorer:");
    console.log(`  - Factory: ${explorerUrl}/address/${factoryAddress}`);
    console.log(`  - Implementation: ${explorerUrl}/address/${implementationAddress}`);
    console.log(`  - Tx: ${explorerUrl}/tx/${receipt.hash}`);
  }

  console.log("\n=== TRIỂN KHAI HOÀN TẤT THÀNH CÔNG ===");
}

main().catch((error: unknown) => {
  console.error(
    "Lỗi triển khai V2:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
