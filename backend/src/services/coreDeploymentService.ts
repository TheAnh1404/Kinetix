import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createHash } from "node:crypto";
import { Interface } from "ethers";
import { createPublicClient, http, keccak256 } from "viem";
import { AuthContext } from "../auth/service";
import { assert } from "../auth/security";
import { workspace } from "./workspaceAccess";
import { deploymentManifest } from "./deploymentService";
import { validateDeployment } from "../../../shared/deploymentManifest";

const keys = ["hub", "cashflow", "forwarder", "cashflowWiring", "forwarderWiring"] as const;
const zero = `0x${"0".repeat(40)}`;
const zeroHash = `0x${"0".repeat(64)}`;
const inFlight = new Set<string>();
function artifact(name: string) {
  const file = resolve(`artifacts/contracts/${name}.sol/${name}.json`);
  return JSON.parse(readFileSync(file, "utf8"));
}
export function sourceIdentity() {
  const file = resolve("artifacts/contracts/FamilyHub.sol/FamilyHub.dbg.json");
  const debug = JSON.parse(readFileSync(file, "utf8"));
  const info = JSON.parse(readFileSync(resolve(dirname(file), debug.buildInfo), "utf8"));
  for (const [name, source] of Object.entries(info.input.sources) as [string, any][]) {
    if (name.startsWith("contracts/")) assert(readFileSync(resolve(name), "utf8") === source.content, 503, "Source đã thay đổi sau compile; chạy npm run compile trước deployment.", "DEPLOYMENT_ARTIFACT_STALE");
  }
  return `0x${createHash("sha256").update(JSON.stringify(info)).digest("hex")}`;
}
async function context(auth: AuthContext, workspaceId: string) {
  const { ws, member } = await workspace(auth, workspaceId);
  assert(member.role === "ADMIN" && auth.wallet, 403, "Chỉ chủ không gian có ví đã liên kết được chuẩn bị deployment.");
  const manifest = deploymentManifest();
  assert(!manifest.enabled || manifest.admin?.toLowerCase() === auth.wallet!.address, 403, "Deployment đã có operator; cần dùng đúng ví operator hiện tại.");
  assert(auth.wallet!.address !== "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", 409, "Hãy dùng ví Core riêng thay cho tài khoản Hardhat công khai.");
  const sourceHash = sourceIdentity();
  const directory = resolve(process.env.NODE_ENV === "test" ? ".cache/v2-core-journals" : "deployments/fuji", `${sourceHash.slice(2, 18)}-${auth.wallet!.address.slice(2, 10)}-${ws.id}`);
  const file = resolve(directory, "journal.json");
  const journal: any = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { chainId: 43113, deployer: auth.wallet!.address, workspaceId: ws.id, sourceHash, transactions: {}, contracts: {} };
  assert(journal.deployer === auth.wallet!.address && journal.workspaceId === ws.id && journal.sourceHash === sourceHash, 409, "Journal khác danh tính/source đang chọn.");
  const client = createPublicClient({ transport: http(process.env.HUB_RPC_URL || manifest.rpcUrl, { timeout: 8000, retryCount: 0 }) });
  assert(await client.getChainId() === 43113, 503, "RPC phải là Fuji 43113.", "RPC_CHAIN_MISMATCH");
  return { manifest, journal, directory, file, client, ws, sourceHash, admin: auth.wallet!.address };
}
export function expectedTransaction(key: typeof keys[number], journal: any, admin: string) {
  const constructors: Record<string, { name: string; args: unknown[] }> = {
    hub: { name: "FamilyHub", args: [admin, zero, zeroHash, zero] },
    cashflow: { name: "VaultCashflow", args: [admin, journal.contracts.hub?.address, zero, zeroHash, zero] },
    forwarder: { name: "KinetixForwarder", args: [] },
  };
  const deploy = constructors[key];
  if (deploy) {
    const compiled = artifact(deploy.name);
    return { to: null, data: `${compiled.bytecode}${new Interface(compiled.abi).encodeDeploy(deploy.args).slice(2)}` as `0x${string}` };
  }
  const abi = new Interface(artifact("FamilyHub").abi);
  return { to: journal.contracts.hub.address as `0x${string}`, data: abi.encodeFunctionData(key === "cashflowWiring" ? "setVaultCashflow" : "setTrustedForwarder", [key === "cashflowWiring" ? journal.contracts.cashflow.address : journal.contracts.forwarder.address]) as `0x${string}` };
}
export async function coreDeploymentPlan(auth: AuthContext, workspaceId: string) {
  const ctx = await context(auth, workspaceId);
  const index = keys.findIndex((key) => !ctx.journal.completed?.includes(key));
  if (index < 0) return { completed: true, sourceHash: ctx.sourceHash, candidatePath: resolve(ctx.directory, "manifest.json"), transactions: ctx.journal.transactions, contracts: ctx.journal.contracts };
  const key = keys[index];
  const expected = expectedTransaction(key, ctx.journal, ctx.admin);
  const gas = await ctx.client.estimateGas({ account: ctx.admin as `0x${string}`, data: expected.data, ...(expected.to ? { to: expected.to } : {}) });
  const fees = await ctx.client.estimateFeesPerGas();
  const maxFeePerGas = fees.maxFeePerGas * 2n;
  return { completed: false, chainId: 43113, admin: ctx.admin, workspaceId, sourceHash: ctx.sourceHash, step: index + 1, totalSteps: keys.length, key, txHash: ctx.journal.transactions[key] || null, transaction: { from: ctx.admin, ...expected, value: "0x0", gas: `0x${(gas * 12n / 10n).toString(16)}`, maxFeePerGas: `0x${maxFeePerGas.toString(16)}`, maxPriorityFeePerGas: `0x${fees.maxPriorityFeePerGas.toString(16)}` }, estimatedMaximumFeeWei: String(gas * 12n / 10n * maxFeePerGas), balanceWei: String(await ctx.client.getBalance({ address: ctx.admin as `0x${string}` })) };
}
export async function recordCoreDeployment(auth: AuthContext, workspaceId: string, keyInput: unknown, hash: unknown) {
  assert(typeof hash === "string" && /^0x[0-9a-f]{64}$/i.test(hash), 400, "Cần txhash thật.");
  assert(keys.includes(keyInput as any), 400, "Bước deployment không hợp lệ.");
  const key = keyInput as typeof keys[number];
  const ctx = await context(auth, workspaceId);
  assert(!inFlight.has(ctx.file), 409, "Đang đối soát deployment.", "OPERATION_PENDING");
  inFlight.add(ctx.file);
  try {
    const { journal, client } = ctx;
    const existing = journal.transactions[key];
    assert(!existing || existing.toLowerCase() === hash.toLowerCase(), 409, "Bước đã có txhash; đối soát hash cũ, không gửi lại.", "DEPLOYMENT_TX_CONFLICT");
    const index = keys.indexOf(key);
    assert(keys.slice(0, index).every((step) => journal.completed?.includes(step)), 409, "Hoàn tất các bước trước theo thứ tự.");
    const expected = expectedTransaction(key, journal, ctx.admin);
    const transaction = await client.getTransaction({ hash: hash as `0x${string}` });
    assert(transaction.from.toLowerCase() === ctx.admin && (transaction.to?.toLowerCase() || null) === (expected.to?.toLowerCase() || null) && transaction.input.toLowerCase() === expected.data.toLowerCase() && transaction.value === 0n, 403, "Transaction khác sender, bytecode, constructor hoặc wiring đã duyệt.", "DEPLOYMENT_TRANSACTION_MISMATCH");
    mkdirSync(ctx.directory, { recursive: true });
    const save = () => { writeFileSync(`${ctx.file}.tmp`, JSON.stringify(journal, null, 2) + "\n"); renameSync(`${ctx.file}.tmp`, ctx.file); };
    journal.transactions[key] = hash.toLowerCase(); save();
    let receipt;
    try { receipt = await client.getTransactionReceipt({ hash: hash as `0x${string}` }); }
    catch (error: any) { if (String(error?.name).includes("ReceiptNotFound")) return { pending: true, txHash: hash }; throw error; }
    assert(receipt.status === "success", 409, "Deployment bị revert; journal giữ hash để đối soát.", "DEPLOYMENT_REVERTED");
    const finalized = await client.getBlock({ blockTag: "finalized" });
    if (receipt.blockNumber > finalized.number!) return { pending: true, txHash: hash };
    if (!expected.to) {
      assert(receipt.contractAddress, 409, "Receipt thiếu contractAddress.");
      const code = await client.getBytecode({ address: receipt.contractAddress });
      assert(code && code !== "0x", 409, "Deployment chưa có bytecode.");
      journal.contracts[key] = { address: receipt.contractAddress, transactionHash: receipt.transactionHash, blockNumber: String(receipt.blockNumber), runtimeCodeHash: keccak256(code) };
    }
    journal.completed = [...new Set([...(journal.completed || []), key])]; save();
    if (keys.every((step) => journal.completed.includes(step))) {
      const candidate = validateDeployment({ ...ctx.manifest, enabled: true, status: "verified", admin: ctx.admin, sourceHash: ctx.sourceHash, deploymentBlock: journal.contracts.hub.blockNumber, contracts: { ...journal.contracts, yieldVault: null }, wiring: [journal.transactions.cashflowWiring, journal.transactions.forwarderWiring] });
      writeFileSync(resolve(ctx.directory, "manifest.json"), JSON.stringify(candidate, null, 2) + "\n");
    }
    return { pending: false, txHash: hash, key };
  } finally { inFlight.delete(ctx.file); }
}
