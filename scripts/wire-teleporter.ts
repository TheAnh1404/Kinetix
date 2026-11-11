import "dotenv/config";
import assert from "node:assert/strict";
import { Contract, JsonRpcProvider, NonceManager, Wallet } from "ethers";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  deploymentDirectory,
  readChainDeployment,
  requireAddress,
  requireBlockchainId,
} from "./lib/dualChainDeployment";

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
/** Preflight toàn bộ trước khi gửi; chạy lại an toàn nếu mạng thứ hai gián đoạn. */
export async function wireContracts(
  vault: any,
  hub: any,
  cashflow: any,
  config: {
    familyId: string;
    cChainId: string;
    fujiMessenger: string;
    familyMessenger: string;
    fujiOwner: string;
    familyOwner: string;
  },
  onReceipt: (step: string, hash: string) => void = () => {},
) {
  const vaultAddress = await vault.getAddress();
  const hubAddress = await hub.getAddress();
  assert(same(await vault.owner(), config.fujiOwner), "FUJI_OWNER_MISMATCH");
  assert(
    same(await hub.familyAdmin(), config.familyOwner),
    "FAMILY_ADMIN_MISMATCH",
  );
  assert(
    same(await cashflow.owner(), config.familyOwner),
    "CASHFLOW_OWNER_MISMATCH",
  );
  assert(
    same(await cashflow.controller(), hubAddress),
    "CASHFLOW_CONTROLLER_MISMATCH",
  );
  assert(
    same(await hub.vaultCashflow(), await cashflow.getAddress()),
    "HUB_CASHFLOW_MISMATCH",
  );
  assert((await vault.yieldReservePool()) > 0n, "YIELD_RESERVE_EMPTY");
  const vaultMatches = async () =>
    same(await vault.teleporterMessenger(), config.fujiMessenger) &&
    same(await vault.familyHubAddress(), hubAddress) &&
    same(await vault.familyL1BlockchainId(), config.familyId);
  const hubMatches = async () =>
    same(await hub.teleporterMessenger(), config.familyMessenger) &&
    same(await hub.yieldVaultAddress(), vaultAddress) &&
    same(await hub.cChainBlockchainId(), config.cChainId);
  const cashflowMatches = async () =>
    same(await cashflow.teleporterMessenger(), config.familyMessenger) &&
    same(await cashflow.yieldVaultAddress(), vaultAddress) &&
    same(await cashflow.cChainBlockchainId(), config.cChainId);
  assert(
    (await hubMatches()) || (await hub.vaultCounter()) === 0n,
    "HUB_CONFIGURATION_LOCKED",
  );
  assert(
    (await cashflowMatches()) || (await cashflow.initializedVaults()) === 0n,
    "CASHFLOW_CONFIGURATION_LOCKED",
  );
  const transact = async (step: string, send: () => Promise<any>) => {
    const transaction = await send();
    onReceipt(`${step}:submitted`, transaction.hash);
    const receipt = await transaction.wait();
    assert(receipt?.status === 1, `WIRING_RECEIPT_FAILED:${step}`);
    onReceipt(`${step}:confirmed`, transaction.hash);
  };
  if (!(await vaultMatches()))
    await transact("yieldVault", () =>
      vault.updateTeleporterConfig(
        config.fujiMessenger,
        config.familyId,
        hubAddress,
      ),
    );
  if (!(await hubMatches()))
    await transact("hub", () =>
      hub.setTeleporterConfig(
        config.familyMessenger,
        config.cChainId,
        vaultAddress,
      ),
    );
  if (!(await cashflowMatches()))
    await transact("cashflow", () =>
      cashflow.setTeleporterConfig(
        config.familyMessenger,
        config.cChainId,
        vaultAddress,
      ),
    );
  assert(await vaultMatches(), "VAULT_WIRING_MISMATCH");
  assert(await hubMatches(), "HUB_WIRING_MISMATCH");
  assert(await cashflowMatches(), "CASHFLOW_WIRING_MISMATCH");
  assert((await vault.yieldReservePool()) > 0n, "YIELD_RESERVE_EMPTY");
}

export async function main() {
  const familyChainId = Number(process.env.FAMILY_L1_CHAIN_ID || "99999");
  assert(
    Number.isSafeInteger(familyChainId) &&
      familyChainId > 0 &&
      familyChainId !== 43113,
    "INVALID_FAMILY_CHAIN_ID",
  );
  const familyId = requireBlockchainId(
    process.env.FAMILY_L1_BLOCKCHAIN_ID,
    "FAMILY_L1_BLOCKCHAIN_ID",
  );
  const cChainId = requireBlockchainId(
    process.env.CCHAIN_BLOCKCHAIN_ID,
    "CCHAIN_BLOCKCHAIN_ID",
  );
  assert(
    familyId.toLowerCase() !== cChainId.toLowerCase(),
    "DISTINCT_BLOCKCHAINS_REQUIRED",
  );
  const fujiRecord = readChainDeployment(43113);
  const familyRecord = readChainDeployment(familyChainId);
  const vaultAddress = requireAddress(
    process.env.FAMILY_YIELD_VAULT_ADDRESS ||
      fujiRecord?.contracts.yieldVault?.address,
    "YIELD_VAULT",
  );
  const hubAddress = requireAddress(
    process.env.FAMILY_HUB_ADDRESS || familyRecord?.contracts.hub?.address,
    "HUB",
  );
  const cashflowAddress = requireAddress(
    process.env.VAULT_CASHFLOW_ADDRESS ||
      familyRecord?.contracts.cashflow?.address,
    "CASHFLOW",
  );
  const fujiMessenger = requireAddress(
    process.env.TELEPORTER_MESSENGER_FUJI,
    "FUJI_MESSENGER",
  );
  const familyMessenger = requireAddress(
    process.env.TELEPORTER_MESSENGER_FAMILY_L1,
    "FAMILY_MESSENGER",
  );
  const key =
    process.env.DEPLOYER_PRIVATE_KEY || process.env.CORE_WALLET_PRIVATE_KEY;
  if (!key) throw new Error("DEPLOYMENT_SIGNER_MISSING");
  if (!process.env.FAMILY_L1_RPC_URL)
    throw new Error("FAMILY_L1_RPC_URL_REQUIRED");
  const fujiProvider = new JsonRpcProvider(
    process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
  );
  const familyProvider = new JsonRpcProvider(process.env.FAMILY_L1_RPC_URL);
  try {
    assert(
      (await fujiProvider.getNetwork()).chainId === 43113n,
      "FUJI_RPC_CHAIN_MISMATCH",
    );
    assert(
      (await familyProvider.getNetwork()).chainId === BigInt(familyChainId),
      "FAMILY_RPC_CHAIN_MISMATCH",
    );
    for (const [provider, address] of [
      [fujiProvider, vaultAddress],
      [fujiProvider, fujiMessenger],
      [familyProvider, hubAddress],
      [familyProvider, cashflowAddress],
      [familyProvider, familyMessenger],
    ] as const)
      assert(
        (await provider.getCode(address)) !== "0x",
        `CONTRACT_CODE_MISSING:${address}`,
      );
    const normalizedKey = key.startsWith("0x") ? key : `0x${key}`;
    const fujiSigner = new Wallet(normalizedKey, fujiProvider);
    const familySigner = new Wallet(normalizedKey, familyProvider);
    const artifact = (name: string) =>
      JSON.parse(
        readFileSync(
          resolve("artifacts/contracts", `${name}.sol`, `${name}.json`),
          "utf8",
        ),
      ).abi;
    const identity = {
      familyChainId,
      familyId,
      cChainId,
      hubAddress,
      vaultAddress,
      cashflowAddress,
      fujiMessenger,
      familyMessenger,
    };
    const journalPath = resolve(deploymentDirectory(), "wiring-journal.json");
    const previous = existsSync(journalPath)
      ? JSON.parse(readFileSync(journalPath, "utf8"))
      : undefined;
    const journal: Record<string, string> =
      previous && JSON.stringify(previous.identity) === JSON.stringify(identity)
        ? previous.journal
        : {};
    const fujiRunner = new NonceManager(fujiSigner);
    const familyRunner = new NonceManager(familySigner);
    mkdirSync(deploymentDirectory(), { recursive: true });
    await wireContracts(
      new Contract(vaultAddress, artifact("FamilyYieldVault"), fujiRunner),
      new Contract(hubAddress, artifact("FamilyHub"), familyRunner),
      new Contract(cashflowAddress, artifact("VaultCashflow"), familyRunner),
      {
        familyId,
        cChainId,
        fujiMessenger,
        familyMessenger,
        fujiOwner: fujiSigner.address,
        familyOwner: familySigner.address,
      },
      (step, hash) => {
        journal[step] = hash;
        writeFileSync(
          journalPath,
          JSON.stringify(
            { status: "in-progress", identity, journal },
            null,
            2,
          ) + "\n",
        );
      },
    );
    const result = {
      status: "verified",
      familyChainId,
      familyId,
      cChainId,
      hubAddress,
      vaultAddress,
      cashflowAddress,
      yieldReservePool: String(
        await new Contract(
          vaultAddress,
          artifact("FamilyYieldVault"),
          fujiProvider,
        ).yieldReservePool(),
      ),
      journal,
    };
    writeFileSync(
      resolve(deploymentDirectory(), "wiring.json"),
      JSON.stringify(result, null, 2) + "\n",
    );
    writeFileSync(
      journalPath,
      JSON.stringify({ status: "verified", identity, journal }, null, 2) + "\n",
    );
    console.log(JSON.stringify(result));
  } finally {
    fujiProvider.destroy();
    familyProvider.destroy();
  }
}

if (require.main === module)
  main().catch((error) => {
    console.error(
      "Wiring stopped:",
      error?.shortMessage || error?.code || error?.message || "UNKNOWN",
    );
    process.exitCode = 1;
  });
