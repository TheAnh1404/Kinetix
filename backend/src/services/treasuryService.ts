import { and, desc, eq, isNotNull, inArray, sql } from "drizzle-orm";
import { createPublicClient, http, isAddress, formatEther } from "viem";
import {
  db,
  treasuryJars as jars,
  treasuryTransfers as transfers,
  treasuryEntries as entries,
  treasuryAttempts as attempts,
  treasuryPolicies as policies,
  treasuryJobs as jobs,
} from "../db";
import { AuthContext, membership } from "../auth/service";
import { assert, textInput, uuidInput } from "../auth/security";
import { requireWorkspaceWrites } from "./familyAccess";
import {
  TREASURY_ADDRESS,
  TREASURY_CHAIN_ID,
  treasuryAmount,
  treasuryMemo,
  matchesTreasuryTransfer,
  matchesTreasuryCancellation,
} from "../../../shared/treasury";

type Store = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function access(
  auth: AuthContext,
  workspaceId: string,
  admin = false,
  store: typeof db | Store = db,
) {
  const member = await membership(store, auth, uuidInput(workspaceId));
  assert(
    !admin || member.role === "ADMIN",
    403,
    "Chỉ quản trị viên được tạo hũ và phân bổ tiền ví chung.",
  );
  return member;
}
export async function treasuryClient() {
  const client = createPublicClient({
    transport: http(
      process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
    ),
  });
  assert(
    (await client.getChainId()) === TREASURY_CHAIN_ID,
    503,
    "RPC phải là Avalanche Fuji C-Chain 43113.",
  );
  return client;
}
async function lock(tx: Store) {
  // One custody address across all workspaces: serialize reservations, nonces and postings.
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext('kinetix:fuji-treasury'))`,
  );
}
export async function createTreasuryJar(
  auth: AuthContext,
  workspaceId: string,
  name: unknown,
) {
  return db.transaction(async (tx) => {
    await access(auth, workspaceId, true, tx);
    await requireWorkspaceWrites(tx, workspaceId);
    const [jar] = await tx
      .insert(jars)
      .values({
        workspaceId,
        name: textInput(name, 100),
        createdBy: auth.user.id,
      })
      .returning();
    return jar;
  });
}
export async function createTreasuryTransfer(
  auth: AuthContext,
  workspaceId: string,
  body: any,
  context?: { jobId: string },
  store?: Store,
) {
  assert(
    ["DEPOSIT", "WITHDRAW", "INTERNAL"].includes(body.kind),
    400,
    "Loại giao dịch không hợp lệ.",
  );
  let amount: bigint;
  try {
    amount = treasuryAmount(body.amount);
  } catch (error) {
    assert(false, 400, (error as Error).message);
  }
  const client = body.kind !== "INTERNAL" ? await treasuryClient() : null;
  const perform = async (tx: Store) => {
    await lock(tx);
    await access(auth, workspaceId, body.kind !== "DEPOSIT" && !context, tx);
    assert(auth.wallet, 403, "Cần liên kết ví.");
    const requestId = uuidInput(body.requestId);
    const [existing] = await tx
      .select()
      .from(transfers)
      .where(eq(transfers.id, requestId));
    if (existing) {
      assert(
        existing.createdBy === auth.user.id &&
          existing.workspaceId === workspaceId &&
          existing.kind === body.kind &&
          existing.jarId === body.jarId &&
          existing.amountWei === amount!.toString() &&
          (existing.kind !== "WITHDRAW" ||
            existing.recipient === body.recipient?.toLowerCase()) &&
          (existing.kind !== "INTERNAL" ||
            existing.destinationJarId === body.destinationJarId),
        409,
        "Mã yêu cầu đã được dùng cho giao dịch khác.",
      );
      return publicTreasuryTransfer(existing);
    }
    const [jar] = await tx
      .select()
      .from(jars)
      .where(
        and(
          eq(jars.id, uuidInput(body.jarId)),
          eq(jars.workspaceId, workspaceId),
        ),
      );
    assert(jar, 404, "Không tìm thấy hũ trong không gian này.");
    assert(!jar.isArchived, 409, "Hũ đã lưu trữ, không nhận giao dịch mới.");
    await requireWorkspaceWrites(tx, workspaceId, body.kind !== "DEPOSIT");
    const [policy] = await tx
      .select()
      .from(policies)
      .where(eq(policies.jarId, jar.id));
    if (policy && (body.kind !== "DEPOSIT" || policy.config.kind === "ROSCA")) {
      assert(
        context?.jobId,
        403,
        "Hũ có chính sách: hãy dùng yêu cầu hỗ trợ, thưởng hoặc kỳ góp tương ứng.",
      );
      const [job] = await tx
        .select()
        .from(jobs)
        .where(eq(jobs.id, context.jobId));
      assert(
        job &&
          job.jarId === jar.id &&
          job.status === "APPROVED" &&
          !job.transferId &&
          job.amountWei === amount!.toString(),
        409,
        "Nghiệp vụ chưa đủ điều kiện thanh toán.",
      );
      assert(
        body.kind === "DEPOSIT"
          ? job.kind === "CONTRIBUTION" && job.subjectId === auth.user.id
          : body.kind === "INTERNAL"
            ? job.kind === "CHORE"
            : job.recipient === body.recipient?.toLowerCase(),
        403,
        "Khoản chuyển không khớp người nhận đã duyệt.",
      );
    }
    const outgoing = body.kind !== "DEPOSIT";
    assert(
      !outgoing || BigInt(jar.balanceWei) - BigInt(jar.reservedWei) >= amount!,
      409,
      "Số dư khả dụng của hũ không đủ.",
    );
    const sender =
      body.kind === "DEPOSIT"
        ? auth.wallet.address.toLowerCase()
        : TREASURY_ADDRESS;
    let recipient = TREASURY_ADDRESS as string;
    let destinationJarId: string | null = null;
    if (body.kind === "WITHDRAW") {
      assert(isAddress(body.recipient), 400, "Địa chỉ nhận không hợp lệ.");
      recipient = body.recipient.toLowerCase();
      assert(
        recipient !== TREASURY_ADDRESS && !/^0x0{40}$/.test(recipient),
        400,
        "Không thể rút về ví chung hoặc địa chỉ zero.",
      );
    } else if (body.kind === "DEPOSIT") {
      assert(
        sender !== TREASURY_ADDRESS,
        400,
        "Ví chung không thể tự nạp cho chính nó.",
      );
    } else {
      const [target] = await tx
        .select()
        .from(jars)
        .where(
          and(
            eq(jars.id, uuidInput(body.destinationJarId)),
            eq(jars.workspaceId, workspaceId),
          ),
        );
      assert(
        target && target.id !== jar.id,
        400,
        "Hũ nhận phải khác hũ nguồn và cùng không gian.",
      );
      destinationJarId = target.id;
      const [targetPolicy] = await tx
        .select()
        .from(policies)
        .where(eq(policies.jarId, target.id));
      assert(
        targetPolicy?.config.kind !== "ROSCA",
        403,
        "Góp họ hụi phải gắn với thành viên và kỳ.",
      );
      if (targetPolicy?.config.kind === "SAVINGS")
        assert(
          context?.jobId,
          403,
          "Phân bổ vào heo đất phải qua nghiệp vụ thưởng.",
        );
    }
    let nonce: bigint | null = null;
    if (client) {
      // Persist the nonce before signing. Re-signing the same intent cannot pay twice.
      nonce = BigInt(
        await client.getTransactionCount({
          address: sender as `0x${string}`,
          blockTag: "pending",
        }),
      );
      const prior = await tx
        .select({ nonce: transfers.nonce })
        .from(transfers)
        .where(
          and(
            eq(transfers.sender, sender),
            eq(transfers.chainId, TREASURY_CHAIN_ID),
            isNotNull(transfers.nonce),
          ),
        )
        .orderBy(desc(transfers.nonce))
        .limit(1);
      if (
        prior[0]?.nonce !== null &&
        prior[0]?.nonce !== undefined &&
        prior[0].nonce >= nonce
      )
        nonce = prior[0].nonce + 1n;
    }
    const [transfer] = await tx
      .insert(transfers)
      .values({
        id: requestId,
        workspaceId,
        jarId: jar.id,
        destinationJarId,
        kind: body.kind,
        amountWei: amount!.toString(),
        sender,
        recipient,
        nonce,
        createdBy: auth.user.id,
        status: body.kind === "INTERNAL" ? "CONFIRMED" : "READY",
      })
      .returning();
    if (body.kind === "INTERNAL") {
      await tx
        .update(jars)
        .set({ balanceWei: sql`${jars.balanceWei} - ${amount!.toString()}` })
        .where(eq(jars.id, jar.id));
      await tx
        .update(jars)
        .set({ balanceWei: sql`${jars.balanceWei} + ${amount!.toString()}` })
        .where(eq(jars.id, destinationJarId!));
      await tx.insert(entries).values([
        {
          transferId: transfer.id,
          jarId: jar.id,
          deltaWei: (-amount!).toString(),
        },
        {
          transferId: transfer.id,
          jarId: destinationJarId!,
          deltaWei: amount!.toString(),
        },
      ]);
    } else if (body.kind === "WITHDRAW") {
      await tx
        .update(jars)
        .set({ reservedWei: sql`${jars.reservedWei} + ${amount!.toString()}` })
        .where(eq(jars.id, jar.id));
    }
    return publicTreasuryTransfer(transfer);
  };
  return store ? perform(store) : db.transaction(perform);
}
export function publicTreasuryTransfer(row: typeof transfers.$inferSelect) {
  return {
    ...row,
    nonce: row.nonce?.toString() ?? null,
    blockNumber: row.blockNumber?.toString() ?? null,
    amount: formatEther(BigInt(row.amountWei)),
    transaction:
      row.kind === "INTERNAL"
        ? null
        : {
            chainId: TREASURY_CHAIN_ID,
            from: row.sender,
            to: row.recipient,
            value: row.amountWei,
            nonce: row.nonce!.toString(),
            data: treasuryMemo(row.id),
          },
  };
}
export async function submitTreasuryHash(
  auth: AuthContext,
  id: string,
  hash: unknown,
) {
  assert(
    typeof hash === "string" && /^0x[0-9a-f]{64}$/i.test(hash),
    400,
    "Tx hash không hợp lệ.",
  );
  const [row] = await db
    .select()
    .from(transfers)
    .where(eq(transfers.id, uuidInput(id)));
  assert(
    row && row.kind !== "INTERNAL",
    404,
    "Không tìm thấy yêu cầu chuyển on-chain.",
  );
  // Attaching a verified public receipt does not authorize spending; the Core
  // signer and immutable intent do. Allow members to recover a custody receipt.
  await access(auth, row.workspaceId);
  assert(
    row.kind === "WITHDRAW" || row.createdBy === auth.user.id,
    403,
    "Giao dịch không thuộc tài khoản này.",
  );
  const client = await treasuryClient();
  const transaction = await client.getTransaction({
    hash: hash as `0x${string}`,
  });
  const intent = { ...row, nonce: row.nonce!.toString() };
  assert(
    matchesTreasuryTransfer(intent, transaction) ||
      matchesTreasuryCancellation(intent, transaction),
    400,
    "Giao dịch sai ví, số tiền, nonce hoặc mã tham chiếu hũ.",
  );
  await db.transaction(async (tx) => {
    await lock(tx);
    const [current] = await tx
      .select()
      .from(transfers)
      .where(eq(transfers.id, row.id));
    if (["CONFIRMED", "REVERTED", "CANCELLED"].includes(current.status)) {
      assert(
        current.txHash === hash.toLowerCase(),
        409,
        "Yêu cầu đã kết thúc.",
      );
      return;
    }
    await tx
      .insert(attempts)
      .values({ transferId: row.id, txHash: hash.toLowerCase() })
      .onConflictDoNothing();
    // A replacement is allowed only for the same persisted sender/nonce/intent.
    await tx
      .update(transfers)
      .set({ txHash: hash.toLowerCase(), status: "SUBMITTED" })
      .where(eq(transfers.id, row.id));
  });
  await reconcileTreasuryTransfer(row.id);
  return publicTreasuryTransfer(
    (await db.select().from(transfers).where(eq(transfers.id, row.id)))[0],
  );
}
export async function reconcileTreasuryTransfer(id: string) {
  const [row] = await db.select().from(transfers).where(eq(transfers.id, id));
  if (!row || row.status !== "SUBMITTED" || !row.txHash) return;
  const client = await treasuryClient();
  const finalized = await client.getBlock({ blockTag: "finalized" });
  if (finalized.number === null) return;
  const candidates = await db
    .select()
    .from(attempts)
    .where(eq(attempts.transferId, id));
  let receipt;
  // Payment and cancellation can race for one nonce. Finalize whichever actually mined.
  for (const candidate of candidates) {
    try {
      const found = await client.getTransactionReceipt({
        hash: candidate.txHash as `0x${string}`,
      });
      if (found.blockNumber <= finalized.number) {
        receipt = found;
        break;
      }
    } catch (error: any) {
      if (error.name !== "TransactionReceiptNotFoundError") throw error;
    }
  }
  if (!receipt) return;
  const [block, transaction] = await Promise.all([
    client.getBlock({ blockNumber: receipt.blockNumber }),
    client.getTransaction({ hash: receipt.transactionHash }),
  ]);
  const intent = { ...row, nonce: row.nonce!.toString() };
  const cancellation = matchesTreasuryCancellation(intent, transaction);
  assert(
    block.hash === receipt.blockHash &&
      (matchesTreasuryTransfer(intent, transaction) || cancellation),
    409,
    "Receipt chưa khớp chuỗi canonical.",
  );
  await db.transaction(async (tx) => {
    await lock(tx);
    const [current] = await tx
      .select()
      .from(transfers)
      .where(eq(transfers.id, id));
    if (current.status !== "SUBMITTED") return;
    const success = receipt.status === "success" && !cancellation;
    const [job] = await tx.select().from(jobs).where(eq(jobs.transferId, id));
    if (job) {
      await tx
        .update(jobs)
        .set({ status: success ? "PAID" : "CANCELLED" })
        .where(eq(jobs.id, job.id));
      if (success && job.kind === "PAYOUT") {
        const [policy] = await tx
          .select()
          .from(policies)
          .where(eq(policies.jarId, job.jarId));
        assert(
          policy && policy.config.round === job.round,
          409,
          "Kỳ họ hụi đã thay đổi.",
        );
        await tx
          .update(policies)
          .set({
            config: {
              ...policy.config,
              round: policy.config.round + 1,
              roundStartedAt: new Date(
                Number(block.timestamp) * 1000,
              ).toISOString(),
            },
          })
          .where(eq(policies.jarId, job.jarId));
      }
    }
    const amount = row.amountWei;
    if (row.kind === "WITHDRAW")
      await tx
        .update(jars)
        .set({
          reservedWei: sql`${jars.reservedWei} - ${amount}`,
          ...(success
            ? { balanceWei: sql`${jars.balanceWei} - ${amount}` }
            : {}),
        })
        .where(eq(jars.id, row.jarId));
    else if (success)
      await tx
        .update(jars)
        .set({ balanceWei: sql`${jars.balanceWei} + ${amount}` })
        .where(eq(jars.id, row.jarId));
    if (success)
      await tx.insert(entries).values({
        transferId: id,
        jarId: row.jarId,
        deltaWei:
          row.kind === "DEPOSIT" ? amount : (-BigInt(amount)).toString(),
      });
    await tx
      .update(transfers)
      .set({
        status: success
          ? "CONFIRMED"
          : receipt.status === "success" && cancellation
            ? "CANCELLED"
            : "REVERTED",
        txHash: receipt.transactionHash.toLowerCase(),
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
      })
      .where(eq(transfers.id, id));
  });
}
export async function reconcileTreasury() {
  const rows = await db
    .select({ id: transfers.id })
    .from(transfers)
    .where(eq(transfers.status, "SUBMITTED"))
    .limit(100);
  for (const row of rows)
    await reconcileTreasuryTransfer(row.id).catch(() => {
      /* Retry next poll; never mark an RPC failure as a payment. */
    });
}
export async function treasuryOverview(auth: AuthContext, workspaceId: string) {
  const member = await access(auth, workspaceId);
  let jarRows = await db
    .select()
    .from(jars)
    .where(eq(jars.workspaceId, workspaceId));
  const configured = jarRows.length
    ? await db
        .select()
        .from(policies)
        .where(
          inArray(
            policies.jarId,
            jarRows.map((jar) => jar.id),
          ),
        )
    : [];
  jarRows = jarRows.filter((jar) => {
    const policy = configured.find((row) => row.jarId === jar.id)?.config;
    return (
      !policy ||
      member.role === "ADMIN" ||
      policy.beneficiaries.includes(auth.user.id) ||
      (["ADMIN", "GUARDIAN"].includes(member.role) &&
        policy.guardians.includes(auth.user.id))
    );
  });
  const history = await db
    .select()
    .from(transfers)
    .where(eq(transfers.workspaceId, workspaceId))
    .orderBy(desc(transfers.createdAt))
    .limit(100);
  const open = await db
    .select()
    .from(transfers)
    .where(
      and(
        eq(transfers.workspaceId, workspaceId),
        inArray(transfers.status, ["READY", "SUBMITTED"]),
      ),
    );
  const visibleHistory = [
    ...open,
    ...history.filter((row) => !open.some((pending) => pending.id === row.id)),
  ].filter((transfer) =>
    jarRows.some(
      (jar) =>
        jar.id === transfer.jarId || jar.id === transfer.destinationJarId,
    ),
  );
  let reconciliation: null | {
    walletBalance: string;
    allocated: string;
    difference: string;
    blockNumber: string;
  } = null;
  // Global totals only for the custody wallet owner; workspace members see their own jars.
  if (auth.wallet?.address.toLowerCase() === TREASURY_ADDRESS) {
    const client = await treasuryClient();
    const block = await client.getBlock({ blockTag: "finalized" });
    const walletBalance = await client.getBalance({
      address: TREASURY_ADDRESS,
      blockNumber: block.number!,
    });
    const allJars = await db.select({ balance: jars.balanceWei }).from(jars);
    const allocated = allJars.reduce(
      (sum, jar) => sum + BigInt(jar.balance),
      0n,
    );
    reconciliation = {
      walletBalance: formatEther(walletBalance),
      allocated: formatEther(allocated),
      difference: formatEther(walletBalance - allocated),
      blockNumber: String(block.number),
    };
  }
  return {
    address: TREASURY_ADDRESS,
    chainId: TREASURY_CHAIN_ID,
    canManage: member.role === "ADMIN",
    jars: jarRows.map((jar) => ({
      ...jar,
      balance: formatEther(BigInt(jar.balanceWei)),
      available: formatEther(BigInt(jar.balanceWei) - BigInt(jar.reservedWei)),
    })),
    transfers: visibleHistory.map(publicTreasuryTransfer),
    reconciliation,
  };
}
