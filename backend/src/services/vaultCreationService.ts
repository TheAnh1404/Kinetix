import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { parseAbi, keccak256, toHex } from "viem";
import {
  db,
  vaultCreationDrafts,
  users,
  userWallets,
  workspaceMembers,
  vaults,
} from "../db";
import { AuthContext, membership, requireFull } from "../auth/service";
import { assert, uuidInput } from "../auth/security";
import { workspace } from "./workspaceAccess";
import { deploymentManifest, verifiedDeployment } from "./deploymentService";
import { FAMILY_HUB_ABI } from "../../../shared/abis";
import {
  buildVaultCall,
  ResolvedVaultConfig,
  resolveVaultConfig,
  vaultForm,
  VaultConfigError,
  MAX_STORED_WEI,
} from "../../../shared/vaultCreation";
import {
  TRANSACTION_ALLOWLIST_ADDRESS,
  TRANSACTION_ALLOWLIST_ABI,
} from "../../../shared/networkPermissions";
import { databaseErrorCode } from "../db/errors";
import { isDeepStrictEqual } from "node:util";

export interface CreationPreflight {
  contractConfig: ResolvedVaultConfig;
  data: `0x${string}`;
  intentHash: string;
  chainId: number;
  hub: `0x${string}`;
  deploymentRef: string;
  actor: string;
  asOfBlock: string;
  checkedAt: string;
  expiresAt: string;
  estimatedFeeWei: string;
}
type Draft = typeof vaultCreationDrafts.$inferSelect;
type Store = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
async function actor(auth: AuthContext, workspaceId: string) {
  requireFull(auth);
  const value = await workspace(auth, uuidInput(workspaceId));
  assert(
    value.member.role === "ADMIN",
    403,
    "Chỉ người bảo hộ được tạo hũ.",
  );
  return value;
}
const condition = (auth: AuthContext, workspaceId: string, id: string) =>
  and(
    eq(vaultCreationDrafts.id, id),
    eq(vaultCreationDrafts.userId, auth.user.id),
    eq(vaultCreationDrafts.workspaceId, workspaceId),
  );
async function ownDraft(
  auth: AuthContext,
  workspaceId: string,
  id: string,
  store: Store = db,
) {
  const [row] = await store
    .select()
    .from(vaultCreationDrafts)
    .where(condition(auth, workspaceId, uuidInput(id)));
  assert(row, 404, "Không tìm thấy bản nháp trong gia đình này.");
  return row;
}
export function creationDraftDto(row: Draft) {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    config: row.config,
    step: row.vaultId ? 5 : row.step,
    revision: row.revision,
    preflight: row.preflight,
    signaturePending: !!row.claimedAt && !row.txHash,
    txHash: row.txHash,
    vaultId: row.vaultId,
    updatedAt: row.updatedAt.toISOString(),
  };
}
async function roster(workspaceId: string, store: Store = db) {
  return store
    .select({
      id: users.id,
      fullName: users.fullName,
      role: workspaceMembers.role,
      address: userWallets.address,
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
async function networkPermission(
  client: any,
  address: string,
  blockNumber: bigint,
) {
  if (process.env.TX_ALLOWLIST_ENABLED !== "true") return true;
  return (
    (await client.readContract({
      address: TRANSACTION_ALLOWLIST_ADDRESS,
      abi: TRANSACTION_ALLOWLIST_ABI,
      functionName: "readAllowList",
      args: [address],
      blockNumber,
    })) > 0n
  );
}
export async function creationContext(auth: AuthContext, workspaceId: string) {
  const { ws, member } = await actor(auth, workspaceId);
  const rows = await roster(ws.id);
  let availability = "DISABLED";
  let reason = "Hệ thống chưa mở giao dịch. Bạn vẫn có thể lưu bản nháp.";
  let allowed = new Map<string, boolean>();
  let actorAllowed: boolean | null = null;
  let asOfBlock: string | null = null;
  try {
    if (deploymentManifest().enabled) {
      const { client, manifest } = await verifiedDeployment(ws.l1HubAddress);
      assert(
        ws.l1HubAddress?.toLowerCase() ===
          manifest.contracts.hub!.address.toLowerCase(),
        409,
        "Cần nối không gian với deployment đã xác minh.",
        "WORKSPACE_NOT_CONNECTED",
      );
      const block = await client.getBlock({ blockTag: "finalized" });
      asOfBlock = String(block.number!);
      const read = (name: string, args: unknown[]) =>
        client.readContract({
          address: manifest.contracts.hub!.address,
          abi: FAMILY_HUB_ABI,
          functionName: name,
          args,
          blockNumber: block.number!,
        } as any) as Promise<any>;
      const paused =
        (await read("paused", [])) ||
        (await client.readContract({
          address: manifest.contracts.cashflow!.address,
          abi: parseAbi(["function paused() view returns (bool)"]),
          functionName: "paused",
          blockNumber: block.number!,
        }));
      const checks = await Promise.all(
        rows.map(
          async (row) =>
            [
              row.id,
              !!row.address &&
                (await read("isAllowlisted", [row.address])) === true &&
                (await networkPermission(client, row.address, block.number!)),
            ] as const,
        ),
      );
      allowed = new Map(checks);
      actorAllowed = auth.wallet
        ? (await read("isAllowlisted", [auth.wallet.address])) === true &&
          (await networkPermission(client, auth.wallet.address, block.number!))
        : false;
      availability = paused ? "PAUSED" : actorAllowed ? "READY" : "BLOCKED";
      reason = paused
        ? "Người vận hành đang tạm dừng giao dịch."
        : actorAllowed
          ? "Có thể kiểm tra cấu hình và ký bằng Core."
          : "Ví của bạn chưa được cấp quyền giao dịch.";
    }
  } catch (error: any) {
    if (databaseErrorCode(error)) throw error;
    availability = "UNAVAILABLE";
    reason =
      error?.code === "WORKSPACE_NOT_CONNECTED"
        ? "Hoàn tất kết nối không gian ở màn Bắt đầu trước khi ký."
        : "Chưa xác minh được blockchain. Quyền chưa xác định; không gửi giao dịch.";
    actorAllowed = null;
    allowed = new Map();
  }
  return {
    workspaceId: ws.id,
    workspaceName: ws.name,
    role: member.role,
    actor: auth.wallet?.address,
    availability,
    reason,
    asOfBlock,
    checkedAt: new Date().toISOString(),
    candidates: rows.map((row) => ({
      ...row,
      linked: !!row.address,
      permission: allowed.has(row.id)
        ? allowed.get(row.id)
          ? "ALLOWED"
          : "DENIED"
        : "UNKNOWN",
      reason: !row.address
        ? "Chưa liên kết Core"
        : !allowed.has(row.id)
          ? "Chưa xác minh quyền"
          : allowed.get(row.id)
            ? "Đủ điều kiện"
            : "Chờ cấp quyền",
      canGuard: ["ADMIN", "GUARDIAN"].includes(row.role) && !!row.address,
    })),
  };
}
export async function listCreationDrafts(
  auth: AuthContext,
  workspaceId: string,
) {
  await actor(auth, workspaceId);
  return (
    await db
      .select()
      .from(vaultCreationDrafts)
      .where(
        and(
          eq(vaultCreationDrafts.userId, auth.user.id),
          eq(vaultCreationDrafts.workspaceId, workspaceId),
        ),
      )
      .orderBy(desc(vaultCreationDrafts.updatedAt))
      .limit(30)
  ).map(creationDraftDto);
}
export async function getCreationDraft(
  auth: AuthContext,
  workspaceId: string,
  id: string,
) {
  await actor(auth, workspaceId);
  return creationDraftDto(await ownDraft(auth, workspaceId, id));
}
export async function saveCreationDraft(
  auth: AuthContext,
  workspaceId: string,
  input: Record<string, unknown>,
  id?: string,
) {
  await actor(auth, workspaceId);
  const config = vaultForm(input.config);
  assert(
    Number.isInteger(input.step) &&
      Number(input.step) >= 1 &&
      Number(input.step) <= 4,
    400,
    "Bước cấu hình không hợp lệ.",
  );
  const draftId = uuidInput(id || String(input.id || ""));
  return db.transaction(async (tx) => {
    const member = await membership(tx, auth, workspaceId);
    assert(
      member.role === "ADMIN",
      403,
      "Quyền tạo hũ đã thay đổi.",
    );
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`vault-draft:${draftId}`}))`,
    );
    const [current] = await tx
      .select()
      .from(vaultCreationDrafts)
      .where(eq(vaultCreationDrafts.id, draftId))
      .for("update");
    if (current) {
      assert(
        current.userId === auth.user.id && current.workspaceId === workspaceId,
        404,
        "Không tìm thấy bản nháp.",
      );
      if (!id) {
        assert(
          isDeepStrictEqual(current.config, config) &&
            current.step === Number(input.step),
          409,
          "Bản nháp đã được lưu với nội dung khác. Tải lại trước khi sửa.",
          "DRAFT_REVISION_CONFLICT",
        );
        return creationDraftDto(current);
      }
      assert(
        !current.claimedAt && !current.txHash && !current.vaultId,
        409,
        "Bản nháp đã bắt đầu ký hoặc đã gửi. Hãy đối soát, không tạo lại.",
        "CREATION_ALREADY_SUBMITTED",
      );
      assert(
        current.revision === input.revision,
        409,
        "Bản nháp đã đổi trên thiết bị khác. Hãy tải lại.",
        "DRAFT_REVISION_CONFLICT",
      );
      const [updated] = await tx
        .update(vaultCreationDrafts)
        .set({
          config,
          step: Number(input.step),
          revision: current.revision + 1,
          preflight: null,
          updatedAt: new Date(),
        })
        .where(eq(vaultCreationDrafts.id, draftId))
        .returning();
      return creationDraftDto(updated);
    }
    assert(!id, 404, "Không tìm thấy bản nháp.");
    const [created] = await tx
      .insert(vaultCreationDrafts)
      .values({
        id: draftId,
        workspaceId,
        userId: auth.user.id,
        config,
        step: Number(input.step),
      })
      .returning();
    return creationDraftDto(created);
  });
}
export async function preflightCreation(
  auth: AuthContext,
  workspaceId: string,
  id: string,
  revision: unknown,
) {
  const { ws } = await actor(auth, workspaceId);
  const draft = await ownDraft(auth, ws.id, id);
  assert(
    draft.revision === revision && !draft.claimedAt && !draft.txHash,
    409,
    "Bản nháp đã đổi hoặc đã bắt đầu gửi.",
    "DRAFT_REVISION_CONFLICT",
  );
  const { client, manifest } = await verifiedDeployment(ws.l1HubAddress);
  assert(
    ws.l1HubAddress?.toLowerCase() ===
      manifest.contracts.hub!.address.toLowerCase(),
    409,
    "Cần nối không gian với deployment.",
    "WORKSPACE_NOT_CONNECTED",
  );
  const block = await client.getBlock({ blockTag: "finalized" });
  const rows = await roster(ws.id);
  const map = new Map(
    rows.filter((row) => row.address).map((row) => [row.id, row.address!]),
  );
  const config = resolveVaultConfig(draft.config, map, block.timestamp);
  assert(
    draft.config.guardianIds.every((guardianId) =>
      rows.some(
        (row) =>
          row.id === guardianId && ["ADMIN", "GUARDIAN"].includes(row.role),
      ),
    ),
    403,
    "Người ký duyệt phải là người bảo hộ của gia đình.",
    "GUARDIAN_ROLE_REQUIRED",
  );
  const hub = manifest.contracts.hub!.address;
  for (const address of [
    ...new Set([
      auth.wallet!.address,
      ...config.guardianWallets,
      ...config.beneficiaryWallets,
    ]),
  ]) {
    const permission = await client.readContract({
      address: hub,
      abi: FAMILY_HUB_ABI,
      functionName: "isAllowlisted",
      args: [address],
      blockNumber: block.number!,
    } as any);
    assert(
      permission === true &&
        (await networkPermission(client, address, block.number!)),
      403,
      "Có ví chưa được cấp quyền trên mạng/Hub. Hoàn tất cấp quyền trước.",
      "NOT_ALLOWLISTED",
    );
  }
  const call = buildVaultCall(config);
  const paused =
    (await client.readContract({
      address: hub,
      abi: FAMILY_HUB_ABI,
      functionName: "paused",
      blockNumber: block.number!,
    } as any)) ||
    (await client.readContract({
      address: manifest.contracts.cashflow!.address,
      abi: parseAbi(["function paused() view returns (bool)"]),
      functionName: "paused",
      blockNumber: block.number!,
    }));
  assert(!paused, 409, "Hệ thống đang tạm dừng giao dịch.", "CONTRACT_PAUSED");
  const gas = await client.estimateContractGas({
    address: hub,
    abi: FAMILY_HUB_ABI,
    functionName: call.functionName,
    args: call.args,
    account: auth.wallet!.address,
    value: 0n,
  } as any);
  const fees = await client.estimateFeesPerGas();
  const quote: CreationPreflight = {
    contractConfig: config,
    data: call.data,
    intentHash: keccak256(
      toHex(
        JSON.stringify({
          user: auth.user.id,
          workspace: ws.id,
          deployment: `${manifest.version}:${hub.toLowerCase()}`,
          data: call.data,
        }),
      ),
    ),
    chainId: manifest.chainId,
    hub,
    deploymentRef: `${manifest.version}:${hub.toLowerCase()}`,
    actor: auth.wallet!.address,
    asOfBlock: String(block.number!),
    checkedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60000).toISOString(),
    estimatedFeeWei: String(gas * (fees.maxFeePerGas ?? fees.gasPrice ?? 0n)),
  };
  return db.transaction(async (tx) => {
    const member = await membership(tx, auth, ws.id);
    assert(
      member.role === "ADMIN",
      403,
      "Quyền tạo hũ đã thay đổi.",
    );
    const [current] = await tx
      .select()
      .from(vaultCreationDrafts)
      .where(condition(auth, ws.id, id))
      .for("update");
    assert(
      current &&
        current.revision === revision &&
        !current.claimedAt &&
        !current.txHash,
      409,
      "Bản nháp đã đổi; kiểm tra lại trước khi ký.",
      "DRAFT_REVISION_CONFLICT",
    );
    const [updated] = await tx
      .update(vaultCreationDrafts)
      .set({ preflight: quote, step: 4, updatedAt: new Date() })
      .where(eq(vaultCreationDrafts.id, id))
      .returning();
    return creationDraftDto(updated);
  });
}
export async function creationIntent(
  auth: AuthContext,
  workspaceId: string,
  id: string,
  attemptId: string,
  store: Store = db,
) {
  const row = await ownDraft(auth, workspaceId, id, store);
  const quote = row.preflight;
  assert(
    quote && Date.parse(quote.expiresAt) > Date.now(),
    409,
    "Lần kiểm tra đã hết hạn. Kiểm tra lại cấu hình trước khi ký.",
    "CREATION_PREFLIGHT_EXPIRED",
  );
  assert(
    !row.txHash &&
      !row.vaultId &&
      (!row.sendAttemptId || row.sendAttemptId === attemptId),
    409,
    "Bản nháp đang được ký hoặc đã gửi. Không gửi lại.",
    "CREATION_ALREADY_SUBMITTED",
  );
  assert(
    quote.actor === auth.wallet?.address,
    403,
    "Ví liên kết đã đổi. Cần kiểm tra lại bản nháp.",
  );
  const manifest = deploymentManifest();
  assert(
    manifest.enabled &&
      manifest.contracts.hub &&
      quote.deploymentRef ===
        `${manifest.version}:${manifest.contracts.hub.address.toLowerCase()}`,
    409,
    "Deployment đã đổi. Kiểm tra lại trước khi ký.",
    "CREATION_DEPLOYMENT_CHANGED",
  );
  return { draftId: row.id, data: quote.data, intentHash: quote.intentHash };
}
export async function claimCreation(
  auth: AuthContext,
  workspaceId: string,
  id: string,
  attemptInput: unknown,
) {
  await actor(auth, workspaceId);
  const attemptId = uuidInput(String(attemptInput || ""));
  return db.transaction(async (tx) => {
    const member = await membership(tx, auth, workspaceId);
    assert(
      member.role === "ADMIN",
      403,
      "Quyền tạo hũ đã thay đổi.",
    );
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`vault-draft:${id}`}))`,
    );
    const intent = await creationIntent(auth, workspaceId, id, attemptId, tx);
    const rowBefore = await ownDraft(auth, workspaceId, id, tx);
    const rows = await roster(workspaceId, tx);
    assert(
      rowBefore.config.guardianIds.every((id) =>
        rows.some(
          (row) => row.id === id && ["ADMIN", "GUARDIAN"].includes(row.role),
        ),
      ),
      403,
      "Vai trò thành viên đã thay đổi.",
      "GUARDIAN_ROLE_REQUIRED",
    );
    const resolved = resolveVaultConfig(
      rowBefore.config,
      new Map(
        rows.filter((row) => row.address).map((row) => [row.id, row.address!]),
      ),
      BigInt(Math.floor(Date.now() / 1000)),
    );
    assert(
      buildVaultCall(resolved).data === intent.data,
      409,
      "Ví thành viên đã thay đổi. Kiểm tra lại bản nháp.",
      "CREATION_INTENT_MISMATCH",
    );
    const [row] = await tx
      .update(vaultCreationDrafts)
      .set({
        sendAttemptId: attemptId,
        claimedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(condition(auth, workspaceId, id))
      .returning();
    return { ...intent, signaturePending: !!row.claimedAt };
  });
}
export async function releaseCreation(
  auth: AuthContext,
  workspaceId: string,
  id: string,
  attemptInput: unknown,
) {
  await actor(auth, workspaceId);
  const attemptId = uuidInput(String(attemptInput || ""));
  await db
    .update(vaultCreationDrafts)
    .set({ sendAttemptId: null, claimedAt: null, updatedAt: new Date() })
    .where(
      and(
        condition(auth, workspaceId, id),
        eq(vaultCreationDrafts.sendAttemptId, attemptId),
        isNull(vaultCreationDrafts.txHash),
        isNull(vaultCreationDrafts.vaultId),
      ),
    );
  return getCreationDraft(auth, workspaceId, id);
}
export async function linkCreationTransaction(
  auth: AuthContext,
  workspaceId: string,
  id: string,
  hash: string,
  data: string,
  hub: string,
) {
  await actor(auth, workspaceId);
  return db.transaction(async (tx) => {
    const row = await ownDraft(auth, workspaceId, id, tx);
    assert(
      row.preflight &&
        row.preflight.data.toLowerCase() === data.toLowerCase() &&
        row.preflight.hub.toLowerCase() === hub.toLowerCase() &&
        row.preflight.actor === auth.wallet?.address,
      409,
      "Giao dịch khác cấu hình đã kiểm tra.",
      "CREATION_INTENT_MISMATCH",
    );
    const [updated] = await tx
      .update(vaultCreationDrafts)
      .set({ txHash: hash.toLowerCase(), step: 5, updatedAt: new Date() })
      .where(
        and(
          condition(auth, workspaceId, id),
          sql`(${vaultCreationDrafts.txHash} IS NULL OR ${vaultCreationDrafts.txHash} = ${hash.toLowerCase()})`,
        ),
      )
      .returning();
    assert(
      updated,
      409,
      "Bản nháp đã có hash khác. Đối soát giao dịch cũ.",
      "CREATION_HASH_CONFLICT",
    );
    return updated;
  });
}
export async function validateCreationRegistration(
  store: Store,
  auth: AuthContext,
  workspaceId: string,
  state: any,
  hash: string,
  hub: string,
  data: string,
  draftId?: string,
) {
  const rows = await roster(workspaceId, store);
  const wallets = new Map(
    rows
      .filter((row) => row.address)
      .map((row) => [row.address!.toLowerCase(), row]),
  );
  assert(
    [...state.guardians, ...state.beneficiaries].every((address: string) =>
      wallets.has(address.toLowerCase()),
    ),
    409,
    "Có ví trong hũ không thuộc thành viên đang hoạt động và đã xác minh của gia đình. Cần đối soát riêng.",
    "VAULT_MEMBER_COVERAGE_REQUIRED",
  );
  assert(
    state.guardians.every((address: string) =>
      ["ADMIN", "GUARDIAN"].includes(wallets.get(address.toLowerCase())!.role),
    ),
    409,
    "Guardian của hũ không có vai trò người bảo hộ trong gia đình.",
    "VAULT_GUARDIAN_ROLE_MISMATCH",
  );
  if (Number(state.ruleType) === 1)
    assert(
      !state.beneficiaries.some((address: string) =>
        state.guardians.some(
          (guardian: string) =>
            guardian.toLowerCase() === address.toLowerCase(),
        ),
      ),
      409,
      "Hũ nhiệm vụ có người nhận trùng Guardian; cần đối soát cấu hình.",
      "MILESTONE_ROLE_OVERLAP",
    );
  assert(
    state.fastWithdrawLimit <= MAX_STORED_WEI &&
      state.targetGoalAmount <= MAX_STORED_WEI &&
      state.roscaRoundContribution *
        BigInt(Math.max(1, state.beneficiaries.length)) <=
        MAX_STORED_WEI,
    409,
    "Giá trị vượt độ chính xác lưu trữ của ứng dụng.",
    "VAULT_AMOUNT_OUT_OF_RANGE",
  );
  if (!draftId) return null; // Explicit receipt import remains available for existing on-chain creations.
  const row = await ownDraft(auth, workspaceId, uuidInput(draftId), store);
  assert(
    row.preflight?.data.toLowerCase() === data.toLowerCase() &&
      row.preflight.actor.toLowerCase() === auth.wallet?.address.toLowerCase() &&
      row.preflight.hub.toLowerCase() === hub.toLowerCase() &&
      (!row.txHash || row.txHash === hash.toLowerCase()),
    409,
    "Receipt khác bản nháp hoặc deployment.",
    "CREATION_INTENT_MISMATCH",
  );
  return row;
}
