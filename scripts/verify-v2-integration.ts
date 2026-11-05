import "dotenv/config";
import assert from "node:assert/strict";
import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";
import { createPublicClient, http, keccak256 } from "viem";
import { and, eq, sql } from "drizzle-orm";

/** Real PostgreSQL + local EVM regression. Never uses the application database or calls this Fuji acceptance. */
async function main() {
  require("./auth-test-safety.cjs").assertIsolatedDatabase(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL, process.env.AUTH_TEST_ALLOW_RESET);
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.NODE_ENV = "test";
  process.env.APP_ORIGIN = "http://localhost:3000";
  const hre = require("hardhat");
  hre.config.networks.hardhat.chainId = 43113;
  const provider = hre.network.provider;
  assert.equal(await provider.request({ method: "eth_chainId" }), "0xa869");
  const rpc = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const execute = async (item: any) => {
      try { return { jsonrpc: "2.0", id: item.id, result: await provider.request({ method: item.method, params: item.params || [] }) }; }
      catch (error: any) { return { jsonrpc: "2.0", id: item.id, error: { code: error.code || -32000, message: error.message } }; }
    };
    const input = JSON.parse(body);
    const output = Array.isArray(input) ? await Promise.all(input.map(execute)) : await execute(input);
    res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(output));
  });
  await new Promise<void>((resolve) => rpc.listen(0, "127.0.0.1", resolve));
  const rpcUrl = `http://127.0.0.1:${(rpc.address() as AddressInfo).port}`;
  process.env.HUB_RPC_URL = rpcUrl; process.env.HUB_CHAIN_ID = "43113";
  const [, admin, guardian, member, observer, replacement] = await hre.ethers.getSigners();
  const hub = await (await hre.ethers.getContractFactory("FamilyHub", admin)).deploy(admin.address, hre.ethers.ZeroAddress, hre.ethers.ZeroHash, hre.ethers.ZeroAddress);
  const cashflow = await (await hre.ethers.getContractFactory("VaultCashflow", admin)).deploy(admin.address, hub.target, hre.ethers.ZeroAddress, hre.ethers.ZeroHash, hre.ethers.ZeroAddress);
  const forwarder = await (await hre.ethers.getContractFactory("KinetixForwarder", admin)).deploy();
  const wire = [await hub.setVaultCashflow(cashflow.target), await hub.setTrustedForwarder(forwarder.target)];
  const client = createPublicClient({ transport: http(rpcUrl) });
  const contracts: any = {};
  for (const [name, contract] of [["hub", hub], ["cashflow", cashflow], ["forwarder", forwarder]] as any[]) {
    const receipt = await contract.deploymentTransaction().wait();
    contracts[name] = { address: String(contract.target), transactionHash: receipt.hash, blockNumber: String(receipt.blockNumber), runtimeCodeHash: keccak256((await client.getBytecode({ address: contract.target }))!) };
  }
  const manifest = { ...require("../shared/deployment.json"), enabled: true, status: "verified", admin: admin.address, contracts: { ...contracts, yieldVault: null }, deploymentBlock: contracts.hub.blockNumber, wiring: wire.map((tx: any) => tx.hash) };
  // Replace only the network dependency in this dedicated process; contract calls and receipts are real local-EVM RPC.
  const deployment = require("../backend/src/services/deploymentService");
  deployment.deploymentManifest = () => manifest;
  deployment.verifiedDeployment = async (requested?: string) => { assert(!requested || requested.toLowerCase() === String(hub.target).toLowerCase()); return { manifest, client, chainId: 43113 }; };
  const schema = require("../backend/src/db") as typeof import("../backend/src/db");
  const { db, pool, users, vaults, vaultMembers, workspaceMembers, chores, withdrawalRequests, financialOperations, walletHistory, chainEvents } = schema;
  const app = require("../backend/src/server").default;
  let api: Server | undefined;
  let passed = 0;
  const check = (message: string) => { passed++; console.log(`PASS ${message}`); };
  try {
    await require("../backend/src/db/migrations").applyDatabaseMigrations();
    await db.execute(sql`TRUNCATE workspaces, users, auth_rate_limits, auth_challenges CASCADE`);
    api = await new Promise<Server>((resolve) => { const server = app.listen(0, "127.0.0.1", () => resolve(server)); });
    const base = `http://127.0.0.1:${(api!.address() as AddressInfo).port}/api`;
    class Browser {
      cookies = new Map<string, string>();
      async request(path: string, body?: any, method = "POST", status = 200): Promise<any> {
        const response = await fetch(base + path, { method, headers: { Origin: process.env.APP_ORIGIN!, "Content-Type": "application/json", Cookie: [...this.cookies].map(([key, value]) => `${key}=${value}`).join("; ") }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
        for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(";")[0]; const pos = pair.indexOf("="); this.cookies.set(pair.slice(0, pos), pair.slice(pos + 1)); }
        const data = await response.json();
        assert.equal(response.status, status, `${method} ${path}: ${data.code || data.error || "unexpected status"}`);
        return data;
      }
      async proof(purpose: string, signer: any) {
        const challenge = await this.request("/auth/wallet/challenge", { purpose, address: signer.address, chainId: 43113 });
        return { challengeId: challenge.challengeId, signature: await signer.signMessage(challenge.message) };
      }
    }
    const password = "Isolated-V2-Regression-2026!";
    const register = async (signer: any, name: string) => {
      const browser = new Browser();
      const response = await browser.request("/auth/register-family", { ...await browser.proof("REGISTER", signer), username: name, password, adminName: name, familyName: name });
      const me = await browser.request("/auth/me", undefined, "GET");
      return { browser, userId: me.user.id, workspaceId: response.family.id };
    };
    const owner = await register(admin, "v2_owner");
    const guard = await register(guardian, "v2_guard");
    const child = await register(member, "v2_member");
    const outsider = await register(observer, "v2_observer");
    for (const [actor, role] of [[guard, "GUARDIAN"], [child, "CHILD"], [outsider, "ADMIN"]] as const) await db.insert(workspaceMembers).values({ workspaceId: owner.workspaceId, userId: actor.userId, role });
    for (const signer of [guardian, member, observer]) await (await hub.setAllowlistStatus(signer.address, true)).wait();
    const registered: any[] = [];
    for (const rule of [0, 1, 2]) {
      const transaction = await hub.createAdvancedVault(`V2 isolated ${rule}`, rule, 10000, rule === 0 ? hre.ethers.parseEther("1") : 0n, 2, [admin.address, guardian.address], rule === 2 ? [member.address, observer.address] : [member.address], 0n, 0n, rule === 2 ? 60n : 0n, rule === 2 ? hre.ethers.parseEther("0.01") : 0n);
      await transaction.wait();
      await owner.browser.request("/vaults", { workspaceId: owner.workspaceId, txHash: transaction.hash }, "POST", 201);
      const [vault] = await db.select().from(vaults).where(and(eq(vaults.workspaceId, owner.workspaceId), eq(vaults.onchainVaultId, rule + 1)));
      assert(vault); registered.push(vault);
    }
    const [shield, milestone, rosca] = registered;
    await db.insert(vaultMembers).values({ vaultId: shield.id, userId: outsider.userId, vaultRole: "CREATOR" });
    const denied = await outsider.browser.request(`/vaults/${shield.id}/state`, undefined, "GET");
    assert.equal(denied.data.capabilities.approveWithdrawal.allowed, false);
    await outsider.browser.request(`/workspaces/${owner.workspaceId}/transaction-context?functionName=approveWithdrawal&resourceId=1`, undefined, "GET", 403);
    check("ADMIN/CREATOR without a chain guardian role cannot vote");
    const project = require("../backend/src/services/projectionService") as typeof import("../backend/src/services/projectionService");
    const deposit = await hub.connect(member).depositToVault(1n, { value: hre.ethers.parseEther("3") }); await deposit.wait();
    const saved = await child.browser.request("/operations", { workspaceId: owner.workspaceId, txHash: deposit.hash });
    await child.browser.request("/operations", { workspaceId: owner.workspaceId, txHash: deposit.hash });
    await child.browser.request(`/operations/${saved.operation.id}/complete`, {});
    assert.equal((await db.select().from(financialOperations).where(eq(financialOperations.txHash, deposit.hash))).length, 1);
    assert.equal((await child.browser.request(`/operations?workspaceId=${owner.workspaceId}`, undefined, "GET")).operations[0].amountWei, hre.ethers.parseEther("3").toString());
    await outsider.browser.request(`/operations/${saved.operation.id}/reconcile`, {}, "POST", 404);
    check("exact wei, real receipt/hash, idempotency and owner-only operation recovery");
    const request = await hub.connect(member).requestLargeWithdrawal(1n, hre.ethers.parseEther("1.1"), "Isolated payout"); await request.wait();
    await project.projectReceipt(await client.getTransactionReceipt({ hash: request.hash }), shield);
    await project.projectReceipt(await client.getTransactionReceipt({ hash: request.hash }), shield);
    const [requestRow] = await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.vaultId, shield.id)); assert(requestRow);
    assert.equal((await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.vaultId, shield.id))).length, 1);
    const vote1 = await hub.approveWithdrawal(1n); await vote1.wait();
    await owner.browser.request("/withdrawals/approve", { requestId: requestRow.id, txHash: vote1.hash });
    let state = (await owner.browser.request(`/vaults/${shield.id}/state`, undefined, "GET")).data;
    assert.equal(state.requests[0].approvals, "1"); assert.equal(state.requests[0].executed, false); assert.equal(state.requests[0].canApprove, false);
    const vote2 = await hub.connect(guardian).approveWithdrawal(1n); await vote2.wait();
    await guard.browser.request("/withdrawals/approve", { requestId: requestRow.id, txHash: vote2.hash });
    state = (await owner.browser.request(`/vaults/${shield.id}/state`, undefined, "GET")).data; assert.equal(state.requests[0].executed, true);
    check("request event backfill is replay-safe and 1/2 signatures never claims a payout");
    await (await hub.depositToVault(2n, { value: hre.ethers.parseEther("2") })).wait();
    const created = await hub.createChore(2n, "Isolated chore", hre.ethers.parseEther("0.3"), member.address); await created.wait();
    await project.projectReceipt(await client.getTransactionReceipt({ hash: created.hash }), milestone);
    const [task] = await db.select().from(chores).where(eq(chores.vaultId, milestone.id)); assert(task);
    await (await hub.connect(member).claimChoreCompleted(1n)).wait();
    await (await hub.verifyAndRewardChore(1n)).wait();
    state = (await owner.browser.request(`/vaults/${milestone.id}/state`, undefined, "GET")).data;
    assert.equal(state.tasks[0].approvals, "1"); assert.equal(state.tasks[0].rewarded, false); assert.equal(state.tasks[0].signed, true);
    await (await hub.connect(guardian).verifyAndRewardChore(1n)).wait();
    const cancelled = await hub.createChore(2n, "Cancel reservation", hre.ethers.parseEther("0.2"), member.address); await cancelled.wait();
    await project.projectReceipt(await client.getTransactionReceipt({ hash: cancelled.hash }), milestone);
    const [cancelTask] = await db.select().from(chores).where(eq(chores.onchainTaskId, 2));
    const cancel = await hub.cancelChore(2n); await cancel.wait();
    await owner.browser.request("/chores/cancel", { choreId: cancelTask.id, txHash: cancel.hash });
    state = (await owner.browser.request(`/vaults/${milestone.id}/state`, undefined, "GET")).data;
    assert.equal(state.balance.reservedWei, "0"); assert.equal(state.tasks.find((task: any) => task.id === cancelTask.id).cancelled, true);
    check("chore backfill, epoch approval progress, final reward and cancellation release real reserves");
    await (await hub.connect(member).contributeRoscaRound(3n, { value: hre.ethers.parseEther("0.01") })).wait();
    state = (await child.browser.request(`/vaults/${rosca.id}/state`, undefined, "GET")).data;
    assert.deepEqual(state.rosca.contributions.map((row: any) => row.contributed), [true, false]);
    check("beneficiary ROSCA state exposes exact contributions and missing participants");
    const recovery = await child.browser.request("/recovery", await child.browser.proof("RECOVERY", replacement));
    await child.browser.request(`/recovery/${recovery.recovery.id}/finish`, {}, "POST", 409);
    for (const vault of registered) {
      const rows = (await owner.browser.request(`/recovery?workspaceId=${owner.workspaceId}`, undefined, "GET")).recoveries;
      const row = rows.find((row: any) => row.step.vaultId === vault.id); assert(row);
      for (const [signer, browser] of [[admin, owner.browser], [guardian, guard.browser]] as any[]) {
        const vote = await hub.connect(signer).recoverMemberWallet(BigInt(vault.onchainVaultId), member.address, replacement.address); await vote.wait();
        await browser.request("/recovery/confirm", { stepId: row.step.id, txHash: vote.hash });
      }
    }
    const pendingRevocation = await child.browser.request(`/recovery/${recovery.recovery.id}/finish`, {}, "POST", 409);
    assert.equal(pendingRevocation.code, "RECOVERY_OLD_WALLET_NOT_REVOKED");
    await (await hub.setAllowlistStatus(member.address, false)).wait();
    await child.browser.request(`/recovery/${recovery.recovery.id}/finish`, {});
    await child.browser.request("/auth/me", undefined, "GET", 401);
    const [history] = await db.select().from(walletHistory).where(eq(walletHistory.userId, child.userId)); assert.equal(history.address, member.address.toLowerCase());
    assert.equal(await hub.hasContributedRosca(3n, 0n, replacement.address), true);
    assert.equal(await hub.hasContributedRosca(3n, 0n, member.address), false);
    check("three-vault recovery requires every quorum, old-wallet revocation and rotates all sessions");
    const latest = await client.getBlock({ blockTag: "finalized" });
    await project.projectVault(shield, latest.number!, latest.hash!);
    const original = await client.getTransactionReceipt({ hash: deposit.hash });
    await project.projectVault(shield, original.blockNumber, original.blockHash);
    const [current] = await db.select().from(vaults).where(eq(vaults.id, shield.id)); assert.equal(current.asOfBlock, latest.number);
    assert.equal((await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.id, requestRow.id)))[0].status, "EXECUTED");
    check("older snapshots cannot regress vault or request projections");
    const signatures = await owner.browser.request("/signatures", undefined, "GET");
    assert(signatures.signatures.some((proof: any) => proof.purpose === "REGISTER" && /^[0-9a-f]{64}$/.test(proof.signatureHash)));
    assert((await db.select().from(chainEvents)).length > 0);
    check("registration signatures retain digests and verified chain events persist in PostgreSQL");
    const manifestBefore = require("node:fs").readFileSync("shared/deployment.json", "utf8");
    await owner.browser.request("/deployment/core-receipt", { workspaceId: owner.workspaceId, key: "hub", txHash: deposit.hash }, "POST", 403);
    for (let step = 0; step < 5; step++) {
      const { plan } = await owner.browser.request(`/deployment/core-plan?workspaceId=${owner.workspaceId}`, undefined, "GET");
      assert.equal(plan.step, step + 1);
      const tx = await admin.sendTransaction({ ...(plan.transaction.to ? { to: plan.transaction.to } : {}), data: plan.transaction.data, value: 0n, gasLimit: BigInt(plan.transaction.gas), maxFeePerGas: BigInt(plan.transaction.maxFeePerGas), maxPriorityFeePerGas: BigInt(plan.transaction.maxPriorityFeePerGas) });
      await tx.wait();
      await owner.browser.request("/deployment/core-receipt", { workspaceId: owner.workspaceId, key: plan.key, txHash: tx.hash });
      await owner.browser.request("/deployment/core-receipt", { workspaceId: owner.workspaceId, key: plan.key, txHash: tx.hash });
    }
    const { plan: completed } = await owner.browser.request(`/deployment/core-plan?workspaceId=${owner.workspaceId}`, undefined, "GET");
    assert.equal(completed.completed, true);
    assert.equal(require("node:fs").readFileSync("shared/deployment.json", "utf8"), manifestBefore);
    check("Core deployment verifies all five exact transactions, retains receipts and keeps activation separate");
    console.log(JSON.stringify({ status: "PASSED", environment: "ISOLATED_POSTGRESQL_AND_LOCAL_EVM", checks: passed, productionDatabaseTouched: false, fujiAcceptance: false }));
  } finally {
    if (api) await new Promise<void>((resolve) => api!.close(() => resolve()));
    await pool.end();
    await new Promise<void>((resolve) => rpc.close(() => resolve()));
  }
}
main().catch((error) => { console.error("V2 isolated regression failed:", error?.code === "ERR_ASSERTION" ? error.message : error?.code || error?.name || "UNKNOWN"); process.exitCode = 1; });
