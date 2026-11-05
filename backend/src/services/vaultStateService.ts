import { and, eq } from "drizzle-orm";
import { db, chores, withdrawalRequests } from "../db";
import { AuthContext } from "../auth/service";
import { vaultAccess } from "./workspaceAccess";
import { hubClient, readHub } from "./chainService";

export async function vaultState(auth: AuthContext, id: string) {
  const access = await vaultAccess(auth, id, true);
  const { vault, chainState: state, asOfBlock, capabilities } = access;
  const blockNumber = BigInt(asOfBlock!);
  const hub = vault.onchainHub!;
  const read = (name: string, args: unknown[]) => readHub<any>(hub, name, args, blockNumber);
  const { client } = hubClient();
  const block = await client.getBlock({ blockNumber });
  const epoch = await read("membershipEpoch", [BigInt(vault.onchainVaultId)]);
  const reserved = await read("reservedRewards", [BigInt(vault.onchainVaultId)]);
  const day = block.timestamp / 86400n;
  const [dailySpent, configuredDailyLimit] = await Promise.all([read("dailyFastWithdrawSpent", [BigInt(vault.onchainVaultId), day]), read("vaultDailyLimit", [BigInt(vault.onchainVaultId)])]);
  const dailyLimit = configuredDailyLimit > 0n ? configuredDailyLimit : state.fastWithdrawLimit * 2n;
  const tasks = [];
  for (const task of await db.select().from(chores).where(eq(chores.vaultId, id))) {
    if (task.onchainTaskId === null) continue;
    // Dependents only see their own private chore resources.
    if (!["ADMIN", "GUARDIAN"].includes(access.member.role) && task.childId !== auth.user.id) continue;
    const tid = BigInt(task.onchainTaskId);
    const [chain, count, cancelled, signed] = await Promise.all([read("tasks", [tid]), read("taskApprovalCount", [tid, epoch]), read("cancelledTasks", [tid]), auth.wallet ? read("taskApprovals", [tid, epoch, auth.wallet.address]) : false]);
    tasks.push({ id: task.id, title: task.title, assignee: chain[4], rewardWei: chain[3], completed: chain[5], rewarded: chain[6], cancelled, approvals: count, required: state.requiredApprovals, signed, canApprove: capabilities!.verifyAndRewardChore.allowed && chain[5] && !chain[6] && !cancelled && !signed, canCancel: capabilities!.cancelChore.allowed && !chain[6] && !cancelled });
  }
  const requests = [];
  for (const request of await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.vaultId, id))) {
    if (request.onchainRequestId === null) continue;
    if (!["ADMIN", "GUARDIAN"].includes(access.member.role) && request.requesterId !== auth.user.id) continue;
    const rid = BigInt(request.onchainRequestId);
    const [chain, requestEpoch, signed] = await Promise.all([read("withdrawalRequests", [rid]), read("requestEpoch", [rid]), auth.wallet ? read("hasApprovedRequest", [rid, auth.wallet.address]) : false]);
    const stale = epoch !== requestEpoch;
    const expired = block.timestamp > chain[7];
    requests.push({ id: request.id, recipient: chain[4], amountWei: chain[3], approvals: chain[6], required: state.requiredApprovals, deadline: chain[7], executed: chain[8], stale, expired, signed, canApprove: capabilities!.approveWithdrawal.allowed && !chain[8] && !stale && !expired && !signed });
  }
  const contributions = Number(state.ruleType) === 2 ? await Promise.all(state.beneficiaries.map(async (address: string) => ({ address, contributed: await read("hasContributedRosca", [BigInt(vault.onchainVaultId), state.roscaCurrentRound, address]) }))) : [];
  return { vaultId: id, chainId: vault.onchainChainId, hub, asset: "AVAX", asOfBlock: blockNumber, asOfBlockHash: block.hash, checkedAt: new Date(), indexingStatus: vault.asOfBlock === null ? "PENDING" : BigInt(vault.asOfBlock) < blockNumber ? "CATCHING_UP" : "CURRENT", epoch, capabilities, state, balance: { totalWei: state.totalBalance, reservedWei: reserved, availableWei: state.totalBalance >= reserved ? state.totalBalance - reserved : 0n }, shield: { dailyLimitWei: dailyLimit, dailySpentWei: dailySpent, resetsAt: (day + 1n) * 86400n }, tasks, requests, rosca: { contributions, nextPayoutAt: state.roscaLastRoundTimestamp + state.roscaRoundDuration, recipient: state.beneficiaries[Number(state.roscaCurrentRound)] || null, ended: state.roscaCurrentRound >= BigInt(state.beneficiaries.length) }, goal: { reached: state.totalBalance >= state.targetGoalAmount, deadlinePassed: state.targetDeadline > 0n && block.timestamp >= state.targetDeadline } };
}
