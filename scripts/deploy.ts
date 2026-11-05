import { artifacts, network } from "hardhat";
import { ethers } from "ethers";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  renameSync,
} from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import {
  DeploymentContract,
  DeploymentManifest,
  validateDeployment,
} from "../shared/deploymentManifest";

/** Deploy mới T1 có journal từng transaction; không chạm DB, không tạo hũ seed. */
async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc");
  if (
    network.name === "familyL1" ||
    (await provider.getNetwork()).chainId !== 43113n
  )
    throw new Error("FUJI_43113_REQUIRED");
  const key = process.env.DEPLOYER_PRIVATE_KEY || process.env.CORE_WALLET_PRIVATE_KEY;
  if (!key) throw new Error("DEPLOYMENT_SIGNER_MISSING");
  const deployer = new ethers.Wallet(key.startsWith("0x") ? key : `0x${key}`, provider);
  if (deployer.address.toLowerCase() === "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266") throw new Error("PUBLIC_DEVELOPMENT_SIGNER_FORBIDDEN");
  const feeCeiling = ethers.parseUnits(
    process.env.DEPLOY_MAX_FEE_GWEI || "50",
    "gwei",
  );
  const estimatedFees = await provider.getFeeData();
  const recommended = (estimatedFees.maxFeePerGas || estimatedFees.gasPrice || feeCeiling) * 2n;
  const maxFee = recommended < feeCeiling ? recommended : feeCeiling;
  const balance = await provider.getBalance(deployer.address);
  if (balance < maxFee * 8000000n)
    throw new Error("INSUFFICIENT_DEPLOYMENT_GAS_BUDGET");
  const sourceHash = `0x${createHash("sha256")
    .update(
      JSON.stringify(
        await artifacts.getBuildInfo("contracts/FamilyHub.sol:FamilyHub"),
      ),
    )
    .digest("hex")}`;
  const directory = resolve("deployments", "fuji", sourceHash.slice(2, 18));
  mkdirSync(directory, { recursive: true });
  const journalPath = resolve(directory, "journal.json");
  const journal: any = existsSync(journalPath)
    ? JSON.parse(readFileSync(journalPath, "utf8"))
    : {
        chainId: 43113,
        deployer: deployer.address,
        sourceHash,
        transactions: {},
        contracts: {},
      };
  if (
    journal.deployer.toLowerCase() !== deployer.address.toLowerCase() ||
    journal.sourceHash !== sourceHash
  )
    throw new Error("JOURNAL_IDENTITY_MISMATCH");
  const save = () =>
    writeFileSync(journalPath, JSON.stringify(journal, null, 2) + "\n");
  const overrides = {
    maxFeePerGas: maxFee,
    maxPriorityFeePerGas: estimatedFees.maxPriorityFeePerGas && estimatedFees.maxPriorityFeePerGas < maxFee ? estimatedFees.maxPriorityFeePerGas : maxFee,
  };
  const deploy = async (name: string, key: string, args: unknown[]) => {
    const artifact = await artifacts.readArtifact(name);
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
    let hash = journal.transactions[key];
    if (!hash) {
      const contract = await factory.deploy(...args, overrides);
      hash = contract.deploymentTransaction()!.hash;
      journal.transactions[key] = hash;
      save();
    }
    const receipt = await provider.waitForTransaction(hash, 1, 180000);
    if (!receipt || receipt.status !== 1 || !receipt.contractAddress)
      throw new Error(`DEPLOYMENT_RECEIPT_FAILED:${key}:${hash}`);
    const address = receipt.contractAddress;
    const code = await provider.getCode(address);
    if (code === "0x") throw new Error(`DEPLOYMENT_CODE_MISSING:${key}`);
    journal.contracts[key] = {
      address: address as `0x${string}`,
      transactionHash: hash as `0x${string}`,
      blockNumber: String(receipt.blockNumber),
      runtimeCodeHash: ethers.keccak256(code) as `0x${string}`,
    } satisfies DeploymentContract;
    save();
    return factory.attach(address) as any;
  };
  const hub = await deploy("FamilyHub", "hub", [
    deployer.address,
    ethers.ZeroAddress,
    ethers.ZeroHash,
    ethers.ZeroAddress,
  ]);
  const cashflow = await deploy("VaultCashflow", "cashflow", [
    deployer.address,
    hub.target,
    ethers.ZeroAddress,
    ethers.ZeroHash,
    ethers.ZeroAddress,
  ]);
  const forwarder = await deploy("KinetixForwarder", "forwarder", []);
  for (const [key, method, address] of [
    ["cashflowWiring", "setVaultCashflow", cashflow.target],
    ["forwarderWiring", "setTrustedForwarder", forwarder.target],
  ]) {
    let hash = journal.transactions[key];
    if (!hash) {
      const transaction = await hub[method](address, overrides);
      hash = transaction.hash;
      journal.transactions[key] = hash;
      save();
    }
    const receipt = await provider.waitForTransaction(hash, 1, 180000);
    if (!receipt || receipt.status !== 1)
      throw new Error(`WIRING_FAILED:${key}:${hash}`);
  }
  if (
    (await hub.vaultCashflow()).toLowerCase() !==
      String(cashflow.target).toLowerCase() ||
    (await hub.trustedForwarder()).toLowerCase() !==
      String(forwarder.target).toLowerCase() ||
    (await cashflow.controller()).toLowerCase() !==
      String(hub.target).toLowerCase() ||
    (await hub.crossChainEnabled()) ||
    (await hub.yieldEnabled()) ||
    (await hub.deploymentVersion()) !== "2.0.0-t1"
  )
    throw new Error("WIRING_VERIFICATION_FAILED");
  const manifest: DeploymentManifest = validateDeployment({
    ...JSON.parse(readFileSync(resolve("shared/deployment.json"), "utf8")),
    enabled: true,
    status: "verified",
    chainId: 43113,
    mode: "single-chain",
    version: "2.0.0-t1",
    deploymentBlock: journal.contracts.hub.blockNumber,
    compiler: "0.8.26",
    evmVersion: "cancun",
    sourceHash,
    admin: deployer.address,
    contracts: { ...journal.contracts, yieldVault: null },
    wiring: [
      journal.transactions.cashflowWiring,
      journal.transactions.forwarderWiring,
    ],
  });
  writeFileSync(
    resolve(directory, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  // Candidate stays separate until an explicit activation verifies finalized receipts.
  console.log(
    JSON.stringify({
      status: "CANDIDATE_DEPLOYED",
      manifest: resolve(directory, "manifest.json"),
      hub: hub.target,
      chainId: 43113,
    }),
  );
  provider.destroy();
}

main().catch((error) => {
  console.error(
    "Deployment stopped:",
    error?.shortMessage || error?.code || error?.message || "UNKNOWN",
  );
  process.exitCode = 1;
});
