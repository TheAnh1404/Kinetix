import { createPublicClient, http, parseEventLogs } from "viem";
import { and, eq, lt, isNotNull } from "drizzle-orm";
import { db, pool } from "../db";
import { projectReceipt, projectVault } from "../services/projectionService";
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
import { deploymentManifest, verifiedDeployment } from "../services/deploymentService";
import { vaultMappingIssue } from "../../../shared/vaultMapping";

// The worker is a service identity with DB access. It never creates users, sessions,
// memberships or workspace mappings from arbitrary wallet addresses/events.
async function main() {
  const { manifest, client, chainId } = await verifiedDeployment();
  const hub = manifest.contracts.hub!.address;
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
          isNotNull(vaults.onchainCreationTx),
          isNotNull(vaults.onchainCreationLogIndex),
        ),
      );
  let running = false;
  const reconcile = async () => {
    if (running) return;
    running = true;
    const lock = await pool.connect();
    try {
      const result = await lock.query("SELECT pg_try_advisory_lock(hashtext($1)) AS acquired", [`kinetix-indexer:${chainId}:${hub.toLowerCase()}`]);
      if (!result.rows[0].acquired) return;
      const knownVaults = (await mapped()).filter(
        (vault) => !vaultMappingIssue(vault, chainId, hub),
      );
      const finalized = await client.getBlock({ blockTag: "finalized" });
      const safeTip = finalized.number!;
      for (const vault of knownVaults) {
        // Cursor riêng giúp hũ đăng ký muộn vẫn replay được lịch sử thật.
        const cursorId = `${chainId}:${hub.toLowerCase()}:${vault.id}`;
        const [cursor] = await db
          .select()
          .from(activityCursors)
          .where(eq(activityCursors.id, cursorId));
        const fromBlock =
          cursor?.nextBlock ?? BigInt(manifest.deploymentBlock!);
        // Chỉ index block final theo Fuji eth_getBlockByNumber("finalized").
        const throughBlock =
          fromBlock + 99n < safeTip ? fromBlock + 99n : safeTip;
        if (throughBlock >= fromBlock) {
          const logs = await client.getLogs({
            address: hub as `0x${string}`,
            fromBlock,
            toBlock: throughBlock,
          });
          const hashes = [...new Set(logs.map((log) => log.transactionHash))];
          for (const hash of hashes) {
            const receipt = await client.getTransactionReceipt({ hash });
            await projectReceipt(receipt, vault);
          }
          await db
            .insert(activityCursors)
            .values({ id: cursorId, nextBlock: throughBlock + 1n })
            .onConflictDoUpdate({
              target: activityCursors.id,
              set: { nextBlock: throughBlock + 1n },
            });
        }
      }
      await db
        .delete(proofAttachments)
        .where(lt(proofAttachments.expiresAt, new Date()));
      for (const vault of knownVaults) {
        await projectVault(vault, safeTip, finalized.hash!);
      }
    } catch (error) {
      console.error("Worker reconciliation failed", {
        category: error instanceof Error ? error.name : "UnknownError",
      });
    } finally {
      await lock.query("SELECT pg_advisory_unlock(hashtext($1))", [`kinetix-indexer:${chainId}:${hub.toLowerCase()}`]).catch(() => {});
      lock.release();
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
// A fresh installation can serve accounts before a verified Hub is available.
// Keep the worker idle in that state rather than killing dev:all's API and UI.
async function startWhenReady() {
  let starting = false;
  let started = false;
  let lastState = "";
  const attempt = async () => {
    if (starting || started) return;
    starting = true;
    try {
      if (!deploymentManifest().enabled) {
        if (lastState !== "WAITING") console.log("Kinetix worker waiting for verified deployment; account services remain available.");
        lastState = "WAITING";
        return;
      }
      await main();
      started = true;
      clearInterval(timer);
    } catch (error: any) {
      if (lastState !== "UNAVAILABLE") console.error("Kinetix worker awaiting deployment verification", { category: error?.code || "DEPLOYMENT_UNAVAILABLE" });
      lastState = "UNAVAILABLE";
    } finally { starting = false; }
  };
  const timer = setInterval(() => void attempt(), 15000);
  const stopWaiting = () => clearInterval(timer);
  process.once("SIGTERM", stopWaiting);
  process.once("SIGINT", stopWaiting);
  await attempt();
}

void startWhenReady();
