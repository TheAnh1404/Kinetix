import { applyDatabaseMigrations } from "./migrations";
import { pool } from "./index";

async function runMigration() {
  try {
    const count = await applyDatabaseMigrations(
      process.argv.includes("--member-upgrade"),
    );
    console.log(
      `Migration hoàn tất: ${count} migration mới, dữ liệu hiện có được giữ lại.`,
    );
  } catch (error: any) {
    // Không in query, URL kết nối hoặc credential khi database báo lỗi.
    console.error(
      "Migration chưa hoàn tất:",
      error.code ||
        error.cause?.code ||
        (error.message?.startsWith("LEGACY_MIGRATION_HISTORY")
          ? error.message
          : "Kiểm tra schema và lịch sử migration."),
    );
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runMigration();
