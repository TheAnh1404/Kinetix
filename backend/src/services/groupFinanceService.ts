import { createHash } from "node:crypto";
import {
  and,
  or,
  eq,
  isNull,
  isNotNull,
  desc,
  sql,
  inArray,
  lt,
  gte,
} from "drizzle-orm";
import { isAddress, formatEther } from "viem";
import {
  db,
  workspaces,
  workspaceMembers,
  users,
  userWallets,
  groupFunds as funds,
  fundPolicies,
  contributionObligations,
  contributions,
  expenseRequests,
  expenseApprovals,
  payments,
  groupAuditEvents,
  groupTransferIntents as intents,
} from "../db";
import { AuthContext, membership, createInvitation } from "../auth/service";
import { assert, textInput, uuidInput } from "../auth/security";
import { requireWorkspaceWrites } from "./familyAccess";
import { treasuryClient } from "./treasuryService";
import { sanitizeProofImage } from "./proofImage";
import {
  GROUP_CHAIN_ID,
  groupTransferMemo,
  matchesGroupTransfer,
} from "../../../shared/groupFinance";

type Store = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Fund = typeof funds.$inferSelect;
type Intent = typeof intents.$inferSelect;
const lock = (tx: Store) =>
  tx.execute(
    sql`select pg_advisory_xact_lock(hashtext('kinetix:group-finance'))`,
  );

export function toWeiString(input: unknown): string {
  const value =
    typeof input === "bigint"
      ? input.toString()
      : typeof input === "number" && Number.isSafeInteger(input)
        ? String(input)
        : input;
  assert(
    typeof value === "string" && /^\d{1,78}$/.test(value),
    400,
    "Số tiền phải là số nguyên không âm (wei), tối đa 78 chữ số.",
  );
  assert(
    BigInt(value) <= (1n << 256n) - 1n,
    400,
    "Số tiền vượt giới hạn tài sản native.",
  );
  return BigInt(value).toString();
}
const positiveWei = (input: unknown) => {
  const value = toWeiString(input);
  assert(BigInt(value) > 0n, 400, "Số tiền phải lớn hơn 0.");
  return value;
};
const address = (input: unknown) => {
  assert(
    typeof input === "string" && isAddress(input) && !/^0x0{40}$/i.test(input),
    400,
    "Địa chỉ ví không hợp lệ.",
  );
  return input.toLowerCase();
};
const walletOf = (auth: AuthContext) => {
  assert(
    auth.wallet?.address,
    403,
    "Cần ví đã xác minh liên kết với tài khoản.",
  );
  return address(auth.wallet.address);
};
export async function recordAuditEvent(
  tx: Store,
  params: {
    workspaceId: string;
    fundId?: string | null;
    actorUserId?: string | null;
    actorWallet?: string | null;
    action: string;
    metadataDiff?: Record<string, unknown>;
  },
) {
  await tx
    .insert(groupAuditEvents)
    .values({ ...params, metadataDiff: params.metadataDiff || {} });
}
async function fundAccess(
  store: typeof db | Store,
  auth: AuthContext,
  groupId: string,
  fundId: string,
  write = false,
) {
  const wsId = uuidInput(groupId);
  await membership(store, auth, wsId);
  const [fund] = await store
    .select()
    .from(funds)
    .where(and(eq(funds.id, uuidInput(fundId)), eq(funds.workspaceId, wsId)));
  assert(fund, 404, "Không tìm thấy quỹ trong nhóm này.");
  if (write) {
    await requireWorkspaceWrites(store, wsId);
    assert(fund.status === "ACTIVE", 409, "Quỹ đang tạm dừng hoặc đã đóng.");
  }
  return fund;
}
function requireCustody(fund: Fund) {
  assert(
    fund.custodyType === "SHARED_TREASURY" && fund.treasuryWalletAddress,
    409,
    "Quỹ chưa có adapter thanh toán đã xác minh. Không gửi tiền tới địa chỉ mặc định.",
    "FUND_ADAPTER_UNAVAILABLE",
  );
  return address(fund.treasuryWalletAddress);
}
async function policyFor(store: typeof db | Store, fundId: string) {
  const [policy] = await store
    .select()
    .from(fundPolicies)
    .where(eq(fundPolicies.fundId, fundId))
    .orderBy(desc(fundPolicies.version))
    .limit(1);
  assert(policy, 409, "Quỹ chưa có chính sách.");
  return policy;
}
async function expenseAccess(tx: Store, auth: AuthContext, expenseId: string) {
  const [request] = await tx
    .select()
    .from(expenseRequests)
    .where(eq(expenseRequests.id, uuidInput(expenseId)));
  assert(request, 404, "Không tìm thấy đề nghị chi.");
  const [fund] = await tx
    .select()
    .from(funds)
    .where(eq(funds.id, request.fundId));
  assert(fund, 404, "Không tìm thấy quỹ.");
  await membership(tx, auth, fund.workspaceId);
  return { request, fund };
}
async function expireRequests(tx: Store, fund: Fund) {
  const expired = await tx
    .select()
    .from(expenseRequests)
    .where(
      and(
        eq(expenseRequests.fundId, fund.id),
        inArray(expenseRequests.status, ["PENDING_APPROVAL", "APPROVED"]),
        lt(expenseRequests.deadline, new Date()),
      ),
    );
  if (!expired.length) return;
  const amount = expired.reduce(
    (sum, item) => sum + BigInt(item.amountWei),
    0n,
  );
  assert(BigInt(fund.reservedWei) >= amount, 409, "Sổ giữ chỗ cần đối soát.");
  await tx
    .update(expenseRequests)
    .set({ status: "EXPIRED", updatedAt: new Date() })
    .where(
      inArray(
        expenseRequests.id,
        expired.map((item) => item.id),
      ),
    );
  await tx
    .update(funds)
    .set({
      reservedWei: sql`${funds.reservedWei} - ${amount.toString()}`,
      updatedAt: new Date(),
    })
    .where(eq(funds.id, fund.id));
  await recordAuditEvent(tx, {
    workspaceId: fund.workspaceId,
    fundId: fund.id,
    action: "EXPENSES_EXPIRED",
    metadataDiff: { requestIds: expired.map((item) => item.id) },
  });
}
export async function getGroupRoster(
  store: typeof db | Store,
  workspaceId: string,
) {
  return store
    .select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
      avatarUrl: users.avatarUrl,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.joinedAt,
      walletAddress: userWallets.address,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .leftJoin(userWallets, eq(userWallets.userId, users.id))
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        isNull(workspaceMembers.accessDisabledAt),
        isNull(users.suspendedAt),
      ),
    );
}
export async function getGroupOverview(auth: AuthContext, groupId: string) {
  const wsId = uuidInput(groupId);
  const caller = await membership(db, auth, wsId);
  const [group] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, wsId));
  return {
    group,
    caller: {
      userId: auth.user.id,
      canManageMembers: caller.isOwner,
      walletAddress: auth.wallet?.address,
    },
    members: await getGroupRoster(db, wsId),
  };
}
export async function inviteGroupMember(
  auth: AuthContext,
  groupId: string,
  body: { walletAddress: string; role?: string },
) {
  assert(
    !body.role || ["MEMBER", "GUARDIAN"].includes(body.role),
    400,
    "Lời mời không cấp quyền quản trị hoặc quyền ký tiền.",
  );
  return createInvitation(
    auth,
    uuidInput(groupId),
    address(body.walletAddress),
  );
}
export async function removeGroupMember(
  auth: AuthContext,
  groupId: string,
  _memberId: string,
) {
  await membership(db, auth, uuidInput(groupId), true);
  assert(
    false,
    409,
    "Dùng quy trình quản lý thành viên hiện hành; cần bàn giao quyền quỹ trước khi thu hồi thành viên.",
  );
}
export async function listGroupFunds(auth: AuthContext, groupId: string) {
  const wsId = uuidInput(groupId);
  await membership(db, auth, wsId);
  return db.transaction(async (tx) => {
    await lock(tx);
    const rows = await tx
      .select()
      .from(funds)
      .where(eq(funds.workspaceId, wsId));
    for (const fund of rows) await expireRequests(tx, fund);
    const current = await tx
      .select()
      .from(funds)
      .where(eq(funds.workspaceId, wsId))
      .orderBy(desc(funds.createdAt));
    return Promise.all(
      current.map(async (fund) => ({
        ...fund,
        availableWei: (
          BigInt(fund.balanceWei) - BigInt(fund.reservedWei)
        ).toString(),
        policy: await policyFor(tx, fund.id),
        canPay:
          fund.custodyType === "SHARED_TREASURY" &&
          fund.treasuryWalletAddress === auth.wallet?.address.toLowerCase(),
      })),
    );
  });
}
export async function createGroupFund(
  auth: AuthContext,
  groupId: string,
  body: {
    name: string;
    description?: string;
    fundType: "OPERATING" | "GOAL";
    custodyType?: string;
    treasuryWalletAddress?: string;
    fastWithdrawLimitWei?: string;
    requiredApprovals: number;
    guardianWallets: string[];
    targetAmountWei?: string;
    targetDeadline?: string;
    idempotencyKey?: string;
  },
) {
  const wsId = uuidInput(groupId),
    custody = walletOf(auth);
  assert(
    body.custodyType === "SHARED_TREASURY",
    409,
    "Adapter quỹ contract V2 chưa được kích hoạt. Chọn ví giữ tiền với điều khoản lưu ký rõ ràng.",
    "FUND_ADAPTER_UNAVAILABLE",
  );
  assert(
    address(body.treasuryWalletAddress) === custody,
    400,
    "Người tạo phải xác nhận dùng chính ví đã liên kết làm ví giữ tiền.",
  );
  assert(
    ["OPERATING", "GOAL"].includes(body.fundType),
    400,
    "Mẫu quỹ không hợp lệ.",
  );
  assert(
    !body.fastWithdrawLimitWei ||
      toWeiString(body.fastWithdrawLimitWei) === "0",
    400,
    "Chi nhanh chưa được hỗ trợ trong adapter lưu ký.",
  );
  assert(Array.isArray(body.guardianWallets), 400, "Cần chọn người duyệt.");
  const signers = body.guardianWallets.map(address);
  assert(
    signers.length >= 2 &&
      signers.length <= 32 &&
      new Set(signers).size === signers.length,
    400,
    "Cần 2–32 ví người duyệt khác nhau.",
  );
  assert(
    Number.isInteger(body.requiredApprovals) &&
      body.requiredApprovals >= 1 &&
      body.requiredApprovals < signers.length,
    400,
    "Ngưỡng duyệt phải nhỏ hơn số người duyệt để loại phiếu của người nhận.",
  );
  const target =
    body.fundType === "GOAL" ? positiveWei(body.targetAmountWei) : "0";
  const name = textInput(body.name, 100),
    description = body.description ? textInput(body.description, 500) : "";
  const creationKey = textInput(body.idempotencyKey, 64);
  const creationFingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        name,
        description,
        kind: body.fundType,
        custody,
        signers,
        quorum: body.requiredApprovals,
        target,
        deadline: body.targetDeadline || null,
      }),
    )
    .digest("hex");
  const deadline =
    body.fundType === "GOAL" ? new Date(body.targetDeadline || "") : null;
  assert(
    !deadline ||
      (Number.isFinite(deadline.getTime()) && deadline.getTime() > Date.now()),
    400,
    "Quỹ mục tiêu cần hạn góp trong tương lai.",
  );
  return db.transaction(async (tx) => {
    await lock(tx);
    await membership(tx, auth, wsId);
    await requireWorkspaceWrites(tx, wsId);
    const [prior] = await tx
      .select()
      .from(groupAuditEvents)
      .where(
        and(
          eq(groupAuditEvents.workspaceId, wsId),
          eq(groupAuditEvents.actorUserId, auth.user.id),
          eq(groupAuditEvents.action, "FUND_CREATED"),
          sql`${groupAuditEvents.metadataDiff}->>'creationKey' = ${creationKey}`,
        ),
      );
    if (prior) {
      assert(
        (prior.metadataDiff as Record<string, unknown> | null)
          ?.creationFingerprint === creationFingerprint,
        409,
        "Khóa tạo quỹ đã được dùng với cấu hình khác.",
      );
      const existing = await fundAccess(tx, auth, wsId, prior.fundId!);
      return {
        ...existing,
        availableWei: (
          BigInt(existing.balanceWei) - BigInt(existing.reservedWei)
        ).toString(),
        policy: await policyFor(tx, existing.id),
      };
    }
    const roster = await getGroupRoster(tx, wsId);
    assert(
      signers.every((signer) =>
        roster.some((person) => person.walletAddress?.toLowerCase() === signer),
      ),
      400,
      "Người duyệt phải là thành viên đang hoạt động có ví đã xác minh.",
    );
    const [fund] = await tx
      .insert(funds)
      .values({
        workspaceId: wsId,
        name,
        description,
        fundType: body.fundType,
        custodyType: "SHARED_TREASURY",
        treasuryWalletAddress: custody,
        targetAmountWei: target,
        targetDeadline: deadline,
        createdBy: auth.user.id,
      })
      .returning();
    const [policy] = await tx
      .insert(fundPolicies)
      .values({
        fundId: fund.id,
        signers,
        quorum: body.requiredApprovals,
        fastWithdrawLimitWei: "0",
      })
      .returning();
    await recordAuditEvent(tx, {
      workspaceId: wsId,
      fundId: fund.id,
      actorUserId: auth.user.id,
      actorWallet: custody,
      action: "FUND_CREATED",
      metadataDiff: {
        name: fund.name,
        custodyType: fund.custodyType,
        treasuryWalletAddress: custody,
        quorum: policy.quorum,
        signers,
        termsVersion: "shared-wallet-v1",
        creationKey,
        creationFingerprint,
      },
    });
    return { ...fund, availableWei: "0", policy };
  });
}
export async function getFundDetail(
  auth: AuthContext,
  groupId: string,
  fundId: string,
) {
  const fund = await fundAccess(db, auth, groupId, fundId);
  return { ...fund, policy: await policyFor(db, fund.id) };
}
export async function updateFundPolicy(
  auth: AuthContext,
  groupId: string,
  fundId: string,
  _body: unknown,
) {
  await fundAccess(db, auth, groupId, fundId);
  assert(
    false,
    409,
    "Chính sách đã cố định. Thay đổi cần quy trình đồng thuận; quyền quản trị nhóm không cho phép đổi người ký.",
  );
}
export async function listFundObligations(
  auth: AuthContext,
  groupId: string,
  fundId: string,
) {
  const fund = await fundAccess(db, auth, groupId, fundId);
  return db
    .select({
      id: contributionObligations.id,
      fundId: contributionObligations.fundId,
      memberUserId: contributionObligations.memberUserId,
      amountWei: contributionObligations.amountWei,
      cycle: contributionObligations.cycle,
      dueDate: contributionObligations.dueDate,
      status: contributionObligations.status,
      memberFullName: users.fullName,
      memberWallet: userWallets.address,
    })
    .from(contributionObligations)
    .innerJoin(users, eq(users.id, contributionObligations.memberUserId))
    .leftJoin(userWallets, eq(userWallets.userId, users.id))
    .where(eq(contributionObligations.fundId, fund.id));
}
function instruction(intent: Intent) {
  return {
    ...intent,
    chainId: GROUP_CHAIN_ID,
    data: groupTransferMemo(intent.id),
  };
}
async function newIntent(
  tx: Store,
  auth: AuthContext,
  fund: Fund,
  kind: string,
  amountWei: string,
  recipient: string,
  requestId?: string,
) {
  const sender = walletOf(auth);
  const existing = await tx
    .select()
    .from(intents)
    .where(
      and(
        eq(intents.senderAddress, sender),
        inArray(intents.status, ["READY", "BROADCAST"]),
      ),
    );
  const same = existing.find(
    (item) =>
      item.userId === auth.user.id &&
      item.fundId === fund.id &&
      item.kind === kind &&
      item.amountWei === amountWei &&
      item.requestId === (requestId || null),
  );
  if (same) return instruction(same);
  assert(
    existing.length === 0,
    409,
    "Ví có lệnh chuyển chưa đối soát. Hoàn tất lệnh đó trước khi tạo lệnh khác.",
  );
  const client = await treasuryClient();
  const code = await client.getCode({ address: recipient as `0x${string}` });
  assert(
    !code || code === "0x",
    400,
    "Adapter hiện chỉ hỗ trợ ví cá nhân nhận AVAX.",
  );
  const nonce = await client.getTransactionCount({
    address: sender as `0x${string}`,
    blockTag: "pending",
  });
  const [intent] = await tx
    .insert(intents)
    .values({
      fundId: fund.id,
      userId: auth.user.id,
      kind,
      amountWei,
      senderAddress: sender,
      recipientAddress: recipient,
      nonce,
      requestId,
    })
    .returning();
  return instruction(intent);
}
export async function createContributionIntent(
  auth: AuthContext,
  groupId: string,
  fundId: string,
  body: { amountWei: string },
) {
  return db.transaction(async (tx) => {
    await lock(tx);
    const fund = await fundAccess(tx, auth, groupId, fundId, true),
      recipient = requireCustody(fund);
    assert(
      walletOf(auth) !== recipient,
      400,
      "Ví giữ tiền không thể tự góp bằng giao dịch chuyển cho chính mình.",
    );
    assert(
      fund.fundType !== "GOAL" ||
        !fund.targetDeadline ||
        fund.targetDeadline.getTime() > Date.now(),
      409,
      "Đã hết hạn nhận góp.",
    );
    return newIntent(
      tx,
      auth,
      fund,
      "CONTRIBUTION",
      positiveWei(body.amountWei),
      recipient,
    );
  });
}
async function verifiedTransfer(intent: Intent, hash: string) {
  const client = await treasuryClient();
  const [receipt, transaction, finalized] = await Promise.all([
    client.getTransactionReceipt({ hash: hash as `0x${string}` }),
    client.getTransaction({ hash: hash as `0x${string}` }),
    client.getBlock({ blockTag: "finalized" }),
  ]);
  assert(
    receipt.status === "success",
    409,
    "Giao dịch thất bại, chưa ghi nhận tiền.",
  );
  assert(
    matchesGroupTransfer(intent, transaction),
    409,
    "Giao dịch không khớp ví gửi, người nhận, số tiền, nonce hoặc mã lệnh.",
  );
  assert(
    finalized.number !== null && receipt.blockNumber <= finalized.number,
    409,
    "Giao dịch chưa đạt finality. Giữ mã giao dịch và đối soát lại.",
  );
  const block = await client.getBlock({ blockNumber: receipt.blockNumber });
  assert(
    block.hash === receipt.blockHash &&
      transaction.blockHash === receipt.blockHash,
    409,
    "Block giao dịch đã thay đổi. Chờ đối soát.",
  );
  return receipt;
}
async function settleIntent(tx: Store, intent: Intent, hash: string) {
  if (intent.status === "CONFIRMED") {
    assert(
      intent.txHash === hash,
      409,
      "Lệnh đã được xác nhận bằng giao dịch khác.",
    );
    return { success: true, alreadyReconciled: true, txHash: hash };
  }
  assert(["READY", "BROADCAST"].includes(intent.status), 409, "Lệnh đã đóng.");
  const receipt = await verifiedTransfer(intent, hash);
  const [fund] = await tx
    .select()
    .from(funds)
    .where(eq(funds.id, intent.fundId));
  assert(fund, 404, "Không tìm thấy quỹ.");
  if (intent.kind === "CONTRIBUTION") {
    await tx.insert(contributions).values({
      fundId: fund.id,
      memberUserId: intent.userId,
      funderAddress: intent.senderAddress,
      amountWei: intent.amountWei,
      txHash: hash,
      blockNumber: receipt.blockNumber,
      intentId: intent.id,
      reconciledAt: new Date(),
    });
    await tx
      .update(funds)
      .set({
        balanceWei: sql`${funds.balanceWei} + ${intent.amountWei}`,
        updatedAt: new Date(),
      })
      .where(eq(funds.id, fund.id));
  } else {
    const [request] = await tx
      .select()
      .from(expenseRequests)
      .where(eq(expenseRequests.id, intent.requestId!));
    assert(
      request?.status === "PAYMENT_PENDING",
      409,
      "Đề nghị chi cần đối soát trạng thái.",
    );
    assert(
      BigInt(fund.balanceWei) >= BigInt(intent.amountWei) &&
        BigInt(fund.reservedWei) >= BigInt(intent.amountWei),
      409,
      "Sổ quỹ cần đối soát; không tự ép số dư về 0.",
    );
    await tx.insert(payments).values({
      requestId: request.id,
      fundId: fund.id,
      senderAddress: intent.senderAddress,
      recipientAddress: intent.recipientAddress,
      amountWei: intent.amountWei,
      txHash: hash,
      status: "CONFIRMED",
      nonce: BigInt(intent.nonce),
      blockNumber: receipt.blockNumber,
      executedByUserId: intent.userId,
      confirmedAt: new Date(),
    });
    await tx
      .update(funds)
      .set({
        balanceWei: sql`${funds.balanceWei} - ${intent.amountWei}`,
        reservedWei: sql`${funds.reservedWei} - ${intent.amountWei}`,
        updatedAt: new Date(),
      })
      .where(eq(funds.id, fund.id));
    await tx
      .update(expenseRequests)
      .set({ status: "SETTLED", updatedAt: new Date() })
      .where(eq(expenseRequests.id, request.id));
  }
  await tx
    .update(intents)
    .set({ txHash: hash, status: "CONFIRMED" })
    .where(eq(intents.id, intent.id));
  await recordAuditEvent(tx, {
    workspaceId: fund.workspaceId,
    fundId: fund.id,
    actorUserId: intent.userId,
    actorWallet: intent.senderAddress,
    action:
      intent.kind === "CONTRIBUTION"
        ? "CONTRIBUTION_RECONCILED"
        : "EXPENSE_SETTLED",
    metadataDiff: {
      intentId: intent.id,
      requestId: intent.requestId,
      txHash: hash,
      amountWei: intent.amountWei,
      blockHash: receipt.blockHash,
    },
  });
  return { success: true, txHash: hash };
}
const txHashInput = (input: unknown) => {
  assert(
    typeof input === "string" && /^0x[0-9a-f]{64}$/i.test(input),
    400,
    "Mã giao dịch không hợp lệ.",
  );
  return input.toLowerCase();
};
export async function submitGroupTransfer(
  auth: AuthContext,
  intentId: string,
  body: { txHash: string },
) {
  const hash = txHashInput(body.txHash);
  return db.transaction(async (tx) => {
    await lock(tx);
    const [intent] = await tx
      .select()
      .from(intents)
      .where(
        and(
          eq(intents.id, uuidInput(intentId)),
          eq(intents.userId, auth.user.id),
        ),
      );
    assert(intent, 404, "Không tìm thấy lệnh chuyển.");
    const [fund] = await tx
      .select()
      .from(funds)
      .where(eq(funds.id, intent.fundId));
    await membership(tx, auth, fund.workspaceId);
    assert(
      intent.status !== "CONFIRMED" || intent.txHash === hash,
      409,
      "Lệnh đã xác nhận bằng giao dịch khác.",
    );
    assert(intent.status !== "CANCELLED", 409, "Lệnh đã đóng.");
    const client = await treasuryClient();
    const candidate = await client.getTransaction({
      hash: hash as `0x${string}`,
    });
    assert(
      matchesGroupTransfer(intent, candidate),
      409,
      "Mã giao dịch không khớp lệnh chuyển.",
    );
    await tx
      .update(intents)
      .set({
        txHash: hash,
        status: intent.status === "CONFIRMED" ? "CONFIRMED" : "BROADCAST",
      })
      .where(eq(intents.id, intent.id));
    return { success: true };
  });
}
export async function listGroupTransfers(auth: AuthContext, groupId: string) {
  const wsId = uuidInput(groupId);
  await membership(db, auth, wsId);
  const rows = await db
    .select({ intent: intents })
    .from(intents)
    .innerJoin(funds, eq(funds.id, intents.fundId))
    .where(
      and(
        eq(funds.workspaceId, wsId),
        eq(intents.userId, auth.user.id),
        inArray(intents.status, ["READY", "BROADCAST"]),
      ),
    );
  return rows.map((row) => instruction(row.intent));
}
/** Release an abandoned signing attempt only after its exact nonce was consumed in a finalized block. */
export async function resolveGroupTransfer(
  auth: AuthContext,
  intentId: string,
  body: { txHash: string },
) {
  const hash = txHashInput(body.txHash);
  return db.transaction(async (tx) => {
    await lock(tx);
    const [intent] = await tx
      .select()
      .from(intents)
      .where(
        and(
          eq(intents.id, uuidInput(intentId)),
          eq(intents.userId, auth.user.id),
        ),
      );
    assert(
      intent && ["READY", "BROADCAST"].includes(intent.status),
      409,
      "Lệnh không còn chờ đối soát.",
    );
    const [fund] = await tx
      .select()
      .from(funds)
      .where(eq(funds.id, intent.fundId));
    await membership(tx, auth, fund.workspaceId);
    const client = await treasuryClient();
    const [transaction, receipt, finalized] = await Promise.all([
      client.getTransaction({ hash: hash as `0x${string}` }),
      client.getTransactionReceipt({ hash: hash as `0x${string}` }),
      client.getBlock({ blockTag: "finalized" }),
    ]);
    assert(
      transaction.from.toLowerCase() === intent.senderAddress &&
        transaction.nonce === intent.nonce &&
        finalized.number !== null &&
        receipt.blockNumber <= finalized.number,
      409,
      "Chưa có bằng chứng nonce của lệnh đã kết thúc.",
    );
    const block = await client.getBlock({ blockNumber: receipt.blockNumber });
    assert(
      block.hash === receipt.blockHash &&
        transaction.blockHash === receipt.blockHash,
      409,
      "Giao dịch chưa nằm trong block chính thức.",
    );
    assert(
      receipt.status === "reverted" ||
        !matchesGroupTransfer(intent, transaction),
      409,
      "Giao dịch đã trả tiền đúng lệnh; dùng đối soát thanh toán.",
    );
    await tx
      .update(intents)
      .set({ status: "CANCELLED", txHash: hash, requestId: null })
      .where(eq(intents.id, intent.id));
    if (intent.requestId)
      await tx
        .update(expenseRequests)
        .set({ status: "APPROVED", updatedAt: new Date() })
        .where(eq(expenseRequests.id, intent.requestId));
    await recordAuditEvent(tx, {
      workspaceId: fund.workspaceId,
      fundId: fund.id,
      actorUserId: auth.user.id,
      actorWallet: intent.senderAddress,
      action: "TRANSFER_CANCELLED",
      metadataDiff: {
        intentId: intent.id,
        requestId: intent.requestId,
        txHash: hash,
      },
    });
    return { success: true };
  });
}
export async function reconcileContribution(
  auth: AuthContext,
  groupId: string,
  fundId: string,
  body: { txHash: string; intentId?: string; amountWei?: string },
) {
  return db.transaction(async (tx) => {
    await lock(tx);
    const fund = await fundAccess(tx, auth, groupId, fundId);
    const [intent] = await tx
      .select()
      .from(intents)
      .where(
        and(
          eq(intents.id, uuidInput(body.intentId || "")),
          eq(intents.fundId, fund.id),
          eq(intents.userId, auth.user.id),
          eq(intents.kind, "CONTRIBUTION"),
        ),
      );
    assert(intent, 404, "Không tìm thấy lệnh góp tiền.");
    return settleIntent(tx, intent, txHashInput(body.txHash));
  });
}
export async function listFundExpenses(
  auth: AuthContext,
  groupId: string,
  fundId: string,
  query?: { status?: string; myPendingApproval?: string },
) {
  const fund = await fundAccess(db, auth, groupId, fundId);
  const rows = await db
    .select({ request: expenseRequests, proposerName: users.fullName })
    .from(expenseRequests)
    .innerJoin(users, eq(users.id, expenseRequests.proposerId))
    .where(eq(expenseRequests.fundId, fund.id))
    .orderBy(desc(expenseRequests.createdAt));
  const policy = await policyFor(db, fund.id),
    caller = auth.wallet?.address.toLowerCase();
  const results = await Promise.all(
    rows.map(async ({ request, proposerName }) => {
      const approvals = await db
        .select({ vote: expenseApprovals, approverName: users.fullName })
        .from(expenseApprovals)
        .innerJoin(users, eq(users.id, expenseApprovals.approverUserId))
        .where(eq(expenseApprovals.requestId, request.id));
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.requestId, request.id));
      return {
        ...request,
        proposerName,
        approvals: approvals.map(({ vote, approverName }) => ({
          ...vote,
          approverName,
        })),
        payment: payment
          ? {
              ...payment,
              blockNumber: payment.blockNumber?.toString() || null,
              nonce: payment.nonce?.toString() || null,
            }
          : undefined,
        canApprove:
          !!caller &&
          policy.signers.includes(caller) &&
          caller !== request.recipientAddress &&
          request.status === "PENDING_APPROVAL" &&
          request.deadline.getTime() > Date.now() &&
          !approvals.some(({ vote }) => vote.approverAddress === caller),
        canPay:
          caller === fund.treasuryWalletAddress &&
          ["APPROVED", "PAYMENT_PENDING"].includes(request.status),
      };
    }),
  );
  return results.filter(
    (item) =>
      (!query?.status || item.status === query.status) &&
      (query?.myPendingApproval !== "true" || item.canApprove),
  );
}
export async function createExpenseRequest(
  auth: AuthContext,
  groupId: string,
  fundId: string,
  body: {
    title: string;
    purpose: string;
    amountWei: string;
    recipientAddress: string;
    recipientName: string;
    category?: string;
    deadlineHours?: number;
    receiptImageBase64?: string;
    unlockOverride?: boolean;
    idempotencyKey?: string;
  },
) {
  const title = textInput(body.title, 120),
    purpose = textInput(body.purpose, 500),
    amountWei = positiveWei(body.amountWei);
  const recipientAddress = address(body.recipientAddress),
    recipientName = textInput(body.recipientName, 100);
  const category = body.category ? textInput(body.category, 50) : "OPERATING";
  assert(!body.unlockOverride, 400, "Không thể bỏ qua điều kiện quỹ mục tiêu.");
  const hours = body.deadlineHours ?? 48;
  assert(
    Number.isInteger(hours) && hours >= 1 && hours <= 168,
    400,
    "Hạn duyệt phải từ 1 đến 168 giờ.",
  );
  const key = textInput(body.idempotencyKey, 64);
  const receipt = body.receiptImageBase64
    ? sanitizeProofImage(body.receiptImageBase64)
    : null;
  const receiptHash = receipt
    ? createHash("sha256").update(Buffer.from(receipt, "base64")).digest("hex")
    : null;
  return db.transaction(async (tx) => {
    await lock(tx);
    let fund = await fundAccess(tx, auth, groupId, fundId, true);
    requireCustody(fund);
    const [existing] = await tx
      .select()
      .from(expenseRequests)
      .where(
        and(
          eq(expenseRequests.fundId, fund.id),
          eq(expenseRequests.idempotencyKey, key),
        ),
      );
    if (existing) {
      assert(
        existing.proposerId === auth.user.id &&
          existing.title === title &&
          existing.purpose === purpose &&
          existing.amountWei === amountWei &&
          existing.recipientAddress === recipientAddress &&
          existing.recipientName === recipientName &&
          existing.category === category &&
          existing.receiptAttachmentHash === receiptHash &&
          Math.round(
            (existing.deadline.getTime() - existing.createdAt.getTime()) /
              3600000,
          ) === hours,
        409,
        "Khóa yêu cầu đã được dùng với nội dung khác.",
      );
      return existing;
    }
    await requireWorkspaceWrites(tx, fund.workspaceId, true);
    await expireRequests(tx, fund);
    fund = await fundAccess(tx, auth, groupId, fundId, true);
    const policy = await policyFor(tx, fund.id),
      roster = await getGroupRoster(tx, fund.workspaceId);
    const independent = policy.signers.filter(
      (signer) =>
        signer !== recipientAddress &&
        roster.some((person) => person.walletAddress?.toLowerCase() === signer),
    );
    assert(
      independent.length >= policy.quorum,
      409,
      "Không đủ người duyệt độc lập đang hoạt động cho người nhận này.",
    );
    assert(
      fund.fundType !== "GOAL" ||
        BigInt(fund.balanceWei) >= BigInt(fund.targetAmountWei),
      409,
      "Quỹ chưa đạt mục tiêu; hết hạn góp không tự mở khóa chi.",
    );
    assert(
      BigInt(fund.balanceWei) - BigInt(fund.reservedWei) >= BigInt(amountWei),
      409,
      "Số dư khả dụng không đủ.",
    );
    const [request] = await tx
      .insert(expenseRequests)
      .values({
        fundId: fund.id,
        policyVersionId: policy.id,
        proposerId: auth.user.id,
        proposerAddress: walletOf(auth),
        recipientAddress,
        recipientName,
        amountWei,
        title,
        purpose,
        category,
        deadline: new Date(Date.now() + hours * 3600000),
        requiredApprovals: policy.quorum,
        idempotencyKey: key,
        receiptAttachmentUrl: receipt
          ? `data:image/png;base64,${receipt}`
          : null,
        receiptAttachmentHash: receiptHash,
      })
      .returning();
    await tx
      .update(funds)
      .set({
        reservedWei: sql`${funds.reservedWei} + ${amountWei}`,
        updatedAt: new Date(),
      })
      .where(eq(funds.id, fund.id));
    await recordAuditEvent(tx, {
      workspaceId: fund.workspaceId,
      fundId: fund.id,
      actorUserId: auth.user.id,
      actorWallet: walletOf(auth),
      action: "EXPENSE_PROPOSED",
      metadataDiff: { requestId: request.id, title, amountWei },
    });
    return request;
  });
}
export async function approveExpenseRequest(
  auth: AuthContext,
  expenseId: string,
  body?: { comment?: string; signature?: string },
) {
  return db.transaction(async (tx) => {
    await lock(tx);
    const { request, fund } = await expenseAccess(tx, auth, expenseId);
    await requireWorkspaceWrites(tx, fund.workspaceId, true);
    assert(
      fund.status === "ACTIVE" &&
        request.status === "PENDING_APPROVAL" &&
        request.deadline.getTime() > Date.now(),
      409,
      "Đề nghị không còn chờ duyệt hoặc đã hết hạn.",
    );
    const policy = await policyFor(tx, fund.id),
      caller = walletOf(auth);
    assert(
      policy.id === request.policyVersionId,
      409,
      "Chính sách đã thay đổi, cần đề nghị mới.",
    );
    assert(
      policy.signers.includes(caller) && caller !== request.recipientAddress,
      403,
      "Cần người duyệt của quỹ, độc lập với người nhận.",
    );
    const votes = await tx
      .select()
      .from(expenseApprovals)
      .where(eq(expenseApprovals.requestId, request.id));
    assert(
      !votes.some(
        (vote) =>
          vote.approverUserId === auth.user.id ||
          vote.approverAddress === caller,
      ),
      409,
      "Bạn đã biểu quyết.",
    );
    await tx.insert(expenseApprovals).values({
      requestId: request.id,
      approverUserId: auth.user.id,
      approverAddress: caller,
      decision: "APPROVE",
      comment: body?.comment ? textInput(body.comment, 250) : null,
    });
    const count =
        votes.filter((vote) => vote.decision === "APPROVE").length + 1,
      status =
        count >= request.requiredApprovals ? "APPROVED" : "PENDING_APPROVAL";
    await tx
      .update(expenseRequests)
      .set({ approvalsCount: count, status, updatedAt: new Date() })
      .where(eq(expenseRequests.id, request.id));
    await recordAuditEvent(tx, {
      workspaceId: fund.workspaceId,
      fundId: fund.id,
      actorUserId: auth.user.id,
      actorWallet: caller,
      action: "EXPENSE_APPROVED",
      metadataDiff: { requestId: request.id, approvalsCount: count, status },
    });
    return { success: true, status, approvalsCount: count };
  });
}
async function releaseRequest(
  auth: AuthContext,
  expenseId: string,
  reject: boolean,
  reason?: string,
) {
  return db.transaction(async (tx) => {
    await lock(tx);
    const { request, fund } = await expenseAccess(tx, auth, expenseId);
    await requireWorkspaceWrites(tx, fund.workspaceId);
    assert(
      ["PENDING_APPROVAL", "APPROVED"].includes(request.status),
      409,
      "Lệnh đã đóng hoặc đang thanh toán; cần đối soát trước khi giải phóng giữ chỗ.",
    );
    const caller = walletOf(auth);
    if (reject) {
      const policy = await policyFor(tx, fund.id);
      assert(
        request.status === "PENDING_APPROVAL" &&
          policy.signers.includes(caller) &&
          caller !== request.recipientAddress,
        403,
        "Bạn không có quyền từ chối khoản này.",
      );
      textInput(reason, 250);
    } else
      assert(
        request.proposerId === auth.user.id,
        403,
        "Chỉ người đề nghị được hủy trước khi thanh toán.",
      );
    assert(
      BigInt(fund.reservedWei) >= BigInt(request.amountWei),
      409,
      "Sổ giữ chỗ cần đối soát.",
    );
    await tx
      .update(expenseRequests)
      .set({ status: reject ? "REJECTED" : "CANCELLED", updatedAt: new Date() })
      .where(eq(expenseRequests.id, request.id));
    await tx
      .update(funds)
      .set({
        reservedWei: sql`${funds.reservedWei} - ${request.amountWei}`,
        updatedAt: new Date(),
      })
      .where(eq(funds.id, fund.id));
    await recordAuditEvent(tx, {
      workspaceId: fund.workspaceId,
      fundId: fund.id,
      actorUserId: auth.user.id,
      actorWallet: caller,
      action: reject ? "EXPENSE_REJECTED" : "EXPENSE_CANCELLED",
      metadataDiff: { requestId: request.id, reason },
    });
    return { success: true };
  });
}
export const rejectExpenseRequest = (
  auth: AuthContext,
  expenseId: string,
  body?: { reason?: string },
) => releaseRequest(auth, expenseId, true, body?.reason);
export const cancelExpenseRequest = (auth: AuthContext, expenseId: string) =>
  releaseRequest(auth, expenseId, false);
export async function preparePayment(auth: AuthContext, expenseId: string) {
  return db.transaction(async (tx) => {
    await lock(tx);
    const { request, fund } = await expenseAccess(tx, auth, expenseId);
    assert(
      walletOf(auth) === requireCustody(fund),
      403,
      "Chỉ ví giữ tiền đã công bố mới có thể thanh toán.",
    );
    const [existing] = await tx
      .select()
      .from(intents)
      .where(eq(intents.requestId, request.id));
    if (existing) return instruction(existing);
    await requireWorkspaceWrites(tx, fund.workspaceId, true);
    assert(
      fund.status === "ACTIVE" &&
        request.status === "APPROVED" &&
        request.deadline.getTime() > Date.now(),
      409,
      "Khoản chi chưa đủ duyệt hoặc đã hết hạn.",
    );
    const policy = await policyFor(tx, fund.id),
      roster = await getGroupRoster(tx, fund.workspaceId);
    assert(
      policy.id === request.policyVersionId,
      409,
      "Chính sách đã thay đổi.",
    );
    const votes = await tx
      .select()
      .from(expenseApprovals)
      .where(eq(expenseApprovals.requestId, request.id));
    const eligible = new Set(
      votes
        .filter(
          (vote) =>
            vote.decision === "APPROVE" &&
            vote.approverAddress !== request.recipientAddress &&
            policy.signers.includes(vote.approverAddress) &&
            roster.some(
              (person) =>
                person.id === vote.approverUserId &&
                person.walletAddress?.toLowerCase() === vote.approverAddress,
            ),
        )
        .map((vote) => vote.approverAddress),
    );
    assert(
      eligible.size >= policy.quorum,
      409,
      "Không còn đủ người duyệt hợp lệ. Cần đối soát quyền thành viên.",
    );
    assert(
      BigInt(fund.balanceWei) >= BigInt(request.amountWei) &&
        BigInt(fund.reservedWei) >= BigInt(request.amountWei),
      409,
      "Số dư và giữ chỗ không đủ.",
    );
    assert(
      request.recipientAddress !== fund.treasuryWalletAddress,
      400,
      "Không thể ghi nhận chi bằng chuyển tiền cho chính ví giữ tiền.",
    );
    const intent = await newIntent(
      tx,
      auth,
      fund,
      "PAYMENT",
      request.amountWei,
      request.recipientAddress,
      request.id,
    );
    await tx
      .update(expenseRequests)
      .set({ status: "PAYMENT_PENDING", updatedAt: new Date() })
      .where(eq(expenseRequests.id, request.id));
    return intent;
  });
}
export async function verifyAndSettlePayment(
  auth: AuthContext,
  expenseId: string,
  body: { txHash: string },
) {
  return db.transaction(async (tx) => {
    await lock(tx);
    const { request } = await expenseAccess(tx, auth, expenseId);
    const [intent] = await tx
      .select()
      .from(intents)
      .where(eq(intents.requestId, request.id));
    assert(
      intent && intent.userId === auth.user.id,
      403,
      "Chỉ người giữ tiền của lệnh được đối soát thanh toán.",
    );
    return settleIntent(tx, intent, txHashInput(body.txHash));
  });
}
export async function reconcilePendingGroupTransfers() {
  const pending = await db
    .select()
    .from(intents)
    .where(eq(intents.status, "BROADCAST"))
    .limit(50);
  for (const intent of pending) {
    try {
      await db.transaction(async (tx) => {
        await lock(tx);
        const [current] = await tx
          .select()
          .from(intents)
          .where(eq(intents.id, intent.id));
        if (current?.txHash) await settleIntent(tx, current, current.txHash);
      });
    } catch {
      /* Unverified candidates stay pending; never invent a receipt. */
    }
  }
}
export async function getGroupAuditEvents(
  auth: AuthContext,
  groupId: string,
  query?: { limit?: number; cursor?: string; fundId?: string },
) {
  const wsId = uuidInput(groupId);
  await membership(db, auth, wsId);
  const requested = Number(query?.limit ?? 50);
  assert(
    Number.isInteger(requested) && requested > 0,
    400,
    "Giới hạn không hợp lệ.",
  );
  const conditions = [
    eq(groupAuditEvents.workspaceId, wsId),
    or(
      isNull(groupAuditEvents.fundId),
      and(
        eq(funds.custodyType, "SHARED_TREASURY"),
        isNotNull(funds.treasuryWalletAddress),
      ),
    )!,
  ];
  if (query?.fundId)
    conditions.push(eq(groupAuditEvents.fundId, uuidInput(query.fundId)));
  if (query?.cursor) {
    const cursor = uuidInput(query.cursor);
    // Compare in PostgreSQL to retain timestamp microseconds and avoid dropping tied rows.
    conditions.push(sql`(${groupAuditEvents.createdAt}, ${groupAuditEvents.id}) <
      (select created_at, id from group_audit_events where id = ${cursor}::uuid and workspace_id = ${wsId}::uuid)`);
  }
  return db
    .select({
      event: groupAuditEvents,
      actorName: users.fullName,
      fundName: funds.name,
    })
    .from(groupAuditEvents)
    .leftJoin(users, eq(users.id, groupAuditEvents.actorUserId))
    .leftJoin(funds, eq(funds.id, groupAuditEvents.fundId))
    .where(and(...conditions))
    .orderBy(desc(groupAuditEvents.createdAt), desc(groupAuditEvents.id))
    .limit(Math.min(requested, 100));
}

export async function exportGroupReport(
  auth: AuthContext,
  groupId: string,
  query: { from?: unknown; to?: unknown },
) {
  const wsId = uuidInput(groupId);
  const from = new Date(String(query.from || "")),
    to = new Date(String(query.to || ""));
  assert(
    Number.isFinite(from.getTime()) &&
      Number.isFinite(to.getTime()) &&
      to > from &&
      to.getTime() - from.getTime() <= 366 * 86400000,
    400,
    "Chọn khoảng báo cáo hợp lệ, tối đa 366 ngày.",
  );
  return db.transaction(async (tx) => {
    await lock(tx);
    await membership(tx, auth, wsId);
    const received = await tx
      .select({ item: contributions, fundName: funds.name })
      .from(contributions)
      .innerJoin(funds, eq(funds.id, contributions.fundId))
      .innerJoin(
        intents,
        and(
          eq(intents.fundId, funds.id),
          sql`${intents.id}::text = ${contributions.intentId}`,
          eq(intents.status, "CONFIRMED"),
        ),
      )
      .where(
        and(
          eq(funds.workspaceId, wsId),
          gte(contributions.createdAt, from),
          lt(contributions.createdAt, to),
        ),
      )
      .orderBy(desc(contributions.createdAt))
      .limit(1001);
    const paid = await tx
      .select({ item: payments, fundName: funds.name })
      .from(payments)
      .innerJoin(funds, eq(funds.id, payments.fundId))
      .innerJoin(
        intents,
        and(
          eq(intents.fundId, funds.id),
          eq(intents.requestId, payments.requestId),
          eq(intents.txHash, payments.txHash),
          eq(intents.status, "CONFIRMED"),
        ),
      )
      .where(
        and(
          eq(funds.workspaceId, wsId),
          eq(payments.status, "CONFIRMED"),
          gte(payments.createdAt, from),
          lt(payments.createdAt, to),
        ),
      )
      .orderBy(desc(payments.createdAt))
      .limit(1001);
    assert(
      received.length <= 1000 && paid.length <= 1000,
      409,
      "Khoảng báo cáo quá lớn. Chọn khoảng ngắn hơn để xuất đầy đủ.",
    );
    const cell = (value: unknown) => {
      let text = String(value ?? "");
      if (/^\s*[=+@-]|^[\t\r\n]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const rows: unknown[][] = [
      [
        "type",
        "fund_id",
        "fund_name",
        "amount_wei",
        "amount_avax",
        "sender",
        "recipient",
        "tx_hash",
        "confirmed_at",
      ],
    ];
    for (const { item, fundName } of received)
      rows.push([
        "CONTRIBUTION",
        item.fundId,
        fundName,
        item.amountWei,
        formatEther(BigInt(item.amountWei)),
        item.funderAddress,
        "",
        item.txHash,
        item.reconciledAt?.toISOString(),
      ]);
    for (const { item, fundName } of paid)
      rows.push([
        "PAYMENT",
        item.fundId,
        fundName,
        item.amountWei,
        formatEther(BigInt(item.amountWei)),
        item.senderAddress,
        item.recipientAddress,
        item.txHash,
        item.confirmedAt?.toISOString(),
      ]);
    return {
      csv: "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n"),
      count: rows.length - 1,
      from: from.toISOString(),
      to: to.toISOString(),
    };
  });
}
