import { migrate } from "drizzle-orm/neon-http/migrator";
import { db } from "./index";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

async function runMigration() {
  console.log("⏳ Đang đẩy migration lên Neon Serverless PostgreSQL...");
  try {
    const migrationsFolder = path.resolve(__dirname, "../../drizzle");
    await migrate(db, { migrationsFolder });
    console.log("✅ Migration hoàn tất thành công trên Neon DB!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi khi chạy migration:", error);
    process.exit(1);
  }
}

runMigration();
