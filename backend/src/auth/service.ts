import { and, eq, gt, isNull, sql, desc, inArray } from "drizzle-orm";
import { getAddress, isAddress, verifyMessage } from "viem";
import { deploymentManifest, provisioningIdentity } from "../services/deploymentService";
import { db } from "../db";
import {
  users,
  userCredentials,
  userWallets,
  sessions,
  authChallenges,
  workspaceMembers,
  workspaces,
  guardianMemberLinks,
  auditLogs,
  authRateLimits,
  authOperations,
  provisioningRequests,
  notifications,
  workspaceInvitations,
  walletHistory,
  walletRecoveries,
  workspaceOnboarding,
} from "../db/schema";
import { START_FLOW_VERSION, entryRoute, needsStart } from "../../../shared/startFlow";
import {
  assert,
  digest,
  randomToken,
  normalizeUsername,
  hashPassword,
  verifyPassword,
  validatePassword,
  textInput,
  siweMessage,
  allowedChains,
  ChallengePurpose,
  uuidInput,
} from "./security";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Store = typeof db | Transaction;
export type AuthContext = {
  session: typeof sessions.$inferSelect;
  user: typeof users.$inferSelect;
  credential?: typeof userCredentials.$inferSelect;
  wallet?: typeof userWallets.$inferSelect;
};
export const SESSION_COOKIE = "kinetix_session";
export const BROWSER_COOKIE = "kinetix_challenge";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
const IDLE_MS = 24 * 60 * 60 * 1000;
const now = () => new Date();
const later = (seconds: number) => new Date(Date.now() + seconds * 1000);
const loginError =
  "Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản chưa thể đăng nhập.";
let dummyHash: Promise<string> | undefined;

export function onboarding(auth: AuthContext) {
  if (!auth.credential) return "SET_PASSWORD";
  if (auth.credential.mustChangePassword) return "CHANGE_PASSWORD";
  if (!auth.wallet) return "LINK_WALLET";
  return "READY";
}
export function requireFull(auth: AuthContext) {
  assert(
    onboarding(auth) === "READY" && auth.session.kind === "full",
    403,
    "Vui lòng hoàn tất kích hoạt tài khoản.",
    "ONBOARDING_REQUIRED",
  );
}
async function audit(
  store: Store,
  actorId: string | null,
  subjectId: string | null,
  action: string,
  workspaceId?: string,
) {
  await store
    .insert(auditLogs)
    .values({ actorId, subjectId, action, workspaceId });
}
async function accountAudit(store: Store, userId: string, action: string) {
  await audit(store, userId, userId, action);
  const links = await store
    .select({ workspaceId: guardianMemberLinks.workspaceId })
    .from(guardianMemberLinks)
    .where(
      and(
        eq(guardianMemberLinks.memberId, userId),
        eq(guardianMemberLinks.active, true),
      ),
    );
  for (const workspaceId of new Set(links.map((link) => link.workspaceId)))
    await audit(store, userId, userId, action, workspaceId);
}
async function newSession(store: Store, userId: string, kind: string) {
  const token = randomToken();
  const [session] = await store
    .insert(sessions)
    .values({
      userId,
      kind,
      tokenHash: digest(token),
      expiresAt: later(kind === "full" ? SESSION_SECONDS : 1800),
    })
    .returning();
  return { token, session };
}
export async function authenticate(
  token: string | undefined,
  store: Store = db,
): Promise<AuthContext> {
  assert(
    token && /^[A-Za-z0-9_-]{43}$/.test(token),
    401,
    "Vui lòng đăng nhập.",
  );
  const [row] = await store
    .select()
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, digest(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now()),
        gt(sessions.lastSeenAt, new Date(Date.now() - IDLE_MS)),
        isNull(users.suspendedAt),
      ),
    );
  assert(row, 401, "Phiên đăng nhập đã hết hạn hoặc bị thu hồi.");
  const [credential] = await store
    .select()
    .from(userCredentials)
    .where(eq(userCredentials.userId, row.users.id));
  const [wallet] = await store
    .select()
    .from(userWallets)
    .where(eq(userWallets.userId, row.users.id));
  return { session: row.sessions, user: row.users, credential, wallet };
}
// Sensitive writes serialize on the account and re-read the session after obtaining the lock.
async function liveAuth(tx: Transaction, auth: AuthContext) {
  await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, auth.user.id))
    .for("update");
  const [session] = await tx
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.id, auth.session.id),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now()),
        gt(sessions.lastSeenAt, new Date(Date.now() - IDLE_MS)),
      ),
    );
  const [user] = await tx
    .select()
    .from(users)
    .where(and(eq(users.id, auth.user.id), isNull(users.suspendedAt)));
  assert(session && user, 401, "Phiên đã bị thu hồi.");
  const [credential] = await tx
    .select()
    .from(userCredentials)
    .where(eq(userCredentials.userId, user.id));
  const [wallet] = await tx
    .select()
    .from(userWallets)
    .where(eq(userWallets.userId, user.id));
  return { session, user, credential, wallet };
}
export async function rateLimit(key: string, limit: number, seconds = 900) {
  const hashed = digest(key);
  const [row] = await db
    .insert(authRateLimits)
    .values({ key: hashed, hits: 1, resetsAt: later(seconds) })
    .onConflictDoUpdate({
      target: authRateLimits.key,
      set: {
        hits: sql`CASE WHEN ${authRateLimits.resetsAt} <= now() THEN 1 ELSE ${authRateLimits.hits} + 1 END`,
        resetsAt: sql`CASE WHEN ${authRateLimits.resetsAt} <= now() THEN ${later(seconds)} ELSE ${authRateLimits.resetsAt} END`,
      },
    })
    .returning();
  assert(
    row.hits <= limit,
    429,
    "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.",
    "RATE_LIMITED",
  );
}
export async function membership(
  store: Store,
  auth: AuthContext,
  workspaceId: string,
  manage = false,
) {
  requireFull(auth);
  const [member] = await store
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, auth.user.id),
        eq(workspaceMembers.workspaceId, workspaceId),
        isNull(workspaceMembers.accessDisabledAt),
      ),
    );
  assert(member, 403, "Bạn không có quyền truy cập không gian này.");
  if (manage)
    assert(
      member.role === "ADMIN" ||
        (member.role === "GUARDIAN" && member.canManageMembers),
      403,
      "Bạn chưa được giao quyền quản lý thành viên.",
    );
  return member;
}
export async function managedAccess(
  store: Store,
  auth: AuthContext,
  workspaceId: string,
  memberId: string,
) {
  const actor = await membership(store, auth, workspaceId, true);
  const [target] = await store
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, memberId),
      ),
    );
  assert(
    target && ["ELDERLY", "CHILD"].includes(target.role),
    404,
    "Không tìm thấy thành viên được quản lý.",
  );
  if (actor.role !== "ADMIN") {
    const [link] = await store
      .select()
      .from(guardianMemberLinks)
      .where(
        and(
          eq(guardianMemberLinks.guardianId, auth.user.id),
          eq(guardianMemberLinks.memberId, memberId),
          eq(guardianMemberLinks.workspaceId, workspaceId),
          eq(guardianMemberLinks.active, true),
        ),
      );
    assert(link, 403, "Thành viên này chưa được phân công cho bạn.");
  }
  return target;
}
export async function me(auth: AuthContext, options: { workspaceId?: string; workspacePreference?: string } = {}) {
  const memberships = await db
    .select({ workspace: workspaces, membership: workspaceMembers })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(
      and(
        eq(workspaceMembers.userId, auth.user.id),
        isNull(workspaceMembers.accessDisabledAt),
      ),
    );
  const preference = options.workspacePreference?.split(".");
  const requestedWorkspace = options.workspaceId ? uuidInput(options.workspaceId) : undefined;
  const selected = requestedWorkspace
    ? memberships.find((m) => m.workspace.id === requestedWorkspace)
    : preference?.[0] === auth.user.id ? memberships.find((m) => m.workspace.id === preference[1]) : undefined;
  assert(!options.workspaceId || selected, 403, "Bạn không có quyền truy cập không gian này.");
  const family = selected ||
    memberships.find((m) => m.workspace.id === auth.user.familyId) ||
    memberships[0];
  const state = onboarding(auth);
  const startEnabled = process.env.START_SCREEN_ENABLED !== "false";
  const progress = state === "READY" && startEnabled ? await db.select().from(workspaceOnboarding).where(and(eq(workspaceOnboarding.userId, auth.user.id), eq(workspaceOnboarding.flowVersion, START_FLOW_VERSION))) : [];
  const presentation = progress.find((row) => row.workspaceId === family?.workspace.id);
  const startRequired = state === "READY" && startEnabled && !!family && needsStart(presentation?.status);
  const requests = await db
    .select()
    .from(provisioningRequests)
    .where(eq(provisioningRequests.userId, auth.user.id));
  return {
    success: true,
    isAuthenticated: true,
    user: {
      id: auth.user.id,
      fullName: auth.user.fullName,
      familyId: family?.workspace.id || "",
      role: family?.membership.role || auth.user.role,
      walletAddress: auth.wallet?.address || "",
      avatarUrl: auth.user.avatarUrl,
      phoneNumber: auth.user.phoneNumber,
      username: auth.credential?.username,
    },
    family: family?.workspace || null,
    workspaces: memberships.map(({ workspace, membership: member }) => ({
      ...workspace,
      role: member.role,
      canManageMembers: member.role === "ADMIN" || member.canManageMembers,
      startRequired: state === "READY" && startEnabled && needsStart(progress.find((row) => row.workspaceId === workspace.id)?.status),
      startStatus: progress.find((row) => row.workspaceId === workspace.id)?.status || null,
    })),
    onboarding: state,
    linkedWallet: auth.wallet
      ? { address: auth.wallet.address, verifiedAt: auth.wallet.verifiedAt }
      : null,
    onchainPermissions: requests
      .filter((request) =>
        memberships.some(
          (member) => member.workspace.id === request.workspaceId,
        ),
      )
      .map(({ id, workspaceId, chainId, status, txHash, hub, deploymentRef }) => ({
        id,
        workspaceId,
        chainId,
        status,
        txHash,
        hub,
        deploymentRef,
        kind: "ALLOWLIST",
      })),
    entryWorkspaceId: family?.workspace.id || null,
    startRequired,
    redirectUrl: entryRoute(state, family?.workspace.id, family?.membership.role || auth.user.role, presentation?.status, startEnabled),
  };
}
export async function login(usernameInput: unknown, password: unknown) {
  let username: string;
  try {
    username = normalizeUsername(usernameInput);
  } catch {
    username = "!invalid";
  }
  await rateLimit(`login-account:${username}`, 10);
  const [record] = await db
    .select()
    .from(userCredentials)
    .innerJoin(users, eq(users.id, userCredentials.userId))
    .where(eq(userCredentials.username, username));
  dummyHash ||= hashPassword(randomToken());
  const valid = await verifyPassword(
    record?.user_credentials.passwordHash || (await dummyHash),
    password,
  );
  assert(
    valid &&
      record &&
      !record.users.suspendedAt &&
      (!record.user_credentials.temporaryExpiresAt ||
        record.user_credentials.temporaryExpiresAt > now()),
    401,
    loginError,
  );
  return db.transaction(async (tx) => {
    await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, record.users.id))
      .for("update");
    const [current] = await tx
      .select()
      .from(userCredentials)
      .innerJoin(users, eq(users.id, userCredentials.userId))
      .where(eq(userCredentials.userId, record.users.id));
    assert(
      current &&
        !current.users.suspendedAt &&
        current.user_credentials.passwordHash ===
          record.user_credentials.passwordHash &&
        (!current.user_credentials.temporaryExpiresAt ||
          current.user_credentials.temporaryExpiresAt > now()),
      401,
      loginError,
    );
    const [wallet] = await tx
      .select()
      .from(userWallets)
      .where(eq(userWallets.userId, current.users.id));
    const result = await newSession(
      tx,
      current.users.id,
      !current.user_credentials.mustChangePassword && wallet
        ? "full"
        : "onboarding",
    );
    await accountAudit(tx, current.users.id, "LOGIN");
    return result;
  });
}
export async function changePassword(
  auth: AuthContext,
  oldPassword: unknown,
  newPassword: unknown,
) {
  validatePassword(newPassword);
  assert(
    newPassword !== oldPassword,
    400,
    "Mật khẩu mới phải khác mật khẩu hiện tại.",
  );
  const passwordHash = await hashPassword(newPassword);
  return db.transaction(async (tx) => {
    const current = await liveAuth(tx, auth);
    if (current.credential) {
      assert(
        await verifyPassword(current.credential.passwordHash, oldPassword),
        401,
        "Mật khẩu hiện tại không đúng.",
      );
      assert(
        !current.credential.temporaryExpiresAt ||
          current.credential.temporaryExpiresAt > now(),
        401,
        "Mật khẩu tạm đã hết hạn.",
      );
      await tx
        .update(userCredentials)
        .set({
          passwordHash,
          mustChangePassword: false,
          temporaryExpiresAt: null,
          changedAt: now(),
        })
        .where(eq(userCredentials.userId, current.user.id));
    } else {
      throw new Error("Use credential setup for an existing guardian.");
    }
    await tx
      .update(sessions)
      .set({ revokedAt: now() })
      .where(
        and(eq(sessions.userId, current.user.id), isNull(sessions.revokedAt)),
      );
    const result = await newSession(
      tx,
      current.user.id,
      current.wallet ? "full" : "onboarding",
    );
    await accountAudit(tx, current.user.id, "PASSWORD_CHANGED");
    return result;
  });
}
export async function setupCredentials(
  auth: AuthContext,
  usernameInput: unknown,
  password: unknown,
) {
  const username = normalizeUsername(usernameInput);
  const passwordHash = await hashPassword(password as string);
  return db.transaction(async (tx) => {
    const current = await liveAuth(tx, auth);
    assert(
      !current.credential &&
        current.wallet &&
        current.session.reauthenticatedAt &&
        current.session.reauthenticatedAt > new Date(Date.now() - 300000),
      403,
      "Hãy xác thực lại bằng ví để tạo tài khoản đăng nhập.",
    );
    await tx.insert(userCredentials).values({
      userId: current.user.id,
      username,
      passwordHash,
      mustChangePassword: false,
    });
    await tx
      .update(sessions)
      .set({ revokedAt: now() })
      .where(eq(sessions.userId, current.user.id));
    await audit(tx, current.user.id, current.user.id, "CREDENTIAL_SETUP");
    return newSession(tx, current.user.id, "full");
  });
}
export async function createChallenge(
  purpose: ChallengePurpose,
  addressInput: unknown,
  chainId: number,
  browserToken: string,
  auth?: AuthContext,
) {
  assert(
    ["REGISTER", "LOGIN", "LINK", "REAUTH", "RECOVERY"].includes(purpose),
    400,
    "Mục đích chữ ký không hợp lệ.",
  );
  assert(
    typeof addressInput === "string" && isAddress(addressInput),
    400,
    "Địa chỉ ví không hợp lệ.",
  );
  assert(
    allowedChains().includes(chainId),
    400,
    "Hãy chuyển ví sang Fuji hoặc Family L1.",
  );
  const address = getAddress(addressInput);
  if (purpose === "LINK" || purpose === "REAUTH" || purpose === "RECOVERY") {
    assert(auth, 401, "Vui lòng đăng nhập.");
    if (purpose === "LINK")
      assert(
        auth.credential && !auth.credential.mustChangePassword && !auth.wallet,
        409,
        "Hãy đổi mật khẩu trước, hoặc tài khoản đã có ví liên kết.",
      );
    if (purpose === "REAUTH")
      assert(
        auth.wallet?.address === address.toLowerCase(),
        403,
        "Hãy dùng ví đã liên kết.",
      );
    if (purpose === "RECOVERY") {
      requireFull(auth!);
      assert(auth!.wallet && auth!.wallet.address !== address.toLowerCase(), 409, "Cần ví thay thế khác ví hiện tại.");
    }
  }
  const nonce = randomToken().replace(/[-_]/g, "");
  const expiresAt = later(300);
  const message = siweMessage(
    address,
    nonce,
    chainId,
    purpose,
    now(),
    expiresAt,
  );
  const [challenge] = await db
    .insert(authChallenges)
    .values({
      nonce,
      purpose,
      address: address.toLowerCase(),
      message,
      browserHash: digest(browserToken),
      userId: auth?.user.id,
      sessionId: auth?.session.id,
      expiresAt,
    })
    .returning();
  return { challengeId: challenge.id, message, expiresAt };
}
export async function checkChallenge(
  challengeId: string,
  signature: unknown,
  browserToken: string,
  purpose: ChallengePurpose,
  auth?: AuthContext,
) {
  const [challenge] = await db
    .select()
    .from(authChallenges)
    .where(eq(authChallenges.id, challengeId));
  assert(
    challenge &&
      challenge.purpose === purpose &&
      challenge.browserHash === digest(browserToken) &&
      !challenge.consumedAt &&
      challenge.expiresAt > now() &&
      (challenge.userId || null) === (auth?.user.id || null) &&
      (challenge.sessionId || null) === (auth?.session.id || null),
    401,
    "Yêu cầu ký không hợp lệ hoặc đã hết hạn.",
  );
  assert(
    typeof signature === "string" && /^0x[0-9a-f]{130}$/i.test(signature),
    401,
    "Chữ ký không hợp lệ.",
  );
  let valid = false;
  try {
    valid = await verifyMessage({
      address: challenge.address as `0x${string}`,
      message: challenge.message,
      signature: signature as `0x${string}`,
    });
  } catch {
    /* invalid signatures fail closed */
  }
  assert(valid, 401, "Chữ ký không khớp với ví đã chọn.");
  return { ...challenge, signatureHash: digest(signature) };
}
export async function consumeChallenge(
  tx: Transaction,
  challenge: typeof authChallenges.$inferSelect,
) {
  const [consumed] = await tx
    .update(authChallenges)
    .set({ userId: challenge.userId, consumedAt: now(), signatureHash: challenge.signatureHash, signatureVerifiedAt: now() })
    .where(
      and(
        eq(authChallenges.id, challenge.id),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, now()),
      ),
    )
    .returning();
  assert(consumed, 409, "Yêu cầu ký đã được sử dụng hoặc hết hạn.");
}
export async function linkWallet(
  auth: AuthContext,
  challengeId: string,
  signature: unknown,
  browserToken: string,
) {
  const challenge = await checkChallenge(
    challengeId,
    signature,
    browserToken,
    "LINK",
    auth,
  );
  return db.transaction(async (tx) => {
    const current = await liveAuth(tx, auth);
    assert(
      current.credential &&
        !current.credential.mustChangePassword &&
        !current.wallet,
      409,
      "Tài khoản chưa sẵn sàng hoặc đã liên kết ví.",
    );
    assert(
      !current.user.walletAddress ||
        current.user.walletAddress.toLowerCase() === challenge.address,
      409,
      "Tài khoản có địa chỉ ví cũ cần được xác minh hoặc recovery. Không thể thay địa chỉ bằng bước liên kết lần đầu.",
      "LEGACY_WALLET_REVIEW_REQUIRED",
    );
    // Reserve legacy addresses too: a migration must never silently reassign an old funded wallet.
    const [legacyOwner] = await tx
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.walletAddress}) = ${challenge.address}`);
    assert(
      !legacyOwner || legacyOwner.id === current.user.id,
      409,
      "Ví này đang thuộc một tài khoản khác.",
    );
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`wallet-address:${challenge.address}`}))`);
    const [retired] = await tx.select().from(walletHistory).where(eq(walletHistory.address, challenge.address));
    const [reserved] = await tx.select().from(walletRecoveries).where(and(eq(walletRecoveries.newWallet, challenge.address), isNull(walletRecoveries.completedAt)));
    assert(!retired && !reserved, 409, "Ví đã bị thu hồi hoặc đang dành cho recovery.");
    await consumeChallenge(tx, challenge);
    await tx
      .insert(userWallets)
      .values({ userId: current.user.id, address: challenge.address });
    await tx
      .update(users)
      .set({
        walletAddress: challenge.address,
        authMethod: "CORE_WALLET",
        pinCode: null,
      })
      .where(eq(users.id, current.user.id));
    const memberRows = await tx
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.userId, current.user.id),
          isNull(workspaceMembers.accessDisabledAt),
        ),
      );
    for (const member of memberRows) {
      await tx
        .insert(provisioningRequests)
        .values({
          userId: current.user.id,
          workspaceId: member.workspaceId,
          ...provisioningIdentity(),
        })
        .onConflictDoNothing();
      const links = await tx
        .select()
        .from(guardianMemberLinks)
        .where(
          and(
            eq(guardianMemberLinks.memberId, current.user.id),
            eq(guardianMemberLinks.workspaceId, member.workspaceId),
            eq(guardianMemberLinks.active, true),
          ),
        );
      for (const link of links)
        await tx.insert(notifications).values({
          familyId: member.workspaceId,
          userId: link.guardianId,
          title: "Thành viên đã liên kết Core",
          message: `${current.user.fullName} đã kích hoạt ví cá nhân. Quyền giao dịch cần được xác nhận riêng trên blockchain.`,
          type: "ACCOUNT_ACTIVATED",
        });
    }
    await tx
      .update(sessions)
      .set({ revokedAt: now() })
      .where(
        and(eq(sessions.userId, current.user.id), isNull(sessions.revokedAt)),
      );
    await accountAudit(tx, current.user.id, "WALLET_LINKED");
    return newSession(tx, current.user.id, "full");
  });
}
export async function walletLogin(
  challengeId: string,
  signature: unknown,
  browserToken: string,
) {
  const challenge = await checkChallenge(
    challengeId,
    signature,
    browserToken,
    "LOGIN",
  );
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(users)
      .where(
        and(
          sql`lower(${users.walletAddress}) = ${challenge.address}`,
          eq(users.authMethod, "CORE_WALLET"),
          isNull(users.suspendedAt),
        ),
      )
      .for("update");
    assert(user, 401, "Không thể đăng nhập bằng ví này.");
    const memberships = await tx
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.userId, user.id),
          isNull(workspaceMembers.accessDisabledAt),
        ),
      );
    assert(
      memberships.some((m) => m.role === "ADMIN" || m.role === "GUARDIAN"),
      403,
      "Thành viên đăng nhập bằng tên đăng nhập và mật khẩu.",
    );
    await consumeChallenge(tx, { ...challenge, userId: user.id });
    const [wallet] = await tx
      .select()
      .from(userWallets)
      .where(eq(userWallets.userId, user.id));
    assert(
      !wallet || wallet.address === challenge.address,
      409,
      "Ví không khớp tài khoản.",
    );
    if (!wallet)
      await tx
        .insert(userWallets)
        .values({ userId: user.id, address: challenge.address });
    const [credential] = await tx
      .select()
      .from(userCredentials)
      .where(eq(userCredentials.userId, user.id));
    const result = await newSession(
      tx,
      user.id,
      credential && !credential.mustChangePassword ? "full" : "onboarding",
    );
    await tx
      .update(sessions)
      .set({ reauthenticatedAt: now() })
      .where(eq(sessions.id, result.session.id));
    await audit(tx, user.id, user.id, "GUARDIAN_WALLET_LOGIN");
    return result;
  });
}
export async function reauthenticate(
  auth: AuthContext,
  challengeId: string,
  signature: unknown,
  browserToken: string,
) {
  const challenge = await checkChallenge(
    challengeId,
    signature,
    browserToken,
    "REAUTH",
    auth,
  );
  return db.transaction(async (tx) => {
    const current = await liveAuth(tx, auth);
    assert(
      current.wallet?.address === challenge.address,
      403,
      "Ví không khớp.",
    );
    await consumeChallenge(tx, challenge);
    await tx
      .update(sessions)
      .set({ reauthenticatedAt: now() })
      .where(eq(sessions.id, current.session.id));
    await audit(tx, current.user.id, current.user.id, "REAUTHENTICATED");
  });
}
function requireRecent(auth: AuthContext) {
  assert(
    auth.session.reauthenticatedAt &&
      auth.session.reauthenticatedAt > new Date(Date.now() - 300000),
    403,
    "Hãy xác thực lại bằng Core trước thao tác này.",
    "REAUTH_REQUIRED",
  );
}
export async function previewGuardianInvitation(token: unknown) {
  assert(typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token), 400, "Mã mời không hợp lệ.", "INVITATION_INVALID");
  const [row] = await db.select({ workspaceName: workspaces.name, expectedWallet: workspaceInvitations.expectedWallet, expiresAt: workspaceInvitations.expiresAt })
    .from(workspaceInvitations).innerJoin(workspaces, eq(workspaces.id, workspaceInvitations.workspaceId))
    .where(and(eq(workspaceInvitations.tokenHash, digest(token)), isNull(workspaceInvitations.acceptedAt), isNull(workspaceInvitations.revokedAt), gt(workspaceInvitations.expiresAt, now())));
  assert(row, 404, "Lời mời đã hết hạn, được sử dụng hoặc không còn hợp lệ.", "INVITATION_UNAVAILABLE");
  return row;
}

export async function registerGuardian(
  input: Record<string, unknown>,
  browserToken: string,
) {
  const username = normalizeUsername(input.username);
  const passwordHash = await hashPassword(input.password as string);
  const fullName = textInput(input.adminName);
  const familyName = input.invitationToken
    ? "Invitation"
    : textInput(input.familyName);
  const challenge = await checkChallenge(
    textInput(input.challengeId),
    input.signature,
    browserToken,
    "REGISTER",
  );
  return db.transaction(async (tx) => {
    await consumeChallenge(tx, challenge);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`wallet-address:${challenge.address}`}))`);
    const [retired] = await tx.select().from(walletHistory).where(eq(walletHistory.address, challenge.address));
    const [reserved] = await tx.select().from(walletRecoveries).where(and(eq(walletRecoveries.newWallet, challenge.address), isNull(walletRecoveries.completedAt)));
    assert(!retired && !reserved, 409, "Ví đã bị thu hồi hoặc đang dành cho recovery.");
    const [owner] = await tx
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.walletAddress}) = ${challenge.address}`);
    assert(!owner, 409, "Ví đã có tài khoản. Vui lòng đăng nhập.");
    const invitation = input.invitationToken
      ? await usableInvitation(tx, input.invitationToken, challenge.address)
      : null;
    let workspace;
    if (invitation) {
      [workspace] = await tx
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, invitation.workspaceId));
      assert(workspace, 404, "Không tìm thấy không gian được mời.");
    } else {
      const code = `KNTX-${randomToken().slice(0, 10).toUpperCase()}`;
      [workspace] = await tx
        .insert(workspaces)
        .values({
          name: familyName,
          workspaceCode: code,
          familyCode: code,
          creatorWallet: challenge.address,
          adminWallet: challenge.address,
          l1HubAddress: deploymentManifest().enabled
            ? deploymentManifest().contracts.hub!.address.toLowerCase()
            : null,
          cchainVaultAddress: null,
        })
        .returning();
    }
    const role = invitation ? "GUARDIAN" : "ADMIN";
    const [user] = await tx
      .insert(users)
      .values({
        fullName,
        familyId: workspace.id,
        role,
        defaultRole: role,
        walletAddress: challenge.address,
        authMethod: "CORE_WALLET",
        phoneNumber: input.phoneNumber
          ? textInput(input.phoneNumber, 30)
          : null,
      })
      .returning();
    await tx.update(authChallenges).set({ userId: user.id }).where(eq(authChallenges.id, challenge.id));
    await tx.insert(userCredentials).values({
      userId: user.id,
      username,
      passwordHash,
      mustChangePassword: false,
    });
    await tx
      .insert(userWallets)
      .values({ userId: user.id, address: challenge.address });
    await tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role,
      canManageMembers: !invitation,
    });
    await tx.insert(provisioningRequests).values({
      userId: user.id,
      workspaceId: workspace.id,
      ...provisioningIdentity(),
    });
    if (invitation)
      await tx
        .update(workspaceInvitations)
        .set({ acceptedBy: user.id, acceptedAt: now() })
        .where(eq(workspaceInvitations.id, invitation.id));
    await audit(tx, user.id, user.id, "GUARDIAN_REGISTERED", workspace.id);
    return newSession(tx, user.id, "full");
  });
}
export async function createManagedMember(
  auth: AuthContext,
  workspaceId: string,
  input: Record<string, unknown>,
  idempotencyKey: string,
) {
  assert(
    typeof idempotencyKey === "string" &&
      /^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey),
    400,
    "Cần Idempotency-Key hợp lệ.",
  );
  assert(
    input.role === "ELDERLY" || input.role === "CHILD",
    400,
    "Chỉ tạo tài khoản người cao tuổi hoặc trẻ nhỏ.",
  );
  const username = normalizeUsername(input.username);
  const fullName = textInput(input.fullName);
  const temporaryPassword =
    input.temporaryPassword === undefined || input.temporaryPassword === ""
      ? randomToken().slice(0, 20)
      : (input.temporaryPassword as string);
  const passwordHash = await hashPassword(temporaryPassword);
  const key = digest(`${auth.user.id}:${workspaceId}:create:${idempotencyKey}`);
  const expiresAt = later(48 * 3600);
  return db.transaction(async (tx) => {
    const current = await liveAuth(tx, auth);
    await membership(tx, current, workspaceId, true);
    const [existing] = await tx
      .select()
      .from(authOperations)
      .where(eq(authOperations.key, key));
    if (existing)
      return { success: true, memberId: existing.memberId, replayed: true };
    const [user] = await tx
      .insert(users)
      .values({
        fullName,
        familyId: workspaceId,
        role: input.role as "ELDERLY" | "CHILD",
        defaultRole: input.role as "ELDERLY" | "CHILD",
        phoneNumber: input.phoneNumber
          ? textInput(input.phoneNumber, 30)
          : null,
      })
      .returning();
    await tx.insert(userCredentials).values({
      userId: user.id,
      username,
      passwordHash,
      temporaryExpiresAt: expiresAt,
    });
    await tx.insert(workspaceMembers).values({
      workspaceId,
      userId: user.id,
      role: input.role as "ELDERLY" | "CHILD",
    });
    await tx.insert(guardianMemberLinks).values({
      workspaceId,
      guardianId: current.user.id,
      memberId: user.id,
      createdBy: current.user.id,
    });
    await tx.insert(authOperations).values({
      key,
      actorId: current.user.id,
      workspaceId,
      memberId: user.id,
    });
    await audit(
      tx,
      current.user.id,
      user.id,
      "MANAGED_MEMBER_CREATED",
      workspaceId,
    );
    return {
      success: true,
      memberId: user.id,
      credential: { username, temporaryPassword, expiresAt },
      replayed: false,
    };
  });
}
export async function listManagedMembers(
  auth: AuthContext,
  workspaceId: string,
) {
  const actor = await membership(db, auth, workspaceId, true);
  const members = await db
    .select({
      user: users,
      member: workspaceMembers,
      credential: userCredentials,
      wallet: userWallets,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .leftJoin(userCredentials, eq(userCredentials.userId, users.id))
    .leftJoin(userWallets, eq(userWallets.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));
  const links = await db
    .select()
    .from(guardianMemberLinks)
    .where(
      and(
        eq(guardianMemberLinks.workspaceId, workspaceId),
        eq(guardianMemberLinks.active, true),
      ),
    );
  const visible = members.filter(
    (row) =>
      ["ELDERLY", "CHILD"].includes(row.member.role) &&
      (actor.role === "ADMIN" ||
        links.some(
          (link) =>
            link.guardianId === auth.user.id && link.memberId === row.user.id,
        )),
  );
  const provisioning = await db
    .select()
    .from(provisioningRequests)
    .where(eq(provisioningRequests.workspaceId, workspaceId));
  return {
    success: true,
    members: visible.map(({ user, member, credential, wallet }) => ({
      id: user.id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      role: member.role,
      username: credential?.username,
      accessDisabled: !!member.accessDisabledAt,
      onboarding: !credential
        ? "CREDENTIAL_REQUIRED"
        : credential.mustChangePassword
          ? "CHANGE_PASSWORD"
          : !wallet
            ? "LINK_WALLET"
            : "READY",
      temporaryExpiresAt: credential?.temporaryExpiresAt,
      linkedWallet: wallet?.address || null,
      legacyWallet: !wallet ? user.walletAddress : null,
      guardians: links
        .filter((link) => link.memberId === user.id)
        .map((link) => link.guardianId),
      onchainPermissions: provisioning
        .filter((request) => request.userId === user.id)
        .map(({ id, chainId, status, txHash }) => ({
          id,
          chainId,
          status,
          txHash,
        })),
    })),
  };
}
export async function updateManagedMember(
  auth: AuthContext,
  workspaceId: string,
  memberId: string,
  action: string,
  input: Record<string, unknown>,
) {
  // Reset credential is global. Only the assigned manager may reset, even if another workspace has an Admin.
  const temporaryPassword = ["reset-password", "enroll"].includes(action)
    ? randomToken().slice(0, 20)
    : undefined;
  const passwordHash = temporaryPassword
    ? await hashPassword(temporaryPassword)
    : undefined;
  return db.transaction(async (tx) => {
    await tx
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, [auth.user.id, memberId]))
      .orderBy(users.id)
      .for("update");
    const current = await liveAuth(tx, auth);
    await managedAccess(tx, current, workspaceId, memberId);
    if (action === "profile") {
      await tx
        .update(users)
        .set({
          fullName: textInput(input.fullName),
          phoneNumber: input.phoneNumber
            ? textInput(input.phoneNumber, 30)
            : null,
        })
        .where(eq(users.id, memberId));
    } else if (action === "access") {
      assert(
        typeof input.disabled === "boolean",
        400,
        "Trạng thái truy cập không hợp lệ.",
      );
      await tx
        .update(workspaceMembers)
        .set({ accessDisabledAt: input.disabled ? now() : null })
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, memberId),
          ),
        );
    } else if (action === "reset-password" || action === "enroll") {
      requireRecent(current);
      const [link] = await tx
        .select()
        .from(guardianMemberLinks)
        .where(
          and(
            eq(guardianMemberLinks.workspaceId, workspaceId),
            eq(guardianMemberLinks.guardianId, current.user.id),
            eq(guardianMemberLinks.memberId, memberId),
            eq(guardianMemberLinks.active, true),
          ),
        );
      assert(link, 403, "Bạn phải được phân công quản lý để cấp lại mật khẩu.");
      await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, memberId))
        .for("update");
      const [credential] = await tx
        .select()
        .from(userCredentials)
        .where(eq(userCredentials.userId, memberId));
      assert(
        action === "enroll" ? !credential : !!credential,
        409,
        action === "enroll"
          ? "Tài khoản đã có credential."
          : "Tài khoản cũ cần được chuyển đổi credential trước.",
      );
      const username =
        action === "enroll"
          ? normalizeUsername(input.username)
          : credential!.username;
      const expiresAt = later(48 * 3600);
      if (action === "enroll")
        await tx.insert(userCredentials).values({
          userId: memberId,
          username,
          passwordHash: passwordHash!,
          mustChangePassword: true,
          temporaryExpiresAt: expiresAt,
        });
      else
        await tx
          .update(userCredentials)
          .set({
            passwordHash,
            mustChangePassword: true,
            temporaryExpiresAt: expiresAt,
            changedAt: now(),
          })
          .where(eq(userCredentials.userId, memberId));
      await tx
        .update(sessions)
        .set({ revokedAt: now() })
        .where(and(eq(sessions.userId, memberId), isNull(sessions.revokedAt)));
      await tx.insert(notifications).values({
        familyId: workspaceId,
        userId: memberId,
        title: "Mật khẩu đã được cấp lại",
        message:
          "Người bảo hộ đã cấp mật khẩu tạm. Hãy đổi mật khẩu sau khi đăng nhập. Ví đã liên kết được giữ nguyên.",
        type: "CREDENTIAL_RESET",
      });
      await audit(
        tx,
        current.user.id,
        memberId,
        action === "enroll" ? "LEGACY_CREDENTIAL_ENROLLED" : "PASSWORD_RESET",
        workspaceId,
      );
      return {
        success: true,
        credential: { username, temporaryPassword, expiresAt },
      };
    } else if (action === "manager") {
      requireRecent(current);
      const actor = await membership(tx, current, workspaceId, true);
      assert(
        actor.role === "ADMIN",
        403,
        "Chỉ Admin được chuyển người quản lý.",
      );
      const guardianId = textInput(input.guardianId);
      const [receiver] = await tx
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, guardianId),
            isNull(workspaceMembers.accessDisabledAt),
          ),
        );
      assert(
        receiver &&
          (receiver.role === "ADMIN" ||
            (receiver.role === "GUARDIAN" && receiver.canManageMembers)),
        403,
        "Người nhận chưa có quyền quản lý.",
      );
      await tx
        .update(guardianMemberLinks)
        .set({ active: false })
        .where(
          and(
            eq(guardianMemberLinks.workspaceId, workspaceId),
            eq(guardianMemberLinks.memberId, memberId),
          ),
        );
      await tx
        .insert(guardianMemberLinks)
        .values({
          workspaceId,
          memberId,
          guardianId,
          createdBy: current.user.id,
          active: true,
        })
        .onConflictDoUpdate({
          target: [
            guardianMemberLinks.workspaceId,
            guardianMemberLinks.guardianId,
            guardianMemberLinks.memberId,
          ],
          set: { active: true, createdBy: current.user.id },
        });
    } else assert(false, 404, "Không tìm thấy thao tác.");
    await audit(
      tx,
      current.user.id,
      memberId,
      `MEMBER_${action.toUpperCase()}`,
      workspaceId,
    );
    return { success: true };
  });
}
export async function listSessions(auth: AuthContext) {
  requireFull(auth);
  return db
    .select({
      id: sessions.id,
      kind: sessions.kind,
      createdAt: sessions.createdAt,
      lastSeenAt: sessions.lastSeenAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, auth.user.id),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now()),
      ),
    )
    .orderBy(desc(sessions.createdAt));
}
export async function revokeSession(auth: AuthContext, id: string) {
  return db.transaction(async (tx) => {
    const current = await liveAuth(tx, auth);
    requireFull(current);
    const [revoked] = await tx
      .update(sessions)
      .set({ revokedAt: now() })
      .where(and(eq(sessions.id, id), eq(sessions.userId, current.user.id)))
      .returning({ id: sessions.id });
    assert(revoked, 404, "Không tìm thấy phiên.");
    await audit(tx, current.user.id, current.user.id, "SESSION_REVOKED");
  });
}
export async function activity(
  auth: AuthContext,
  workspaceId: string,
  memberId: string,
) {
  await managedAccess(db, auth, workspaceId, memberId);
  return db
    .select({
      id: auditLogs.id,
      actorId: auditLogs.actorId,
      action: auditLogs.action,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.workspaceId, workspaceId),
        eq(auditLogs.subjectId, memberId),
      ),
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(100);
}

async function usableInvitation(
  tx: Transaction,
  rawToken: unknown,
  address: string,
) {
  assert(
    typeof rawToken === "string" && /^[A-Za-z0-9_-]{43}$/.test(rawToken),
    400,
    "Lời mời không hợp lệ.",
  );
  const [invite] = await tx
    .select()
    .from(workspaceInvitations)
    .where(
      and(
        eq(workspaceInvitations.tokenHash, digest(rawToken)),
        isNull(workspaceInvitations.revokedAt),
        isNull(workspaceInvitations.acceptedAt),
        gt(workspaceInvitations.expiresAt, now()),
      ),
    )
    .for("update");
  assert(
    invite && invite.expectedWallet === address.toLowerCase(),
    403,
    "Lời mời không hợp lệ, hết hạn hoặc không dành cho ví này.",
  );
  const [issuer] = await tx
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, invite.workspaceId),
        eq(workspaceMembers.userId, invite.createdBy),
        eq(workspaceMembers.role, "ADMIN"),
        isNull(workspaceMembers.accessDisabledAt),
      ),
    );
  assert(issuer, 403, "Người mời không còn quyền quản trị.");
  return invite;
}
export async function createInvitation(
  auth: AuthContext,
  workspaceId: string,
  addressInput: unknown,
) {
  assert(
    typeof addressInput === "string" && isAddress(addressInput),
    400,
    "Cần địa chỉ Core của người được mời.",
  );
  const token = randomToken();
  return db.transaction(async (tx) => {
    const current = await liveAuth(tx, auth);
    const actor = await membership(tx, current, workspaceId, true);
    assert(actor.role === "ADMIN", 403, "Chỉ Admin được mời người bảo hộ.");
    requireRecent(current);
    const expiresAt = later(48 * 3600);
    const [invitation] = await tx
      .insert(workspaceInvitations)
      .values({
        tokenHash: digest(token),
        expectedWallet: addressInput.toLowerCase(),
        workspaceId,
        createdBy: current.user.id,
        expiresAt,
      })
      .returning();
    await audit(tx, current.user.id, null, "GUARDIAN_INVITED", workspaceId);
    return {
      success: true,
      invitation: {
        id: invitation.id,
        token,
        expectedWallet: invitation.expectedWallet,
        expiresAt,
      },
    };
  });
}
export async function acceptInvitation(auth: AuthContext, token: unknown) {
  return db.transaction(async (tx) => {
    const current = await liveAuth(tx, auth);
    requireFull(current);
    requireRecent(current);
    const invite = await usableInvitation(tx, token, current.wallet!.address);
    const [existing] = await tx
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, invite.workspaceId),
          eq(workspaceMembers.userId, current.user.id),
        ),
      );
    assert(
      !existing,
      409,
      "Tài khoản đã có membership ở không gian này. Lời mời không mở khóa hoặc ghi đè quyền cũ.",
    );
    await tx.insert(workspaceMembers).values({
      workspaceId: invite.workspaceId,
      userId: current.user.id,
      role: "GUARDIAN",
      canManageMembers: false,
    });
    await tx
      .insert(provisioningRequests)
      .values({
        userId: current.user.id,
        workspaceId: invite.workspaceId,
        ...provisioningIdentity(),
      })
      .onConflictDoNothing();
    await tx
      .update(workspaceInvitations)
      .set({ acceptedBy: current.user.id, acceptedAt: now() })
      .where(eq(workspaceInvitations.id, invite.id));
    await audit(
      tx,
      current.user.id,
      current.user.id,
      "GUARDIAN_INVITATION_ACCEPTED",
      invite.workspaceId,
    );
    return { success: true, workspaceId: invite.workspaceId };
  });
}
export async function setManagementPermission(
  auth: AuthContext,
  workspaceId: string,
  guardianId: string,
  enabled: unknown,
) {
  assert(typeof enabled === "boolean", 400, "Quyền quản lý không hợp lệ.");
  return db.transaction(async (tx) => {
    await tx
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, [auth.user.id, guardianId]))
      .orderBy(users.id)
      .for("update");
    const current = await liveAuth(tx, auth);
    requireRecent(current);
    const actor = await membership(tx, current, workspaceId, true);
    assert(actor.role === "ADMIN", 403, "Chỉ Admin được phân quyền quản lý.");
    const [updated] = await tx
      .update(workspaceMembers)
      .set({ canManageMembers: enabled })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, guardianId),
          eq(workspaceMembers.role, "GUARDIAN"),
          isNull(workspaceMembers.accessDisabledAt),
        ),
      )
      .returning();
    assert(updated, 404, "Không tìm thấy Guardian hoạt động trong không gian.");
    await audit(
      tx,
      current.user.id,
      guardianId,
      enabled ? "MANAGEMENT_GRANTED" : "MANAGEMENT_REVOKED",
      workspaceId,
    );
    return { success: true };
  });
}
