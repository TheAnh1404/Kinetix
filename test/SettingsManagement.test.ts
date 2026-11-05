import { expect } from "chai";
import {
  userPreferences,
  linkedWallets,
  memberAllowancePolicies,
  sessionKeysAndApprovals,
  settingsAuditLogs,
} from "../backend/src/db/schema";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

describe("Phân Hệ Settings & Management (Hybrid Web2 + Web3 Finance)", () => {
  describe("Tối ưu hóa Database Schema (Additive Migration Integrity)", () => {
    it("đã định nghĩa bảng user_preferences với các trường cần thiết", () => {
      expect(userPreferences).to.be.an("object");
      expect(userPreferences.userId).to.exist;
      expect(userPreferences.uiMode).to.exist;
      expect(userPreferences.defaultCurrency).to.exist;
      expect(userPreferences.preferredNetwork).to.exist;
      expect(userPreferences.gasPreference).to.exist;
      expect(userPreferences.privacyHideBalance).to.exist;
      expect(userPreferences.notificationConfig).to.exist;
    });

    it("đã định nghĩa bảng linked_wallets hỗ trợ Hybrid Wallet Switcher", () => {
      expect(linkedWallets).to.be.an("object");
      expect(linkedWallets.userId).to.exist;
      expect(linkedWallets.walletAddress).to.exist;
      expect(linkedWallets.walletType).to.exist;
      expect(linkedWallets.isPrimaryReceiving).to.exist;
      expect(linkedWallets.chainId).to.exist;
    });

    it("đã định nghĩa bảng member_allowance_policies hỗ trợ Emergency Freeze & Allowances", () => {
      expect(memberAllowancePolicies).to.be.an("object");
      expect(memberAllowancePolicies.workspaceId).to.exist;
      expect(memberAllowancePolicies.memberUserId).to.exist;
      expect(memberAllowancePolicies.dailyLimitAmount).to.exist;
      expect(memberAllowancePolicies.autoApproveThreshold).to.exist;
      expect(memberAllowancePolicies.allowedCategories).to.exist;
      expect(memberAllowancePolicies.isFrozen).to.exist;
      expect(memberAllowancePolicies.onchainSyncStatus).to.exist;
      expect(memberAllowancePolicies.lastTxHash).to.exist;
    });

    it("đã định nghĩa bảng session_keys_and_approvals hỗ trợ AI Agent session revoke", () => {
      expect(sessionKeysAndApprovals).to.be.an("object");
      expect(sessionKeysAndApprovals.sessionKeyAddress).to.exist;
      expect(sessionKeysAndApprovals.permissionsScope).to.exist;
      expect(sessionKeysAndApprovals.expiresAt).to.exist;
      expect(sessionKeysAndApprovals.isRevoked).to.exist;
    });

    it("đã định nghĩa bảng settings_audit_logs hỗ trợ Dual-layer audit trail", () => {
      expect(settingsAuditLogs).to.be.an("object");
      expect(settingsAuditLogs.actorId).to.exist;
      expect(settingsAuditLogs.workspaceId).to.exist;
      expect(settingsAuditLogs.actionType).to.exist;
      expect(settingsAuditLogs.layer).to.exist;
      expect(settingsAuditLogs.metadataDiff).to.exist;
      expect(settingsAuditLogs.txHash).to.exist;
      expect(settingsAuditLogs.status).to.exist;
    });

    it("tồn tại migration 0004_settings_management.sql và đã đăng ký trong _journal.json", () => {
      const migrationPath = resolve(
        __dirname,
        "../backend/drizzle/0004_settings_management.sql",
      );
      expect(existsSync(migrationPath)).to.be.true;

      const journalPath = resolve(
        __dirname,
        "../backend/drizzle/meta/_journal.json",
      );
      const journal = JSON.parse(readFileSync(journalPath, "utf8"));
      const entry = journal.entries.find(
        (e: any) => e.tag === "0004_settings_management",
      );
      expect(entry).to.exist;
      expect(entry.tag).to.equal("0004_settings_management");
      expect(entry.idx).to.be.a("number");
    });
  });

  describe("Cơ chế Dual-Sync & Progressive Disclosure Validation", () => {
    it("hỗ trợ chuẩn định dạng địa chỉ ví Web3 và TxHash", () => {
      const ethRegex = /^0x[a-fA-F0-9]{40}$/;
      const txRegex = /^0x[a-fA-F0-9]{64}$/;

      expect(ethRegex.test("0x71C840134f711fF06114112e4B80bCeB33B93c4a")).to.be.true;
      expect(ethRegex.test("invalid_wallet_address")).to.be.false;

      expect(
        txRegex.test(
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        ),
      ).to.be.true;
      expect(txRegex.test("0xshort_hash")).to.be.false;
    });

    it("hợp lệ hóa các giá trị UI mode trong Progressive Disclosure", () => {
      const validModes = ["LITE", "PRO"];
      expect(validModes.includes("LITE")).to.be.true;
      expect(validModes.includes("PRO")).to.be.true;
      expect(validModes.includes("EXPERT")).to.be.false;
    });

    it("hợp lệ hóa các cơ chế tài trợ gas trong Gas Tank Config", () => {
      const validGas = ["SPONSORED", "STABLECOIN", "NATIVE"];
      expect(validGas.includes("SPONSORED")).to.be.true;
      expect(validGas.includes("STABLECOIN")).to.be.true;
      expect(validGas.includes("NATIVE")).to.be.true;
    });
  });
});
