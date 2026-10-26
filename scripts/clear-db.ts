import { db } from "../backend/src/db";
import {
  notifications,
  chores,
  withdrawalRequests,
  authNonces,
  users,
  families,
} from "../backend/src/db/schema";
import { sql } from "drizzle-orm";

async function clearDatabase() {
  console.log("🧹 Bắt đầu dọn dẹp sạch toàn bộ dữ liệu trong Neon Database...");

  try {
    // 1. Kiểm tra số lượng bản ghi trước khi xóa
    const notifRes = await db.execute(sql`SELECT count(*) FROM notifications`);
    const choreRes = await db.execute(sql`SELECT count(*) FROM chores`);
    const withdrawRes = await db.execute(sql`SELECT count(*) FROM withdrawal_requests`);
    const userRes = await db.execute(sql`SELECT count(*) FROM users`);
    const familyRes = await db.execute(sql`SELECT count(*) FROM families`);
    const nonceRes = await db.execute(sql`SELECT count(*) FROM auth_nonces`);

    console.log("📊 Số lượng bản ghi trước khi xóa:");
    console.log(` - notifications: ${notifRes.rows[0]?.count}`);
    console.log(` - chores: ${choreRes.rows[0]?.count}`);
    console.log(` - withdrawal_requests: ${withdrawRes.rows[0]?.count}`);
    console.log(` - users: ${userRes.rows[0]?.count}`);
    console.log(` - families: ${familyRes.rows[0]?.count}`);
    console.log(` - auth_nonces: ${nonceRes.rows[0]?.count}`);

    // 2. Thực hiện xóa toàn bộ
    console.log("\n🗑️ Đang xóa toàn bộ dữ liệu...");
    await db.execute(sql`TRUNCATE TABLE notifications, chores, withdrawal_requests, auth_nonces, users, families CASCADE;`);

    // 3. Kiểm tra lại sau khi xóa
    const afterFamily = await db.execute(sql`SELECT count(*) FROM families`);
    const afterUser = await db.execute(sql`SELECT count(*) FROM users`);
    const afterNotif = await db.execute(sql`SELECT count(*) FROM notifications`);

    console.log("\n✅ Kết quả sau khi xóa:");
    console.log(` - families: ${afterFamily.rows[0]?.count}`);
    console.log(` - users: ${afterUser.rows[0]?.count}`);
    console.log(` - notifications: ${afterNotif.rows[0]?.count}`);
    console.log("🎉 Cơ sở dữ liệu hiện đã hoàn toàn trống (0 bản ghi)!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi khi dọn dẹp database:", error);
    process.exit(1);
  }
}

clearDatabase();
