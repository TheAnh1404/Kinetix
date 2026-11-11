import { artifacts, ethers, network } from "hardhat";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DeploymentContract } from "../shared/deploymentManifest";
import {
  deploymentDirectory,
  readChainDeployment,
  requireAddress,
  requireBlockchainId,
  saveChainDeployment,
} from "./lib/dualChainDeployment";

/** Deploy theo mạng Hardhat chọn; journal giữ receipt để chạy lại an toàn. */
export async function main() {
  const chainId = network.config.chainId;
  const familyChainId = Number(process.env.FAMILY_L1_CHAIN_ID || "99999");
  if (
    chainId !== 43113 &&
    (network.name !== "familyL1" || chainId !== familyChainId)
  )
    throw new Error("UNSUPPORTED_DEPLOYMENT_NETWORK");
  if ((await ethers.provider.getNetwork()).chainId !== BigInt(chainId))
    throw new Error("RPC_CHAIN_ID_MISMATCH");
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("DEPLOYMENT_SIGNER_MISSING");
  if (
    deployer.address.toLowerCase() ===
    "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
  )
    throw new Error("PUBLIC_DEVELOPMENT_SIGNER_FORBIDDEN");
  const fuji = chainId === 43113;
  const messenger = requireAddress(
    process.env[
      fuji ? "TELEPORTER_MESSENGER_FUJI" : "TELEPORTER_MESSENGER_FAMILY_L1"
    ],
    "MESSENGER",
  );
  if ((await ethers.provider.getCode(messenger)) === "0x")
    throw new Error("MESSENGER_CODE_MISSING");
  const remoteId = requireBlockchainId(
    process.env[fuji ? "FAMILY_L1_BLOCKCHAIN_ID" : "CCHAIN_BLOCKCHAIN_ID"],
    "REMOTE_BLOCKCHAIN_ID",
  );
  const remoteVault = fuji
    ? undefined
    : requireAddress(
        process.env.FAMILY_YIELD_VAULT_ADDRESS ||
          readChainDeployment(43113)?.contracts.yieldVault?.address,
        "FAMILY_YIELD_VAULT_ADDRESS",
      );
  const reserve = ethers.parseEther(
    process.env.INITIAL_YIELD_RESERVE_AVAX || "0.1",
  );
  if (fuji && reserve <= 0n) throw new Error("POSITIVE_YIELD_RESERVE_REQUIRED");
  const sourceHash = `0x${createHash("sha256")
    .update(
      JSON.stringify(
        await Promise.all(
          [
            "FamilyYieldVault",
            "FamilyHub",
            "VaultCashflow",
            "KinetixForwarder",
          ].map((name) => artifacts.readArtifact(name)),
        ),
      ),
    )
    .digest("hex")}`;
  const directory = resolve(
    deploymentDirectory(),
    String(chainId),
    sourceHash.slice(2, 18),
  );
  mkdirSync(directory, { recursive: true });
  const path = resolve(directory, "journal.json");
  const identity = {
    chainId,
    deployer: deployer.address,
    sourceHash,
    messenger,
    remoteId,
    remoteVault: remoteVault || null,
    reserve: fuji ? reserve.toString() : null,
  };
  const journal: {
    identity: typeof identity;
    transactions: Record<string, string>;
    contracts: Record<string, DeploymentContract>;
  } = existsSync(path)
    ? JSON.parse(readFileSync(path, "utf8"))
    : { identity, transactions: {}, contracts: {} };
  if (JSON.stringify(journal.identity) !== JSON.stringify(identity))
    throw new Error("JOURNAL_IDENTITY_MISMATCH");
  const save = () =>
    writeFileSync(path, JSON.stringify(journal, null, 2) + "\n");
  const ceiling = ethers.parseUnits(
    process.env.DEPLOY_MAX_FEE_GWEI || "50",
    "gwei",
  );
  const fees = await ethers.provider.getFeeData();
  if (fuji && (fees.gasPrice || 0n) > ceiling)
    throw new Error("DEPLOYMENT_FEE_CEILING_EXCEEDED");
  const overrides = fuji
    ? { gasPrice: fees.gasPrice || ceiling }
    : { gasPrice: 0n };
  const confirm = async (hash: string) => {
    // HardhatEthersProvider không cài waitForTransaction; poll receipt dùng được cả hai mạng.
    const deadline = Date.now() + 180000;
    while (Date.now() < deadline) {
      const receipt = await ethers.provider.getTransactionReceipt(hash);
      if (receipt) {
        if (receipt.status !== 1) throw new Error(`RECEIPT_FAILED:${hash}`);
        return receipt;
      }
      await new Promise((done) => setTimeout(done, 1000));
    }
    throw new Error(`RECEIPT_TIMEOUT:${hash}`);
  };
  const deploy = async (name: string, key: string, args: unknown[]) => {
    const factory = await ethers.getContractFactory(name, deployer);
    if (!journal.transactions[key]) {
      const instance = await factory.deploy(...args, overrides);
      journal.transactions[key] = instance.deploymentTransaction()!.hash;
      save();
    }
    const receipt = await confirm(journal.transactions[key]);
    if (!receipt.contractAddress)
      throw new Error(`CONTRACT_ADDRESS_MISSING:${key}`);
    const code = await ethers.provider.getCode(receipt.contractAddress);
    if (code === "0x") throw new Error(`CONTRACT_CODE_MISSING:${key}`);
    journal.contracts[key] = {
      address: receipt.contractAddress as `0x${string}`,
      transactionHash: receipt.hash as `0x${string}`,
      blockNumber: String(receipt.blockNumber),
      runtimeCodeHash: ethers.keccak256(code) as `0x${string}`,
    };
    save();
    return factory.attach(receipt.contractAddress) as any;
  };
  const transact = async (key: string, send: () => Promise<any>) => {
    if (!journal.transactions[key]) {
      journal.transactions[key] = (await send()).hash;
      save();
    }
    await confirm(journal.transactions[key]);
  };
  if (fuji) {
    const vault = await deploy("FamilyYieldVault", "yieldVault", [
      messenger,
      remoteId,
      ethers.ZeroAddress,
    ]);
    await transact("seedReserve", () =>
      vault.seedYieldReserve({ ...overrides, value: reserve }),
    );
    if ((await vault.yieldReservePool()) <= 0n)
      throw new Error("RESERVE_VERIFICATION_FAILED");
  } else {
    const hub = await deploy("FamilyHub", "hub", [
      deployer.address,
      messenger,
      remoteId,
      remoteVault,
    ]);
    const cashflow = await deploy("VaultCashflow", "cashflow", [
      deployer.address,
      hub.target,
      messenger,
      remoteId,
      remoteVault,
    ]);
    const forwarder = await deploy("KinetixForwarder", "forwarder", []);
    await transact("cashflowWiring", () =>
      hub.setVaultCashflow(cashflow.target, overrides),
    );
    await transact("forwarderWiring", () =>
      hub.setTrustedForwarder(forwarder.target, overrides),
    );
    if (
      (await hub.vaultCashflow()) !== cashflow.target ||
      (await hub.trustedForwarder()) !== forwarder.target ||
      (await cashflow.controller()) !== hub.target
    )
      throw new Error("LOCAL_WIRING_VERIFICATION_FAILED");
  }
  const deployment = {
    chainId,
    sourceHash,
    admin: deployer.address,
    contracts: journal.contracts,
    transactions: journal.transactions,
    status: "awaiting-teleporter-wiring",
  };
  saveChainDeployment(deployment);
  console.log(
    JSON.stringify({
      chainId,
      status: deployment.status,
      contracts: journal.contracts,
      journal: path,
    }),
  );
}

if (require.main === module)
  main().catch((error) => {
    console.error(
      "Deployment stopped:",
      error?.shortMessage || error?.code || error?.message || "UNKNOWN",
    );
    process.exitCode = 1;
  });
