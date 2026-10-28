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
} from "drizzle-orm/pg-core";
import { relations, InferSelectModel, InferInsertModel } from "drizzle-orm";

// =================================================================
// 1. ENUMS
// =================================================================

/// @notice Vai trò của thành viên trong workspace / gia đình
export const userRoleEnum = pgEnum("user_role", [
  "ADMIN",      // Bố/Mẹ - Quản trị Workspace/Gia đình
  "GUARDIAN",   // Các con trưởng thành - Bảo hộ và ký duyệt đa chữ ký
  "ELDERLY",    // Ông/Bà - Người cao tuổi thụ hưởng, cần bảo vệ
  "CHILD",      // Con nhỏ - Học tài chính, làm việc nhà nhận thưởng
]);

/// @notice Phương thức đăng nhập và quản lý khóa bí mật
export const authTypeEnum = pgEnum("auth_type", [
  "CORE_WALLET",       // Ví Avalanche Core Wallet chính thức
  "PASSKEY_EMBEDDED",  // Đăng nhập không hạt giống qua Passkey (dành cho người già/trẻ em)
]);

/// @notice Phân loại Không gian (Workspace Types)
export const workspaceTypeEnum = pgEnum("workspace_type", [
  "FAMILY",     // Đại Gia Đình
  "SIBLINGS",   // Nhóm Anh Chị Em Ruột
  "FRIENDS",    // Hội Bạn Thân
  "COMMUNITY",  // CLB / Cộng Đồng Sinh Viên
]);

/// @notice 4 Bộ Quy Tắc Hũ Tiền Động (Rule Templates)
export const ruleTemplateEnum = pgEnum("rule_template", [
  "SHIELD",       // Bảo vệ & Trợ cấp (Rút nhỏ <= limit giải ngân tức thì, rút lớn cần M/N approvals)
  "MILESTONE",    // Nhiệm vụ & Cột mốc (Chore-to-Earn, gốc gửi C-Chain sinh lời, mở thưởng khi duyệt)
  "ROSCA",        // Góp vốn xoay vòng (Định kỳ góp vốn, sinh lời C-Chain, xoay vòng giải ngân)
  "SHARED_GOAL",  // Mục tiêu chung (Góp tiền du lịch/mua sắm chung, sinh lãi đến khi đạt target)
]);

/// @notice Trạng thái của phiếu yêu cầu rút tiền lớn
export const requestStatusEnum = pgEnum("request_status", [
  "PENDING",   // Đang chờ Guardians ký duyệt on-chain
  "APPROVED",  // Đã đủ 2/3 chữ ký, sẵn sàng giải ngân
  "REJECTED",  // Bị từ chối do nghi vấn lừa đảo
  "EXECUTED",  // Đã giải ngân thành công trên blockchain
]);

/// @notice Trạng thái của nhiệm vụ việc nhà (Chore-to-Earn)
export const choreStatusEnum = pgEnum("chore_status", [
  "TODO",       // Đã giao nhiệm vụ
  "SUBMITTED",  // Con đã nộp báo cáo kèm ảnh minh chứng
  "VERIFIED",   // Bố mẹ đã duyệt hoàn thành
  "REWARDED",   // Đã chuyển tiền thưởng từ hũ MILESTONE về ví con
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * @notice Bảng Người dùng hệ thống (Users)
 */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  username: varchar("username", { length: 50 }),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().unique(),
  authMethod: authTypeEnum("auth_method").default("CORE_WALLET").notNull(),
  pinCode: varchar("pin_code", { length: 128 }),
  avatarUrl: text("avatar_url"),
  phoneNumber: text("phone_number"),
  isAllowlisted: boolean("is_allowlisted").default(false).notNull(),
  defaultRole: userRoleEnum("default_role").default("GUARDIAN").notNull(),
  // Trường tương thích ngược cho các truy vấn 1-1 cũ
  familyId: uuid("family_id").references(() => workspaces.id, { onDelete: "set null" }),
  role: userRoleEnum("role").default("GUARDIAN").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * @notice Bảng Thành viên trong Không gian (Workspace Members)
 */
export const workspaceMembers = pgTable("workspace_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  role: userRoleEnum("role").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * @notice Bảng Hũ tiền Động (Dynamic Vaults)
 */
export const vaults = pgTable("vaults", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  onchainVaultId: integer("onchain_vault_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  ruleTemplate: ruleTemplateEnum("rule_template").notNull(),
  bufferRatioBps: integer("buffer_ratio_bps").default(1000).notNull(), // 1000 = 10%
  fastWithdrawLimit: decimal("fast_withdraw_limit", { precision: 18, scale: 6 }).default("50").notNull(),
  requiredApprovals: integer("required_approvals").default(2).notNull(),
  cachedTotalBalance: decimal("cached_total_balance", { precision: 18, scale: 6 }).default("0").notNull(),
  cachedL1Buffer: decimal("cached_l1_buffer", { precision: 18, scale: 6 }).default("0").notNull(),
  cachedCChainYield: decimal("cached_cchain_yield", { precision: 18, scale: 6 }).default("0").notNull(),
  // Các trường mở rộng đồng bộ với 4 Bộ Quy Tắc của Smart Contract:
  targetGoalAmount: decimal("target_goal_amount", { precision: 18, scale: 6 }).default("0").notNull(),
  targetDeadline: timestamp("target_deadline", { withTimezone: true }),
  roscaRoundDuration: integer("rosca_round_duration").default(0).notNull(), // giây
  roscaRoundContribution: decimal("rosca_round_contribution", { precision: 18, scale: 6 }).default("0").notNull(),
  roscaCurrentRound: integer("rosca_current_round").default(0).notNull(),
  roscaLastRoundTimestamp: timestamp("rosca_last_round_timestamp", { withTimezone: true }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * @notice Phân quyền & Thành viên của từng Hũ tiền (Vault Members)
 */
export const vaultMembers = pgTable("vault_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  vaultId: uuid("vault_id")
    .references(() => vaults.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  vaultRole: varchar("vault_role", { length: 20 }).notNull(), // 'GUARDIAN' | 'BENEFICIARY' | 'CREATOR'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * @notice Bảng lưu mã nonce ngẫu nhiên SIWE EIP-4361
 */
export const authNonces = pgTable("auth_nonces", {
  nonce: text("nonce").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

/**
 * @notice Bảng yêu cầu rút tiền lớn (Đa chữ ký phân tầng)
 */
export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  vaultId: uuid("vault_id")
    .references(() => vaults.id, { onDelete: "cascade" }),
  requesterId: uuid("requester_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
  vault: text("vault").default("SHIELD"),
  reason: text("reason").notNull(),
  onchainRequestId: bigint("onchain_request_id", { mode: "number" }),
  approvalsCount: integer("approvals_count").default(0).notNull(),
  requiredApprovals: integer("required_approvals").default(2).notNull(),
  status: requestStatusEnum("status").default("PENDING").notNull(),
  txHash: varchar("tx_hash", { length: 66 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * @notice Bảng nhiệm vụ Chore-to-Earn gắn liền với hũ MILESTONE
 */
export const chores = pgTable("chores", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  vaultId: uuid("vault_id")
    .references(() => vaults.id, { onDelete: "cascade" }),
  childId: uuid("child_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  rewardAmount: decimal("reward_amount", { precision: 18, scale: 6 }).notNull(),
  proofImageUrl: text("proof_image_url"),
  onchainTaskId: bigint("onchain_task_id", { mode: "number" }),
  status: choreStatusEnum("status").default("TODO").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * @notice Bảng thông báo
 */
export const notifications = pgTable("notifications", {
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

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

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
}));

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

export const withdrawalRequestsRelations = relations(withdrawalRequests, ({ one }) => ({
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
}));

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
