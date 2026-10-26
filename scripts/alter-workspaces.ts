import { db } from "../backend/src/db";
import { sql } from "drizzle-orm";

async function alterWorkspaces() {
  console.log("⚙️ Đang bổ sung cột family_code và admin_wallet vào bảng workspaces...");
  try {
    await db.execute(sql.raw('ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "family_code" varchar(16)'));
    await db.execute(sql.raw('ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "admin_wallet" varchar(42)'));
    await db.execute(sql.raw('ALTER TABLE "workspaces" ALTER COLUMN "creator_wallet" DROP NOT NULL'));
    console.log("✅ Cập nhật bảng workspaces thành công!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật bảng:", error);
    process.exit(1);
  }
}

alterWorkspaces();
