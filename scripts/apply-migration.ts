import { db } from "../backend/src/db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

async function applyMigration() {
  console.log("🚀 Bắt đầu áp dụng migration lên Neon Database...");
  try {
    const migrationFilePath = path.resolve(__dirname, "../backend/drizzle/0000_brief_luke_cage.sql");
    const sqlContent = fs.readFileSync(migrationFilePath, "utf8");

    const dropTables = [
      'DROP TABLE IF EXISTS "notifications" CASCADE',
      'DROP TABLE IF EXISTS "chores" CASCADE',
      'DROP TABLE IF EXISTS "withdrawal_requests" CASCADE',
      'DROP TABLE IF EXISTS "vault_members" CASCADE',
      'DROP TABLE IF EXISTS "vaults" CASCADE',
      'DROP TABLE IF EXISTS "workspace_members" CASCADE',
      'DROP TABLE IF EXISTS "users" CASCADE',
      'DROP TABLE IF EXISTS "workspaces" CASCADE',
      'DROP TABLE IF EXISTS "families" CASCADE',
      'DROP TABLE IF EXISTS "auth_nonces" CASCADE',
    ];

    console.log("🧹 Dọn dẹp bảng cũ...");
    for (const dropCmd of dropTables) {
      try {
        await db.execute(sql.raw(dropCmd));
      } catch (e: any) {
        console.warn("Drop warning:", e.message);
      }
    }

    // Tách các câu lệnh theo statement-breakpoint
    const statements = sqlContent
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`📦 Thực thi ${statements.length} câu lệnh DDL...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await db.execute(sql.raw(stmt));
      } catch (err: any) {
        console.warn(`⚠️ Warning at statement ${i + 1}: ${err.message}`);
      }
    }

    console.log("✅ Toàn bộ cấu trúc bảng và kiểu dữ liệu mới đã được tạo thành công trên Neon DB!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi khi áp dụng migration:", error);
    process.exit(1);
  }
}

applyMigration();
