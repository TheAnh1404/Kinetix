import { Router } from "express";
import { and, eq, isNull, desc, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  users,
  userWallets,
  workspaces,
  workspaceMembers,
  vaults,
  vaultMembers,
  withdrawalRequests,
  chores,
  notifications,
  provisioningRequests,
} from "../db/schema";
import {
  endpoint,
  managedMemberRouter,
  workspaceAdminRouter,
} from "./authRoutes";
import { AuthContext, membership, managedAccess } from "../auth/service";
import { assert, randomToken, textInput, uuidInput } from "../auth/security";
import {
  readHub,
  verifiedEvent,
  hubClient,
  decimalAmount,
  networkAllowed,
} from "../services/chainService";
import { relayForwardRequest } from "../services/relayerService";

import {
  workspace,
  visibleVaults,
  vaultAccess,
} from "../services/workspaceAccess";

export const apiRouter = Router();
apiRouter.use("/workspaces/:id/managed-members", managedMemberRouter);
apiRouter.use("/workspaces/:id", workspaceAdminRouter);
apiRouter.get(
  "/workspaces/:id/transaction-context",
  endpoint(async (req, res) => {
    const { ws, member } = await workspace(req.auth!, req.params.id);
    const action = req.query.functionName;
    const resourceId = req.query.resourceId;
    assert(typeof action === "string", 400, "Thao tác không hợp lệ.");
    if (
      [
        "createCustomVault",
        "createAdvancedVault",
        "setAllowlistStatus",
        "depositYieldReserve",
      ].includes(action)
    ) {
      assert(
        member.role === "ADMIN" || member.role === "GUARDIAN",
        403,
        "Chỉ người bảo hộ được thực hiện thao tác này.",
      );
    } else {
      assert(
        typeof resourceId === "string" &&
          /^\d{1,16}$/.test(resourceId) &&
          Number.isSafeInteger(Number(resourceId)),
        400,
        "Mã tài nguyên không hợp lệ.",
      );
      let vaultId: string | null = null;
      if (
        ["approveWithdrawal", "executeWithdrawalWithSignatures"].includes(
          action,
        )
      ) {
        const [row] = await db
          .select({ id: vaults.id })
          .from(withdrawalRequests)
          .innerJoin(vaults, eq(vaults.id, withdrawalRequests.vaultId))
          .where(
            and(
              eq(vaults.workspaceId, ws.id),
              eq(withdrawalRequests.onchainRequestId, Number(resourceId)),
            ),
          );
        vaultId = row?.id || null;
      } else if (
        ["claimChoreCompleted", "verifyAndRewardChore"].includes(action)
      ) {
        const [row] = await db
          .select({ id: vaults.id })
          .from(chores)
          .innerJoin(vaults, eq(vaults.id, chores.vaultId))
          .where(
            and(
              eq(vaults.workspaceId, ws.id),
              eq(chores.onchainTaskId, Number(resourceId)),
            ),
          );
        vaultId = row?.id || null;
      } else {
        assert(
          [
            "depositToVault",
            "fastWithdraw",
            "requestLargeWithdrawal",
            "payoutRoscaRound",
            "createChore",
            "compoundYield",
            "contributeRoscaRound",
            "setVaultDailyLimit",
            "depositTokenToVault",
            "fastWithdrawToken",
          ].includes(action),
          400,
          "Thao tác chưa được hỗ trợ.",
        );
        const [row] = await db
          .select({ id: vaults.id })
          .from(vaults)
          .where(
            and(
              eq(vaults.workspaceId, ws.id),
              eq(vaults.onchainVaultId, Number(resourceId)),
            ),
          );
        vaultId = row?.id || null;
      }
      assert(vaultId, 403, "Tài nguyên không thuộc không gian đang chọn.");
      const access = await vaultAccess(req.auth!, vaultId, true);
      if (
        ["approveWithdrawal", "verifyAndRewardChore", "createChore"].includes(
          action,
        )
      )
        assert(
          access.canApprove,
          403,
          "Bạn không có quyền duyệt hoặc giao việc trên hũ này.",
        );
    }
    return res.json({ success: true, workspaceId: ws.id });
  }),
);
apiRouter.get(
  "/workspaces",
  endpoint(async (req, res) => {
    const list = await db
      .select({
        workspace: workspaces,
        role: workspaceMembers.role,
        canManageMembers: workspaceMembers.canManageMembers,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(
        and(
          eq(workspaceMembers.userId, req.auth!.user.id),
          isNull(workspaceMembers.accessDisabledAt),
        ),
      );
    return res.json({
      success: true,
      workspaces: list.map((row) => ({
        ...row.workspace,
        role: row.role,
        canManageMembers: row.role === "ADMIN" || row.canManageMembers,
      })),
    });
  }),
);
apiRouter.post(
  "/workspaces",
  endpoint(async (req, res) => {
    const auth = req.auth!;
    const [manager] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.userId, auth.user.id),
          isNull(workspaceMembers.accessDisabledAt),
          sql`${workspaceMembers.role} in ('ADMIN','GUARDIAN')`,
        ),
      );
    assert(
      manager && auth.wallet,
      403,
      "Chỉ người bảo hộ được tạo không gian.",
    );
    const name = textInput(req.body.name);
    const type = req.body.type || "FAMILY";
    assert(
      ["FAMILY", "SIBLINGS", "FRIENDS", "COMMUNITY"].includes(type),
      400,
      "Loại không gian không hợp lệ.",
    );
    const created = await db.transaction(async (tx) => {
      const code = `KNTX-${randomToken().slice(0, 10).toUpperCase()}`;
      const [ws] = await tx
        .insert(workspaces)
        .values({
          name,
          type,
          workspaceCode: code,
          familyCode: code,
          creatorWallet: auth.wallet!.address,
          adminWallet: auth.wallet!.address,
          l1HubAddress: process.env.FAMILY_HUB_ADDRESS || null,
          cchainVaultAddress: process.env.FAMILY_YIELD_VAULT_ADDRESS || null,
        })
        .returning();
      await tx.insert(workspaceMembers).values({
        workspaceId: ws.id,
        userId: auth.user.id,
        role: "ADMIN",
        canManageMembers: true,
      });
      return ws;
    });
    return res.status(201).json({ success: true, workspace: created });
  }),
);
async function roster(auth: AuthContext, id: string) {
  const { member } = await workspace(auth, id);
  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
      walletAddress: userWallets.address,
      role: workspaceMembers.role,
      canManageMembers: workspaceMembers.canManageMembers,
      accessDisabledAt: workspaceMembers.accessDisabledAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .leftJoin(userWallets, eq(userWallets.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, id));
  return rows
    .filter((row) => member.role === "ADMIN" || !row.accessDisabledAt)
    .map(({ accessDisabledAt, ...row }) => ({
      ...row,
      walletAddress: row.walletAddress || "",
      accessDisabled: !!accessDisabledAt,
    }));
}
for (const prefix of ["/workspaces", "/families"]) {
  apiRouter.get(
    `${prefix}/:id`,
    endpoint(async (req, res) => {
      const { ws } = await workspace(req.auth!, req.params.id);
      const members = await roster(req.auth!, ws.id);
      const list = await visibleVaults(req.auth!, ws.id);
      return res.json({
        success: true,
        workspace: ws,
        family: ws,
        members,
        vaults: list,
        hubChainId: Number(
          process.env.HUB_CHAIN_ID || process.env.FAMILY_L1_CHAIN_ID || 99999,
        ),
        networkAllowlistRequired: process.env.TX_ALLOWLIST_ENABLED === "true",
        data: { workspace: ws, members, vaults: list },
      });
    }),
  );
}
apiRouter.get(
  "/families/:id/members",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      members: await roster(req.auth!, uuidInput(req.params.id)),
    }),
  ),
);
apiRouter.post("/families/:id/members", (_req, res) =>
  res
    .status(410)
    .json({ error: "Hãy dùng API managed-members để tạo credential tạm." }),
);
apiRouter.get(
  "/user/profile",
  endpoint(async (req, res) => {
    const user = req.auth!.user;
    return res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,
        walletAddress: req.auth!.wallet?.address || "",
      },
    });
  }),
);
apiRouter.put(
  "/user/profile",
  endpoint(async (req, res) => {
    const fields: {
      fullName?: string;
      phoneNumber?: string | null;
      avatarUrl?: string | null;
    } = {};
    if (req.body.fullName !== undefined)
      fields.fullName = textInput(req.body.fullName);
    if (req.body.phoneNumber !== undefined)
      fields.phoneNumber = req.body.phoneNumber
        ? textInput(req.body.phoneNumber, 30)
        : null;
    if (req.body.avatarUrl !== undefined) {
      const val = req.body.avatarUrl;
      const isHttps = typeof val === "string" && /^https:\/\//.test(val);
      const isDataUrl =
        typeof val === "string" &&
        /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,/.test(val);
      const isBlank = !val;
      assert(
        isBlank || isHttps || isDataUrl,
        400,
        "Ảnh đại diện cần URL HTTPS hoặc dữ liệu ảnh hợp lệ.",
      );
      fields.avatarUrl = val ? String(val).trim() : null;
    }
    assert(
      Object.keys(fields).length > 0,
      400,
      "Không có thay đổi hồ sơ hợp lệ.",
    );
    await db.update(users).set(fields).where(eq(users.id, req.auth!.user.id));
    return res.json({
      success: true,
      user: { id: req.auth!.user.id, ...fields },
    });
  }),
);
apiRouter.get(
  "/vaults",
  endpoint(async (req, res) => {
    assert(typeof req.query.workspaceId === "string", 400, "Cần workspaceId.");
    return res.json({
      success: true,
      vaults: await visibleVaults(req.auth!, req.query.workspaceId),
    });
  }),
);
apiRouter.post(
  "/vaults",
  endpoint(async (req, res) => {
    const auth = req.auth!;
    const { ws, member } = await workspace(auth, req.body.workspaceId || "");
    assert(
      member.role === "ADMIN" || member.role === "GUARDIAN",
      403,
      "Chỉ người bảo hộ được tạo hũ.",
    );
    assert(ws.l1HubAddress, 503, "Không gian chưa có hợp đồng.");
    const { event, chainId } = await verifiedEvent(
      auth,
      ws.l1HubAddress,
      req.body.txHash,
      "VaultCreated",
      (args) => args.creator.toLowerCase() === auth.wallet!.address,
    );
    const vaultId = Number(event.vaultId);
    assert(Number.isSafeInteger(vaultId), 400, "Mã hũ vượt giới hạn hỗ trợ.");
    const chainVault: any = await readHub(ws.l1HubAddress, "getVault", [
      BigInt(vaultId),
    ]);
    const created = await db.transaction(async (tx) => {
      await tx
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.id, ws.id))
        .for("update");
      await membership(tx, req.auth!, ws.id);
      const [existing] = await tx
        .select()
        .from(vaults)
        .where(
          and(
            eq(vaults.onchainChainId, chainId),
            eq(vaults.onchainHub, ws.l1HubAddress!.toLowerCase()),
            eq(vaults.onchainVaultId, vaultId),
          ),
        );
      if (existing) {
        assert(
          existing.workspaceId === ws.id,
          409,
          "Hũ đã được gắn với không gian khác.",
        );
        return existing;
      }
      const [vault] = await tx
        .insert(vaults)
        .values({
          workspaceId: ws.id,
          onchainVaultId: vaultId,
          onchainHub: ws.l1HubAddress!.toLowerCase(),
          onchainChainId: chainId,
          name: chainVault.name,
          ruleTemplate: ["SHIELD", "MILESTONE", "ROSCA", "SHARED_GOAL"][
            Number(chainVault.ruleType)
          ] as "SHIELD",
          bufferRatioBps: Number(chainVault.bufferRatioBps),
          fastWithdrawLimit: decimalAmount(chainVault.fastWithdrawLimit),
          requiredApprovals: Number(chainVault.requiredApprovals),
          targetGoalAmount: decimalAmount(chainVault.targetGoalAmount),
          targetDeadline: chainVault.targetDeadline
            ? new Date(Number(chainVault.targetDeadline) * 1000)
            : null,
          roscaRoundDuration: Number(chainVault.roscaRoundDuration),
          roscaRoundContribution: decimalAmount(
            chainVault.roscaRoundContribution,
          ),
          isActive: chainVault.isActive,
        })
        .returning();
      const members = await tx
        .select({ id: users.id, wallet: userWallets.address })
        .from(workspaceMembers)
        .innerJoin(users, eq(users.id, workspaceMembers.userId))
        .innerJoin(userWallets, eq(userWallets.userId, users.id))
        .where(
          and(
            eq(workspaceMembers.workspaceId, ws.id),
            isNull(workspaceMembers.accessDisabledAt),
          ),
        );
      for (const user of members) {
        const guardian = chainVault.guardians.some(
          (address: string) => address.toLowerCase() === user.wallet,
        );
        const beneficiary = chainVault.beneficiaries.some(
          (address: string) => address.toLowerCase() === user.wallet,
        );
        if (guardian || beneficiary || user.id === auth.user.id) {
          await tx.insert(vaultMembers).values({
            vaultId: vault.id,
            userId: user.id,
            vaultRole: guardian
              ? "GUARDIAN"
              : beneficiary
                ? "BENEFICIARY"
                : "CREATOR",
          });
          if (
            (await readHub(ws.l1HubAddress!, "isAllowlisted", [user.wallet])) &&
            (await networkAllowed(user.wallet))
          )
            await tx
              .insert(provisioningRequests)
              .values({
                userId: user.id,
                workspaceId: ws.id,
                chainId,
                status: "CONFIRMED",
                txHash: req.body.txHash,
              })
              .onConflictDoUpdate({
                target: [
                  provisioningRequests.userId,
                  provisioningRequests.workspaceId,
                  provisioningRequests.chainId,
                ],
                set: { status: "CONFIRMED", txHash: req.body.txHash },
              });
        }
      }
      return vault;
    });
    return res.status(201).json({ success: true, vault: created });
  }),
);
apiRouter.patch(
  "/vaults",
  endpoint(async (req, res) => {
    const { vault, ws } = await vaultAccess(
      req.auth!,
      req.body.vaultId || "",
      true,
    );
    const eventName =
      req.body.action === "DEPOSIT"
        ? "FundsDeposited"
        : req.body.action === "WITHDRAW"
          ? "FastWithdrawalExecuted"
          : "";
    assert(eventName, 400, "Thao tác không hợp lệ.");
    await verifiedEvent(
      req.auth!,
      ws.l1HubAddress!,
      req.body.txHash,
      eventName,
      (args) => Number(args.vaultId) === vault.onchainVaultId,
    );
    const state: any = await readHub(ws.l1HubAddress!, "getVaultOverview", [
      BigInt(vault.onchainVaultId),
    ]);
    const [updated] = await db
      .update(vaults)
      .set({
        cachedTotalBalance: decimalAmount(state[0]),
        cachedL1Buffer: decimalAmount(state[1]),
        cachedCChainYield: decimalAmount(state[2]),
      })
      .where(eq(vaults.id, vault.id))
      .returning();
    return res.json({ success: true, vault: updated });
  }),
);
apiRouter.get(
  "/withdrawals/:familyId",
  endpoint(async (req, res) => {
    const allowed = await visibleVaults(
      req.auth!,
      uuidInput(req.params.familyId),
    );
    if (!allowed.length) return res.json({ success: true, data: [] });
    const list = await db
      .select({
        request: withdrawalRequests,
        requesterName: users.fullName,
        requesterAddress: userWallets.address,
        vaultName: vaults.name,
      })
      .from(withdrawalRequests)
      .innerJoin(users, eq(users.id, withdrawalRequests.requesterId))
      .leftJoin(userWallets, eq(userWallets.userId, users.id))
      .innerJoin(vaults, eq(vaults.id, withdrawalRequests.vaultId))
      .where(
        and(
          eq(withdrawalRequests.familyId, req.params.familyId),
          inArray(
            withdrawalRequests.vaultId,
            allowed.map((v) => v.id),
          ),
        ),
      )
      .orderBy(desc(withdrawalRequests.createdAt));
    return res.json({
      success: true,
      data: list.map(({ request, ...rest }) => ({ ...request, ...rest })),
    });
  }),
);
apiRouter.post(
  "/withdrawals/create",
  endpoint(async (req, res) => {
    const { vault, ws } = await vaultAccess(
      req.auth!,
      req.body.vaultId || "",
      true,
    );
    const { event } = await verifiedEvent(
      req.auth!,
      ws.l1HubAddress!,
      req.body.txHash,
      "WithdrawalRequested",
      (args) =>
        Number(args.vaultId) === vault.onchainVaultId &&
        args.requester.toLowerCase() === req.auth!.wallet!.address,
    );
    const onchainRequestId = Number(event.requestId);
    assert(
      Number.isSafeInteger(onchainRequestId),
      400,
      "Mã yêu cầu vượt giới hạn.",
    );
    const state: any = await readHub(ws.l1HubAddress!, "withdrawalRequests", [
      event.requestId,
    ]);
    const [existing] = await db
      .select()
      .from(withdrawalRequests)
      .where(
        and(
          eq(withdrawalRequests.vaultId, vault.id),
          eq(withdrawalRequests.onchainRequestId, onchainRequestId),
        ),
      );
    const request =
      existing ||
      (
        await db
          .insert(withdrawalRequests)
          .values({
            familyId: ws.id,
            vaultId: vault.id,
            requesterId: req.auth!.user.id,
            amount: decimalAmount(event.amount),
            reason: event.reason,
            vault: vault.name,
            onchainRequestId,
            deadline: new Date(Number(state[7]) * 1000),
            requiredApprovals: vault.requiredApprovals,
            approvalsCount: Number(state[6]),
            status: state[8] ? "EXECUTED" : "PENDING",
            txHash: req.body.txHash,
          })
          .onConflictDoNothing()
          .returning()
      )[0] ||
      (
        await db
          .select()
          .from(withdrawalRequests)
          .where(
            and(
              eq(withdrawalRequests.vaultId, vault.id),
              eq(withdrawalRequests.onchainRequestId, onchainRequestId),
            ),
          )
      )[0];
    return res
      .status(201)
      .json({ success: true, data: { request, isFastWithdraw: false } });
  }),
);
apiRouter.post(
  "/withdrawals/approve",
  endpoint(async (req, res) => {
    const [request] = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.id, uuidInput(req.body.requestId || "")));
    assert(
      request?.vaultId && request.onchainRequestId !== null,
      404,
      "Yêu cầu chưa được xác minh on-chain.",
    );
    const { vault, ws } = await vaultAccess(req.auth!, request.vaultId, true);
    await verifiedEvent(
      req.auth!,
      ws.l1HubAddress!,
      req.body.txHash,
      "WithdrawalApproved",
      (args) =>
        Number(args.requestId) === request.onchainRequestId &&
        Number(args.vaultId) === vault.onchainVaultId &&
        args.guardian.toLowerCase() === req.auth!.wallet!.address,
    );
    const state: any = await readHub(ws.l1HubAddress!, "withdrawalRequests", [
      BigInt(request.onchainRequestId),
    ]);
    const [updated] = await db
      .update(withdrawalRequests)
      .set({
        approvalsCount: Number(state[6]),
        status: state[8]
          ? "EXECUTED"
          : Number(state[6]) >= vault.requiredApprovals
            ? "APPROVED"
            : "PENDING",
      })
      .where(eq(withdrawalRequests.id, request.id))
      .returning();
    return res.json({ success: true, data: updated });
  }),
);
apiRouter.get(
  "/chores/:familyId",
  endpoint(async (req, res) => {
    const allowed = await visibleVaults(
      req.auth!,
      uuidInput(req.params.familyId),
    );
    if (!allowed.length) return res.json({ success: true, data: [] });
    const list = await db
      .select({
        chore: chores,
        childName: users.fullName,
        childAvatar: users.avatarUrl,
        vaultName: vaults.name,
      })
      .from(chores)
      .innerJoin(users, eq(users.id, chores.childId))
      .innerJoin(vaults, eq(vaults.id, chores.vaultId))
      .where(
        and(
          eq(chores.familyId, req.params.familyId),
          inArray(
            chores.vaultId,
            allowed.map((v) => v.id),
          ),
        ),
      );
    return res.json({
      success: true,
      data: list.map(({ chore, ...rest }) => ({ ...chore, ...rest })),
    });
  }),
);
apiRouter.post(
  "/chores/create",
  endpoint(async (req, res) => {
    const { vault, ws } = await vaultAccess(
      req.auth!,
      req.body.vaultId || "",
      true,
    );
    const { event } = await verifiedEvent(
      req.auth!,
      ws.l1HubAddress!,
      req.body.txHash,
      "ChoreCreated",
      (args) => Number(args.vaultId) === vault.onchainVaultId,
    );
    const [child] = await db
      .select({ id: users.id })
      .from(userWallets)
      .innerJoin(users, eq(users.id, userWallets.userId))
      .innerJoin(workspaceMembers, eq(workspaceMembers.userId, users.id))
      .where(
        and(
          eq(userWallets.address, event.assignee.toLowerCase()),
          eq(workspaceMembers.workspaceId, ws.id),
          isNull(workspaceMembers.accessDisabledAt),
        ),
      );
    assert(
      child,
      400,
      "Người nhận chưa là thành viên hoạt động của không gian.",
    );
    const created =
      (
        await db
          .insert(chores)
          .values({
            familyId: ws.id,
            vaultId: vault.id,
            childId: child.id,
            title: event.title,
            rewardAmount: decimalAmount(event.rewardAmount),
            onchainTaskId: Number(event.taskId),
          })
          .onConflictDoNothing()
          .returning()
      )[0] ||
      (
        await db
          .select()
          .from(chores)
          .where(
            and(
              eq(chores.vaultId, vault.id),
              eq(chores.onchainTaskId, Number(event.taskId)),
            ),
          )
      )[0];
    return res.status(201).json({ success: true, data: created });
  }),
);
for (const action of ["submit", "verify"] as const) {
  apiRouter.post(
    `/chores/${action}`,
    endpoint(async (req, res) => {
      const [chore] = await db
        .select()
        .from(chores)
        .where(eq(chores.id, uuidInput(req.body.choreId || "")));
      assert(
        chore?.vaultId && chore.onchainTaskId !== null,
        404,
        "Nhiệm vụ chưa được xác minh on-chain.",
      );
      const { ws } = await vaultAccess(req.auth!, chore.vaultId, true);
      if (action === "submit")
        assert(
          chore.childId === req.auth!.user.id,
          403,
          "Bạn không phải người nhận nhiệm vụ.",
        );
      await verifiedEvent(
        req.auth!,
        ws.l1HubAddress!,
        req.body.txHash,
        action === "submit" ? "ChoreClaimed" : "ChoreRewarded",
        (args) => Number(args.taskId) === chore.onchainTaskId,
      );
      const proof = req.body.proofImageUrl;
      assert(
        proof === undefined ||
          (typeof proof === "string" &&
            proof.length <= 2000 &&
            /^https:\/\//.test(proof)),
        400,
        "Minh chứng cần URL HTTPS.",
      );
      const [updated] = await db
        .update(chores)
        .set({
          status:
            action === "submit"
              ? sql`case when ${chores.status} = 'TODO' then 'SUBMITTED'::chore_status else ${chores.status} end`
              : "REWARDED",
          ...(proof
            ? {
                proofImageUrl: sql`coalesce(${chores.proofImageUrl}, ${proof})`,
              }
            : {}),
        })
        .where(
          and(
            eq(chores.id, chore.id),
            action === "submit"
              ? sql`${chores.status} in ('TODO','SUBMITTED','VERIFIED','REWARDED')`
              : sql`${chores.status} in ('SUBMITTED','VERIFIED','REWARDED')`,
          ),
        )
        .returning();
      assert(updated, 409, "Trạng thái nhiệm vụ đã thay đổi.");
      return res.json({ success: true, data: updated });
    }),
  );
}
apiRouter.post(
  "/vaults/rosca-payout",
  endpoint(async (req, res) => {
    const { vault, ws } = await vaultAccess(
      req.auth!,
      req.body.vaultId || "",
      true,
    );
    await verifiedEvent(
      req.auth!,
      ws.l1HubAddress!,
      req.body.txHash,
      "RoscaRoundPaid",
      (args) => Number(args.vaultId) === vault.onchainVaultId,
    );
    const state: any = await readHub(ws.l1HubAddress!, "getVault", [
      BigInt(vault.onchainVaultId),
    ]);
    await db
      .update(vaults)
      .set({
        roscaCurrentRound: Number(state.roscaCurrentRound),
        roscaLastRoundTimestamp: new Date(
          Number(state.roscaLastRoundTimestamp) * 1000,
        ),
      })
      .where(eq(vaults.id, vault.id));
    return res.json({ success: true });
  }),
);
apiRouter.get(
  "/notifications/:userId",
  endpoint(async (req, res) => {
    assert(
      req.params.userId === req.auth!.user.id,
      403,
      "Bạn chỉ được xem thông báo của mình.",
    );
    const list = await db
      .select({ notification: notifications })
      .from(notifications)
      .innerJoin(
        workspaceMembers,
        and(
          eq(workspaceMembers.workspaceId, notifications.familyId),
          eq(workspaceMembers.userId, req.auth!.user.id),
          isNull(workspaceMembers.accessDisabledAt),
        ),
      )
      .where(eq(notifications.userId, req.auth!.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(100);
    return res.json({
      success: true,
      data: list.map((row) => row.notification),
    });
  }),
);
apiRouter.patch(
  "/notifications/:id/read",
  endpoint(async (req, res) => {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, uuidInput(req.params.id)),
          eq(notifications.userId, req.auth!.user.id),
        ),
      );
    assert(notification, 404, "Không tìm thấy thông báo.");
    await membership(db, req.auth!, notification.familyId);
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notification.id));
    return res.json({ success: true });
  }),
);
apiRouter.post(
  "/workspaces/:id/provisioning/:requestId/confirm",
  endpoint(async (req, res) => {
    const { ws } = await workspace(req.auth!, req.params.id);
    await membership(db, req.auth!, ws.id, true);
    const [request] = await db
      .select()
      .from(provisioningRequests)
      .where(
        and(
          eq(provisioningRequests.id, uuidInput(req.params.requestId)),
          eq(provisioningRequests.workspaceId, ws.id),
        ),
      );
    if (request && request.userId !== req.auth!.user.id)
      await managedAccess(db, req.auth!, ws.id, request.userId);
    assert(
      request && request.chainId === hubClient().chainId && ws.l1HubAddress,
      404,
      "Không tìm thấy yêu cầu trên mạng đã cấu hình.",
    );
    const [wallet] = await db
      .select()
      .from(userWallets)
      .where(eq(userWallets.userId, request.userId));
    assert(wallet, 409, "Thành viên chưa có ví đã xác minh.");
    await verifiedEvent(
      req.auth!,
      ws.l1HubAddress,
      req.body.txHash,
      "AllowlistStatusChanged",
      (args) => args.account.toLowerCase() === wallet.address && args.isAllowed,
      false,
    );
    assert(
      await readHub(ws.l1HubAddress, "isAllowlisted", [wallet.address]),
      409,
      "Ví hiện chưa được allowlist trên hợp đồng.",
    );
    assert(
      await networkAllowed(wallet.address),
      409,
      "Network Transaction AllowList has not granted access to this wallet.",
    );
    await db
      .update(provisioningRequests)
      .set({ status: "CONFIRMED", txHash: req.body.txHash })
      .where(eq(provisioningRequests.id, request.id));
    return res.json({
      success: true,
      kind: "ALLOWLIST",
      note: "Quyền beneficiary/guardian của từng hũ được kiểm riêng trên contract.",
    });
  }),
);

apiRouter.post(
  "/relayer/forward",
  endpoint(async (req, res) => {
    const auth = req.auth!;
    assert(auth.wallet, 403, "Chưa liên kết ví.");
    const { forwarderAddress, request } = req.body;
    assert(
      request &&
        typeof request.from === "string" &&
        request.from.toLowerCase() === auth.wallet.address.toLowerCase(),
      403,
      "Chỉ được ủy quyền cho ví của chính bạn.",
    );
    const result = await relayForwardRequest(forwarderAddress, request);
    return res.json({ success: true, ...result });
  }),
);

apiRouter.post(
  "/withdrawals/execute-signatures",
  endpoint(async (req, res) => {
    const [request] = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.id, uuidInput(req.body.requestId || "")));
    assert(
      request?.vaultId && request.onchainRequestId !== null,
      404,
      "Yêu cầu chưa được xác minh on-chain.",
    );
    const { vault, ws } = await vaultAccess(req.auth!, request.vaultId, true);
    const verified = await verifiedEvent(
      req.auth!,
      ws.l1HubAddress!,
      req.body.txHash,
      "WithdrawalExecuted",
      (args) =>
        Number(args.requestId) === request.onchainRequestId &&
        Number(args.vaultId) === vault.onchainVaultId,
      false,
    );
    const state: any = await readHub(ws.l1HubAddress!, "withdrawalRequests", [
      BigInt(request.onchainRequestId),
    ]);
    const [updated] = await db
      .update(withdrawalRequests)
      .set({
        approvalsCount: Number(state[6]),
        status: state[8] ? "EXECUTED" : "PENDING",
      })
      .where(eq(withdrawalRequests.id, request.id))
      .returning();
    return res.json({ success: true, data: updated });
  }),
);

apiRouter.post(
  "/vaults/rosca-contribute",
  endpoint(async (req, res) => {
    const { vault, ws } = await vaultAccess(
      req.auth!,
      req.body.vaultId || "",
      true,
    );
    await verifiedEvent(
      req.auth!,
      ws.l1HubAddress!,
      req.body.txHash,
      "RoscaRoundContributed",
      (args) => Number(args.vaultId) === vault.onchainVaultId,
    );
    return res.json({ success: true });
  }),
);
