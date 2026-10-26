import { db } from "../backend/src/db";
import {
  notifications,
  chores,
  withdrawalRequests,
  vaultMembers,
  vaults,
  workspaceMembers,
  authNonces,
  users,
  workspaces,
} from "../backend/src/db/schema";
import { sql } from "drizzle-orm";

async function clearDatabase() {
  console.log("🧹 Bắt đầu dọn dẹp sạch toàn bộ dữ liệu trong Neon Database...");

  try {
    // 1. Thực hiện xóa toàn bộ bằng CASCADE truncate
    console.log("\n🗑️ Đang xóa toàn bộ dữ liệu...");
    await db.execute(sql`
      TRUNCATE TABLE 
        notifications, 
        chores, 
        withdrawal_requests, 
        vault_members, 
        vaults, 
        workspace_members, 
        auth_nonces, 
        users, 
        workspaces 
      CASCADE;
    `);

    console.log("🎉 Cơ sở dữ liệu hiện đã hoàn toàn trống (0 bản ghi)!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi khi dọn dẹp database:", error);
    process.exit(1);
  }
}

clearDatabase();
