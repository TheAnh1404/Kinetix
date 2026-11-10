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
  vaultCreationDrafts,
  chainEvents,
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
import { FAMILY_HUB_ABI } from "../../../shared/abis";
import { scopedMembership } from "../../../shared/workspacePermissions";
import { creationIntent, validateCreationRegistration } from "../services/vaultCreationService";
import { vaultState } from "../services/vaultStateService";
import {
  deploymentManifest,
  verifiedDeployment,
  provisioningIdentity,
} from "../services/deploymentService";

import {
  workspace,
  visibleVaults,
  vaultAccess,
} from "../services/workspaceAccess";

export const apiRouter = Router();
apiRouter.get("/vaults/:id/state", endpoint(async (req, res) => res.json({ success: true, data: await vaultState(req.auth!, uuidInput(req.params.id)) })));
apiRouter.get("/vaults/:id/member-additions", endpoint(async (req, res) => {
  const access = await vaultAccess(req.auth!, uuidInput(req.params.id), true);
  const { vault, ws, chainState } = access;
  const actor = req.auth!.wallet?.address?.toLowerCase();
  const canApprove = access.canApprove && !!actor && chainState.guardians.some((wallet: string) => wallet.toLowerCase() === actor);
  const [roster, currentMembers, epoch, eventRows] = await Promise.all([
    db.select({ id: users.id, fullName: users.fullName, role: workspaceMembers.role, wallet: userWallets.address })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .leftJoin(userWallets, eq(userWallets.userId, users.id))
      .where(and(eq(workspaceMembers.workspaceId, ws.id), isNull(workspaceMembers.accessDisabledAt))),
    db.select().from(vaultMembers).where(eq(vaultMembers.vaultId, vault.id)),
    readHub(ws.l1HubAddress!, "membershipEpoch", [BigInt(vault.onchainVaultId)]),
    db.select().from(chainEvents)
      .where(and(eq(chainEvents.chainId, vault.onchainChainId!), eq(chainEvents.hub, ws.l1HubAddress!.toLowerCase()), eq(chainEvents.eventName, "VaultMemberAdditionApproved"), sql`${chainEvents.payload}->>'vaultId' = ${String(vault.onchainVaultId)}`))
      .orderBy(desc(chainEvents.blockNumber)).limit(500),
  ]);
  const linked = new Set(currentMembers.map((member) => member.userId));
  const candidates = await Promise.all(roster.map(async (person) => ({
    id: person.id,
    fullName: person.fullName,
    role: person.role,
    walletAddress: person.wallet || "",
    inVault: linked.has(person.id),
    allowlisted: person.wallet ? await readHub(ws.l1HubAddress!, "isAllowlisted", [person.wallet]) : false,
  })));
  const proposalMap = new Map<string, any>();
  for (const row of eventRows) {
    const payload = row.payload as Record<string, unknown>;
    if (String(payload.vaultId) !== String(vault.onchainVaultId)) continue;
    const proposalId = String(payload.proposalId || "").toLowerCase();
    const memberAddress = String(payload.member || "").toLowerCase();
    const guardianRole = Boolean(payload.guardianRole);
    const proposalEpoch = String(payload.epoch);
    const key = `${proposalId}:${memberAddress}:${guardianRole}:${proposalEpoch}`;
    if (!proposalMap.has(key) && proposalEpoch === String(epoch)) proposalMap.set(key, { proposalId, memberAddress, guardianRole, epoch: proposalEpoch });
  }
  const workspaceAddresses = new Set(candidates.map((candidate) => candidate.walletAddress.toLowerCase()));
  const proposals = await Promise.all([...proposalMap.values()].filter((proposal) =>
    workspaceAddresses.has(proposal.memberAddress) && (!proposal.guardianRole || candidates.some((candidate) =>
      candidate.walletAddress.toLowerCase() === proposal.memberAddress && ["ADMIN", "GUARDIAN"].includes(candidate.role),
    )),
  ).map(async (proposal) => {
    const status: any = await readHub(ws.l1HubAddress!, "membershipChangeStatus", [BigInt(vault.onchainVaultId), proposal.memberAddress, proposal.guardianRole, proposal.proposalId]);
    return {
      ...proposal,
      approvalsCount: Number(status[0]),
      requiredApprovals: Number(status[1]),
      deadline: Number(status[2]),
      executed: Boolean(status[3]),
      approvedByCaller: Boolean(status[4]),
    };
  }));
  return res.json({ success: true, canApprove, ruleTemplate: vault.ruleTemplate, candidates, proposals: proposals.filter((proposal) => !proposal.executed) });
}));
apiRouter.get("/workspaces/:id/provisioning", endpoint(async (req, res) => {
  const { ws } = await workspace(req.auth!, req.params.id);
  await membership(db, req.auth!, ws.id, true);
  const { manifest, client } = await verifiedDeployment(ws.l1HubAddress);
  const block = await client.getBlock({ blockTag: "finalized" });
  const rows = await db.select({ request: provisioningRequests, address: userWallets.address, fullName: users.fullName }).from(provisioningRequests).innerJoin(userWallets, eq(userWallets.userId, provisioningRequests.userId)).innerJoin(users, eq(users.id, provisioningRequests.userId)).innerJoin(workspaceMembers, and(eq(workspaceMembers.workspaceId, ws.id), eq(workspaceMembers.userId, users.id), isNull(workspaceMembers.accessDisabledAt))).where(and(eq(provisioningRequests.workspaceId, ws.id), eq(provisioningRequests.deploymentRef, provisioningIdentity().deploymentRef)));
  const requests = await Promise.all(rows.map(async (row) => ({ ...row.request, address: row.address, fullName: row.fullName, liveAllowed: await client.readContract({ address: manifest.contracts.hub!.address, abi: FAMILY_HUB_ABI, functionName: "isAllowlisted", args: [row.address], blockNumber: block.number! } as any) })));
  return res.json({ success: true, requests, operator: manifest.admin, canSign: req.auth!.wallet?.address === manifest.admin!.toLowerCase(), asOfBlock: String(block.number) });
}));
apiRouter.post("/workspaces/:id/provisioning/refresh", endpoint(async (req, res) => {
  const { ws } = await workspace(req.auth!, req.params.id);
  const target = req.body.userId ? uuidInput(req.body.userId) : req.auth!.user.id;
  if (target !== req.auth!.user.id) {
    const actor = await membership(db, req.auth!, ws.id, true);
    if (actor.role !== "ADMIN") await managedAccess(db, req.auth!, ws.id, target);
  }
  const [active] = await db.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, ws.id), eq(workspaceMembers.userId, target), isNull(workspaceMembers.accessDisabledAt)));
  const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, target));
  assert(active && wallet, 409, "Thành viên chưa hoạt động hoặc chưa liên kết ví.");
  await verifiedDeployment(ws.l1HubAddress);
  const identity = provisioningIdentity();
  const [request] = await db.insert(provisioningRequests).values({ userId: target, workspaceId: ws.id, ...identity }).onConflictDoUpdate({ target: [provisioningRequests.userId, provisioningRequests.workspaceId, provisioningRequests.chainId, provisioningRequests.deploymentRef], set: { hub: identity.hub } }).returning();
  return res.json({ success: true, request });
}));
apiRouter.use("/workspaces/:id/managed-members", managedMemberRouter);
apiRouter.use("/workspaces/:id", workspaceAdminRouter);
apiRouter.get(
  "/workspaces/:id/transaction-context",
  endpoint(async (req, res) => {
    const { ws, member } = await workspace(req.auth!, req.params.id);
    const action = req.query.functionName;
    const resourceId = req.query.resourceId;
    assert(typeof action === "string", 400, "Thao tác không hợp lệ.");
    assert(
      ![
        "depositYieldReserve",
        "compoundYield",
        "depositTokenToVault",
        "fastWithdrawToken",
        "setVaultDailyLimit",
      ].includes(action),
      409,
      "Tính năng chưa bật ở T1 Fuji.",
      "FEATURE_DISABLED_T1",
    );
    const { manifest } = await verifiedDeployment(ws.l1HubAddress);
    const intent = ["createCustomVault", "createAdvancedVault"].includes(action)
      ? await creationIntent(req.auth!, ws.id, uuidInput(String(req.query.draftId || "")), uuidInput(String(req.query.attemptId || ""))) : null;
    if (
      [
        "createCustomVault",
        "createAdvancedVault",
        "setAllowlistStatus",
        "depositYieldReserve",
      ].includes(action)
    ) {
      assert(
        member.role === "ADMIN",
        403,
        "Chỉ người bảo hộ được thực hiện thao tác này.",
      );
      assert(req.auth!.wallet, 403, "Chưa liên kết ví.");
      const allowed = await readHub(ws.l1HubAddress!, "isAllowlisted", [req.auth!.wallet!.address]);
      assert(allowed, 403, "Ví chưa được cấp quyền on-chain.", "NOT_ALLOWLISTED");
      if (action === "setAllowlistStatus") assert(String(await readHub(ws.l1HubAddress!, "familyAdmin")).toLowerCase() === req.auth!.wallet!.address.toLowerCase(), 403, "Chỉ operator của Hub được cấp quyền.", "HUB_OPERATOR_REQUIRED");
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
        ["claimChoreCompleted", "verifyAndRewardChore", "cancelChore"].includes(action)
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
            "recoverMemberWallet",
            "approveVaultMemberAddition",
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
      const capability = access.capabilities?.[action as keyof NonNullable<typeof access.capabilities>];
      if (action === "approveVaultMemberAddition") {
        const memberAddress = String(req.query.memberAddress || "").toLowerCase();
        const roleValue = req.query.guardianRole;
        const proposalId = String(req.query.proposalId || "");
        assert(/^0x[0-9a-f]{40}$/.test(memberAddress), 400, "Ví thành viên không hợp lệ.");
        assert(roleValue === "true" || roleValue === "false", 400, "Vai trò thành viên không hợp lệ.");
        assert(/^0x[0-9a-f]{64}$/i.test(proposalId) && !/^0x0{64}$/i.test(proposalId), 400, "Mã đề nghị không hợp lệ.");
        assert(access.canApprove && req.auth!.wallet && access.chainState.guardians.some((wallet: string) => wallet.toLowerCase() === req.auth!.wallet!.address.toLowerCase()), 403, "Chỉ Guardian được cấp quyền và đang hoạt động mới duyệt thành viên.");
        const [target] = await db.select({ id: users.id, wallet: userWallets.address, role: workspaceMembers.role, existingVaultMember: vaultMembers.id })
          .from(workspaceMembers)
          .innerJoin(users, eq(users.id, workspaceMembers.userId))
          .innerJoin(userWallets, eq(userWallets.userId, users.id))
          .leftJoin(vaultMembers, and(eq(vaultMembers.vaultId, vaultId), eq(vaultMembers.userId, users.id)))
          .where(and(eq(workspaceMembers.workspaceId, ws.id), eq(userWallets.address, memberAddress), isNull(workspaceMembers.accessDisabledAt)));
        assert(target && !target.existingVaultMember, 409, "Thành viên đã trong Hũ hoặc chưa được kích hoạt/liên kết ví.");
        assert(await readHub(ws.l1HubAddress!, "isAllowlisted", [memberAddress]), 409, "Ví thành viên chưa được allowlist trên Hub.", "NOT_ALLOWLISTED");
        const [isGuardian, isBeneficiary] = await Promise.all([
          readHub(ws.l1HubAddress!, "isVaultGuardian", [BigInt(String(resourceId)), memberAddress]),
          readHub(ws.l1HubAddress!, "isVaultBeneficiary", [BigInt(String(resourceId)), memberAddress]),
        ]);
        assert(!isGuardian && !isBeneficiary && memberAddress !== req.auth!.wallet!.address.toLowerCase(), 409, "Ví này đã có vai trò trong Hũ.");
        const addingGuardian = roleValue === "true";
        assert(!addingGuardian || ["ADMIN", "GUARDIAN"].includes(target.role), 409, "Tài khoản trẻ em/người cao tuổi chỉ có thể tham gia với vai trò Beneficiary.");
        assert(addingGuardian ? access.chainState.guardians.length < 32 : access.chainState.beneficiaries.length < 64, 409, "Hũ đã đạt giới hạn thành viên.");
        assert(addingGuardian || access.vault.ruleTemplate !== "ROSCA", 409, "Không thể thêm người thụ hưởng vào ROSCA đang hoạt động.");
      } else {
        assert(capability?.allowed, 403, "Bạn chưa có quyền thực hiện thao tác này trên hũ.", capability?.reason || "VAULT_ACTION_DENIED");
      }
      if (action === "claimChoreCompleted") {
        const task: any = await readHub(ws.l1HubAddress!, "tasks", [BigInt(String(resourceId))]);
        assert(String(task[4]).toLowerCase() === req.auth!.wallet?.address.toLowerCase(), 403, "Bạn không phải người được giao việc.", "ASSIGNEE_MISMATCH");
      }
    }
    return res.json({
      success: true,
      workspaceId: ws.id,
      deploymentVersion: manifest.version,
      chainId: manifest.chainId,
      hub: manifest.contracts.hub!.address,
      features: manifest.features,
      creationIntent: intent,
    });
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
        ...scopedMembership(req.auth!.user.id, row.workspace, row),
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
          creatorUserId: auth.user.id,
          adminWallet: auth.wallet!.address,
          l1HubAddress: deploymentManifest().enabled
            ? deploymentManifest().contracts.hub!.address.toLowerCase()
            : null,
          cchainVaultAddress: null,
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
  const { ws, member } = await workspace(auth, id);
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
      ...scopedMembership(row.id, ws, { ...row, accessDisabledAt }),
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
        hubChainId: Number(deploymentManifest().chainId),
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
      member.role === "ADMIN",
      403,
      "Chỉ người bảo hộ được tạo hũ.",
    );
    assert(ws.l1HubAddress, 503, "Không gian chưa có hợp đồng.");
    const deployment = await verifiedDeployment(ws.l1HubAddress);
    const { event, chainId, logIndex, receipt } = await verifiedEvent(
      auth,
      ws.l1HubAddress,
      req.body.txHash,
      "VaultCreated",
      (args) => args.creator.toLowerCase() === auth.wallet!.address,
    );
    const vaultId = Number(event.vaultId);
    assert(Number.isSafeInteger(vaultId), 400, "Mã hũ vượt giới hạn hỗ trợ.");
    const chainVault: any = await deployment.client.readContract({ address: ws.l1HubAddress as `0x${string}`, abi: FAMILY_HUB_ABI, functionName: "getVault", args: [BigInt(vaultId)], blockNumber: receipt.blockNumber } as any);
    const transaction = await deployment.client.getTransaction({ hash: receipt.transactionHash });
    assert(
      chainVault.isActive &&
        chainVault.creator.toLowerCase() === auth.wallet!.address &&
        chainVault.ruleType === event.ruleType &&
        chainVault.name === event.name &&
        chainVault.bufferRatioBps === event.bufferRatioBps &&
        chainVault.requiredApprovals === event.requiredApprovals,
      409,
      "Sự kiện tạo hũ khác trạng thái on-chain.",
      "VAULT_RECEIPT_MISMATCH",
    );
    const created = await db.transaction(async (tx) => {
      await tx
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.id, ws.id))
        .for("update");
      const currentMember = await membership(tx, req.auth!, ws.id);
      assert(currentMember.role === "ADMIN", 403, "Quyền đăng ký hũ đã thay đổi.");
      const draft = await validateCreationRegistration(tx, auth, ws.id, chainVault, receipt.transactionHash, ws.l1HubAddress!, transaction.input, req.body.draftId);
      const finish = async (vault: typeof vaults.$inferSelect) => {
        if (draft) {
          await tx.update(vaultCreationDrafts).set({ vaultId: vault.id, txHash: receipt.transactionHash.toLowerCase(), step: 5, updatedAt: new Date() }).where(eq(vaultCreationDrafts.id, draft.id));
          const [updated] = await tx.update(vaults).set({ description: draft.config.description || null }).where(eq(vaults.id, vault.id)).returning();
          return updated;
        }
        return vault;
      };
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
        assert(
          existing.ruleTemplate ===
            ["SHIELD", "MILESTONE", "ROSCA", "SHARED_GOAL"][
              Number(chainVault.ruleType)
            ],
          409,
          "Policy hũ hiện có khác receipt.",
          "VAULT_POLICY_MISMATCH",
        );
        if (!existing.onchainCreationTx) {
          return finish((
            await tx
              .update(vaults)
              .set({
                onchainCreationTx: receipt.transactionHash.toLowerCase(),
                onchainCreationLogIndex: logIndex,
              })
              .where(eq(vaults.id, existing.id))
              .returning()
          )[0]);
        }
        assert(
          existing.onchainCreationTx ===
            receipt.transactionHash.toLowerCase() &&
            existing.onchainCreationLogIndex === logIndex,
          409,
          "Bằng chứng tạo hũ đã được gắn bằng receipt khác.",
          "VAULT_EVIDENCE_CONFLICT",
        );
        return finish(existing);
      }
      const [vault] = await tx
        .insert(vaults)
        .values({
          workspaceId: ws.id,
          onchainVaultId: vaultId,
          onchainHub: ws.l1HubAddress!.toLowerCase(),
          onchainChainId: chainId,
          onchainCreationTx: receipt.transactionHash.toLowerCase(),
          onchainCreationLogIndex: logIndex,
          name: chainVault.name,
          description: draft?.config.description || null,
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
                ...provisioningIdentity(),
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
                  provisioningRequests.deploymentRef,
                ],
                set: { status: "CONFIRMED", txHash: req.body.txHash },
              });
        }
      }
      return finish(vault);
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
apiRouter.post("/vault-members/add", endpoint(async (req, res) => {
  const { vault, ws, member } = await vaultAccess(req.auth!, req.body.vaultId || "", true);
  assert(req.auth!.wallet, 403, "Chưa liên kết ví.");
  assert(["ADMIN", "GUARDIAN"].includes(member.role), 403, "Vai trò workspace không được phép ký duyệt thành viên.");
  const memberAddress = String(req.body.memberAddress || "").toLowerCase();
  const guardianRole = req.body.guardianRole === true;
  const proposalId = String(req.body.proposalId || "").toLowerCase();
  assert(/^0x[0-9a-f]{40}$/.test(memberAddress) && /^0x[0-9a-f]{64}$/.test(proposalId), 400, "Thông tin đề nghị không hợp lệ.");
  const { event, receipt, logIndex } = await verifiedEvent(
    req.auth!, ws.l1HubAddress!, req.body.txHash, "VaultMemberAdditionApproved",
    (args) => Number(args.vaultId) === vault.onchainVaultId &&
      args.member.toLowerCase() === memberAddress && Boolean(args.guardianRole) === guardianRole &&
      args.proposalId.toLowerCase() === proposalId && args.approver.toLowerCase() === req.auth!.wallet!.address.toLowerCase(),
  );
  const saveChainEvent = async (eventName: string, args: any, eventLogIndex: number) => db.insert(chainEvents).values({
    chainId: vault.onchainChainId!,
    hub: ws.l1HubAddress!.toLowerCase(),
    txHash: receipt.transactionHash.toLowerCase(),
    logIndex: eventLogIndex,
    blockNumber: receipt.blockNumber,
    blockHash: receipt.blockHash,
    eventName,
    payload: JSON.parse(JSON.stringify(args, (_key, value) => typeof value === "bigint" ? value.toString() : value)),
  }).onConflictDoNothing();
  await saveChainEvent("VaultMemberAdditionApproved", event, logIndex);
  const [target] = await db.select({ userId: users.id, wallet: userWallets.address, role: workspaceMembers.role })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .innerJoin(userWallets, eq(userWallets.userId, users.id))
    .where(and(eq(workspaceMembers.workspaceId, ws.id), eq(userWallets.address, memberAddress), isNull(workspaceMembers.accessDisabledAt)));
  assert(target && target.wallet.toLowerCase() === memberAddress, 409, "Ví cần thuộc thành viên đang hoạt động trong workspace.");
  assert(!guardianRole || ["ADMIN", "GUARDIAN"].includes(target.role), 409, "Tài khoản trẻ em/người cao tuổi chỉ có thể tham gia với vai trò Beneficiary.");
  let added = false;
  let requiredApprovals = Number(event.requiredApprovals);
  if (Number(event.approvalsCount) >= Number(event.requiredApprovals)) {
    const { event: completed, logIndex: completedLogIndex } = await verifiedEvent(
      req.auth!, ws.l1HubAddress!, req.body.txHash, "VaultMemberAdded",
      (args) => Number(args.vaultId) === vault.onchainVaultId && args.member.toLowerCase() === memberAddress &&
        Boolean(args.guardianRole) === guardianRole && args.proposalId.toLowerCase() === proposalId,
    );
    await saveChainEvent("VaultMemberAdded", completed, completedLogIndex);
    const state: any = await readHub(ws.l1HubAddress!, "getVault", [BigInt(vault.onchainVaultId)]);
    assert(guardianRole ? state.guardians.some((wallet: string) => wallet.toLowerCase() === memberAddress) : state.beneficiaries.some((wallet: string) => wallet.toLowerCase() === memberAddress), 409, "Receipt và trạng thái Hũ không khớp.", "VAULT_RECEIPT_MISMATCH");
    const role = guardianRole ? "GUARDIAN" : "BENEFICIARY";
    const [existing] = await db.select().from(vaultMembers).where(and(eq(vaultMembers.vaultId, vault.id), eq(vaultMembers.userId, target.userId)));
    assert(!existing || existing.vaultRole === role, 409, "Thành viên đã có vai trò khác trong Hũ.");
    if (!existing) await db.insert(vaultMembers).values({ vaultId: vault.id, userId: target.userId, vaultRole: role }).onConflictDoNothing();
    requiredApprovals = Number(state.requiredApprovals);
    await db.update(vaults).set({ requiredApprovals }).where(eq(vaults.id, vault.id));
    if (await readHub(ws.l1HubAddress!, "isAllowlisted", [memberAddress]) && await networkAllowed(memberAddress)) {
      const identity = provisioningIdentity();
      await db.insert(provisioningRequests).values({ ...identity, userId: target.userId, workspaceId: ws.id, chainId: vault.onchainChainId!, status: "CONFIRMED", txHash: receipt.transactionHash.toLowerCase() }).onConflictDoUpdate({
        target: [provisioningRequests.userId, provisioningRequests.workspaceId, provisioningRequests.chainId, provisioningRequests.deploymentRef],
        set: { status: "CONFIRMED", txHash: receipt.transactionHash.toLowerCase() },
      });
    }
    added = true;
  }
  return res.json({ success: true, added, approvalsCount: Number(event.approvalsCount), requiredApprovals, deadline: Number(event.deadline), txHash: receipt.transactionHash.toLowerCase() });
}));
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
for (const action of ["submit", "verify", "cancel"] as const) {
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
        action === "submit" ? "ChoreClaimed" : action === "cancel" ? "ChoreCancelled" : "ChoreApproved",
        (args) => Number(args.taskId) === chore.onchainTaskId,
      );
      const taskState: any =
        action === "verify"
          ? await readHub(ws.l1HubAddress!, "tasks", [
              BigInt(chore.onchainTaskId!),
            ])
          : null;
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
            action === "cancel" ? "CANCELLED" : action === "submit"
              ? sql`case when ${chores.status} = 'TODO' then 'SUBMITTED'::chore_status else ${chores.status} end`
              : taskState[6]
                ? "REWARDED"
                : sql`case when ${chores.status} = 'REWARDED' then ${chores.status} else 'SUBMITTED'::chore_status end`,
          ...(proof
            ? {
                proofImageUrl: sql`coalesce(${chores.proofImageUrl}, ${proof})`,
              }
            : {}),
        })
        .where(
          and(
            eq(chores.id, chore.id),
            action === "cancel" ? sql`${chores.status} in ('TODO','SUBMITTED','VERIFIED','CANCELLED')` : action === "submit"
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
    const actor = await membership(db, req.auth!, ws.id, true);
    const [request] = await db
      .select()
      .from(provisioningRequests)
      .where(
        and(
          eq(provisioningRequests.id, uuidInput(req.params.requestId)),
          eq(provisioningRequests.workspaceId, ws.id),
        ),
      );
    if (request && request.userId !== req.auth!.user.id && actor.role !== "ADMIN")
      await managedAccess(db, req.auth!, ws.id, request.userId);
    assert(
      request && request.chainId === hubClient().chainId && ws.l1HubAddress,
      404,
      "Không tìm thấy yêu cầu trên mạng đã cấu hình.",
    );
    const { manifest } = await verifiedDeployment(ws.l1HubAddress);
    assert(request.hub === manifest.contracts.hub!.address.toLowerCase() && request.deploymentRef === provisioningIdentity().deploymentRef, 409, "Yêu cầu cấp quyền thuộc deployment cũ; tạo yêu cầu mới để đối soát.", "PROVISIONING_DEPLOYMENT_MISMATCH");
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
