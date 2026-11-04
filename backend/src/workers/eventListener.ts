import { createPublicClient, http, parseEventLogs } from "viem";
import { and, eq, lt } from "drizzle-orm";
import { db } from "../db";
import {
  vaults,
  withdrawalRequests,
  chores,
  activityCursors,
  proofAttachments,
} from "../db/schema";
import { FAMILY_HUB_ABI } from "../../../shared/abis";
import { hubClient, readHub, decimalAmount } from "../services/chainService";
import { assert } from "../auth/security";

import { recordReceiptActivity } from "../services/activityService";

// The worker is a service identity with DB access. It never creates users, sessions,
// memberships or workspace mappings from arbitrary wallet addresses/events.
async function main() {
  const hub = process.env.FAMILY_HUB_ADDRESS;
  assert(hub, 503, "FAMILY_HUB_ADDRESS is required for the event worker.");
  const { client, chainId } = hubClient();
  assert(
    (await client.getChainId()) === chainId,
    503,
    "Worker RPC chain mismatch.",
  );
  const mapped = () =>
    db
      .select()
      .from(vaults)
      .where(
        and(
          eq(vaults.onchainChainId, chainId),
          eq(vaults.onchainHub, hub.toLowerCase()),
        ),
      );
  let running = false;
  const reconcile = async () => {
    if (running) return;
    running = true;
    try {
      const knownVaults = await mapped();
      const cursorId = `${chainId}:${hub.toLowerCase()}`;
      const [cursor] = await db
        .select()
        .from(activityCursors)
        .where(eq(activityCursors.id, cursorId));
      const fromBlock =
        cursor?.nextBlock ??
        BigInt(process.env.HUB_ACTIVITY_START_BLOCK || "0");
      const tip = await client.getBlockNumber();
      const throughBlock =
        fromBlock + 999n < tip - 1n ? fromBlock + 999n : tip - 1n;
      if (throughBlock >= fromBlock) {
        const logs = await client.getLogs({
          address: hub as `0x${string}`,
          fromBlock,
          toBlock: throughBlock,
        });
        const hashes = [...new Set(logs.map((log) => log.transactionHash))];
        for (const hash of hashes) {
          const receipt = await client.getTransactionReceipt({ hash });
          for (const vault of knownVaults)
            await recordReceiptActivity(receipt, vault);
        }
        await db
          .insert(activityCursors)
          .values({ id: cursorId, nextBlock: throughBlock + 1n })
          .onConflictDoUpdate({
            target: activityCursors.id,
            set: { nextBlock: throughBlock + 1n },
          });
      }
      await db
        .delete(proofAttachments)
        .where(lt(proofAttachments.expiresAt, new Date()));
      for (const vault of knownVaults) {
        const chain: any = await readHub(hub, "getVault", [
          BigInt(vault.onchainVaultId),
        ]);
        const overview: any = await readHub(hub, "getVaultOverview", [
          BigInt(vault.onchainVaultId),
        ]);
        await db
          .update(vaults)
          .set({
            cachedTotalBalance: decimalAmount(overview[0]),
            cachedL1Buffer: decimalAmount(overview[1]),
            cachedCChainYield: decimalAmount(overview[2]),
            roscaCurrentRound: Number(chain.roscaCurrentRound),
            roscaLastRoundTimestamp: chain.roscaLastRoundTimestamp
              ? new Date(Number(chain.roscaLastRoundTimestamp) * 1000)
              : null,
            isActive: chain.isActive,
          })
          .where(eq(vaults.id, vault.id));
        const requests = await db
          .select()
          .from(withdrawalRequests)
          .where(eq(withdrawalRequests.vaultId, vault.id));
        for (const request of requests) {
          if (request.onchainRequestId === null) continue;
          const state: any = await readHub(hub, "withdrawalRequests", [
            BigInt(request.onchainRequestId),
          ]);
          if (Number(state[1]) !== vault.onchainVaultId) continue;
          await db
            .update(withdrawalRequests)
            .set({
              deadline: new Date(Number(state[7]) * 1000),
              approvalsCount: Number(state[6]),
              status: state[8]
                ? "EXECUTED"
                : Number(state[6]) >= vault.requiredApprovals
                  ? "APPROVED"
                  : "PENDING",
            })
            .where(eq(withdrawalRequests.id, request.id));
        }
        const tasks = await db
          .select()
          .from(chores)
          .where(eq(chores.vaultId, vault.id));
        for (const task of tasks) {
          if (task.onchainTaskId === null) continue;
          const state: any = await readHub(hub, "tasks", [
            BigInt(task.onchainTaskId),
          ]);
          if (Number(state[1]) !== vault.onchainVaultId) continue;
          await db
            .update(chores)
            .set({
              status: state[6] ? "REWARDED" : state[5] ? "SUBMITTED" : "TODO",
            })
            .where(eq(chores.id, task.id));
        }
      }
    } catch (error) {
      console.error("Worker reconciliation failed", {
        category: error instanceof Error ? error.name : "UnknownError",
      });
    } finally {
      running = false;
    }
  };
  await reconcile();
  // Snapshot reconciliation is idempotent and avoids replayed events incrementing balances twice.
  const timer = setInterval(() => void reconcile(), 15000);
  const stop = () => {
    clearInterval(timer);
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  console.log("Kinetix worker reconciling verified workspace mappings");
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Worker failed");
  process.exitCode = 1;
});
