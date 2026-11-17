import {
  createPublicClient,
  http,
  parseEventLogs,
  isAddress,
  type PublicClient,
} from "viem";
import { and, eq, or, sql, desc } from "drizzle-orm";
import { db, pool } from "../db";
import {
  groupFunds as funds,
  fundPolicies,
  fundPolicyProposals,
  fundGovernanceActions,
  fundRefundClaims,
  contributions,
  expenseRequests,
  groupAuditEvents,
  activityCursors,
  users,
} from "../db/schema";
import { KINETIX_FUND_V2_ABI } from "../../../shared/abis";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

let cachedV2Config: {
  rpcUrl: string;
  chainId: number;
  blockNumber?: string;
  factory?: string;
} | null = null;

export function getV2Config() {
  if (cachedV2Config) return cachedV2Config;

  let rpcUrl =
    process.env.V2_RPC_URL ||
    process.env.FUJI_RPC_URL ||
    process.env.HUB_RPC_URL ||
    "https://api.avax-test.network/ext/bc/C/rpc";
  let chainId = Number(process.env.V2_CHAIN_ID || 43113);
  let blockNumber: string | undefined;
  let factory: string | undefined;

  const manifestPath = resolve(process.cwd(), "shared/deployment-v2.json");
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      if (manifest.rpcUrl && !process.env.V2_RPC_URL && !process.env.FUJI_RPC_URL) {
        rpcUrl = manifest.rpcUrl;
      }
      if (manifest.chainId && !process.env.V2_CHAIN_ID) {
        chainId = Number(manifest.chainId);
      }
      blockNumber = manifest.blockNumber;
      factory = manifest.factory;
    } catch {}
  }

  cachedV2Config = { rpcUrl, chainId, blockNumber, factory };
  return cachedV2Config;
}

export function getV2Client(): {
  client: PublicClient;
  chainId: number;
  rpcUrl: string;
} {
  const config = getV2Config();
  const client = createPublicClient({
    transport: http(config.rpcUrl),
  }) as PublicClient;
  return { client, chainId: config.chainId, rpcUrl: config.rpcUrl };
}

/**
 * Đồng bộ sự kiện On-Chain V2 cho một Quỹ cụ thể hoặc tất cả Quỹ On-chain V2.
 */
export async function syncV2FundInternal(
  fund: typeof funds.$inferSelect,
  client: PublicClient,
  chainId: number,
  config: ReturnType<typeof getV2Config>,
): Promise<void> {
  if (!fund.contractAddress || !isAddress(fund.contractAddress)) return;

  const fundAddress = fund.contractAddress as `0x${string}`;
  const cursorId = `v2:${chainId}:${fundAddress.toLowerCase()}`;

  let currentBlock: bigint;
  try {
    currentBlock = await client.getBlockNumber();
  } catch (err) {
    console.error("V2 Indexer: Failed to get block number", err);
    return;
  }

  const [cursor] = await db
    .select()
    .from(activityCursors)
    .where(eq(activityCursors.id, cursorId))
    .limit(1);

  let fromBlock: bigint;
  if (cursor?.nextBlock) {
    fromBlock = cursor.nextBlock;
  } else if (process.env.NODE_ENV === "test") {
    fromBlock = 0n;
  } else if (config.blockNumber) {
    try {
      fromBlock = BigInt(config.blockNumber);
    } catch {
      fromBlock = currentBlock > 1000n ? currentBlock - 1000n : 0n;
    }
  } else {
    fromBlock = currentBlock > 1000n ? currentBlock - 1000n : 0n;
  }

  // Chia nhỏ theo lô (batch) tối đa 2000 blocks để tránh lỗi RPC filter limit
  const maxBatch = 2000n;
  const toBlock = fromBlock + maxBatch < currentBlock ? fromBlock + maxBatch : currentBlock;

  if (toBlock >= fromBlock) {
    try {
      const rawLogs = await client.getLogs({
        address: fundAddress,
        fromBlock,
        toBlock,
      });

      const logs = parseEventLogs({
        abi: KINETIX_FUND_V2_ABI,
        logs: rawLogs,
      });

      for (const log of logs as any[]) {
        const eventName = log.eventName;
        const txHash = log.transactionHash;

        if (eventName === "Deposited") {
          const { contributor, amount, referenceHash } = log.args as {
            contributor: string;
            amount: bigint;
            referenceHash: string;
          };
          const contributorAddr = contributor.toLowerCase();
          const amountStr = amount.toString();

          const [funderUser] = await db
            .select({ id: users.id })
            .from(users)
            .where(sql`lower(${users.walletAddress}) = ${contributorAddr}`)
            .limit(1);

          const [existing] = await db
            .select()
            .from(contributions)
            .where(
              and(
                eq(contributions.fundId, fund.id),
                eq(contributions.txHash, txHash),
              ),
            )
            .limit(1);

          if (!existing) {
            await db.insert(contributions).values({
              fundId: fund.id,
              memberUserId: funderUser?.id ?? null,
              funderAddress: contributorAddr,
              amountWei: amountStr,
              asset: "AVAX",
              txHash,
              blockNumber: log.blockNumber,
              logIndex: log.logIndex,
              status: "CONFIRMED",
              reconciledAt: new Date(),
            });

            await db.insert(groupAuditEvents).values({
              workspaceId: fund.workspaceId,
              fundId: fund.id,
              actorUserId: funderUser?.id ?? null,
              actorWallet: contributorAddr,
              action: "ONCHAIN_DEPOSIT",
              metadataDiff: {
                amountWei: amountStr,
                txHash,
                referenceHash,
              },
            });
          }
        } else if (eventName === "GoalReached") {
          const { balance } = log.args as { balance: bigint };
          await db
            .update(funds)
            .set({ goalReached: true, updatedAt: new Date() })
            .where(eq(funds.id, fund.id));

          await db.insert(groupAuditEvents).values({
            workspaceId: fund.workspaceId,
            fundId: fund.id,
            action: "GOAL_REACHED",
            metadataDiff: {
              balanceWei: balance.toString(),
              txHash,
            },
          });
        } else if (eventName === "GoalRefunded") {
          const { contributor, amount } = log.args as {
            contributor: string;
            amount: bigint;
          };
          const contributorAddr = contributor.toLowerCase();
          const amountStr = amount.toString();

          const [existingClaim] = await db
            .select()
            .from(fundRefundClaims)
            .where(eq(fundRefundClaims.txHash, txHash))
            .limit(1);

          if (!existingClaim) {
            await db.insert(fundRefundClaims).values({
              fundId: fund.id,
              claimantAddress: contributorAddr,
              amountWei: amountStr,
              txHash,
            });

            await db.insert(groupAuditEvents).values({
              workspaceId: fund.workspaceId,
              fundId: fund.id,
              actorWallet: contributorAddr,
              action: "GOAL_REFUNDED",
              metadataDiff: {
                claimantAddress: contributorAddr,
                amountWei: amountStr,
                txHash,
              },
            });
          }
        } else if (eventName === "ExpenseProposed") {
          const { id: onchainId, proposer, recipient, amount, deadline, epoch, memoHash } =
            log.args as {
              id: bigint;
              proposer: string;
              recipient: string;
              amount: bigint;
              deadline: bigint;
              epoch: bigint;
              memoHash: string;
            };
          const propIdNum = Number(onchainId);
          const proposerAddr = proposer.toLowerCase();
          const recipientAddr = recipient.toLowerCase();
          const amountStr = amount.toString();
          const deadlineDate = new Date(Number(deadline) * 1000);

          const [existingExp] = await db
            .select()
            .from(expenseRequests)
            .where(
              and(
                eq(expenseRequests.fundId, fund.id),
                eq(expenseRequests.onchainExpenseId, propIdNum),
              ),
            )
            .limit(1);

          if (!existingExp) {
            const [proposerUser] = await db
              .select({ id: users.id })
              .from(users)
              .where(sql`lower(${users.walletAddress}) = ${proposerAddr}`)
              .limit(1);

            await db.insert(expenseRequests).values({
              fundId: fund.id,
              proposerId: proposerUser?.id ?? fund.createdBy,
              proposerAddress: proposerAddr,
              recipientAddress: recipientAddr,
              recipientName: recipientAddr.slice(0, 10),
              amountWei: amountStr,
              title: `Đề xuất chi On-chain #${propIdNum}`,
              purpose: `On-chain memo hash: ${memoHash}`,
              category: "OPERATING",
              deadline: deadlineDate,
              status: "PENDING_APPROVAL",
              onchainExpenseId: propIdNum,
              requiredApprovals: 2,
            });
          }

          await db.insert(groupAuditEvents).values({
            workspaceId: fund.workspaceId,
            fundId: fund.id,
            actorWallet: proposerAddr,
            action: "ONCHAIN_EXPENSE_PROPOSED",
            metadataDiff: {
              onchainExpenseId: propIdNum,
              recipient: recipientAddr,
              amountWei: amountStr,
              deadline: deadlineDate.toISOString(),
              epoch: Number(epoch),
              memoHash,
              txHash,
            },
          });
        } else if (eventName === "ExpenseApproved") {
          const { id: onchainId, approver, approvals } = log.args as {
            id: bigint;
            approver: string;
            approvals: bigint;
          };
          const propIdNum = Number(onchainId);
          const approverAddr = approver.toLowerCase();
          const approvalsCount = Number(approvals);

          await db
            .update(expenseRequests)
            .set({
              approvalsCount,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(expenseRequests.fundId, fund.id),
                eq(expenseRequests.onchainExpenseId, propIdNum),
              ),
            );

          await db.insert(groupAuditEvents).values({
            workspaceId: fund.workspaceId,
            fundId: fund.id,
            actorWallet: approverAddr,
            action: "ONCHAIN_EXPENSE_APPROVED",
            metadataDiff: {
              onchainExpenseId: propIdNum,
              approver: approverAddr,
              approvals: approvalsCount,
              txHash,
            },
          });
        } else if (eventName === "ExpenseFinalized") {
          const { id: onchainId, status } = log.args as {
            id: bigint;
            status: number;
          };
          const propIdNum = Number(onchainId);
          const statusNum = Number(status);
          let finalStatus = "PENDING_APPROVAL";
          if (statusNum === 3) finalStatus = "SETTLED";
          else if (statusNum === 4) finalStatus = "CANCELLED";
          else if (statusNum === 5) finalStatus = "REJECTED";
          else if (statusNum === 6) finalStatus = "EXPIRED";
          else if (statusNum === 7) finalStatus = "CANCELLED";

          await db
            .update(expenseRequests)
            .set({
              status: finalStatus,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(expenseRequests.fundId, fund.id),
                eq(expenseRequests.onchainExpenseId, propIdNum),
              ),
            );

          await db.insert(groupAuditEvents).values({
            workspaceId: fund.workspaceId,
            fundId: fund.id,
            action: "ONCHAIN_EXPENSE_FINALIZED",
            metadataDiff: {
              onchainExpenseId: propIdNum,
              onchainStatus: statusNum,
              dbStatus: finalStatus,
              txHash,
            },
          });
        } else if (eventName === "GovernanceProposed") {
          const { id: onchainId, action, proposer, epoch, commitment } = log.args as {
            id: bigint;
            action: number;
            proposer: string;
            epoch: bigint;
            commitment: string;
          };
          const govIdNum = Number(onchainId);
          const actionNum = Number(action);
          const actionNames = ["POLICY", "PAUSE", "RESUME", "CLOSE", "SURPLUS"];
          const actionName = actionNames[actionNum] || "POLICY";
          const proposerAddr = proposer.toLowerCase();

          const [existingGov] = await db
            .select()
            .from(fundGovernanceActions)
            .where(
              and(
                eq(fundGovernanceActions.fundId, fund.id),
                eq(fundGovernanceActions.onchainProposalId, govIdNum),
              ),
            )
            .limit(1);

          if (!existingGov) {
            await db.insert(fundGovernanceActions).values({
              fundId: fund.id,
              onchainProposalId: govIdNum,
              action: actionName,
              proposerAddress: proposerAddr,
              epoch: Number(epoch),
              commitment,
              status: "PENDING",
            });

            if (actionName === "POLICY") {
              await db.insert(fundPolicyProposals).values({
                fundId: fund.id,
                onchainProposalId: govIdNum,
                proposerAddress: proposerAddr,
                quorum: 2,
                dailyLimitWei: "0",
                termsHash: commitment || "0x",
                status: "PENDING",
              });
            }
          }

          await db.insert(groupAuditEvents).values({
            workspaceId: fund.workspaceId,
            fundId: fund.id,
            actorWallet: proposerAddr,
            action: "ONCHAIN_GOVERNANCE_PROPOSED",
            metadataDiff: {
              onchainProposalId: govIdNum,
              action: actionName,
              epoch: Number(epoch),
              commitment,
              txHash,
            },
          });
        } else if (eventName === "GovernanceApproved") {
          const { id: onchainId, approver, approvals, readyAt } = log.args as {
            id: bigint;
            approver: string;
            approvals: bigint;
            readyAt: bigint;
          };
          const govIdNum = Number(onchainId);
          const approverAddr = approver.toLowerCase();
          const approvalsCount = Number(approvals);
          const readyAtSec = Number(readyAt);
          const readyAtDate = readyAtSec > 0 ? new Date(readyAtSec * 1000) : null;

          await db
            .update(fundGovernanceActions)
            .set({
              approvalsCount,
              readyAt: readyAtDate,
              status: readyAtSec > 0 ? "APPROVED" : "PENDING",
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(fundGovernanceActions.fundId, fund.id),
                eq(fundGovernanceActions.onchainProposalId, govIdNum),
              ),
            );

          if (readyAtSec > 0) {
            await db
              .update(fundPolicyProposals)
              .set({
                timelockEndsAt: readyAtDate,
                status: "APPROVED",
              })
              .where(
                and(
                  eq(fundPolicyProposals.fundId, fund.id),
                  eq(fundPolicyProposals.onchainProposalId, govIdNum),
                ),
              );
          }

          await db.insert(groupAuditEvents).values({
            workspaceId: fund.workspaceId,
            fundId: fund.id,
            actorWallet: approverAddr,
            action: "ONCHAIN_GOVERNANCE_APPROVED",
            metadataDiff: {
              onchainProposalId: govIdNum,
              approver: approverAddr,
              approvals: approvalsCount,
              readyAt: readyAtDate?.toISOString(),
              txHash,
            },
          });
        } else if (eventName === "GovernanceFinalized") {
          const { id: onchainId, status } = log.args as {
            id: bigint;
            status: number;
          };
          const govIdNum = Number(onchainId);
          const statusNum = Number(status);
          let finalStatus = "PENDING";
          if (statusNum === 3) finalStatus = "EXECUTED";
          else if (statusNum === 4) finalStatus = "CANCELLED";
          else if (statusNum === 5) finalStatus = "REJECTED";
          else if (statusNum === 6) finalStatus = "EXPIRED";
          else if (statusNum === 7) finalStatus = "INVALIDATED";

          await db
            .update(fundGovernanceActions)
            .set({
              status: finalStatus,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(fundGovernanceActions.fundId, fund.id),
                eq(fundGovernanceActions.onchainProposalId, govIdNum),
              ),
            );

          await db
            .update(fundPolicyProposals)
            .set({
              status: finalStatus,
            })
            .where(
              and(
                eq(fundPolicyProposals.fundId, fund.id),
                eq(fundPolicyProposals.onchainProposalId, govIdNum),
              ),
            );

          await db.insert(groupAuditEvents).values({
            workspaceId: fund.workspaceId,
            fundId: fund.id,
            action: "ONCHAIN_GOVERNANCE_FINALIZED",
            metadataDiff: {
              onchainProposalId: govIdNum,
              onchainStatus: statusNum,
              dbStatus: finalStatus,
              txHash,
            },
          });
        } else if (eventName === "PolicyApplied") {
          const { epoch, quorum, termsHash } = log.args as {
            epoch: bigint;
            quorum: bigint;
            termsHash: string;
          };
          const newEpoch = Number(epoch);
          const quorumNum = Number(quorum);

          await db
            .update(funds)
            .set({
              policyEpoch: newEpoch,
              termsHash,
              updatedAt: new Date(),
            })
            .where(eq(funds.id, fund.id));

          await db.insert(fundPolicies).values({
            fundId: fund.id,
            version: newEpoch,
            quorum: quorumNum,
            signers: [],
            fastWithdrawLimitWei: "0",
            effectiveFrom: new Date(),
          });

          await db.insert(groupAuditEvents).values({
            workspaceId: fund.workspaceId,
            fundId: fund.id,
            action: "POLICY_APPLIED",
            metadataDiff: {
              epoch: newEpoch,
              quorum: quorumNum,
              termsHash,
              txHash,
            },
          });
        } else if (eventName === "PauseChanged") {
          const { paused } = log.args as { paused: boolean };
          await db
            .update(funds)
            .set({
              isPaused: Boolean(paused),
              status: paused ? "PAUSED" : "ACTIVE",
              updatedAt: new Date(),
            })
            .where(eq(funds.id, fund.id));

          await db.insert(groupAuditEvents).values({
            workspaceId: fund.workspaceId,
            fundId: fund.id,
            action: "PAUSE_CHANGED",
            metadataDiff: {
              paused: Boolean(paused),
              txHash,
            },
          });
        }
      }
    } catch (logErr) {
      console.error(`V2 Indexer: Error querying logs for fund ${fund.id} (${fundAddress})`, logErr);
    }
  }

  // Tự động đối soát trạng thái tức thời on-chain để đảm bảo tính nhất quán tuyệt đối
  try {
    const [accountedBal, reservedBal, liveEpoch, isPausedLive, goalReachedLive] =
      await Promise.all([
        client.readContract({
          address: fundAddress,
          abi: KINETIX_FUND_V2_ABI,
          functionName: "accountedBalance",
        }),
        client.readContract({
          address: fundAddress,
          abi: KINETIX_FUND_V2_ABI,
          functionName: "reservedBalance",
        }),
        client.readContract({
          address: fundAddress,
          abi: KINETIX_FUND_V2_ABI,
          functionName: "policyEpoch",
        }),
        client.readContract({
          address: fundAddress,
          abi: KINETIX_FUND_V2_ABI,
          functionName: "paused",
        }),
        client.readContract({
          address: fundAddress,
          abi: KINETIX_FUND_V2_ABI,
          functionName: "goalReached",
        }),
      ]);

    const livePaused = Boolean(isPausedLive);
    const liveGoal = Boolean(goalReachedLive);

    await db
      .update(funds)
      .set({
        balanceWei: (accountedBal as bigint).toString(),
        reservedWei: (reservedBal as bigint).toString(),
        policyEpoch: Number(liveEpoch),
        isPaused: livePaused,
        goalReached: liveGoal,
        status: livePaused ? "PAUSED" : (fund.status === "PAUSED" ? "ACTIVE" : fund.status),
        updatedAt: new Date(),
      })
      .where(eq(funds.id, fund.id));
  } catch {}

  // Lưu lại cursor sau khi hoàn tất batch
  if (toBlock >= fromBlock) {
    await db
      .insert(activityCursors)
      .values({ id: cursorId, nextBlock: toBlock + 1n })
      .onConflictDoUpdate({
        target: activityCursors.id,
        set: { nextBlock: toBlock + 1n },
      });
  }
}

/**
 * Worker tick định kỳ 15 giây: Đồng bộ tất cả các Quỹ V2 trên chuỗi.
 */
export async function syncV2Funds(): Promise<void> {
  let lockClient: any = null;
  try {
    lockClient = await pool.connect();
    const result = await lockClient.query(
      "SELECT pg_try_advisory_lock(hashtext('kinetix:v2-indexer')) AS acquired",
    );
    if (!result.rows[0].acquired) return;

    const v2Funds = await db
      .select()
      .from(funds)
      .where(
        and(
          or(
            eq(funds.custodyType, "ONCHAIN_V2"),
            sql`${funds.contractAddress} IS NOT NULL`,
          ),
          sql`${funds.contractAddress} != ''`,
        ),
      );

    if (v2Funds.length === 0) return;

    const { client, chainId } = getV2Client();
    const config = getV2Config();

    for (const fund of v2Funds) {
      await syncV2FundInternal(fund, client, chainId, config);
    }
  } catch (error) {
    console.error("syncV2Funds encountered an error:", error);
  } finally {
    if (lockClient) {
      await lockClient
        .query("SELECT pg_advisory_unlock(hashtext('kinetix:v2-indexer'))")
        .catch(() => {});
      lockClient.release();
    }
  }
}

/**
 * Đồng bộ ngay lập tức cho 1 quỹ V2 (khi nhận được receipt khởi tạo hoặc giao dịch mới).
 */
export async function syncSingleV2Fund(fundId: string): Promise<void> {
  const [fund] = await db
    .select()
    .from(funds)
    .where(eq(funds.id, fundId))
    .limit(1);

  if (!fund || !fund.contractAddress) return;

  const { client, chainId } = getV2Client();
  const config = getV2Config();
  await syncV2FundInternal(fund, client, chainId, config);
}
