import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { decodeFunctionData, encodeAbiParameters, keccak256, parseEventLogs } from "viem";
import { db, walletRecoveries, recoverySteps, walletHistory, users, userWallets, sessions, vaults, vaultMembers, provisioningRequests, auditLogs, workspaceMembers } from "../db";
import { AuthContext, checkChallenge, consumeChallenge, requireFull } from "../auth/service";
import { assert, uuidInput } from "../auth/security";
import { FAMILY_HUB_ABI } from "../../../shared/abis";
import { verifiedDeployment, provisioningIdentity } from "./deploymentService";
import { workspace, vaultAccess } from "./workspaceAccess";

async function scope(auth: AuthContext, oldWallet: string) {
  const { client, manifest } = await verifiedDeployment();
  const hub = manifest.contracts.hub!.address;
  assert(manifest.admin?.toLowerCase() !== oldWallet, 409, "FamilyHub T1 chưa hỗ trợ thay operator toàn Hub. Cần quy trình migration operator riêng.", "HUB_OPERATOR_RECOVERY_UNSUPPORTED");
  const block = await client.getBlock({ blockTag: "finalized" });
  const read = (functionName: string, args: unknown[]) => client.readContract({ address: hub, abi: FAMILY_HUB_ABI, functionName, args, blockNumber: block.number! } as any) as Promise<any>;
  const ids: bigint[] = await read("getUserVaultIds", [oldWallet]);
  assert(ids.length <= 200 && ids.every((id) => id > 0n && id <= BigInt(Number.MAX_SAFE_INTEGER)), 409, "Scope recovery vượt giới hạn đối soát.");
  const mapped = ids.length ? await db.select().from(vaults).where(and(eq(vaults.onchainHub, hub.toLowerCase()), eq(vaults.onchainChainId, manifest.chainId), inArray(vaults.onchainVaultId, ids.map(Number)))) : [];
  assert(mapped.length === ids.length, 409, "Có hũ trên chain chưa đăng ký receipt vào ứng dụng. Đối soát đủ scope trước recovery.", "RECOVERY_SCOPE_UNMAPPED");
  const links = await db.select({ hub: vaults.onchainHub }).from(vaultMembers).innerJoin(vaults, eq(vaults.id, vaultMembers.vaultId)).where(eq(vaultMembers.userId, auth.user.id));
  assert(links.every((row) => row.hub === hub.toLowerCase()), 409, "Còn hũ thuộc deployment khác cần migration riêng.", "RECOVERY_LEGACY_DEPLOYMENT");
  const steps = [];
  for (const vault of mapped) {
    await workspace(auth, vault.workspaceId);
    assert(vault.onchainCreationTx && vault.onchainCreationLogIndex !== null, 409, "Scope thiếu evidence tạo hũ.");
    const state = await read("getVault", [BigInt(vault.onchainVaultId)]);
    steps.push({ vault, state, epoch: String(await read("membershipEpoch", [BigInt(vault.onchainVaultId)])) });
  }
  return { client, manifest, hub, block, steps };
}

export async function startRecovery(auth: AuthContext, challengeId: string, signature: unknown, browserToken: string) {
  requireFull(auth);
  const proof = await checkChallenge(uuidInput(challengeId), signature, browserToken, "RECOVERY", auth);
  assert(auth.wallet && proof.address !== auth.wallet.address, 409, "Cần chứng minh ví thay thế.");
  const checked = await scope(auth, auth.wallet.address);
  assert(checked.steps.length > 0, 409, "Không có hũ để thu quorum recovery; dùng quy trình xác minh tài khoản của operator.", "RECOVERY_QUORUM_UNAVAILABLE");
  for (const { state } of checked.steps) assert(state.creator.toLowerCase() !== proof.address && ![...state.guardians, ...state.beneficiaries].some((address: string) => address.toLowerCase() === proof.address), 409, "Ví mới đã giữ vai trò trong một hũ; không thể gộp quyền.", "RECOVERY_ROLE_COLLISION");
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`wallet-address:${proof.address}`}))`);
    await tx.select({ id: users.id }).from(users).where(eq(users.id, auth.user.id)).for("update");
    const [wallet] = await tx.select().from(userWallets).where(eq(userWallets.userId, auth.user.id));
    assert(wallet?.address === auth.wallet!.address, 409, "Ví hiện tại đã thay đổi.");
    const [owner] = await tx.select().from(users).where(sql`lower(${users.walletAddress}) = ${proof.address}`);
    const [revoked] = await tx.select().from(walletHistory).where(eq(walletHistory.address, proof.address));
    assert(!owner && !revoked, 409, "Ví mới đã thuộc tài khoản hoặc đã bị thu hồi.", "RECOVERY_WALLET_RESERVED");
    const [active] = await tx.select().from(walletRecoveries).where(and(eq(walletRecoveries.userId, auth.user.id), isNull(walletRecoveries.completedAt)));
    if (active) { assert(active.newWallet === proof.address, 409, "Đã có recovery đang xử lý."); return active; }
    await consumeChallenge(tx, proof);
    const [recovery] = await tx.insert(walletRecoveries).values({ userId: auth.user.id, oldWallet: wallet.address, newWallet: proof.address, deploymentRef: `${checked.manifest.version}:${checked.hub.toLowerCase()}`, proofChallengeId: proof.id }).returning();
    await tx.insert(recoverySteps).values(checked.steps.map(({ vault, epoch, state }) => ({ recoveryId: recovery.id, vaultId: vault.id, epoch, requiredApprovals: Number(state.requiredApprovals) })));
    await tx.insert(auditLogs).values({ actorId: auth.user.id, subjectId: auth.user.id, action: "WALLET_RECOVERY_PROVEN" });
    return recovery;
  });
}

export async function listRecoveries(auth: AuthContext, workspaceId: string) {
  const { member } = await workspace(auth, workspaceId);
  const rows = await db.select({ recovery: walletRecoveries, step: recoverySteps, vault: vaults }).from(recoverySteps).innerJoin(walletRecoveries, eq(walletRecoveries.id, recoverySteps.recoveryId)).innerJoin(vaults, eq(vaults.id, recoverySteps.vaultId)).where(and(eq(vaults.workspaceId, workspaceId), ["ADMIN", "GUARDIAN"].includes(member.role) ? undefined : eq(walletRecoveries.userId, auth.user.id)));
  const result = [];
  for (const row of rows) {
    const access = await vaultAccess(auth, row.vault.id, true);
    const { client, manifest } = await verifiedDeployment(row.vault.onchainHub);
    assert(row.recovery.deploymentRef === `${manifest.version}:${manifest.contracts.hub!.address.toLowerCase()}`, 409, "Recovery thuộc deployment khác.");
    const key = keccak256(encodeAbiParameters([{ type: "uint256" }, { type: "address" }, { type: "address" }, { type: "uint256" }], [BigInt(row.vault.onchainVaultId), row.recovery.oldWallet as `0x${string}`, row.recovery.newWallet as `0x${string}`, BigInt(row.step.epoch)]));
    const read = (functionName: string, args: unknown[]) => client.readContract({ address: manifest.contracts.hub!.address, abi: FAMILY_HUB_ABI, functionName, args, blockNumber: BigInt(access.asOfBlock!) } as any) as Promise<any>;
    const [state, signed, epoch] = await Promise.all([read("recoveryRequests", [key]), auth.wallet ? read("hasApprovedRecovery", [key, auth.wallet.address]) : false, read("membershipEpoch", [BigInt(row.vault.onchainVaultId)])]);
    result.push({ ...row.recovery, step: { ...row.step, name: row.vault.name, workspaceId, onchainVaultId: row.vault.onchainVaultId, approvals: String(state[3]), signed, stale: !state[4] && epoch !== BigInt(row.step.epoch), chainExecuted: state[4], canApprove: access.capabilities!.recoverMemberWallet.allowed && !state[4] && !signed && epoch === BigInt(row.step.epoch) } });
  }
  return result;
}

export async function confirmRecovery(auth: AuthContext, stepId: string, hash: unknown) {
  assert(auth.wallet && typeof hash === "string" && /^0x[0-9a-f]{64}$/i.test(hash), 400, "Cần ví ký và txhash hợp lệ.");
  const [row] = await db.select({ step: recoverySteps, recovery: walletRecoveries, vault: vaults }).from(recoverySteps).innerJoin(walletRecoveries, eq(walletRecoveries.id, recoverySteps.recoveryId)).innerJoin(vaults, eq(vaults.id, recoverySteps.vaultId)).where(eq(recoverySteps.id, uuidInput(stepId)));
  assert(row, 404, "Không tìm thấy bước recovery.");
  const access = await vaultAccess(auth, row.vault.id);
  assert(["ADMIN", "GUARDIAN"].includes(access.member.role), 403, "Không có quyền đối soát recovery.");
  const { client, manifest } = await verifiedDeployment(row.vault.onchainHub);
  const hub = manifest.contracts.hub!.address;
  assert(row.recovery.deploymentRef === `${manifest.version}:${hub.toLowerCase()}`, 409, "Recovery khác deployment.");
  const transaction = await client.getTransaction({ hash: hash as `0x${string}` });
  const decoded = decodeFunctionData({ abi: FAMILY_HUB_ABI, data: transaction.input });
  const args = decoded.args as any[];
  assert(transaction.from.toLowerCase() === auth.wallet!.address && transaction.to?.toLowerCase() === hub.toLowerCase() && decoded.functionName === "recoverMemberWallet" && args[0] === BigInt(row.vault.onchainVaultId) && args[1].toLowerCase() === row.recovery.oldWallet && args[2].toLowerCase() === row.recovery.newWallet, 403, "Receipt khác scope recovery.");
  const receipt = await client.getTransactionReceipt({ hash: hash as `0x${string}` });
  const finalized = await client.getBlock({ blockTag: "finalized" });
  assert(receipt.status === "success", 409, "Recovery transaction bị revert.");
  assert(receipt.blockNumber <= finalized.number!, 409, "Chờ receipt finalized; không ký lại.", "RECEIPT_NOT_FINALIZED");
  const key = keccak256(encodeAbiParameters([{ type: "uint256" }, { type: "address" }, { type: "address" }, { type: "uint256" }], [BigInt(row.vault.onchainVaultId), row.recovery.oldWallet as `0x${string}`, row.recovery.newWallet as `0x${string}`, BigInt(row.step.epoch)]));
  const read = (functionName: string, values: unknown[]) => client.readContract({ address: hub, abi: FAMILY_HUB_ABI, functionName, args: values, blockNumber: receipt.blockNumber } as any) as Promise<any>;
  const [signed, state] = await Promise.all([read("hasApprovedRecovery", [key, auth.wallet!.address]), read("recoveryRequests", [key])]);
  assert(signed && state[1].toLowerCase() === row.recovery.oldWallet && state[2].toLowerCase() === row.recovery.newWallet, 409, "Chữ ký không thuộc epoch của recovery này.");
  const events: any[] = parseEventLogs({ abi: FAMILY_HUB_ABI, strict: true, logs: receipt.logs.filter((log) => log.address.toLowerCase() === hub.toLowerCase()) }) as any;
  const applied = state[4] && events.some((event) => event.eventName === "MemberWalletRecovered" && event.args.vaultId === BigInt(row.vault.onchainVaultId) && event.args.oldWallet.toLowerCase() === row.recovery.oldWallet && event.args.newWallet.toLowerCase() === row.recovery.newWallet);
  await db.update(recoverySteps).set({ status: applied ? "APPLIED" : row.step.status, ...(applied ? { txHash: hash.toLowerCase(), appliedEpoch: String(await read("membershipEpoch", [BigInt(row.vault.onchainVaultId)])) } : {}) }).where(eq(recoverySteps.id, row.step.id));
  await db.update(walletRecoveries).set({ status: "PARTIAL" }).where(and(eq(walletRecoveries.id, row.recovery.id), isNull(walletRecoveries.completedAt)));
  // First votes emit no Hub event; retain their actual transaction as durable evidence too.
  const { recordOperation } = await import("./operationService");
  await recordOperation(auth, row.vault.workspaceId, hash);
  return { applied, approvals: String(state[3]), requiredApprovals: row.step.requiredApprovals };
}

export async function finishRecovery(auth: AuthContext, id: string) {
  const [recovery] = await db.select().from(walletRecoveries).where(and(eq(walletRecoveries.id, uuidInput(id)), eq(walletRecoveries.userId, auth.user.id)));
  assert(recovery && auth.wallet, 404, "Không tìm thấy recovery của bạn.");
  if (recovery.completedAt) return { completed: true };
  assert(auth.wallet.address === recovery.oldWallet, 409, "Ví tài khoản đã thay đổi.");
  const { client, manifest } = await verifiedDeployment();
  const hub = manifest.contracts.hub!.address;
  const block = await client.getBlock({ blockTag: "finalized" });
  const read = (functionName: string, args: unknown[]) => client.readContract({ address: hub, abi: FAMILY_HUB_ABI, functionName, args, blockNumber: block.number! } as any) as Promise<any>;
  const rows = await db.select({ step: recoverySteps, vault: vaults }).from(recoverySteps).innerJoin(vaults, eq(vaults.id, recoverySteps.vaultId)).where(eq(recoverySteps.recoveryId, recovery.id));
  assert(rows.length > 0 && rows.every((row) => row.step.status === "APPLIED" && row.step.txHash), 409, "Chưa đủ receipt quorum ở tất cả hũ.", "RECOVERY_PARTIAL");
  for (const row of rows) assert((await read("recoveredWallets", [BigInt(row.vault.onchainVaultId), recovery.oldWallet])).toLowerCase() === recovery.newWallet, 409, "Ví trên chain đã đổi khác recovery.", "RECOVERY_CHAIN_CHANGED");
  assert((await read("getUserVaultIds", [recovery.oldWallet])).length === 0, 409, "Còn quyền trên hũ ngoài scope đã chốt; cần đối soát bổ sung.", "RECOVERY_SCOPE_CHANGED");
  assert(await read("isAllowlisted", [recovery.oldWallet]) === false && await read("isAllowlisted", [recovery.newWallet]) === true, 409, "Operator cần thu allowlist ví cũ sau khi hoàn tất các hũ.", "RECOVERY_OLD_WALLET_NOT_REVOKED");
  await db.transaction(async (tx) => {
    const [current] = await tx.select().from(walletRecoveries).where(eq(walletRecoveries.id, recovery.id)).for("update");
    if (current.completedAt) return;
    await tx.insert(walletHistory).values({ userId: auth.user.id, address: recovery.oldWallet, recoveryId: recovery.id });
    const changed = await tx.update(userWallets).set({ address: recovery.newWallet }).where(and(eq(userWallets.userId, auth.user.id), eq(userWallets.address, recovery.oldWallet))).returning();
    assert(changed.length === 1, 409, "Ví đang hoạt động đã thay đổi.");
    await tx.update(users).set({ walletAddress: recovery.newWallet }).where(eq(users.id, auth.user.id));
    await tx.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.userId, auth.user.id));
    await tx.update(walletRecoveries).set({ status: "COMPLETED", completedAt: new Date() }).where(eq(walletRecoveries.id, recovery.id));
    const memberships = await tx.select().from(workspaceMembers).where(and(eq(workspaceMembers.userId, auth.user.id), isNull(workspaceMembers.accessDisabledAt)));
    for (const membership of memberships) await tx.insert(provisioningRequests).values({ userId: auth.user.id, workspaceId: membership.workspaceId, ...provisioningIdentity() }).onConflictDoUpdate({ target: [provisioningRequests.userId, provisioningRequests.workspaceId, provisioningRequests.chainId, provisioningRequests.deploymentRef], set: { status: "PENDING", txHash: null } });
    await tx.insert(auditLogs).values({ actorId: auth.user.id, subjectId: auth.user.id, action: "WALLET_RECOVERY_COMPLETED" });
  });
  return { completed: true, signInAgain: true };
}
