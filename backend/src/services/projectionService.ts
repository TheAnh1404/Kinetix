import { and, eq, isNull, sql } from "drizzle-orm";
import { decodeFunctionData, parseEventLogs, TransactionReceipt } from "viem";
import { db } from "../db";
import { chainEvents, financialOperations, userWallets, workspaceMembers, chores, vaultMembers, vaults, withdrawalRequests } from "../db/schema";
import { FAMILY_HUB_ABI } from "../../../shared/abis";
import { decimalAmount, hubClient, readHub } from "./chainService";
import { recordReceiptActivity } from "./activityService";
import { deploymentManifest } from "./deploymentService";
import { walletOwnerInWorkspace } from "./walletOwnershipService";
import { operationMetadata } from "./operationMetadataService";

/** Chỉ tạo projection cho hũ đã mapping; không tạo user/membership từ địa chỉ trong log. */
export async function projectReceipt(receipt: TransactionReceipt, vault: typeof vaults.$inferSelect) {
  if (receipt.status !== "success" || !vault.onchainHub || !vault.onchainChainId) return;
  const hub = vault.onchainHub.toLowerCase();
  const events: any[] = parseEventLogs({ abi: FAMILY_HUB_ABI, strict: true, logs: receipt.logs.filter((log) => log.address.toLowerCase() === hub) });
  const relevant = events.some((event) => event.args.vaultId !== undefined && BigInt(event.args.vaultId) === BigInt(vault.onchainVaultId));
  // ChoreApproved/Claimed/Cancelled chỉ có taskId; xác định scope qua getter cùng block receipt.
  let taskRelevant = false;
  for (const event of events.filter((event) => event.args.taskId !== undefined && event.args.vaultId === undefined)) {
    const task: any = await readHub(hub, "tasks", [event.args.taskId], receipt.blockNumber);
    if (BigInt(task[1]) === BigInt(vault.onchainVaultId)) taskRelevant = true;
  }
  if (!relevant && !taskRelevant) return;
  for (const event of events) {
    await db.insert(chainEvents).values({ chainId: vault.onchainChainId, hub, txHash: receipt.transactionHash.toLowerCase(), logIndex: event.logIndex, blockNumber: receipt.blockNumber, blockHash: receipt.blockHash, eventName: event.eventName, payload: JSON.parse(JSON.stringify(event.args, (_key, value) => typeof value === "bigint" ? value.toString() : value)) }).onConflictDoNothing();
    if (event.args.vaultId === undefined || BigInt(event.args.vaultId) !== BigInt(vault.onchainVaultId)) continue;
    const address = event.eventName === "WithdrawalRequested" ? event.args.requester : event.eventName === "ChoreCreated" ? event.args.assignee : event.eventName === "VaultMemberAdded" ? event.args.member : undefined;
    if (!address) continue;
    const owner = await walletOwnerInWorkspace(address, vault.workspaceId);
    if (!owner) continue;
    if (event.eventName === "WithdrawalRequested") {
      await db.insert(withdrawalRequests).values({ familyId: vault.workspaceId, vaultId: vault.id, requesterId: owner.userId, amount: decimalAmount(event.args.amount), reason: event.args.reason, vault: vault.name, onchainRequestId: Number(event.args.requestId), deadline: new Date(Number(event.args.deadline) * 1000), requiredApprovals: vault.requiredApprovals, approvalsCount: 0, status: "PENDING", txHash: receipt.transactionHash.toLowerCase() }).onConflictDoNothing();
    } else if (event.eventName === "ChoreCreated") {
      await db.insert(chores).values({ familyId: vault.workspaceId, vaultId: vault.id, childId: owner.userId, title: event.args.title, rewardAmount: decimalAmount(event.args.rewardAmount), onchainTaskId: Number(event.args.taskId), status: "TODO" }).onConflictDoNothing();
    } else if (event.eventName === "VaultMemberAdded") {
      await db.insert(vaultMembers).values({ vaultId: vault.id, userId: owner.userId, vaultRole: event.args.guardianRole ? "GUARDIAN" : "BENEFICIARY" }).onConflictDoNothing();
      await db.update(vaults).set({ requiredApprovals: Number(event.args.requiredApprovals) }).where(eq(vaults.id, vault.id));
    }
  }
  await recordReceiptActivity(receipt, vault);
  const sender = await walletOwnerInWorkspace(receipt.from, vault.workspaceId);
  if (!sender || receipt.to?.toLowerCase() !== hub) return;
  const { client } = hubClient();
  const transaction = await client.getTransaction({ hash: receipt.transactionHash });
  const decoded = decodeFunctionData({ abi: FAMILY_HUB_ABI, data: transaction.input });
  const metadata = await operationMetadata(client, hub, decoded.functionName, decoded.args || [], transaction.value, receipt.from, receipt);
  await db.insert(financialOperations).values({ userId: sender.userId, workspaceId: vault.workspaceId, deploymentRef: `${deploymentManifest().version}:${hub}`, chainId: vault.onchainChainId, hub, txHash: receipt.transactionHash.toLowerCase(), sender: receipt.from.toLowerCase(), nonce: String(transaction.nonce), functionName: decoded.functionName, calldata: transaction.input, ...metadata, status: "SYNC_PENDING", blockNumber: receipt.blockNumber, blockHash: receipt.blockHash }).onConflictDoNothing();
}

/** Snapshot cố định ở một finalized block, không trộn latest với history đã finalized. */
export async function projectVault(vault: typeof vaults.$inferSelect, blockNumber: bigint, blockHash: string) {
  return db.transaction(async (tx) => {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`vault-projection:${vault.id}`}))`);
  const [current] = await tx.select().from(vaults).where(eq(vaults.id, vault.id));
  if (!current || current.asOfBlock !== null && current.asOfBlock > blockNumber) return;
  const hub = vault.onchainHub!;
  const read = (name: string, args: unknown[]) => readHub<any>(hub, name, args, blockNumber);
  const state = await read("getVault", [BigInt(vault.onchainVaultId)]);
  if (state.vaultId !== BigInt(vault.onchainVaultId) || ["SHIELD", "MILESTONE", "ROSCA", "SHARED_GOAL"][Number(state.ruleType)] !== vault.ruleTemplate) throw new Error("VAULT_POLICY_MISMATCH");
  await tx.update(vaults).set({ cachedTotalBalance: decimalAmount(state.totalBalance), cachedL1Buffer: decimalAmount(state.l1BufferBalance), cachedCChainYield: "0", asOfBlock: blockNumber, asOfBlockHash: blockHash, lastSyncedAt: new Date(), isActive: state.isActive, roscaCurrentRound: Number(state.roscaCurrentRound), roscaLastRoundTimestamp: state.roscaLastRoundTimestamp ? new Date(Number(state.roscaLastRoundTimestamp) * 1000) : null }).where(and(eq(vaults.id, vault.id), sql`(${vaults.asOfBlock} is null or ${vaults.asOfBlock} <= ${blockNumber})`));
  const epoch = await read("membershipEpoch", [BigInt(vault.onchainVaultId)]);
  for (const request of await tx.select().from(withdrawalRequests).where(eq(withdrawalRequests.vaultId, vault.id))) {
    if (request.onchainRequestId === null) continue;
    const [chain, requestEpoch] = await Promise.all([read("withdrawalRequests", [BigInt(request.onchainRequestId)]), read("requestEpoch", [BigInt(request.onchainRequestId)])]);
    if (Number(chain[1]) !== vault.onchainVaultId) continue;
    await tx.update(withdrawalRequests).set({ deadline: new Date(Number(chain[7]) * 1000), approvalsCount: Number(chain[6]), status: chain[8] ? "EXECUTED" : epoch !== requestEpoch ? "REJECTED" : "PENDING" }).where(eq(withdrawalRequests.id, request.id));
  }
  for (const task of await tx.select().from(chores).where(eq(chores.vaultId, vault.id))) {
    if (task.onchainTaskId === null) continue;
    const [chain, cancelled] = await Promise.all([read("tasks", [BigInt(task.onchainTaskId)]), read("cancelledTasks", [BigInt(task.onchainTaskId)])]);
    if (Number(chain[1]) !== vault.onchainVaultId) continue;
    await tx.update(chores).set({ status: chain[6] ? "REWARDED" : cancelled ? "CANCELLED" : chain[5] ? "SUBMITTED" : "TODO" }).where(eq(chores.id, task.id));
  }
  });
}
