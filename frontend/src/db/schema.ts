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
import { relations } from "drizzle-orm";

// =================================================================
// 1. ENUMS
// =================================================================

export const userRoleEnum = pgEnum("user_role", [
  "ADMIN",      // Bố/Mẹ - Quản trị gia đình
  "GUARDIAN",   // Các con trưởng thành - Bảo hộ và ký duyệt đa chữ ký
  "ELDERLY",    // Ông/Bà - Người cao tuổi thụ hưởng, cần bảo vệ
  "CHILD",      // Con nhỏ - Học tài chính, làm việc nhà nhận thưởng
]);

export const authTypeEnum = pgEnum("auth_type", [
  "CORE_WALLET",       // Ví Avalanche Core Wallet chính thức
  "PASSKEY_EMBEDDED",  // Đăng nhập không hạt giống qua Passkey (dành cho người già/trẻ em)
]);

export const vaultTypeEnum = pgEnum("vault_type", [
  "RetirementShield", // Hũ 1: Báo hiếu & Hưu trí (Ông Bà)
  "KidsSavings",      // Hũ 2: Lì xì & Tiết kiệm con trẻ
  "FamilyROSCA",      // Hũ 3: Quỹ tương trợ họ hàng
]);

export const requestStatusEnum = pgEnum("request_status", [
  "PENDING",   // Đang chờ Guardians ký duyệt on-chain
  "APPROVED",  // Đã đủ 2/3 chữ ký, sẵn sàng giải ngân
  "REJECTED",  // Bị từ chối do nghi vấn lừa đảo
  "EXECUTED",  // Đã giải ngân thành công trên blockchain
]);

export const choreStatusEnum = pgEnum("chore_status", [
  "TODO",       // Đã giao nhiệm vụ
  "SUBMITTED",  // Con đã nộp báo cáo kèm ảnh minh chứng
  "VERIFIED",   // Bố mẹ đã duyệt hoàn thành
  "REWARDED",   // Đã chuyển tiền thưởng từ hũ KidsSavings về ví con
]);

// =================================================================
// 2. TABLES
// =================================================================

export const families = pgTable("families", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  adminWallet: varchar("admin_wallet", { length: 42 }).notNull(),
  l1HubAddress: varchar("l1_hub_address", { length: 42 }),
  cchainVaultAddress: varchar("cchain_vault_address", { length: 42 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .references(() => families.id, { onDelete: "cascade" })
    .notNull(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").notNull(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().unique(),
  authMethod: authTypeEnum("auth_method").default("CORE_WALLET").notNull(),
  pinCode: varchar("pin_code", { length: 6 }),
  avatarUrl: text("avatar_url"),
  phoneNumber: text("phone_number"),
  isAllowlisted: boolean("is_allowlisted").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const authNonces = pgTable("auth_nonces", {
  nonce: text("nonce").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

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
  type: text("type").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Relations
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
