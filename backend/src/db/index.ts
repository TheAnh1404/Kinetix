import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing in environment variables.");
}

// Khởi tạo neon client với giao thức HTTP Serverless
neonConfig.webSocketConstructor = ws;
export const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
export * from "./schema";
