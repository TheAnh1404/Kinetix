import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";
import * as dotenv from "dotenv";
import * as path from "path";
import dns from "node:dns";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

// Ưu tiên IPv4 để ngăn lỗi ETIMEDOUT / ENETUNREACH trên Windows khi kết nối Neon WebSocket
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Bỏ qua nếu môi trường không hỗ trợ
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing in environment variables.");
}

// Khởi tạo neon client với giao thức WebSocket ép buộc IPv4
class IPv4WebSocket extends ws {
  constructor(address: any, protocols: any, options: any) {
    super(address, protocols, { ...options, family: 4 });
  }
}

neonConfig.webSocketConstructor = IPv4WebSocket;
// Local/Compose PostgreSQL uses an internal fixed-target WebSocket gateway.
// Neon cloud keeps its default secure transport when this option is absent.
if (process.env.LOCAL_PG_WS_PROXY) {
  const proxy = process.env.LOCAL_PG_WS_PROXY;
  if (!/^[a-zA-Z0-9.-]+:\d+$/.test(proxy)) throw new Error("Invalid local PostgreSQL proxy configuration.");
  neonConfig.wsProxy = () => proxy;
  neonConfig.useSecureWebSocket = false;
  neonConfig.forceDisablePgSSL = true;
  neonConfig.pipelineConnect = false;
}
export const pool = new Pool({ connectionString });

// Bắt sự kiện lỗi khi idle client ngắt kết nối để không crash tiến trình Node.js
pool.on("error", (err) => {
  console.warn("Kinetix database pool idle connection notice:", err?.message || err);
});

export const db = drizzle(pool, { schema });
export * from "./schema";
