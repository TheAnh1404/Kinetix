import { and, eq, desc } from "drizzle-orm";
import { decodeFunctionData } from "viem";
import { db } from "../db";
import { financialOperations, vaults, chores, withdrawalRequests, proofAttachments, recoverySteps, walletRecoveries } from "../db/schema";
import { FAMILY_HUB_ABI } from "../../../shared/abis";
import { AuthContext } from "../auth/service";
import { assert, uuidInput } from "../auth/security";
import { workspace, vaultAccess } from "./workspaceAccess";
import { verifiedDeployment } from "./deploymentService";
import { projectReceipt, projectVault } from "./projectionService";
import { operationMetadata } from "./operationMetadataService";

/** Canonical sync được xây lại từ calldata của transaction thật và tài nguyên có scope. */
async function syncTarget(auth: AuthContext, workspaceId: string, hub: string, chainId: number, name: string, args: readonly unknown[], hash: string, attachmentId?: unknown) {
  const body: Record<string, unknown> = { txHash: hash };
  if (["createCustomVault", "createAdvancedVault"].includes(name)) return { path: "/api/vaults", method: "POST", body: { ...body, workspaceId } };
  // Operator controls have no browser reconciliation endpoint, but still retain their real hash.
  if (["setAllowlistStatus", "setTrustedForwarder", "setVaultCashflow", "pause", "unpause"].includes(name)) return null;
  const resource = Number(args[0]);
  assert(Number.isSafeInteger(resource) && resource > 0, 400, "Mã tài nguyên ngoài giới hạn.");
  let vaultId: string | undefined;
  let path: string;
  let method = "POST";
  if (["approveWithdrawal", "executeWithdrawalWithSignatures"].includes(name)) {
    const rows = await db.select({ id: withdrawalRequests.id, vaultId: vaults.id }).from(withdrawalRequests).innerJoin(vaults, eq(vaults.id, withdrawalRequests.vaultId)).where(and(eq(vaults.workspaceId, workspaceId), eq(vaults.onchainHub, hub), eq(vaults.onchainChainId, chainId), eq(withdrawalRequests.onchainRequestId, resource)));
    vaultId = rows[0]?.vaultId; body.requestId = rows[0]?.id;
    path = name === "approveWithdrawal" ? "/api/withdrawals/approve" : "/api/withdrawals/execute-signatures";
  } else if (["claimChoreCompleted", "verifyAndRewardChore", "cancelChore"].includes(name)) {
    const rows = await db.select({ id: chores.id, vaultId: vaults.id }).from(chores).innerJoin(vaults, eq(vaults.id, chores.vaultId)).where(and(eq(vaults.workspaceId, workspaceId), eq(vaults.onchainHub, hub), eq(vaults.onchainChainId, chainId), eq(chores.onchainTaskId, resource)));
    vaultId = rows[0]?.vaultId; body.choreId = rows[0]?.id;
    path = name === "claimChoreCompleted" ? "/api/chores/submit" : name === "cancelChore" ? "/api/chores/cancel" : "/api/chores/verify";
    if (name === "claimChoreCompleted" && typeof attachmentId === "string") {
      const [proof] = await db.select().from(proofAttachments).where(and(eq(proofAttachments.id, uuidInput(attachmentId)), eq(proofAttachments.ownerId, auth.user.id), eq(proofAttachments.choreId, String(body.choreId))));
      assert(proof && proof.expiresAt > new Date(), 403, "Ảnh không thuộc thao tác này.");
      body.attachmentId = proof.id;
    }
  } else {
    const [row] = await db.select().from(vaults).where(and(eq(vaults.workspaceId, workspaceId), eq(vaults.onchainHub, hub), eq(vaults.onchainChainId, chainId), eq(vaults.onchainVaultId, resource)));
    vaultId = row?.id; body.vaultId = row?.id;
    if (name === "recoverMemberWallet") {
      const [step] = await db.select({ id: recoverySteps.id }).from(recoverySteps).innerJoin(walletRecoveries, eq(walletRecoveries.id, recoverySteps.recoveryId)).where(and(eq(recoverySteps.vaultId, row?.id || "00000000-0000-0000-0000-000000000000"), eq(walletRecoveries.oldWallet, String(args[1]).toLowerCase()), eq(walletRecoveries.newWallet, String(args[2]).toLowerCase())));
      assert(step, 409, "Recovery chưa có scope và bằng chứng ví mới.", "OPERATION_PENDING");
      body.stepId = step.id;
    }
    const paths: Record<string, string> = { depositToVault: "/api/vaults", contributeRoscaRound: "/api/vaults", fastWithdraw: "/api/vaults", requestLargeWithdrawal: "/api/withdrawals/create", createChore: "/api/chores/create", payoutRoscaRound: "/api/vaults/rosca-payout", recoverMemberWallet: "/api/recovery/confirm" };
    path = paths[name];
    assert(path, 400, "Thao tác chưa hỗ trợ nhật ký.", "OPERATION_UNSUPPORTED");
    if (path === "/api/vaults") { method = "PATCH"; body.action = name === "fastWithdraw" ? "WITHDRAW" : "DEPOSIT"; }
  }
  assert(vaultId, 409, "Tài nguyên đang chờ indexer hoặc đăng ký receipt.", "OPERATION_PENDING");
  await vaultAccess(auth, vaultId);
  return { path, method, body };
}

export function publicOperation(row: typeof financialOperations.$inferSelect) {
  return { id: row.id, hash: row.txHash, chainId: row.chainId, hub: row.hub, workspaceId: row.workspaceId, deploymentRef: row.deploymentRef, functionName: row.functionName, amountWei: row.amountWei, asset: row.asset, recipient: row.recipient, resourceType: row.resourceType, resourceId: row.resourceId, sender: row.sender, nonce: row.nonce, status: row.status, blockNumber: row.blockNumber?.toString() || null, blockHash: row.blockHash, lastErrorCode: row.lastErrorCode, submittedAt: row.createdAt.toISOString(), sync: row.syncIntent };
}

export async function recordOperation(auth: AuthContext, workspaceId: string, hash: unknown, attachmentId?: unknown) {
  assert(auth.wallet, 403, "Chưa liên kết ví.");
  assert(typeof hash === "string" && /^0x[0-9a-f]{64}$/i.test(hash), 400, "Mã giao dịch không hợp lệ.");
  const { ws, member } = await workspace(auth, workspaceId);
  const { manifest, client, chainId } = await verifiedDeployment(ws.l1HubAddress);
  const hub = manifest.contracts.hub!.address.toLowerCase();
  const transaction = await client.getTransaction({ hash: hash as `0x${string}` });
  assert(transaction.from.toLowerCase() === auth.wallet.address.toLowerCase() && transaction.to?.toLowerCase() === hub, 403, "Transaction không thuộc ví và Hub đang chọn.", "OPERATION_ACTOR_MISMATCH");
  const decoded = decodeFunctionData({ abi: FAMILY_HUB_ABI, data: transaction.input });
  if (["createCustomVault", "createAdvancedVault"].includes(decoded.functionName)) assert(["ADMIN", "GUARDIAN"].includes(member.role), 403, "Không có quyền đăng ký hũ.");
  let intent = null;
  let lastErrorCode = null;
  try { intent = await syncTarget(auth, ws.id, hub, chainId, decoded.functionName, decoded.args || [], hash.toLowerCase(), attachmentId); }
  catch (error: any) { if (error?.code !== "OPERATION_PENDING") throw error; lastErrorCode = "OPERATION_PENDING"; }
  const metadata = await operationMetadata(client, hub, decoded.functionName, decoded.args || [], transaction.value, transaction.from, transaction.blockNumber === null ? undefined : await client.getTransactionReceipt({ hash: transaction.hash }));
  const [created] = await db.insert(financialOperations).values({ userId: auth.user.id, workspaceId: ws.id, deploymentRef: `${manifest.version}:${hub}`, chainId, hub, txHash: hash.toLowerCase(), sender: transaction.from.toLowerCase(), nonce: String(transaction.nonce), functionName: decoded.functionName, calldata: transaction.input, ...metadata, syncIntent: intent, lastErrorCode }).onConflictDoNothing().returning();
  const row = created || (await db.select().from(financialOperations).where(and(eq(financialOperations.chainId, chainId), eq(financialOperations.hub, hub), eq(financialOperations.txHash, hash.toLowerCase()))))[0];
  assert(row?.userId === auth.user.id && row.workspaceId === ws.id, 409, "Transaction đã thuộc scope khác.", "OPERATION_SCOPE_CONFLICT");
  return row;
}

export async function reconcileOperation(auth: AuthContext, operationId: string) {
  const [operation] = await db.select().from(financialOperations).where(and(eq(financialOperations.id, uuidInput(operationId)), eq(financialOperations.userId, auth.user.id)));
  assert(operation, 404, "Không tìm thấy giao dịch của bạn.");
  await workspace(auth, operation.workspaceId);
  if (["COMPLETED", "REVERTED"].includes(operation.status)) return publicOperation(operation);
  const { client, manifest } = await verifiedDeployment(operation.hub);
  assert(operation.chainId === manifest.chainId && operation.deploymentRef === `${manifest.version}:${operation.hub}`, 409, "Giao dịch thuộc deployment khác.", "OPERATION_DEPLOYMENT_MISMATCH");
  let values: Partial<typeof financialOperations.$inferInsert>;
  try {
    const receipt = await client.getTransactionReceipt({ hash: operation.txHash as `0x${string}` });
    assert(receipt.from.toLowerCase() === operation.sender && receipt.to?.toLowerCase() === operation.hub, 409, "Receipt khác transaction đã ghi.");
    const finalized = await client.getBlock({ blockTag: "finalized" });
    let intent = operation.syncIntent;
    if (!intent && receipt.status === "success") {
      const decoded = decodeFunctionData({ abi: FAMILY_HUB_ABI, data: operation.calldata as `0x${string}` });
      intent = await syncTarget(auth, operation.workspaceId, operation.hub, operation.chainId, decoded.functionName, decoded.args || [], operation.txHash);
    }
    const decoded = decodeFunctionData({ abi: FAMILY_HUB_ABI, data: operation.calldata as `0x${string}` });
    const metadata = await operationMetadata(client, operation.hub, decoded.functionName, decoded.args || [], 0n, operation.sender, receipt);
    values = { ...metadata, amountWei: ["depositToVault", "contributeRoscaRound"].includes(decoded.functionName) ? operation.amountWei : metadata.amountWei, syncIntent: intent, status: receipt.status === "reverted" ? "REVERTED" : receipt.blockNumber <= finalized.number! ? "SYNC_PENDING" : "CONFIRMED", blockNumber: receipt.blockNumber, blockHash: receipt.blockHash, lastErrorCode: receipt.status === "reverted" ? "CONTRACT_REVERTED" : null };
  } catch (error: any) {
    if (error?.status) throw error;
    if (!String(error?.name).includes("ReceiptNotFound")) throw error;
    const nonce = await client.getTransactionCount({ address: operation.sender as `0x${string}`, blockTag: "finalized" });
    values = { status: BigInt(nonce) > BigInt(operation.nonce) ? "NEEDS_REVIEW" : "BROADCAST", lastErrorCode: BigInt(nonce) > BigInt(operation.nonce) ? "NONCE_CONSUMED_RECEIPT_UNKNOWN" : "RECEIPT_PENDING" };
  }
  const [updated] = await db.update(financialOperations).set({ ...values, updatedAt: new Date() }).where(eq(financialOperations.id, operation.id)).returning();
  return publicOperation(updated);
}

/** Completion is derived from finalized receipt and server projection, never from a browser flag. */
export async function completeOperation(auth: AuthContext, operationId: string) {
  await reconcileOperation(auth, operationId);
  const [operation] = await db.select().from(financialOperations).where(and(eq(financialOperations.id, uuidInput(operationId)), eq(financialOperations.userId, auth.user.id)));
  assert(operation?.status === "SYNC_PENDING" || operation?.status === "COMPLETED", 409, "Chờ receipt finalized trước khi hoàn tất.", "RECEIPT_NOT_FINALIZED");
  if (operation.status === "COMPLETED") return publicOperation(operation);
  const { client } = await verifiedDeployment(operation.hub);
  const receipt = await client.getTransactionReceipt({ hash: operation.txHash as `0x${string}` });
  const block = await client.getBlock({ blockTag: "finalized" });
  const mapped = await db.select().from(vaults).where(and(eq(vaults.workspaceId, operation.workspaceId), eq(vaults.onchainHub, operation.hub), eq(vaults.onchainChainId, operation.chainId)));
  if (["createCustomVault", "createAdvancedVault"].includes(operation.functionName)) assert(mapped.some((vault) => vault.onchainCreationTx?.toLowerCase() === operation.txHash), 409, "Chờ đăng ký receipt tạo hũ.", "OPERATION_PENDING");
  for (const vault of mapped) {
    await projectReceipt(receipt, vault);
    await projectVault(vault, block.number!, block.hash!);
  }
  const [updated] = await db.update(financialOperations).set({ status: "COMPLETED", lastErrorCode: null, updatedAt: new Date() }).where(eq(financialOperations.id, operation.id)).returning();
  return publicOperation(updated);
}

export async function listOperations(auth: AuthContext, workspaceId: string) {
  await workspace(auth, uuidInput(workspaceId));
  return (await db.select().from(financialOperations).where(and(eq(financialOperations.userId, auth.user.id), eq(financialOperations.workspaceId, workspaceId))).orderBy(desc(financialOperations.createdAt)).limit(200)).map(publicOperation);
}
