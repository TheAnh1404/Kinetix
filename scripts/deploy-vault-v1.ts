import { artifacts, network } from "hardhat";
import { ethers } from "ethers";
import { resolve } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";

/**
 * @notice Kịch bản triển khai Kinetix Vault V1 (Implementation & Factory EIP-1167)
 * trên mạng Avalanche Fuji Testnet (Chain ID 43113) hoặc mạng cục bộ Hardhat.
 */
async function main() {
  console.log("=== BẮT ĐẦU QUY TRÌNH TRIỂN KHAI KINETIX VAULT V1 (EIP-1167 CLONES) ===");

  const rpcUrl =
    network.name === "fuji"
      ? process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc"
      : "http://127.0.0.1:8545";

  let deployer: ethers.Wallet | ethers.Signer;
  let provider: ethers.Provider;

  if (network.name === "fuji") {
    provider = new ethers.JsonRpcProvider(rpcUrl);
    const key =
      process.env.DEPLOYER_PRIVATE_KEY || process.env.CORE_WALLET_PRIVATE_KEY;
    if (!key) throw new Error("DEPLOYER_PRIVATE_KEY hoặc CORE_WALLET_PRIVATE_KEY chưa được cấu hình.");
    deployer = new ethers.Wallet(key.startsWith("0x") ? key : `0x${key}`, provider);
  } else {
    // Hardhat in-process / localhost
    const signers = await (await import("hardhat")).ethers.getSigners();
    deployer = signers[0];
    provider = (await import("hardhat")).ethers.provider;
  }

  const deployerAddress = await deployer.getAddress();
  const balance = await provider.getBalance(deployerAddress);
  console.log(`- Mạng triển khai: ${network.name}`);
  console.log(`- Ví Deployer: ${deployerAddress}`);
  console.log(`- Số dư khả dụng: ${ethers.formatEther(balance)} AVAX`);

  // 1. Triển khai Hợp đồng Mẫu Logic KinetixVaultV1 (Implementation)
  console.log("\n[1/3] Đang triển khai KinetixVaultV1 Implementation...");
  const VaultArtifact = await artifacts.readArtifact("KinetixVaultV1");
  const vaultFactory = new ethers.ContractFactory(
    VaultArtifact.abi,
    VaultArtifact.bytecode,
    deployer
  );
  const implementation = await vaultFactory.deploy();
  await implementation.waitForDeployment();
  const implementationAddress = await implementation.getAddress();
  const implTxHash = implementation.deploymentTransaction()?.hash;
  console.log(`  -> KinetixVaultV1 Implementation: ${implementationAddress}`);
  console.log(`  -> Giao dịch TxHash: ${implTxHash}`);

  // 2. Triển khai KinetixVaultFactoryV1
  console.log("\n[2/3] Đang triển khai KinetixVaultFactoryV1...");
  const FactoryArtifact = await artifacts.readArtifact("KinetixVaultFactoryV1");
  const factoryContract = new ethers.ContractFactory(
    FactoryArtifact.abi,
    FactoryArtifact.bytecode,
    deployer
  );
  const factory = await factoryContract.deploy(implementationAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  const factoryTxHash = factory.deploymentTransaction()?.hash;
  console.log(`  -> KinetixVaultFactoryV1: ${factoryAddress}`);
  console.log(`  -> Giao dịch TxHash: ${factoryTxHash}`);

  // 3. Đối soát on-chain
  console.log("\n[3/3] Xác thực kết nối Factory với Implementation...");
  const registeredImpl = await (factory as any).implementation();
  if (registeredImpl.toLowerCase() !== implementationAddress.toLowerCase()) {
    throw new Error("LỖI ĐỐI SOÁT: Implementation trong Factory không khớp với địa chỉ vừa deploy!");
  }
  console.log("  -> Đối soát on-chain hoàn toàn hợp lệ (100% Verified).");

  // Ghi kết quả ra manifest
  const deploymentRecord = {
    network: network.name,
    chainId: network.name === "fuji" ? 43113 : 31337,
    deployedAt: new Date().toISOString(),
    deployer: deployerAddress,
    contracts: {
      vaultImplementation: {
        address: implementationAddress,
        txHash: implTxHash,
      },
      vaultFactory: {
        address: factoryAddress,
        txHash: factoryTxHash,
      },
    },
  };

  mkdirSync(resolve("deployments"), { recursive: true });
  writeFileSync(
    resolve("deployments", `vault-v1-${network.name}.json`),
    JSON.stringify(deploymentRecord, null, 2) + "\n"
  );
  console.log(`\nManifest lưu thành công tại deployments/vault-v1-${network.name}.json`);
  console.log("=== HOÀN TẤT TRIỂN KHAI THÀNH CÔNG ===");
}

main().catch((error) => {
  console.error("Lỗi khi triển khai:", error);
  process.exitCode = 1;
});
