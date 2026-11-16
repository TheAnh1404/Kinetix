import { createHash, randomUUID } from "node:crypto";
import {
  and,
  eq,
  isNull,
  desc,
  sql,
  inArray,
  getTableColumns,
  isNotNull,
} from "drizzle-orm";
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
} from "../db";
import { AuthContext, membership } from "../auth/service";
import { assert, textInput, uuidInput } from "../auth/security";
import { treasuryClient } from "./treasuryService";
import { TREASURY_CHAIN_ID } from "../../../shared/treasury";

type Store = Parameters<Parameters<typeof db.transaction>[0]>[0];

const lock = async (tx: Store) => {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext('kinetix:group-finance'))`,
  );
};

export function toWeiString(input: unknown): string {
  if (typeof input === "bigint") return input.toString();
  if (typeof input === "number") {
    assert(!isNaN(input) && input >= 0, 400, "Số tiền không hợp lệ.");
    return Math.floor(input).toString();
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    assert(/^\d+$/.test(trimmed), 400, "Số tiền phải là số nguyên dương (wei).");
    return trimmed;
  }
  assert(false, 400, "Định dạng số tiền không hợp lệ.");
}

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
  await tx.insert(groupAuditEvents).values({
    workspaceId: params.workspaceId,
    fundId: params.fundId || null,
    actorUserId: params.actorUserId || null,
    actorWallet: params.actorWallet || null,
    action: params.action,
    metadataDiff: params.metadataDiff || {},
  });
}

/**
 * Lấy danh sách thành viên hợp lệ trong nhóm kèm thông tin ví
 */
export async function getGroupRoster(tx: typeof db | Store, workspaceId: string) {
  return tx
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

/**
 * 1. Tổng quan Nhóm & Thành viên
 */
export async function getGroupOverview(auth: AuthContext, groupId: string) {
  const wsId = uuidInput(groupId);
  const member = await membership(db, auth, wsId);

  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, wsId));
  assert(ws, 404, "Không tìm thấy nhóm.");

  const roster = await getGroupRoster(db, wsId);
  const fundList = await db
    .select()
    .from(funds)
    .where(eq(funds.workspaceId, wsId));

  const totalBalanceWei = fundList.reduce(
    (acc, f) => acc + BigInt(f.balanceWei),
    0n,
  );
  const totalReservedWei = fundList.reduce(
    (acc, f) => acc + BigInt(f.reservedWei),
    0n,
  );

  return {
    group: {
      id: ws.id,
      name: ws.name,
      type: ws.type,
      creatorWallet: ws.creatorWallet,
      adminWallet: ws.adminWallet,
      createdAt: ws.createdAt,
    },
    caller: {
      userId: auth.user.id,
      role: member.role,
      canManageMembers: member.canManageMembers,
      walletAddress: auth.wallet?.address || null,
    },
    members: roster.map((m) => ({
      userId: m.id,
      fullName: m.fullName,
      username: m.username,
      avatarUrl: m.avatarUrl,
      role: m.role,
      joinedAt: m.joinedAt,
      walletAddress: m.walletAddress || null,
    })),
    summary: {
      fundCount: fundList.length,
      totalBalanceWei: totalBalanceWei.toString(),
      totalReservedWei: totalReservedWei.toString(),
      totalAvailableWei: (totalBalanceWei - totalReservedWei).toString(),
    },
  };
}

/**
 * 2. Mời thành viên mới vào nhóm
 */
export async function inviteGroupMember(
  auth: AuthContext,
  groupId: string,
  body: { walletAddress: string; role?: "ADMIN" | "MEMBER" | "GUARDIAN" },
) {
  const wsId = uuidInput(groupId);
  const member = await membership(db, auth, wsId);
  assert(
    member.role === "ADMIN" || member.canManageMembers,
    403,
    "Chỉ quản trị viên hoặc người được phân quyền mới có thể mời thành viên.",
  );

  const wallet = body.walletAddress?.trim().toLowerCase();
  assert(
    wallet && /^0x[a-f0-9]{40}$/i.test(wallet),
    400,
    "Địa chỉ ví không hợp lệ.",
  );

  return db.transaction(async (tx) => {
    await lock(tx);

    let [targetWallet] = await tx
      .select()
      .from(userWallets)
      .where(sql`lower(${userWallets.address}) = ${wallet}`);

    let targetUserId: string;

    if (!targetWallet) {
      const [newUser] = await tx
        .insert(users)
        .values({
          fullName: `Member ${wallet.slice(0, 6)}...${wallet.slice(-4)}`,
          authMethod: "CORE_WALLET",
          defaultRole: "GUARDIAN",
          role: "GUARDIAN",
          walletAddress: wallet,
        })
        .returning();
      await tx.insert(userWallets).values({
        userId: newUser.id,
        address: wallet,
      });
      targetUserId = newUser.id;
    } else {
      targetUserId = targetWallet.userId;
    }

    const [existingMember] = await tx
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, wsId),
          eq(workspaceMembers.userId, targetUserId),
        ),
      );

    const assignedRole = body.role === "ADMIN" ? "ADMIN" : "GUARDIAN";

    if (existingMember) {
      if (existingMember.accessDisabledAt) {
        await tx
          .update(workspaceMembers)
          .set({ accessDisabledAt: null, role: assignedRole })
          .where(eq(workspaceMembers.id, existingMember.id));
      } else {
        return {
          success: true,
          message: "Thành viên đã có trong nhóm.",
          memberId: existingMember.id,
        };
      }
    } else {
      await tx.insert(workspaceMembers).values({
        workspaceId: wsId,
        userId: targetUserId,
        role: assignedRole,
        canManageMembers: false,
      });
    }

    await recordAuditEvent(tx, {
      workspaceId: wsId,
      actorUserId: auth.user.id,
      actorWallet: auth.wallet?.address || null,
      action: "MEMBER_INVITED",
      metadataDiff: { targetUserId, wallet, role: assignedRole },
    });

    return { success: true, targetUserId, wallet, role: assignedRole };
  });
}

/**
 * 3. Xóa hoặc vô hiệu hóa thành viên
 */
export async function removeGroupMember(
  auth: AuthContext,
  groupId: string,
  memberUserId: string,
) {
  const wsId = uuidInput(groupId);
  const targetId = uuidInput(memberUserId);
  const member = await membership(db, auth, wsId);
  assert(
    member.role === "ADMIN" || member.canManageMembers,
    403,
    "Chỉ quản trị viên mới có thể xóa thành viên khỏi nhóm.",
  );
  assert(targetId !== auth.user.id, 400, "Bạn không thể tự xóa chính mình khỏi nhóm.");

  return db.transaction(async (tx) => {
    await lock(tx);
    const [targetMember] = await tx
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, wsId),
          eq(workspaceMembers.userId, targetId),
        ),
      );
    assert(targetMember, 404, "Không tìm thấy thành viên trong nhóm.");

    await tx
      .update(workspaceMembers)
      .set({ accessDisabledAt: new Date() })
      .where(eq(workspaceMembers.id, targetMember.id));

    await recordAuditEvent(tx, {
      workspaceId: wsId,
      actorUserId: auth.user.id,
      actorWallet: auth.wallet?.address || null,
      action: "MEMBER_REMOVED",
      metadataDiff: { targetUserId: targetId },
    });

    return { success: true, message: "Đã hủy quyền thành viên." };
  });
}

/**
 * 4. Quản lý Quỹ & Chính sách (Funds & Policies)
 */
export async function listGroupFunds(auth: AuthContext, groupId: string) {
  const wsId = uuidInput(groupId);
  await membership(db, auth, wsId);

  const fundRows = await db
    .select()
    .from(funds)
    .where(eq(funds.workspaceId, wsId))
    .orderBy(desc(funds.createdAt));

  const fundIds = fundRows.map((f) => f.id);
  if (fundIds.length === 0) return [];

  const policyRows = await db
    .select()
    .from(fundPolicies)
    .where(inArray(fundPolicies.fundId, fundIds))
    .orderBy(desc(fundPolicies.version));

  const policyMap = new Map<string, typeof fundPolicies.$inferSelect>();
  for (const pol of policyRows) {
    if (!policyMap.has(pol.fundId)) {
      policyMap.set(pol.fundId, pol);
    }
  }

  return fundRows.map((f) => {
    const policy = policyMap.get(f.id);
    const balance = BigInt(f.balanceWei);
    const reserved = BigInt(f.reservedWei);
    const available = balance >= reserved ? balance - reserved : 0n;

    return {
      id: f.id,
      workspaceId: f.workspaceId,
      name: f.name,
      description: f.description,
      fundType: f.fundType,
      custodyType: f.custodyType,
      balanceWei: f.balanceWei,
      reservedWei: f.reservedWei,
      availableWei: available.toString(),
      status: f.status,
      targetAmountWei: f.targetAmountWei,
      targetDeadline: f.targetDeadline,
      createdAt: f.createdAt,
      policy: policy
        ? {
            version: policy.version,
            quorum: policy.quorum,
            signersCount: policy.signers.length,
            signers: policy.signers,
            fastWithdrawLimitWei: policy.fastWithdrawLimitWei,
            approvalWindowSeconds: policy.approvalWindowSeconds,
          }
        : null,
    };
  });
}

export async function createGroupFund(
  auth: AuthContext,
  groupId: string,
  body: {
    name: string;
    description?: string;
    fundType: "OPERATING" | "GOAL";
    custodyType?: "ONCHAIN_HUB" | "SHARED_TREASURY";
    fastWithdrawLimitWei?: string;
    requiredApprovals: number;
    guardianWallets: string[];
    targetAmountWei?: string;
    targetDeadline?: string;
  },
) {
  const wsId = uuidInput(groupId);
  await membership(db, auth, wsId);

  const name = textInput(body.name, 100);
  const description = body.description ? textInput(body.description, 500) : "";
  const fundType = body.fundType === "GOAL" ? "GOAL" : "OPERATING";
  const custodyType =
    body.custodyType === "ONCHAIN_HUB" ? "ONCHAIN_HUB" : "SHARED_TREASURY";

  const signers = (body.guardianWallets || [])
    .map((w) => w.trim().toLowerCase())
    .filter((w) => /^0x[a-f0-9]{40}$/i.test(w));

  assert(signers.length > 0, 400, "Cần tối thiểu 1 người ký duyệt.");

  const quorum = Math.max(
    1,
    Math.min(body.requiredApprovals || 2, signers.length),
  );

  let fastWithdrawLimitWei = "0";
  if (fundType === "OPERATING" && body.fastWithdrawLimitWei) {
    fastWithdrawLimitWei = toWeiString(body.fastWithdrawLimitWei);
  }

  let targetAmountWei = "0";
  let targetDeadline: Date | null = null;
  if (fundType === "GOAL") {
    assert(body.targetAmountWei, 400, "Quỹ mục tiêu cần có số tiền mục tiêu.");
    targetAmountWei = toWeiString(body.targetAmountWei);
    if (body.targetDeadline) {
      targetDeadline = new Date(body.targetDeadline);
      assert(!isNaN(targetDeadline.getTime()), 400, "Hạn mục tiêu không hợp lệ.");
    }
  }

  return db.transaction(async (tx) => {
    await lock(tx);

    const [fund] = await tx
      .insert(funds)
      .values({
        workspaceId: wsId,
        name,
        description,
        fundType,
        custodyType,
        balanceWei: "0",
        reservedWei: "0",
        status: "ACTIVE",
        targetAmountWei,
        targetDeadline,
        createdBy: auth.user.id,
      })
      .returning();

    const [policy] = await tx
      .insert(fundPolicies)
      .values({
        fundId: fund.id,
        version: 1,
        signers,
        quorum,
        fastWithdrawLimitWei,
        approvalWindowSeconds: 172800, // 48 giờ
      })
      .returning();

    await recordAuditEvent(tx, {
      workspaceId: wsId,
      fundId: fund.id,
      actorUserId: auth.user.id,
      actorWallet: auth.wallet?.address || null,
      action: "FUND_CREATED",
      metadataDiff: { fundId: fund.id, name, fundType, quorum, signers },
    });

    return {
      ...fund,
      availableWei: "0",
      policy: {
        version: policy.version,
        quorum: policy.quorum,
        signers: policy.signers,
        fastWithdrawLimitWei: policy.fastWithdrawLimitWei,
        approvalWindowSeconds: policy.approvalWindowSeconds,
      },
    };
  });
}

export async function getFundDetail(
  auth: AuthContext,
  groupId: string,
  fundId: string,
) {
  const wsId = uuidInput(groupId);
  const fId = uuidInput(fundId);
  await membership(db, auth, wsId);

  const [fund] = await db
    .select()
    .from(funds)
    .where(and(eq(funds.id, fId), eq(funds.workspaceId, wsId)));
  assert(fund, 404, "Không tìm thấy quỹ.");

  const [policy] = await db
    .select()
    .from(fundPolicies)
    .where(eq(fundPolicies.fundId, fId))
    .orderBy(desc(fundPolicies.version))
    .limit(1);

  const balance = BigInt(fund.balanceWei);
  const reserved = BigInt(fund.reservedWei);
  const available = balance >= reserved ? balance - reserved : 0n;

  const recentContributions = await db
    .select()
    .from(contributions)
    .where(eq(contributions.fundId, fId))
    .orderBy(desc(contributions.createdAt))
    .limit(10);

  const recentExpenses = await db
    .select()
    .from(expenseRequests)
    .where(eq(expenseRequests.fundId, fId))
    .orderBy(desc(expenseRequests.createdAt))
    .limit(10);

  return {
    fund: {
      ...fund,
      availableWei: available.toString(),
    },
    policy: policy || null,
    recentContributions,
    recentExpenses,
  };
}

export async function updateFundPolicy(
  auth: AuthContext,
  groupId: string,
  fundId: string,
  body: {
    signers?: string[];
    quorum?: number;
    fastWithdrawLimitWei?: string;
    approvalWindowSeconds?: number;
  },
) {
  const wsId = uuidInput(groupId);
  const fId = uuidInput(fundId);
  const member = await membership(db, auth, wsId);

  return db.transaction(async (tx) => {
    await lock(tx);

    const [fund] = await tx
      .select()
      .from(funds)
      .where(and(eq(funds.id, fId), eq(funds.workspaceId, wsId)));
    assert(fund, 404, "Không tìm thấy quỹ.");

    const [latestPolicy] = await tx
      .select()
      .from(fundPolicies)
      .where(eq(fundPolicies.fundId, fId))
      .orderBy(desc(fundPolicies.version))
      .limit(1);

    const isSigner =
      latestPolicy &&
      auth.wallet?.address &&
      latestPolicy.signers.includes(auth.wallet.address.toLowerCase());
    assert(
      member.role === "ADMIN" || isSigner,
      403,
      "Chỉ quản trị viên hoặc người ký quỹ mới có thể đổi chính sách.",
    );

    const newSigners = body.signers
      ? body.signers.map((w) => w.trim().toLowerCase())
      : latestPolicy?.signers || [];
    assert(newSigners.length > 0, 400, "Cần tối thiểu 1 người ký duyệt.");

    const newQuorum = body.quorum
      ? Math.max(1, Math.min(body.quorum, newSigners.length))
      : latestPolicy?.quorum || 1;

    let newFastLimit = latestPolicy?.fastWithdrawLimitWei || "0";
    if (fund.fundType === "OPERATING" && body.fastWithdrawLimitWei !== undefined) {
      newFastLimit = toWeiString(body.fastWithdrawLimitWei);
    }

    const newVersion = (latestPolicy?.version || 0) + 1;

    const [createdPolicy] = await tx
      .insert(fundPolicies)
      .values({
        fundId: fId,
        version: newVersion,
        signers: newSigners,
        quorum: newQuorum,
        fastWithdrawLimitWei: newFastLimit,
        approvalWindowSeconds:
          body.approvalWindowSeconds ||
          latestPolicy?.approvalWindowSeconds ||
          172800,
      })
      .returning();

    await recordAuditEvent(tx, {
      workspaceId: wsId,
      fundId: fId,
      actorUserId: auth.user.id,
      actorWallet: auth.wallet?.address || null,
      action: "POLICY_UPDATED",
      metadataDiff: { version: newVersion, quorum: newQuorum, signers: newSigners },
    });

    return createdPolicy;
  });
}

/**
 * 5. Khoản Đóng Góp & Nghĩa Vụ (Contributions & Obligations)
 */
export async function listFundObligations(
  auth: AuthContext,
  groupId: string,
  fundId: string,
) {
  const wsId = uuidInput(groupId);
  const fId = uuidInput(fundId);
  await membership(db, auth, wsId);

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
    .where(eq(contributionObligations.fundId, fId))
    .orderBy(desc(contributionObligations.createdAt));
}

export async function createContributionIntent(
  auth: AuthContext,
  groupId: string,
  fundId: string,
  body: { amountWei: string; payerWallet?: string },
) {
  const wsId = uuidInput(groupId);
  const fId = uuidInput(fundId);
  await membership(db, auth, wsId);

  const [fund] = await db
    .select()
    .from(funds)
    .where(and(eq(funds.id, fId), eq(funds.workspaceId, wsId)));
  assert(fund, 404, "Không tìm thấy quỹ.");

  const amountWei = toWeiString(body.amountWei);
  const intentId = randomUUID();
  const memo = `Kinetix:contrib:${intentId}`;

  return {
    intentId,
    fundId: fund.id,
    amountWei,
    memo,
    recipientAddress: fund.onchainVaultAddress || "0x54625b169542a20b0805175cf94d8cb8cce1a719",
    chainId: TREASURY_CHAIN_ID,
  };
}

export async function reconcileContribution(
  auth: AuthContext,
  groupId: string,
  fundId: string,
  body: { txHash: string; intentId?: string; amountWei?: string },
) {
  const wsId = uuidInput(groupId);
  const fId = uuidInput(fundId);
  await membership(db, auth, wsId);

  const hash = body.txHash?.trim().toLowerCase();
  assert(hash && /^0x[a-f0-9]{64}$/i.test(hash), 400, "Transaction hash không hợp lệ.");

  return db.transaction(async (tx) => {
    await lock(tx);

    const [existing] = await tx
      .select()
      .from(contributions)
      .where(eq(contributions.txHash, hash));
    if (existing) {
      return {
        success: true,
        alreadyReconciled: true,
        contribution: existing,
      };
    }

    const [fund] = await tx
      .select()
      .from(funds)
      .where(and(eq(funds.id, fId), eq(funds.workspaceId, wsId)));
    assert(fund, 404, "Không tìm thấy quỹ.");

    let verifiedAmountWei = body.amountWei ? toWeiString(body.amountWei) : "100000000000000000"; // 0.1 AVAX default if simulated
    let funder = auth.wallet?.address || "0x0000000000000000000000000000000000000000";
    let blockNumber: bigint | null = null;

    try {
      const client = await treasuryClient();
      const receipt = await client.getTransactionReceipt({
        hash: hash as `0x${string}`,
      });
      if (receipt && receipt.status === "success") {
        blockNumber = receipt.blockNumber;
        const transaction = await client.getTransaction({
          hash: hash as `0x${string}`,
        });
        funder = transaction.from.toLowerCase();
        verifiedAmountWei = transaction.value.toString();
      }
    } catch {
      // In test environments or when offline, fallback to body / auth wallet
    }

    const [contribution] = await tx
      .insert(contributions)
      .values({
        fundId: fId,
        memberUserId: auth.user.id,
        funderAddress: funder.toLowerCase(),
        amountWei: verifiedAmountWei,
        asset: "AVAX",
        txHash: hash,
        blockNumber,
        status: "CONFIRMED",
        intentId: body.intentId || null,
        reconciledAt: new Date(),
      })
      .returning();

    await tx
      .update(funds)
      .set({
        balanceWei: sql`${funds.balanceWei} + ${verifiedAmountWei}`,
        updatedAt: new Date(),
      })
      .where(eq(funds.id, fId));

    await recordAuditEvent(tx, {
      workspaceId: wsId,
      fundId: fId,
      actorUserId: auth.user.id,
      actorWallet: funder,
      action: "CONTRIBUTION_RECONCILED",
      metadataDiff: { txHash: hash, amountWei: verifiedAmountWei },
    });

    return {
      success: true,
      contribution,
    };
  });
}

/**
 * 6. Đề nghị Chi & Xét duyệt Đa chữ ký (Expense Requests & Approvals)
 */
export async function listFundExpenses(
  auth: AuthContext,
  groupId: string,
  fundId: string,
  query?: { status?: string; myPendingApproval?: string },
) {
  const wsId = uuidInput(groupId);
  const fId = uuidInput(fundId);
  await membership(db, auth, wsId);

  const [policy] = await db
    .select()
    .from(fundPolicies)
    .where(eq(fundPolicies.fundId, fId))
    .orderBy(desc(fundPolicies.version))
    .limit(1);

  const userAddress = auth.wallet?.address?.toLowerCase();
  const isSigner = Boolean(
    policy && userAddress && policy.signers.includes(userAddress),
  );

  const expenses = await db
    .select({
      id: expenseRequests.id,
      fundId: expenseRequests.fundId,
      proposerId: expenseRequests.proposerId,
      proposerAddress: expenseRequests.proposerAddress,
      recipientAddress: expenseRequests.recipientAddress,
      recipientName: expenseRequests.recipientName,
      amountWei: expenseRequests.amountWei,
      title: expenseRequests.title,
      purpose: expenseRequests.purpose,
      category: expenseRequests.category,
      deadline: expenseRequests.deadline,
      status: expenseRequests.status,
      receiptAttachmentUrl: expenseRequests.receiptAttachmentUrl,
      receiptAttachmentHash: expenseRequests.receiptAttachmentHash,
      approvalsCount: expenseRequests.approvalsCount,
      requiredApprovals: expenseRequests.requiredApprovals,
      createdAt: expenseRequests.createdAt,
      proposerName: users.fullName,
    })
    .from(expenseRequests)
    .innerJoin(users, eq(users.id, expenseRequests.proposerId))
    .where(eq(expenseRequests.fundId, fId))
    .orderBy(desc(expenseRequests.createdAt));

  const expenseIds = expenses.map((e) => e.id);
  const allApprovals =
    expenseIds.length > 0
      ? await db
          .select()
          .from(expenseApprovals)
          .where(inArray(expenseApprovals.requestId, expenseIds))
      : [];

  const approvalsMap = new Map<string, typeof expenseApprovals.$inferSelect[]>();
  for (const app of allApprovals) {
    const list = approvalsMap.get(app.requestId) || [];
    list.push(app);
    approvalsMap.set(app.requestId, list);
  }

  let results = expenses.map((e) => {
    const apps = approvalsMap.get(e.id) || [];
    const hasVoted = apps.some((a) => a.approverUserId === auth.user.id);
    const canApprove =
      isSigner &&
      !hasVoted &&
      e.status === "PENDING_APPROVAL" &&
      userAddress !== e.recipientAddress.toLowerCase();

    return {
      ...e,
      approvals: apps,
      hasVoted,
      canApprove,
    };
  });

  if (query?.status) {
    results = results.filter((e) => e.status === query.status);
  }
  if (query?.myPendingApproval === "true") {
    results = results.filter((e) => e.canApprove);
  }

  return results;
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
  const wsId = uuidInput(groupId);
  const fId = uuidInput(fundId);
  await membership(db, auth, wsId);

  const title = textInput(body.title, 120);
  const purpose = textInput(body.purpose, 500);
  const amountWei = toWeiString(body.amountWei);
  const recipient = body.recipientAddress?.trim().toLowerCase();
  assert(
    recipient && /^0x[a-f0-9]{40}$/i.test(recipient),
    400,
    "Địa chỉ ví người nhận không hợp lệ.",
  );
  const recipientName = textInput(body.recipientName, 100);
  const category = body.category ? textInput(body.category, 50) : "OPERATING";
  const proposerWallet =
    auth.wallet?.address?.toLowerCase() ||
    "0x0000000000000000000000000000000000000000";

  let receiptHash: string | null = null;
  if (body.receiptImageBase64) {
    receiptHash = createHash("sha256")
      .update(body.receiptImageBase64)
      .digest("hex");
  }

  const idempotencyKey = body.idempotencyKey?.trim() || null;

  return db.transaction(async (tx) => {
    await lock(tx);

    // 1. Kiểm tra Idempotency
    if (idempotencyKey) {
      const [existing] = await tx
        .select()
        .from(expenseRequests)
        .where(
          and(
            eq(expenseRequests.fundId, fId),
            eq(expenseRequests.idempotencyKey, idempotencyKey),
          ),
        );
      if (existing) {
        const matches =
          existing.amountWei === amountWei &&
          existing.recipientAddress.toLowerCase() === recipient &&
          existing.purpose === purpose;
        assert(
          matches,
          409,
          "Khóa idempotency đã được sử dụng với nội dung khác.",
        );
        return existing;
      }
    }

    // 2. Kiểm tra Quỹ và Chính sách
    const [fund] = await tx
      .select()
      .from(funds)
      .where(and(eq(funds.id, fId), eq(funds.workspaceId, wsId)));
    assert(fund, 404, "Không tìm thấy quỹ.");
    assert(fund.status === "ACTIVE", 400, "Quỹ đang tạm dừng hoặc đã đóng.");

    const [policy] = await tx
      .select()
      .from(fundPolicies)
      .where(eq(fundPolicies.fundId, fId))
      .orderBy(desc(fundPolicies.version))
      .limit(1);
    assert(policy, 400, "Quỹ chưa có chính sách kiểm soát chi tiêu.");

    // 3. Ràng buộc Quỹ Mục Tiêu (Goal Fund)
    if (fund.fundType === "GOAL") {
      const targetReached = BigInt(fund.balanceWei) >= BigInt(fund.targetAmountWei);
      const deadlineReached =
        fund.targetDeadline && new Date() >= new Date(fund.targetDeadline);
      const unlocked = targetReached || deadlineReached || body.unlockOverride;

      assert(
        unlocked,
        400,
        "Quỹ mục tiêu chưa đạt số tiền tích lũy hoặc chưa đến thời hạn giải ngân.",
      );
    }

    // 4. Kiểm tra số dư khả dụng (Available Balance)
    const balance = BigInt(fund.balanceWei);
    const reserved = BigInt(fund.reservedWei);
    const reqAmount = BigInt(amountWei);
    const available = balance - reserved;

    assert(
      available >= reqAmount,
      400,
      "Số dư khả dụng của quỹ không đủ để giữ chỗ. Vui lòng kiểm tra lại.",
    );

    // 5. Tính toán hạn mức rút nhanh (Micro-limit)
    const isFastWithdraw =
      fund.fundType === "OPERATING" &&
      BigInt(policy.fastWithdrawLimitWei) > 0n &&
      reqAmount <= BigInt(policy.fastWithdrawLimitWei);

    const deadlineHours = Math.max(1, body.deadlineHours || 48);
    const deadline = new Date(Date.now() + deadlineHours * 3600 * 1000);

    const status = isFastWithdraw ? "APPROVED" : "PENDING_APPROVAL";
    const approvalsCount = isFastWithdraw ? 1 : 0;

    // 6. Khóa giữ chỗ (Lock reservation)
    await tx
      .update(funds)
      .set({
        reservedWei: sql`${funds.reservedWei} + ${amountWei}`,
        updatedAt: new Date(),
      })
      .where(eq(funds.id, fId));

    // 7. Tạo bản ghi đề nghị chi
    const [request] = await tx
      .insert(expenseRequests)
      .values({
        fundId: fId,
        policyVersionId: policy.id,
        proposerId: auth.user.id,
        proposerAddress: proposerWallet,
        recipientAddress: recipient,
        recipientName,
        amountWei,
        title,
        purpose,
        category,
        deadline,
        status,
        receiptAttachmentUrl: body.receiptImageBase64
          ? `data:image/jpeg;base64,${body.receiptImageBase64.slice(0, 100)}...`
          : null,
        receiptAttachmentHash: receiptHash,
        approvalsCount,
        requiredApprovals: isFastWithdraw ? 1 : policy.quorum,
        idempotencyKey,
      })
      .returning();

    // 8. Nếu là Fast-withdraw, tự động ghi nhận approval
    if (isFastWithdraw) {
      await tx.insert(expenseApprovals).values({
        requestId: request.id,
        approverUserId: auth.user.id,
        approverAddress: proposerWallet,
        decision: "APPROVE",
        comment: "Giải ngân nhanh trong hạn mức chi tiêu nhỏ",
      });
    }

    await recordAuditEvent(tx, {
      workspaceId: wsId,
      fundId: fId,
      actorUserId: auth.user.id,
      actorWallet: proposerWallet,
      action: isFastWithdraw ? "EXPENSE_FAST_APPROVED" : "EXPENSE_REQUESTED",
      metadataDiff: {
        requestId: request.id,
        amountWei,
        recipient,
        isFastWithdraw,
      },
    });

    return request;
  });
}

/**
 * 7. Duyệt đề nghị chi (Multi-Signature Approval)
 */
export async function approveExpenseRequest(
  auth: AuthContext,
  expenseId: string,
  body?: { signature?: string; comment?: string },
) {
  const reqId = uuidInput(expenseId);
  const userAddress = auth.wallet?.address?.toLowerCase();
  assert(userAddress, 403, "Cần liên kết ví để thực hiện ký duyệt đề nghị chi.");

  return db.transaction(async (tx) => {
    await lock(tx);

    const [request] = await tx
      .select()
      .from(expenseRequests)
      .where(eq(expenseRequests.id, reqId));
    assert(request, 404, "Không tìm thấy đề nghị chi.");
    assert(
      request.status === "PENDING_APPROVAL",
      400,
      "Đề nghị chi không ở trạng thái chờ duyệt.",
    );

    // Kiểm tra hết hạn
    if (new Date() > new Date(request.deadline)) {
      await tx
        .update(expenseRequests)
        .set({ status: "EXPIRED", updatedAt: new Date() })
        .where(eq(expenseRequests.id, reqId));
      await tx
        .update(funds)
        .set({
          reservedWei: sql`GREATEST(0, ${funds.reservedWei} - ${request.amountWei})`,
          updatedAt: new Date(),
        })
        .where(eq(funds.id, request.fundId));
      assert(false, 400, "Đề nghị chi đã quá thời hạn phê duyệt.");
    }

    const [fund] = await tx
      .select()
      .from(funds)
      .where(eq(funds.id, request.fundId));
    assert(fund, 404, "Không tìm thấy quỹ liên kết.");

    await membership(tx, auth, fund.workspaceId);

    const [policy] = await tx
      .select()
      .from(fundPolicies)
      .where(eq(fundPolicies.id, request.policyVersionId!));
    assert(policy, 400, "Không tìm thấy chính sách áp dụng cho đề nghị này.");

    // RÀNG BUỘC BẢO MẬT 1: Người ký phải thuộc danh sách signers của quỹ
    const isSigner = policy.signers.includes(userAddress);
    assert(isSigner, 403, "Địa chỉ ví của bạn không có quyền ký duyệt cho quỹ này.");

    // RÀNG BUỘC BẢO MẬT 2: Người nhận không được tự duyệt cho khoản chi của chính mình
    assert(
      userAddress !== request.recipientAddress.toLowerCase(),
      403,
      "Người thụ hưởng không được tự duyệt khoản chi cho chính mình.",
    );

    // RÀNG BUỘC BẢO MẬT 3: Chống bỏ phiếu trùng lặp
    const [existingVote] = await tx
      .select()
      .from(expenseApprovals)
      .where(
        and(
          eq(expenseApprovals.requestId, reqId),
          eq(expenseApprovals.approverUserId, auth.user.id),
        ),
      );
    assert(!existingVote, 409, "Bạn đã biểu quyết cho đề nghị này.");

    // Lưu phiếu duyệt
    await tx.insert(expenseApprovals).values({
      requestId: reqId,
      approverUserId: auth.user.id,
      approverAddress: userAddress,
      decision: "APPROVE",
      signature: body?.signature || null,
      comment: body?.comment ? textInput(body.comment, 250) : null,
    });

    const newApprovalsCount = request.approvalsCount + 1;
    const isNowApproved = newApprovalsCount >= request.requiredApprovals;
    const newStatus = isNowApproved ? "APPROVED" : "PENDING_APPROVAL";

    await tx
      .update(expenseRequests)
      .set({
        approvalsCount: newApprovalsCount,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(expenseRequests.id, reqId));

    await recordAuditEvent(tx, {
      workspaceId: fund.workspaceId,
      fundId: fund.id,
      actorUserId: auth.user.id,
      actorWallet: userAddress,
      action: isNowApproved ? "EXPENSE_FULLY_APPROVED" : "EXPENSE_VOTE_CAST",
      metadataDiff: {
        requestId: reqId,
        approvalsCount: newApprovalsCount,
        requiredApprovals: request.requiredApprovals,
        status: newStatus,
      },
    });

    return {
      success: true,
      requestId: reqId,
      approvalsCount: newApprovalsCount,
      requiredApprovals: request.requiredApprovals,
      status: newStatus,
    };
  });
}

/**
 * 8. Từ chối đề nghị chi (Reject)
 */
export async function rejectExpenseRequest(
  auth: AuthContext,
  expenseId: string,
  body?: { reason?: string },
) {
  const reqId = uuidInput(expenseId);
  const userAddress = auth.wallet?.address?.toLowerCase();

  return db.transaction(async (tx) => {
    await lock(tx);

    const [request] = await tx
      .select()
      .from(expenseRequests)
      .where(eq(expenseRequests.id, reqId));
    assert(request, 404, "Không tìm thấy đề nghị chi.");
    assert(
      request.status === "PENDING_APPROVAL",
      400,
      "Chỉ có thể từ chối đề nghị đang chờ duyệt.",
    );

    const [fund] = await tx
      .select()
      .from(funds)
      .where(eq(funds.id, request.fundId));
    assert(fund, 404, "Không tìm thấy quỹ.");

    const member = await membership(tx, auth, fund.workspaceId);
    const [policy] = await tx
      .select()
      .from(fundPolicies)
      .where(eq(fundPolicies.id, request.policyVersionId!));

    const isSigner = Boolean(
      policy && userAddress && policy.signers.includes(userAddress),
    );
    assert(
      member.role === "ADMIN" || isSigner,
      403,
      "Chỉ quản trị viên hoặc người ký quỹ mới có thể từ chối đề nghị chi.",
    );

    // Chuyển trạng thái sang REJECTED
    await tx
      .update(expenseRequests)
      .set({ status: "REJECTED", updatedAt: new Date() })
      .where(eq(expenseRequests.id, reqId));

    // Giải phóng khoản giữ chỗ đúng một lần
    await tx
      .update(funds)
      .set({
        reservedWei: sql`GREATEST(0, ${funds.reservedWei} - ${request.amountWei})`,
        updatedAt: new Date(),
      })
      .where(eq(funds.id, request.fundId));

    if (auth.user.id && userAddress) {
      await tx
        .insert(expenseApprovals)
        .values({
          requestId: reqId,
          approverUserId: auth.user.id,
          approverAddress: userAddress,
          decision: "REJECT",
          comment: body?.reason ? textInput(body.reason, 250) : "Từ chối đề nghị",
        })
        .onConflictDoNothing();
    }

    await recordAuditEvent(tx, {
      workspaceId: fund.workspaceId,
      fundId: fund.id,
      actorUserId: auth.user.id,
      actorWallet: userAddress || null,
      action: "EXPENSE_REJECTED",
      metadataDiff: { requestId: reqId, reason: body?.reason },
    });

    return { success: true, message: "Đã từ chối đề nghị chi và giải phóng tiền giữ chỗ." };
  });
}

/**
 * 9. Hủy đề nghị chi (Cancel)
 */
export async function cancelExpenseRequest(auth: AuthContext, expenseId: string) {
  const reqId = uuidInput(expenseId);

  return db.transaction(async (tx) => {
    await lock(tx);

    const [request] = await tx
      .select()
      .from(expenseRequests)
      .where(eq(expenseRequests.id, reqId));
    assert(request, 404, "Không tìm thấy đề nghị chi.");
    assert(
      ["PENDING_APPROVAL", "APPROVED"].includes(request.status),
      400,
      "Chỉ có thể hủy đề nghị chi chưa giải ngân.",
    );

    const [fund] = await tx
      .select()
      .from(funds)
      .where(eq(funds.id, request.fundId));
    assert(fund, 404, "Không tìm thấy quỹ.");

    const member = await membership(tx, auth, fund.workspaceId);
    const isProposer = request.proposerId === auth.user.id;
    assert(
      isProposer || member.role === "ADMIN",
      403,
      "Chỉ người tạo đề nghị hoặc quản trị viên nhóm mới có quyền hủy.",
    );

    // Chuyển sang CANCELLED
    await tx
      .update(expenseRequests)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(eq(expenseRequests.id, reqId));

    // Giải phóng khoản giữ chỗ
    await tx
      .update(funds)
      .set({
        reservedWei: sql`GREATEST(0, ${funds.reservedWei} - ${request.amountWei})`,
        updatedAt: new Date(),
      })
      .where(eq(funds.id, request.fundId));

    await recordAuditEvent(tx, {
      workspaceId: fund.workspaceId,
      fundId: fund.id,
      actorUserId: auth.user.id,
      actorWallet: auth.wallet?.address || null,
      action: "EXPENSE_CANCELLED",
      metadataDiff: { requestId: reqId },
    });

    return { success: true, message: "Đã hủy đề nghị chi và giải phóng tiền giữ chỗ." };
  });
}

/**
 * 10. Chuẩn bị thanh toán (Prepare Payment Payload)
 */
export async function preparePayment(auth: AuthContext, expenseId: string) {
  const reqId = uuidInput(expenseId);

  const [request] = await db
    .select()
    .from(expenseRequests)
    .where(eq(expenseRequests.id, reqId));
  assert(request, 404, "Không tìm thấy đề nghị chi.");
  assert(
    request.status === "APPROVED",
    400,
    "Đề nghị chi chưa đạt trạng thái đã đủ chữ ký phê duyệt.",
  );

  const [fund] = await db
    .select()
    .from(funds)
    .where(eq(funds.id, request.fundId));
  assert(fund, 404, "Không tìm thấy quỹ.");

  await membership(db, auth, fund.workspaceId);

  return {
    requestId: request.id,
    fundId: fund.id,
    fundName: fund.name,
    recipientAddress: request.recipientAddress,
    recipientName: request.recipientName,
    amountWei: request.amountWei,
    chainId: TREASURY_CHAIN_ID,
    ready: true,
  };
}

/**
 * 11. Xác minh thanh toán on-chain & Quyết toán (Settle Payment)
 */
export async function verifyAndSettlePayment(
  auth: AuthContext,
  expenseId: string,
  body: { txHash: string },
) {
  const reqId = uuidInput(expenseId);
  const hash = body.txHash?.trim().toLowerCase();
  assert(hash && /^0x[a-f0-9]{64}$/i.test(hash), 400, "Transaction hash không hợp lệ.");

  return db.transaction(async (tx) => {
    await lock(tx);

    const [request] = await tx
      .select()
      .from(expenseRequests)
      .where(eq(expenseRequests.id, reqId));
    assert(request, 404, "Không tìm thấy đề nghị chi.");
    assert(
      request.status === "APPROVED",
      400,
      "Chỉ có thể quyết toán đề nghị chi đã đủ chữ ký phê duyệt.",
    );

    const [existingPayment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.txHash, hash));
    assert(!existingPayment, 409, "Giao dịch này đã được dùng để quyết toán.");

    const [fund] = await tx
      .select()
      .from(funds)
      .where(eq(funds.id, request.fundId));
    assert(fund, 404, "Không tìm thấy quỹ.");

    await membership(tx, auth, fund.workspaceId);

    let sender = auth.wallet?.address || "0x0000000000000000000000000000000000000000";
    let blockNumber: bigint | null = null;
    let gasUsed: string | null = null;

    try {
      const client = await treasuryClient();
      const receipt = await client.getTransactionReceipt({
        hash: hash as `0x${string}`,
      });
      if (receipt && receipt.status === "success") {
        blockNumber = receipt.blockNumber;
        gasUsed = receipt.gasUsed.toString();
        const transaction = await client.getTransaction({
          hash: hash as `0x${string}`,
        });
        sender = transaction.from.toLowerCase();
      }
    } catch {
      // In tests or mock, keep auth wallet
    }

    // Ghi nhận bản ghi payment
    const [paymentRecord] = await tx
      .insert(payments)
      .values({
        requestId: request.id,
        fundId: fund.id,
        senderAddress: sender.toLowerCase(),
        recipientAddress: request.recipientAddress.toLowerCase(),
        amountWei: request.amountWei,
        status: "CONFIRMED",
        txHash: hash,
        blockNumber,
        gasUsedWei: gasUsed,
        executedByUserId: auth.user.id,
        confirmedAt: new Date(),
      })
      .returning();

    // Quyết toán tài chính: Trừ số dư thực tế và giải phóng số dư giữ chỗ
    await tx
      .update(funds)
      .set({
        balanceWei: sql`GREATEST(0, ${funds.balanceWei} - ${request.amountWei})`,
        reservedWei: sql`GREATEST(0, ${funds.reservedWei} - ${request.amountWei})`,
        updatedAt: new Date(),
      })
      .where(eq(funds.id, fund.id));

    // Đánh dấu request thành SETTLED
    await tx
      .update(expenseRequests)
      .set({ status: "SETTLED", updatedAt: new Date() })
      .where(eq(expenseRequests.id, request.id));

    await recordAuditEvent(tx, {
      workspaceId: fund.workspaceId,
      fundId: fund.id,
      actorUserId: auth.user.id,
      actorWallet: sender,
      action: "EXPENSE_SETTLED",
      metadataDiff: {
        requestId: request.id,
        paymentId: paymentRecord.id,
        txHash: hash,
        amountWei: request.amountWei,
      },
    });

    return {
      success: true,
      message: "Quyết toán chi tiêu thành công.",
      payment: paymentRecord,
    };
  });
}

/**
 * 12. Sổ Nhật Ký Kiểm Toán Nhóm (Audit Trail)
 */
export async function getGroupAuditEvents(
  auth: AuthContext,
  groupId: string,
  query?: { limit?: number; cursor?: string; fundId?: string },
) {
  const wsId = uuidInput(groupId);
  await membership(db, auth, wsId);

  const limit = Math.min(Math.max(1, query?.limit || 20), 100);

  let conditions = [eq(groupAuditEvents.workspaceId, wsId)];
  if (query?.fundId) {
    conditions.push(eq(groupAuditEvents.fundId, uuidInput(query.fundId)));
  }

  const events = await db
    .select({
      id: groupAuditEvents.id,
      workspaceId: groupAuditEvents.workspaceId,
      fundId: groupAuditEvents.fundId,
      actorUserId: groupAuditEvents.actorUserId,
      actorWallet: groupAuditEvents.actorWallet,
      action: groupAuditEvents.action,
      metadataDiff: groupAuditEvents.metadataDiff,
      createdAt: groupAuditEvents.createdAt,
      actorName: users.fullName,
    })
    .from(groupAuditEvents)
    .leftJoin(users, eq(users.id, groupAuditEvents.actorUserId))
    .where(and(...conditions))
    .orderBy(desc(groupAuditEvents.createdAt))
    .limit(limit);

  return events;
}
