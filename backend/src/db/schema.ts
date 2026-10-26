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

/// @notice Vai trò của thành viên trong gia đình
export const userRoleEnum = pgEnum("user_role", [
  "ADMIN",      // Bố/Mẹ - Quản trị gia đình
  "GUARDIAN",   // Các con trưởng thành - Bảo hộ và ký duyệt đa chữ ký
  "ELDERLY",    // Ông/Bà - Người cao tuổi thụ hưởng, cần bảo vệ
  "CHILD",      // Con nhỏ - Học tài chính, làm việc nhà nhận thưởng
]);

/// @notice Phương thức đăng nhập và quản lý khóa bí mật
export const authTypeEnum = pgEnum("auth_type", [
  "CORE_WALLET",       // Ví Avalanche Core Wallet chính thức
  "PASSKEY_EMBEDDED",  // Đăng nhập không hạt giống qua Passkey (dành cho người già/trẻ em)
]);

/// @notice 3 Hũ tài chính gia đình đồng bộ với Smart Contract FamilyHub.sol
export const vaultTypeEnum = pgEnum("vault_type", [
  "RetirementShield", // Hũ 1: Báo hiếu & Hưu trí (Ông Bà)
  "KidsSavings",      // Hũ 2: Lì xì & Tiết kiệm con trẻ
  "FamilyROSCA",      // Hũ 3: Quỹ tương trợ họ hàng
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
  "REWARDED",   // Đã chuyển tiền thưởng từ hũ KidsSavings về ví con
]);

// =================================================================
// 2. TABLES
// =================================================================

/**
 * @notice Bảng quản lý tổ hợp gia đình
 */
export const families = pgTable("families", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  adminWallet: varchar("admin_wallet", { length: 42 }).notNull(),
  l1HubAddress: varchar("l1_hub_address", { length: 42 }),
  cchainVaultAddress: varchar("cchain_vault_address", { length: 42 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * @notice Bảng thành viên gia đình
 */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .references(() => families.id, { onDelete: "cascade" })
    .notNull(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").notNull(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().unique(),
  authMethod: authTypeEnum("auth_method").default("CORE_WALLET").notNull(),
  phoneNumber: text("phone_number"),
  isAllowlisted: boolean("is_allowlisted").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * @notice Bảng theo dõi các yêu cầu rút tiền và tiến trình phê duyệt đa chữ ký (Multisig)
 */
export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .references(() => families.id, { onDelete: "cascade" })
    .notNull(),
  requesterId: uuid("requester_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
  vault: vaultTypeEnum("vault").notNull(),
  reason: text("reason").notNull(),
  onchainRequestId: bigint("onchain_request_id", { mode: "number" }),
  approvalsCount: integer("approvals_count").default(0).notNull(),
  requiredApprovals: integer("required_approvals").default(2).notNull(),
  status: requestStatusEnum("status").default("PENDING").notNull(),
  txHash: varchar("tx_hash", { length: 66 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * @notice Bảng nhiệm vụ việc nhà nhận thưởng (Chore-to-Earn)
 */
export const chores = pgTable("chores", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .references(() => families.id, { onDelete: "cascade" })
    .notNull(),
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
 * @notice Bảng hộp thư thông báo cảnh báo tức thời
 */
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .references(() => families.id, { onDelete: "cascade" })
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

export const familiesRelations = relations(families, ({ many }) => ({
  members: many(users),
  withdrawalRequests: many(withdrawalRequests),
  chores: many(chores),
  notifications: many(notifications),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  family: one(families, {
    fields: [users.familyId],
    references: [families.id],
  }),
  withdrawalRequests: many(withdrawalRequests),
  chores: many(chores),
  notifications: many(notifications),
}));

export const withdrawalRequestsRelations = relations(withdrawalRequests, ({ one }) => ({
  family: one(families, {
    fields: [withdrawalRequests.familyId],
    references: [families.id],
  }),
  requester: one(users, {
    fields: [withdrawalRequests.requesterId],
    references: [users.id],
  }),
}));

export const choresRelations = relations(chores, ({ one }) => ({
  family: one(families, {
    fields: [chores.familyId],
    references: [families.id],
  }),
  child: one(users, {
    fields: [chores.childId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  family: one(families, {
    fields: [notifications.familyId],
    references: [families.id],
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// =================================================================
// 4. TYPE INFERENCES
// =================================================================

export type Family = InferSelectModel<typeof families>;
export type NewFamily = InferInsertModel<typeof families>;

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type WithdrawalRequest = InferSelectModel<typeof withdrawalRequests>;
export type NewWithdrawalRequest = InferInsertModel<typeof withdrawalRequests>;

export type Chore = InferSelectModel<typeof chores>;
export type NewChore = InferInsertModel<typeof chores>;

export type Notification = InferSelectModel<typeof notifications>;
export type NewNotification = InferInsertModel<typeof notifications>;
