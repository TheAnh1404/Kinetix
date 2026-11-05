import "dotenv/config";
import { createPublicClient, http, parseEventLogs, keccak256, formatEther } from "viem";
import { FAMILY_HUB_ABI } from "../shared/abis";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

/** Read-only chain inspection; --persist-events imports real logs without creating app identities. */
async function main() {
  const address = "0x2873c3B76364E6377912F174e3754AFdfCeae1F6" as const;
  const client = createPublicClient({ transport: http("https://api.avax-test.network/ext/bc/C/rpc") });
  if (await client.getChainId() !== 43113) throw new Error("FUJI_CHAIN_REQUIRED");
  const tip = await client.getBlock({ blockTag: "finalized" });
  const code = await client.getBytecode({ address, blockNumber: tip.number! });
  if (!code || code === "0x") throw new Error("LEGACY_CODE_MISSING");
  let lo = 0n, hi = tip.number!;
  while (lo < hi) {
    const mid = (lo + hi) / 2n;
    const historical = await client.getBytecode({ address, blockNumber: mid });
    if (historical && historical !== "0x") hi = mid; else lo = mid + 1n;
  }
  const evidence: any = { chainId: 43113, hub: address, identity: "LEGACY_UNVERIFIED_SOURCE", checkedAt: new Date().toISOString(), checkedAtBlock: String(tip.number), deploymentBlock: String(lo), runtimeCodeHash: keccak256(code), balanceWei: String(await client.getBalance({ address, blockNumber: tip.number! })), getters: {}, events: [] };
  for (const functionName of ["familyAdmin", "vaultCounter", "vaultCashflow", "deploymentVersion"]) {
    try { evidence.getters[functionName] = await client.readContract({ address, abi: FAMILY_HUB_ABI, functionName, blockNumber: tip.number! } as any); }
    catch { evidence.getters[functionName] = "UNSUPPORTED_OR_UNAVAILABLE"; }
  }
  const count = typeof evidence.getters.vaultCounter === "bigint" ? evidence.getters.vaultCounter : 0n;
  console.log(JSON.stringify({ stage: "LEGACY_STATE_READ", deploymentBlock: String(lo), throughBlock: String(tip.number), balanceWei: evidence.balanceWei, getters: evidence.getters }, (_key, value) => typeof value === "bigint" ? String(value) : value));
  evidence.vaults = [];
  if (count > 100n) throw new Error("LEGACY_VAULT_SCAN_LIMIT");
  for (let id = 1n; id <= count; id++) {
    try { evidence.vaults.push(await client.readContract({ address, abi: FAMILY_HUB_ABI, functionName: "getVault", args: [id], blockNumber: tip.number! })); }
    catch { evidence.vaults.push({ id, status: "GETTER_UNAVAILABLE" }); }
  }
  // The public RPC limits eth_getLogs to 100 blocks. Use the official index only
  // to discover hashes, then independently verify every receipt through RPC.
  const hashes = new Set<`0x${string}`>();
  let pageToken: string | undefined;
  for (let page = 0; page < 20; page++) {
    const url = new URL(`https://glacier-api.avax.network/v1/chains/43113/addresses/${address}/transactions`);
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`LEGACY_INDEX_HTTP_${response.status}`);
    const data: any = await response.json();
    if (!Array.isArray(data.transactions)) throw new Error("LEGACY_INDEX_FORMAT_INVALID");
    for (const item of data.transactions) {
      const hash = item.nativeTransaction?.txHash;
      if (/^0x[0-9a-f]{64}$/i.test(hash || "")) hashes.add(hash);
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
    if (page === 19) throw new Error("LEGACY_INDEX_PAGE_LIMIT");
  }
  for (const hash of hashes) {
    const candidate = await client.getTransactionReceipt({ hash });
    if (candidate.status !== "success" || candidate.blockNumber > tip.number!) continue;
    const parsed: any[] = parseEventLogs({ abi: FAMILY_HUB_ABI, strict: true, logs: candidate.logs.filter((log) => log.address.toLowerCase() === address.toLowerCase()) }) as any;
    for (const event of parsed) {
      const receipt = await client.getTransactionReceipt({ hash: event.transactionHash! });
      if (receipt.status !== "success" || receipt.blockNumber > tip.number!) throw new Error("LEGACY_RECEIPT_INVALID");
      evidence.events.push({ name: event.eventName, args: event.args, txHash: receipt.transactionHash, blockNumber: String(receipt.blockNumber), blockHash: receipt.blockHash, logIndex: event.logIndex });
    }
  }
  const json = JSON.stringify(evidence, (_key, value) => typeof value === "bigint" ? String(value) : value, 2);
  mkdirSync(resolve(".private/evidence"), { recursive: true });
  const file = resolve(".private/evidence/legacy-fuji.json");
  writeFileSync(file, json + "\n");
  let persisted = 0;
  if (process.argv.includes("--persist-events")) {
    const { db, pool, chainEvents } = await import("../backend/src/db");
    try {
      for (const event of JSON.parse(json).events) {
        const rows = await db.insert(chainEvents).values({ chainId: 43113, hub: address.toLowerCase(), txHash: event.txHash.toLowerCase(), logIndex: event.logIndex, blockNumber: BigInt(event.blockNumber), blockHash: event.blockHash, eventName: event.name, payload: { sourceIdentity: "LEGACY_UNVERIFIED_SOURCE", args: event.args } }).onConflictDoNothing().returning({ id: chainEvents.id });
        persisted += rows.length;
      }
    } finally { await pool.end(); }
  }
  console.log(JSON.stringify({ ...evidence, balanceAvax: formatEther(BigInt(evidence.balanceWei)), evidence: file, persistedEvents: persisted }, (_key, value) => typeof value === "bigint" ? String(value) : value));
}
main().catch((error) => { console.error("Legacy inspection stopped:", error?.shortMessage || error?.message || error?.code, error?.details || ""); process.exitCode = 1; });
