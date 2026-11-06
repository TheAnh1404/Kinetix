import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  timestamp,
  decimal,
  integer,
  bigint,
  pgEnum,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations, InferSelectModel, InferInsertModel, sql } from "drizzle-orm";

// =================================================================
// 1. ENUMS
// =================================================================

/// @notice Vai trò của thành viên trong workspace / gia đình
export const userRoleEnum = pgEnum("user_role", [
  "ADMIN", // Bố/Mẹ - Quản trị Workspace/Gia đình
  "GUARDIAN", // Các con trưởng thành - Bảo hộ và ký duyệt đa chữ ký
  "ELDERLY", // Ông/Bà - Người cao tuổi thụ hưởng, cần bảo vệ
  "CHILD", // Con nhỏ - Học tài chính, làm việc nhà nhận thưởng
]);

/// @notice Phương thức đăng nhập và quản lý khóa bí mật
export const authTypeEnum = pgEnum("auth_type", [
  "CORE_WALLET", // Ví Avalanche Core Wallet chính thức
  "PASSKEY_EMBEDDED", // Đăng nhập không hạt giống qua Passkey (dành cho người già/trẻ em)
]);

/// @notice Phân loại Không gian (Workspace Types)
export const workspaceTypeEnum = pgEnum("workspace_type", [
  "FAMILY", // Đại Gia Đình
  "SIBLINGS", // Nhóm Anh Chị Em Ruột
  "FRIENDS", // Hội Bạn Thân
  "COMMUNITY", // CLB / Cộng Đồng Sinh Viên
]);

/// @notice 4 Bộ Quy Tắc Hũ Tiền Động (Rule Templates)
export const ruleTemplateEnum = pgEnum("rule_template", [
  "SHIELD", // Bảo vệ & Trợ cấp (Rút nhỏ <= limit giải ngân tức thì, rút lớn cần M/N approvals)
  "MILESTONE", // Nhiệm vụ & Cột mốc (Chore-to-Earn, gốc gửi C-Chain sinh lời, mở thưởng khi duyệt)
  "ROSCA", // Góp vốn xoay vòng (Định kỳ góp vốn, sinh lời C-Chain, xoay vòng giải ngân)
  "SHARED_GOAL", // Mục tiêu chung (Góp tiền du lịch/mua sắm chung, sinh lãi đến khi đạt target)
]);

/// @notice Trạng thái của phiếu yêu cầu rút tiền lớn
export const requestStatusEnum = pgEnum("request_status", [
  "PENDING", // Đang chờ Guardians ký duyệt on-chain
  "APPROVED", // Đã đủ 2/3 chữ ký, sẵn sàng giải ngân
  "REJECTED", // Bị từ chối do nghi vấn lừa đảo
  "EXECUTED", // Đã giải ngân thành công trên blockchain
]);

/// @notice Trạng thái của nhiệm vụ việc nhà (Chore-to-Earn)
export const choreStatusEnum = pgEnum("chore_status", [
  "TODO", // Đã giao nhiệm vụ
  "SUBMITTED", // Con đã nộp báo cáo kèm ảnh minh chứng
  "VERIFIED", // Bố mẹ đã duyệt hoàn thành
  "REWARDED", // Đã chuyển tiền thưởng từ hũ MILESTONE về ví con
  "CANCELLED", // Hủy nhiệm vụ, đã giải phóng khoản giữ chỗ
]);

// =================================================================
// 2. TABLES
// =================================================================

/**
 * @notice Bảng Không gian chung (Workspaces / Families)
 */
export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceCode: varchar("workspace_code", { length: 16 }).unique(),
  familyCode: varchar("family_code", { length: 16 }),
  name: text("name").notNull(),
  type: workspaceTypeEnum("type").default("FAMILY").notNull(),
  creatorWallet: varchar("creator_wallet", { length: 42 }),
  adminWallet: varchar("admin_wallet", { length: 42 }),
  l1HubAddress: varchar("l1_hub_address", { length: 42 }),
  cchainVaultAddress: varchar("cchain_vault_address", { length: 42 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * @notice Bảng Người dùng hệ thống (Users)
 */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  username: varchar("username", { length: 50 }),
  walletAddress: varchar("wallet_address", { length: 42 }).unique(),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  authMethod: authTypeEnum("auth_method").default("CORE_WALLET").notNull(),
  pinCode: varchar("pin_code", { length: 128 }),
  avatarUrl: text("avatar_url"),
  phoneNumber: text("phone_number"),
  isAllowlisted: boolean("is_allowlisted").default(false).notNull(),
  defaultRole: userRoleEnum("default_role").default("GUARDIAN").notNull(),
  // Trường tương thích ngược cho các truy vấn 1-1 cũ
  familyId: uuid("family_id").references(() => workspaces.id, {
    onDelete: "set null",
  }),
  role: userRoleEnum("role").default("GUARDIAN").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}); // Case-insensitive legacy address uniqueness is enforced by the SQL migration.

/**
 * @notice Bảng Thành viên trong Không gian (Workspace Members)
 */
export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: userRoleEnum("role").notNull(),
    accessDisabledAt: timestamp("access_disabled_at", { withTimezone: true }),
    canManageMembers: boolean("can_manage_members").default(false).notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    membershipUnique: uniqueIndex("workspace_members_unique").on(
      table.workspaceId,
      table.userId,
    ),
  }),
);

/**
 * @notice Bảng Hũ tiền Động (Dynamic Vaults)
 */
export const vaults = pgTable(
  "vaults",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    onchainVaultId: integer("onchain_vault_id").notNull(),
    onchainHub: varchar("onchain_hub", { length: 42 }),
    onchainChainId: integer("onchain_chain_id"),
    onchainCreationTx: varchar("onchain_creation_tx", { length: 66 }),
    onchainCreationLogIndex: integer("onchain_creation_log_index"),
    name: text("name").notNull(),
    description: text("description"),
    ruleTemplate: ruleTemplateEnum("rule_template").notNull(),
    bufferRatioBps: integer("buffer_ratio_bps").default(1000).notNull(), // 1000 = 10%
    fastWithdrawLimit: decimal("fast_withdraw_limit", {
      precision: 38,
      scale: 18,
    })
      .default("50")
      .notNull(),
    requiredApprovals: integer("required_approvals").default(2).notNull(),
    cachedTotalBalance: decimal("cached_total_balance", {
      precision: 38,
      scale: 18,
    })
      .default("0")
      .notNull(),
    cachedL1Buffer: decimal("cached_l1_buffer", { precision: 38, scale: 18 })
      .default("0")
      .notNull(),
    cachedCChainYield: decimal("cached_cchain_yield", {
      precision: 38,
      scale: 18,
    })
      .default("0")
      .notNull(),
    // Các trường mở rộng đồng bộ với 4 Bộ Quy Tắc của Smart Contract:
    targetGoalAmount: decimal("target_goal_amount", {
      precision: 38,
      scale: 18,
    })
      .default("0")
      .notNull(),
    targetDeadline: timestamp("target_deadline", { withTimezone: true }),
    roscaRoundDuration: integer("rosca_round_duration").default(0).notNull(), // giây
    roscaRoundContribution: decimal("rosca_round_contribution", {
      precision: 38,
      scale: 18,
    })
      .default("0")
      .notNull(),
    roscaCurrentRound: integer("rosca_current_round").default(0).notNull(),
    roscaLastRoundTimestamp: timestamp("rosca_last_round_timestamp", {
      withTimezone: true,
    }),
    isActive: boolean("is_active").default(true).notNull(),
    asOfBlock: bigint("as_of_block", { mode: "bigint" }),
    asOfBlockHash: varchar("as_of_block_hash", { length: 66 }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    onchainUnique: uniqueIndex("vault_onchain_unique").on(
      table.onchainChainId,
      table.onchainHub,
      table.onchainVaultId,
    ),
    creationEventUnique: uniqueIndex("vault_creation_event_unique").on(
      table.onchainChainId,
      table.onchainHub,
      table.onchainCreationTx,
      table.onchainCreationLogIndex,
    ),
  }),
);

/**
 * @notice Phân quyền & Thành viên của từng Hũ tiền (Vault Members)
 */
export const vaultMembers = pgTable(
  "vault_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vaultId: uuid("vault_id")
      .references(() => vaults.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    vaultRole: varchar("vault_role", { length: 20 }).notNull(), // 'GUARDIAN' | 'BENEFICIARY' | 'CREATOR'
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    memberUnique: uniqueIndex("vault_members_unique").on(
      table.vaultId,
      table.userId,
    ),
  }),
);

/**
 * @notice Bảng lưu mã nonce ngẫu nhiên SIWE EIP-4361
 */
export const authNonces = pgTable("auth_nonces", {
  nonce: text("nonce").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

/**
 * @notice Bảng yêu cầu rút tiền lớn (Đa chữ ký phân tầng)
 */
export const withdrawalRequests = pgTable(
  "withdrawal_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    vaultId: uuid("vault_id").references(() => vaults.id, {
      onDelete: "cascade",
    }),
    requesterId: uuid("requester_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    amount: decimal("amount", { precision: 38, scale: 18 }).notNull(),
    vault: text("vault").default("SHIELD"),
    reason: text("reason").notNull(),
    onchainRequestId: bigint("onchain_request_id", { mode: "number" }),
    deadline: timestamp("deadline", { withTimezone: true }),
    approvalsCount: integer("approvals_count").default(0).notNull(),
    requiredApprovals: integer("required_approvals").default(2).notNull(),
    status: requestStatusEnum("status").default("PENDING").notNull(),
    txHash: varchar("tx_hash", { length: 66 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    requestUnique: uniqueIndex("withdrawal_onchain_unique").on(
      table.vaultId,
      table.onchainRequestId,
    ),
  }),
);

/**
 * @notice Bảng nhiệm vụ Chore-to-Earn gắn liền với hũ MILESTONE
 */
export const chores = pgTable(
  "chores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    vaultId: uuid("vault_id").references(() => vaults.id, {
      onDelete: "cascade",
    }),
    childId: uuid("child_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    description: text("description"),
    rewardAmount: decimal("reward_amount", {
      precision: 38,
      scale: 18,
    }).notNull(),
    proofImageUrl: text("proof_image_url"),
    onchainTaskId: bigint("onchain_task_id", { mode: "number" }),
    status: choreStatusEnum("status").default("TODO").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    taskUnique: uniqueIndex("chore_onchain_unique").on(
      table.vaultId,
      table.onchainTaskId,
    ),
  }),
);

/**
 * @notice Bảng thông báo
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type").notNull(), // 'ALERT_SCAM' | 'TASK_COMPLETED' | 'YIELD_PAYOUT' | 'APPROVAL_NEEDED'
    isRead: boolean("is_read").default(false).notNull(),
    sourceEvent: text("source_event"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    sourceUnique: uniqueIndex("notification_source_event_unique").on(
      table.sourceEvent,
    ),
  }),
);

// =================================================================
// 3. RELATIONS
// =================================================================

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  vaults: many(vaults),
  withdrawalRequests: many(withdrawalRequests),
  chores: many(chores),
  notifications: many(notifications),
}));

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
    user: one(users, {
      fields: [workspaceMembers.userId],
      references: [users.id],
    }),
  }),
);

export const vaultsRelations = relations(vaults, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [vaults.workspaceId],
    references: [workspaces.id],
  }),
  members: many(vaultMembers),
  withdrawalRequests: many(withdrawalRequests),
  chores: many(chores),
}));

export const vaultMembersRelations = relations(vaultMembers, ({ one }) => ({
  vault: one(vaults, {
    fields: [vaultMembers.vaultId],
    references: [vaults.id],
  }),
  user: one(users, {
    fields: [vaultMembers.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  workspaceMemberships: many(workspaceMembers),
  vaultMemberships: many(vaultMembers),
  withdrawalRequests: many(withdrawalRequests),
  chores: many(chores),
  notifications: many(notifications),
}));

export const withdrawalRequestsRelations = relations(
  withdrawalRequests,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [withdrawalRequests.familyId],
      references: [workspaces.id],
    }),
    vault: one(vaults, {
      fields: [withdrawalRequests.vaultId],
      references: [vaults.id],
    }),
    requester: one(users, {
      fields: [withdrawalRequests.requesterId],
      references: [users.id],
    }),
  }),
);

export const choresRelations = relations(chores, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [chores.familyId],
    references: [workspaces.id],
  }),
  vault: one(vaults, {
    fields: [chores.vaultId],
    references: [vaults.id],
  }),
  child: one(users, {
    fields: [chores.childId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [notifications.familyId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Backward compatibility alias for families
export const families = workspaces;
export const familiesRelations = workspacesRelations;

// =================================================================
// 4. TYPE INFERENCES
// =================================================================

export type Workspace = InferSelectModel<typeof workspaces>;
export type NewWorkspace = InferInsertModel<typeof workspaces>;

export type Family = Workspace;
export type NewFamily = NewWorkspace;

export type WorkspaceMember = InferSelectModel<typeof workspaceMembers>;
export type NewWorkspaceMember = InferInsertModel<typeof workspaceMembers>;

export type Vault = InferSelectModel<typeof vaults>;
export type NewVault = InferInsertModel<typeof vaults>;

export type VaultMember = InferSelectModel<typeof vaultMembers>;
export type NewVaultMember = InferInsertModel<typeof vaultMembers>;

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type WithdrawalRequest = InferSelectModel<typeof withdrawalRequests>;
export type NewWithdrawalRequest = InferInsertModel<typeof withdrawalRequests>;

export type Chore = InferSelectModel<typeof chores>;
export type NewChore = InferInsertModel<typeof chores>;

export type Notification = InferSelectModel<typeof notifications>;
export type NewNotification = InferInsertModel<typeof notifications>;

// Authentication owns credentials and wallet proofs; legacy user columns are never authoritative.
export const userCredentials = pgTable("user_credentials", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  username: varchar("username", { length: 50 }).unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  mustChangePassword: boolean("must_change_password").default(true).notNull(),
  temporaryExpiresAt: timestamp("temporary_expires_at", { withTimezone: true }),
  changedAt: timestamp("changed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const userWallets = pgTable("user_wallets", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  address: varchar("address", { length: 42 }).unique().notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenHash: text("token_hash").unique().notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  kind: text("kind").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  reauthenticatedAt: timestamp("reauthenticated_at", { withTimezone: true }),
});
export const authChallenges = pgTable("auth_challenges", {
  id: uuid("id").defaultRandom().primaryKey(),
  nonce: text("nonce").unique().notNull(),
  sessionId: uuid("session_id").references(() => sessions.id, {
    onDelete: "cascade",
  }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  browserHash: text("browser_hash").notNull(),
  purpose: text("purpose").notNull(),
  address: varchar("address", { length: 42 }).notNull(),
  message: text("message").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  signatureHash: varchar("signature_hash", { length: 64 }),
  signatureVerifiedAt: timestamp("signature_verified_at", { withTimezone: true }),
});
export const guardianMemberLinks = pgTable(
  "guardian_member_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guardianId: uuid("guardian_id")
      .references(() => users.id)
      .notNull(),
    memberId: uuid("member_id")
      .references(() => users.id)
      .notNull(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id)
      .notNull(),
    createdBy: uuid("created_by")
      .references(() => users.id)
      .notNull(),
    active: boolean("active").default(true).notNull(),
  },
  (table) => ({
    linkUnique: uniqueIndex("guardian_member_link_unique").on(
      table.workspaceId,
      table.guardianId,
      table.memberId,
    ),
  }),
);
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(() => users.id),
  subjectId: uuid("subject_id").references(() => users.id),
  workspaceId: uuid("workspace_id").references(() => workspaces.id),
  action: text("action").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const authRateLimits = pgTable("auth_rate_limits", {
  key: text("key").primaryKey(),
  hits: integer("hits").default(1).notNull(),
  resetsAt: timestamp("resets_at", { withTimezone: true }).notNull(),
});
export const authOperations = pgTable("auth_operations", {
  key: text("key").primaryKey(),
  actorId: uuid("actor_id")
    .references(() => users.id)
    .notNull(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  memberId: uuid("member_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const provisioningRequests = pgTable(
  "provisioning_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id)
      .notNull(),
    chainId: integer("chain_id").notNull(),
    status: text("status").default("PENDING").notNull(),
    hub: varchar("hub", { length: 42 }),
    deploymentRef: text("deployment_ref").default("legacy").notNull(),
    txHash: varchar("tx_hash", { length: 66 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    provisioningUnique: uniqueIndex("provisioning_request_unique").on(
      table.userId,
      table.workspaceId,
      table.chainId,
      table.deploymentRef,
    ),
  }),
);
export const workspaceInvitations = pgTable("workspace_invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenHash: text("token_hash").unique().notNull(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  expectedWallet: varchar("expected_wallet", { length: 42 }).notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedBy: uuid("accepted_by").references(() => users.id),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

// Ảnh chỉ được đọc qua API có session; không phát hành đường dẫn public.
export const proofAttachments = pgTable(
  "proof_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    choreId: uuid("chore_id")
      .references(() => chores.id, { onDelete: "cascade" })
      .notNull(),
    ownerId: uuid("owner_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => ({ expiry: index("proof_attachment_expiry").on(table.expiresAt) }),
);

// Một dòng cho mỗi event thực; replay receipt không làm tăng lịch sử/số tiền.
export const memberActivity = pgTable(
  "member_activity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    vaultId: uuid("vault_id")
      .references(() => vaults.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    chainId: integer("chain_id").notNull(),
    txHash: varchar("tx_hash", { length: 66 }).notNull(),
    eventKey: text("event_key").notNull(),
    kind: text("kind").notNull(),
    amount: decimal("amount", { precision: 38, scale: 18 }).notNull(),
    asset: text("asset").default("AVAX").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    eventUnique: uniqueIndex("member_activity_event_unique").on(
      table.chainId,
      table.eventKey,
    ),
    personal: index("member_activity_personal").on(
      table.userId,
      table.workspaceId,
      table.createdAt,
    ),
  }),
);

export const activityCursors = pgTable("activity_cursors", {
  id: text("id").primaryKey(),
  nextBlock: bigint("next_block", { mode: "bigint" }).notNull(),
});

// Nhật ký bền vững: payload từ RPC, không dùng status/amount client làm bằng chứng chi tiền.
export const financialOperations = pgTable("financial_operations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  deploymentRef: text("deployment_ref").notNull(),
  chainId: integer("chain_id").notNull(),
  hub: varchar("hub", { length: 42 }).notNull(),
  txHash: varchar("tx_hash", { length: 66 }).notNull(),
  sender: varchar("sender", { length: 42 }).notNull(),
  nonce: text("nonce").notNull(),
  functionName: text("function_name").notNull(),
  calldata: text("calldata").notNull(),
  amountWei: text("amount_wei").notNull(),
  asset: text("asset").default("AVAX").notNull(),
  recipient: varchar("recipient", { length: 42 }),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  status: text("status").default("BROADCAST").notNull(),
  blockNumber: bigint("block_number", { mode: "bigint" }),
  blockHash: varchar("block_hash", { length: 66 }),
  syncIntent: jsonb("sync_intent").$type<{ path: string; method: string; body: Record<string, unknown> }>(),
  lastErrorCode: text("last_error_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ chainTransaction: uniqueIndex("financial_operation_chain_tx_unique").on(table.chainId, table.hub, table.txHash), personal: index("financial_operation_personal").on(table.userId, table.workspaceId, table.createdAt) }));

export const chainEvents = pgTable("chain_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  chainId: integer("chain_id").notNull(),
  hub: varchar("hub", { length: 42 }).notNull(),
  txHash: varchar("tx_hash", { length: 66 }).notNull(),
  logIndex: integer("log_index").notNull(),
  blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
  blockHash: varchar("block_hash", { length: 66 }).notNull(),
  eventName: text("event_name").notNull(),
  payload: jsonb("payload").notNull(),
  indexedAt: timestamp("indexed_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ eventUnique: uniqueIndex("chain_event_identity_unique").on(table.chainId, table.hub, table.txHash, table.logIndex) }));

export const walletRecoveries = pgTable("wallet_recoveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  oldWallet: varchar("old_wallet", { length: 42 }).notNull(),
  newWallet: varchar("new_wallet", { length: 42 }).notNull().unique(),
  deploymentRef: text("deployment_ref").notNull(),
  proofChallengeId: uuid("proof_challenge_id").references(() => authChallenges.id).notNull().unique(),
  status: text("status").default("PROVEN").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => ({ activeUser: uniqueIndex("recovery_one_active_per_user").on(table.userId).where(sql`${table.completedAt} is null`) }));
export const recoverySteps = pgTable("recovery_steps", {
  id: uuid("id").defaultRandom().primaryKey(),
  recoveryId: uuid("recovery_id").references(() => walletRecoveries.id).notNull(),
  vaultId: uuid("vault_id").references(() => vaults.id).notNull(),
  epoch: text("epoch").notNull(),
  requiredApprovals: integer("required_approvals").notNull(),
  status: text("status").default("PENDING").notNull(),
  txHash: varchar("tx_hash", { length: 66 }),
  appliedEpoch: text("applied_epoch"),
}, (table) => ({ recoveryVault: uniqueIndex("recovery_step_vault_unique").on(table.recoveryId, table.vaultId) }));
export const walletHistory = pgTable("wallet_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  address: varchar("address", { length: 42 }).notNull().unique(),
  recoveryId: uuid("recovery_id").references(() => walletRecoveries.id).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }).defaultNow().notNull(),
});

// =================================================================
// 5. PHÂN HỆ CÀI ĐẶT & QUẢN LÝ (HYBRID WEB2 + WEB3 SETTINGS)
// =================================================================

/**
 * @notice Cài đặt cá nhân & Chế độ hiển thị (Lite Mode vs Pro Mode)
 */
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  uiMode: varchar("ui_mode", { length: 10 }).default("LITE").notNull(), // 'LITE' | 'PRO'
  defaultCurrency: varchar("default_currency", { length: 10 })
    .default("VND")
    .notNull(), // 'VND' | 'USD' | 'AVAX'
  preferredNetwork: varchar("preferred_network", { length: 20 })
    .default("TESTNET")
    .notNull(), // 'MAINNET' | 'TESTNET'
  gasPreference: varchar("gas_preference", { length: 20 })
    .default("SPONSORED")
    .notNull(), // 'SPONSORED' | 'STABLECOIN' | 'NATIVE'
  privacyHideBalance: boolean("privacy_hide_balance").default(false).notNull(),
  notificationConfig: jsonb("notification_config").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * @notice Quản lý Danh sách Ví Lai (Embedded MPC, Core Wallet, MetaMask)
 */
export const linkedWallets = pgTable(
  "linked_wallets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
    walletType: varchar("wallet_type", { length: 30 })
      .default("EXTERNAL_CORE")
      .notNull(), // 'EMBEDDED_MPC' | 'EXTERNAL_CORE' | 'EXTERNAL_METAMASK'
    isPrimaryReceiving: boolean("is_primary_receiving").default(false).notNull(),
    chainId: integer("chain_id").default(43113).notNull(),
    label: text("label"),
    verifiedAt: timestamp("verified_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userPrimaryIdx: index("linked_wallets_user_primary").on(
      table.userId,
      table.isPrimaryReceiving,
    ),
    userAddressUnique: uniqueIndex("linked_wallets_user_address").on(
      table.userId,
      table.walletAddress,
    ),
  }),
);

/**
 * @notice Phân quyền & Hạn mức Chi tiêu Quỹ Chung (Programmable Allowances)
 */
export const memberAllowancePolicies = pgTable(
  "member_allowance_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    memberUserId: uuid("member_user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    walletAddress: varchar("wallet_address", { length: 42 }),
    role: varchar("role", { length: 20 }).default("SPENDER").notNull(), // 'ADMIN' | 'SPENDER' | 'DEPENDENT' | 'AI_AGENT'
    dailyLimitAmount: decimal("daily_limit_amount", {
      precision: 38,
      scale: 18,
    })
      .default("50")
      .notNull(),
    autoApproveThreshold: decimal("auto_approve_threshold", {
      precision: 38,
      scale: 18,
    })
      .default("10")
      .notNull(),
    allowedCategories: jsonb("allowed_categories")
      .default(["FOOD", "EDUCATION", "HEALTHCARE"])
      .notNull(),
    isFrozen: boolean("is_frozen").default(false).notNull(), // Khóa khẩn cấp Emergency Freeze
    onchainSyncStatus: varchar("onchain_sync_status", { length: 30 })
      .default("SYNCED")
      .notNull(), // 'SYNCED' | 'PENDING_SIGNATURE' | 'OUT_OF_SYNC'
    lastTxHash: varchar("last_tx_hash", { length: 66 }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    wsMemberUnique: uniqueIndex("member_allowance_ws_member").on(
      table.workspaceId,
      table.memberUserId,
    ),
  }),
);

/**
 * @notice Quản lý Phiên Ký Tự Động & Session Keys (Cấp cho AI Agent / Lịch định kỳ)
 */
export const sessionKeysAndApprovals = pgTable(
  "session_keys_and_approvals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    sessionKeyAddress: varchar("session_key_address", { length: 42 }).notNull(),
    label: text("label").default("AI Agent Automation Key").notNull(),
    permissionsScope: jsonb("permissions_scope").default({}).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    isRevoked: boolean("is_revoked").default(false).notNull(),
    revokeTxHash: varchar("revoke_tx_hash", { length: 66 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userWsIdx: index("session_keys_user_ws").on(
      table.userId,
      table.workspaceId,
    ),
  }),
);

/**
 * @notice Nhật Ký Hoạt Động Kép (Dual Audit Logs: Web2 DB + On-chain Smart Contract)
 */
export const settingsAuditLogs = pgTable(
  "settings_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    actionType: varchar("action_type", { length: 50 }).notNull(), // 'UPDATE_ALLOWANCE' | 'FREEZE_MEMBER' | 'REVOKE_SESSION' | 'SWITCH_PRIMARY_WALLET' | 'UPDATE_PREFERENCES'
    layer: varchar("layer", { length: 20 }).default("OFF_CHAIN").notNull(), // 'OFF_CHAIN' | 'ON_CHAIN' | 'HYBRID_DUAL'
    metadataDiff: jsonb("metadata_diff").default({}).notNull(),
    txHash: varchar("tx_hash", { length: 66 }),
    status: varchar("status", { length: 30 }).default("COMPLETED").notNull(), // 'COMPLETED' | 'PENDING_CONFIRMATION' | 'FAILED'
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    wsCreatedIdx: index("settings_audit_ws_created").on(
      table.workspaceId,
      table.createdAt,
    ),
    actorCreatedIdx: index("settings_audit_actor_created").on(
      table.actorId,
      table.createdAt,
    ),
  }),
);

// Type inferences cho phân hệ Settings & Management
export type UserPreference = InferSelectModel<typeof userPreferences>;
export type NewUserPreference = InferInsertModel<typeof userPreferences>;

export type LinkedWallet = InferSelectModel<typeof linkedWallets>;
export type NewLinkedWallet = InferInsertModel<typeof linkedWallets>;

export type MemberAllowancePolicy = InferSelectModel<typeof memberAllowancePolicies>;
export type NewMemberAllowancePolicy = InferInsertModel<typeof memberAllowancePolicies>;

export type SessionKeyAndApproval = InferSelectModel<typeof sessionKeysAndApprovals>;
export type NewSessionKeyAndApproval = InferInsertModel<typeof sessionKeysAndApprovals>;

export type SettingsAuditLog = InferSelectModel<typeof settingsAuditLogs>;
export type NewSettingsAuditLog = InferInsertModel<typeof settingsAuditLogs>;

// Presentation progress only: never used as financial authorization.
export const workspaceOnboarding = pgTable("workspace_onboarding", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  membershipId: uuid("membership_id").references(() => workspaceMembers.id, { onDelete: "cascade" }).notNull(),
  flowVersion: integer("flow_version").notNull(),
  status: text("status").notNull(),
  lastStep: text("last_step").notNull(),
  revision: integer("revision").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  deferredAt: timestamp("deferred_at", { withTimezone: true }),
}, (table) => ({ userWorkspaceVersion: uniqueIndex("workspace_onboarding_user_ws_version").on(table.userId, table.workspaceId, table.flowVersion) }));

export const vaultCreationDrafts = pgTable("vault_creation_drafts", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  config: jsonb("config").$type<import("../../../shared/vaultCreation").VaultForm>().notNull(),
  step: integer("step").default(1).notNull(),
  revision: integer("revision").default(0).notNull(),
  preflight: jsonb("preflight").$type<import("../services/vaultCreationService").CreationPreflight>(),
  sendAttemptId: uuid("send_attempt_id"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  txHash: varchar("tx_hash", { length: 66 }),
  vaultId: uuid("vault_id").references(() => vaults.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ actorWorkspace: index("vault_creation_actor_workspace").on(table.userId, table.workspaceId, table.updatedAt), transaction: uniqueIndex("vault_creation_transaction").on(table.txHash) }));
