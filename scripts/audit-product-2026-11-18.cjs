// Read-only product probes: executes the real TypeScript modules with mocked
// wallet/RPC/database adapters. No browser, database, network or real signing.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ts = require("typescript");
const viem = require("viem");
const root = path.resolve(__dirname, "..");
function loadSource(file, mocks) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", code)(
    (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id), module, module.exports,
  );
  return module.exports;
}
function variableExpression(file, name) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let result;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name && node.initializer)
      result = node.initializer.getText(source);
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(result, name);
  return result;
}
function functionExpression(file, name) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration, name);
  return declaration.getText(source).replace(/^export\s+/, "");
}
function evalTs(expression, bindings) {
  const code = ts.transpileModule(`return (${expression});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function(...Object.keys(bindings), code)(...Object.values(bindings));
}
const wallet = `0x${"1".repeat(40)}`;
const otherWallet = `0x${"2".repeat(40)}`;
const fundAddress = `0x${"3".repeat(40)}`;
const txHash = `0x${"a".repeat(64)}`;
const results = [];
function record(name, observed) { results.push({ name, observed }); }
async function main() {
  let scope = "workspace-a", receiptStatus = "success", timeout = false;
  let onSimulation = () => {}, writes = 0;
  const storage = new Map();
  global.window = {};
  global.sessionStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  const publicClient = {
    simulateContract: async (request) => { onSimulation(); return { request }; },
    waitForTransactionReceipt: async () => {
      if (timeout) throw new Error("Receipt timeout");
      return { status: receiptStatus, transactionHash: txHash, logs: [] };
    },
  };
  const client = loadSource("frontend/src/lib/web3/fundV2Client.ts", {
    viem: { ...viem, createWalletClient: () => ({ writeContract: async () => { writes++; return txHash; } }) },
    "@/contracts/abis": { KINETIX_FUND_V2_ABI: [], KINETIX_FUND_FACTORY_V2_ABI: [] },
    "@/contracts/config": { avalancheFuji: { id: 43113 } },
    "./client": {
      getCoreProvider: () => ({ request: async ({ method }) => method === "eth_chainId" ? "0xa869" : [wallet] }),
      publicClientFuji: publicClient,
      switchNetwork: async () => true,
      walletWriteScope: () => scope,
    },
  });
  const params = { fundAddress, amountWei: "1" };
  const options = { expectedWalletAddress: wallet, expectedWorkspaceId: "workspace-a" };
  await assert.rejects(client.depositOnchainFund(params, { ...options, expectedWalletAddress: otherWallet }), /không khớp/);
  assert.equal(writes, 0);
  record("Initial linked-wallet mismatch", "Rejected before broadcast");
  receiptStatus = "reverted";
  await assert.rejects(client.depositOnchainFund(params, options), /reverted/);
  record("Reverted receipt", "Rejected by real client");
  receiptStatus = "success";
  scope = null;
  await assert.rejects(client.depositOnchainFund(params, options), /không gian làm việc/i);
  record("UI-disconnected/null workspace scope", "Rejected before broadcast");
  scope = "workspace-a";
  onSimulation = () => { scope = "workspace-b"; };
  await assert.rejects(client.depositOnchainFund(params, options), /không gian làm việc/i);
  record("Workspace changes during simulation", "Rejected before broadcast");
  onSimulation = () => {};
  scope = "workspace-a";
  timeout = true;
  const beforeRetry = writes;
  await assert.rejects(client.depositOnchainFund(params, options), /timeout/);
  await assert.rejects(client.depositOnchainFund(params, options), /timeout/);
  assert.equal(writes - beforeRetry, 1);
  record("Retry same deposit after receipt timeout", { broadcastCalls: writes - beforeRetry, journalRecords: client.getPendingV2Transactions().length });
  timeout = false;

  const actions = [{ id: "d290f1ee-6c54-4b01-90e6-d701748f0851", onchainProposalId: 7,
    action: "PAUSE", approvalsCount: 0, proposerAddress: wallet, epoch: 1, status: "PENDING", createdAt: new Date() }];
  const enriched = evalTs(variableExpression("backend/src/services/groupFinanceService.ts", "enrichedActions"), {
    actions, currentPolicy: { quorum: 2 },
  });
  const normalized = evalTs(variableExpression("frontend/src/components/group-finance/EmergencyPauseModal.tsx", "normalized"), {
    raw: enriched, fund: { requiredApprovals: 2 },
  });
  const passedId = Number(normalized[0].id);
  assert.equal(passedId, 7);
  await client.approveGovernanceOnchain({ fundAddress, proposalId: passedId }, options);
  record("Emergency governance API DTO to UI to client", { apiOnchainId: 7, uiId: normalized[0].id, numericId: passedId, result: "Approval accepted with valid numeric on-chain ID" });

  // Execute the real indexer against an in-memory adapter and a fake PolicyApplied log.
  const inserted = [], errors = [];
  const chain = {
    from() { return this; }, where() { return this; }, limit() { return Promise.resolve([]); },
    set() { return this; }, values(value) { this.value = value; inserted.push({ table: this.table, value }); return this; },
    onConflictDoUpdate() { return Promise.resolve(); },
    then(resolve) { return Promise.resolve([]).then(resolve); },
  };
  const db = { select: () => Object.create(chain), update: () => Object.create(chain),
    insert: (table) => Object.assign(Object.create(chain), { table }) };
  const schema = new Proxy({}, { get: (_, key) => key === "__esModule" ? false : key === "activityCursors" ? { id: "cursor-id" } : key });
  const indexer = loadSource("backend/src/services/fundV2IndexerService.ts", {
    viem: { ...viem, parseEventLogs: ({ logs }) => logs },
    "drizzle-orm": { and: () => null, eq: () => null, or: () => null, sql: () => null, desc: () => null },
    "../db": { db, pool: {} }, "../db/schema": schema,
    "../../../shared/abis": { KINETIX_FUND_V2_ABI: [] },
  });
  const fund = { id: "fund-a", workspaceId: "workspace-a", contractAddress: fundAddress, status: "ACTIVE" };
  const rpc = { getBlockNumber: async () => 100n,
    getLogs: async () => [{ eventName: "PolicyApplied", transactionHash: txHash, args: { epoch: 2n, quorum: 1n, termsHash: txHash } }],
    readContract: async ({ functionName }) => {
      if (["paused", "goalReached"].includes(functionName)) return false;
      if (functionName === "getConfiguration") {
        return [
          { quorum: 1n, transactionLimit: 0n, dailyLimit: 0n, approvalWindow: 172800n },
          [{ account: wallet, permissions: 3, dailyAllowance: 0n }],
        ];
      }
      return 0n;
    }
  };
  await indexer.syncV2FundInternal(fund, rpc, 43113, { blockNumber: "1" });
  const policy = inserted.find((item) => item.table === "fundPolicies").value;
  assert.notDeepEqual(policy.signers, []);
  assert.deepEqual(policy.signers, [wallet]);
  record("PolicyApplied indexing", { policyVersion: policy.version, signers: policy.signers, result: "Signers preserved from contract configuration" });
  inserted.length = 0;
  const originalError = console.error;
  console.error = (...args) => errors.push(String(args[0]));
  try {
    await indexer.syncV2FundInternal(fund, { ...rpc, getLogs: async () => { throw new Error("RPC unavailable"); } }, 43113, { blockNumber: "1" });
  } finally { console.error = originalError; }
  const cursor = inserted.find((item) => typeof item.table === "object");
  assert.equal(cursor, undefined);
  record("Indexer getLogs failure", { errors: errors.length, cursorCommitted: false, result: "Failed log range preserved / cursor not advanced" });

  inserted.length = 0;
  const syncTx = Object.create(chain);
  syncTx.execute = async () => {};
  syncTx.select = () => Object.create(chain);
  syncTx.insert = (table) => Object.assign(Object.create(chain), { table,
    returning() { return Promise.resolve([this.value]); } });
  const dbSync = { transaction: async (callback) => callback(syncTx) };
  const check = (condition, status, message) => { if (!condition) throw new Error(`${status}: ${message}`); };
  const textInput = evalTs(functionExpression("backend/src/auth/security.ts", "textInput"), { assert: check });
  const syncExpense = evalTs(functionExpression("backend/src/services/groupFinanceService.ts", "syncV2Expense"), {
    db: dbSync, fundAccess: async () => fund, walletOf: () => wallet,
    assert: check, toWeiString: (value) => String(value), address: (value) => value,
    textInput, policyFor: async () => ({ id: "policy-a", quorum: 2 }),
    lock: async () => {}, expenseRequests: "expenseRequests", and: () => null, eq: () => null,
    recordAuditEvent: async () => {}, syncSingleV2Fund: async () => {},
  });
  const body = { onchainExpenseId: 777, amountWei: "1", recipientAddress: otherWallet, title: "Synthetic probe" };
  // A03: Without onchain verification or valid contract proposal, sync must reject unverified payload
  await assert.rejects(syncExpense({ user: { id: "user-a" } }, "workspace-a", "fund-a", body), /xác minh đề xuất on-chain/i);
  record("V2 expense sync after mocked access check", "Unverified payload rejected without on-chain proof");

  // A03 & A08: When verified onchain proposal is available, sync succeeds and inline data URLs are accepted
  const verifiedFund = {
    ...fund,
    chainReader: {
      getExpense: async () => ({
        proposer: wallet,
        recipient: otherWallet,
        amount: 1n,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
      }),
    },
  };
  const syncExpenseVerified = evalTs(functionExpression("backend/src/services/groupFinanceService.ts", "syncV2Expense"), {
    db: dbSync, fundAccess: async () => verifiedFund, walletOf: () => wallet,
    assert: check, toWeiString: (value) => String(value), address: (value) => value,
    textInput, policyFor: async () => ({ id: "policy-a", quorum: 2 }),
    lock: async () => {}, expenseRequests: "expenseRequests", and: () => null, eq: () => null,
    recordAuditEvent: async () => {}, syncSingleV2Fund: async () => {},
  });
  const receipt = `data:image/png;base64,${"A".repeat(600)}`;
  const synced = await syncExpenseVerified({ user: { id: "user-a" } }, "workspace-a", "fund-a",
    { ...body, receiptAttachmentUrl: receipt });
  assert.equal(synced.onchainExpenseId, 777);
  assert.equal(synced.amountWei, "1");
  assert.equal(synced.receiptAttachmentUrl, receipt);
  record("V2 inline receipt attachment", { dataUrlLength: receipt.length, result: "Accepted valid inline receipt attachment" });

  const commit = process.env.AUDIT_COMMIT || null;
  console.log(JSON.stringify({ commit, environment: "Node mock adapters; no real wallet or database", results }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
