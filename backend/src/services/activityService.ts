import { parseEventLogs, TransactionReceipt } from "viem";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import {
  memberActivity,
  notifications,
  userWallets,
  workspaceMembers,
} from "../db/schema";
import { FAMILY_HUB_ABI } from "../../../shared/abis";
import { decimalAmount, hubClient } from "./chainService";

/** Chỉ ghi event ở đúng Hub và vault đã ánh xạ; trạng thái chi trả không suy từ số chữ ký. */
export async function recordReceiptActivity(
  receipt: TransactionReceipt,
  vault: {
    id: string;
    workspaceId: string;
    onchainVaultId: number;
    onchainHub: string | null;
  },
) {
  if (receipt.status !== "success") return;
  const events = parseEventLogs({
    abi: FAMILY_HUB_ABI,
    strict: true,
    logs: receipt.logs.filter(
      (log) => log.address.toLowerCase() === vault.onchainHub?.toLowerCase(),
    ),
  }) as unknown as { eventName: string; args: any; logIndex: number }[];
  const { chainId, client } = hubClient();
  let timestamp: Date | undefined;
  for (const log of events) {
    const kinds: Record<string, string> = {
      FundsDeposited: "DEPOSIT",
      FastWithdrawalExecuted: "WITHDRAW",
      WithdrawalExecuted: "WITHDRAWAL",
      ChoreRewarded: "REWARD",
    };
    const kind = kinds[log.eventName];
    const assigned = log.eventName === "ChoreCreated";
    if (
      (!kind && !assigned) ||
      Number(log.args.vaultId) !== vault.onchainVaultId
    )
      continue;
    const recipient =
      log.args.depositor ||
      log.args.beneficiary ||
      log.args.recipient ||
      log.args.assignee;
    if (typeof recipient !== "string") continue;
    const [user] = await db
      .select({ id: userWallets.userId })
      .from(userWallets)
      .innerJoin(
        workspaceMembers,
        and(
          eq(workspaceMembers.userId, userWallets.userId),
          eq(workspaceMembers.workspaceId, vault.workspaceId),
          isNull(workspaceMembers.accessDisabledAt),
        ),
      )
      .where(eq(userWallets.address, recipient.toLowerCase()));
    if (!user) continue;
    timestamp ||= new Date(
      Number(
        (await client.getBlock({ blockNumber: receipt.blockNumber })).timestamp,
      ) * 1000,
    );
    if (
      assigned ||
      kind === "REWARD" ||
      kind === "WITHDRAW" ||
      kind === "WITHDRAWAL"
    ) {
      await db
        .insert(notifications)
        .values({
          familyId: vault.workspaceId,
          userId: user.id,
          title: assigned
            ? "Có việc mới dành cho con"
            : kind === "REWARD"
              ? "Phần thưởng đã được chi trả"
              : "Đã rút về ví cá nhân",
          message: assigned
            ? `Việc mới: ${log.args.title}. Mở danh sách việc để xem hướng dẫn.`
            : `Đã xác nhận ${decimalAmount(log.args.amount ?? log.args.rewardAmount)} AVAX về ví của bạn.`,
          type: assigned
            ? "TASK_ASSIGNED"
            : kind === "REWARD"
              ? "TASK_COMPLETED"
              : "FAST_WITHDRAW",
          sourceEvent: `${chainId}:${receipt.transactionHash.toLowerCase()}:${log.logIndex}:${user.id}`,
          createdAt: timestamp,
        })
        .onConflictDoNothing();
    }
    if (!kind) continue;
    await db
      .insert(memberActivity)
      .values({
        workspaceId: vault.workspaceId,
        vaultId: vault.id,
        userId: user.id,
        chainId,
        txHash: receipt.transactionHash.toLowerCase(),
        eventKey: `${receipt.transactionHash.toLowerCase()}:${log.logIndex}`,
        kind,
        amount: decimalAmount(
          log.args.amount ?? log.args.totalAmount ?? log.args.rewardAmount,
        ),
        createdAt: timestamp,
      })
      .onConflictDoNothing();
  }
}
