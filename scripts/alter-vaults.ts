import { db } from "../backend/src/db";
import { sql } from "drizzle-orm";

async function alterVaults() {
  console.log("⚙️ Đang bổ sung các cột mở rộng cho bảng vaults trên Neon Database...");
  try {
    await db.execute(sql.raw('ALTER TABLE "vaults" ADD COLUMN IF NOT EXISTS "target_goal_amount" numeric(18, 6) DEFAULT \'0\' NOT NULL'));
    await db.execute(sql.raw('ALTER TABLE "vaults" ADD COLUMN IF NOT EXISTS "target_deadline" timestamp with time zone'));
    await db.execute(sql.raw('ALTER TABLE "vaults" ADD COLUMN IF NOT EXISTS "rosca_round_duration" integer DEFAULT 0 NOT NULL'));
    await db.execute(sql.raw('ALTER TABLE "vaults" ADD COLUMN IF NOT EXISTS "rosca_round_contribution" numeric(18, 6) DEFAULT \'0\' NOT NULL'));
    await db.execute(sql.raw('ALTER TABLE "vaults" ADD COLUMN IF NOT EXISTS "rosca_current_round" integer DEFAULT 0 NOT NULL'));
    await db.execute(sql.raw('ALTER TABLE "vaults" ADD COLUMN IF NOT EXISTS "rosca_last_round_timestamp" timestamp with time zone'));
    console.log("✅ Cập nhật bảng vaults thành công!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật bảng vaults:", error);
    process.exit(1);
  }
}

alterVaults();
