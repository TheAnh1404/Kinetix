import "dotenv/config";
import { Pool, neonConfig, PoolClient } from "@neondatabase/serverless";
import ws from "ws";
import { is } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "../backend/src/db/schema";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, openSync, fsyncSync, closeSync } from "node:fs";
import { resolve } from "node:path";

/** Inventory trước; --execute chỉ reset đúng DB đã kiểm fingerprint, backup thành công rồi mới xóa. */
async function main() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_CONFIG_MISSING");
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("DATABASE_PROTOCOL_INVALID");
  const fingerprint = createHash("sha256").update(`${url.hostname.replace(/-pooler(?=\.)/, "")}:${url.port || "5432"}${url.pathname}`).digest("hex");
  const execute = process.argv.includes("--execute");
  if (execute && process.argv[process.argv.indexOf("--target-fingerprint") + 1] !== fingerprint) throw new Error("DATABASE_TARGET_FINGERPRINT_REQUIRED");
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: value, connectionTimeoutMillis: 5000, query_timeout: 15000 });
  let client: PoolClient | undefined;
  const quote = (name: string) => `"${name.replace(/"/g, '""')}"`;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '15s'");
    const identity = await client.query("SELECT current_database() AS name");
    if (identity.rows[0].name !== decodeURIComponent(url.pathname.slice(1))) throw new Error("DATABASE_IDENTITY_MISMATCH");
    const known = new Set(Object.values(schema).filter((item) => is(item, PgTable)).map((table) => getTableConfig(table as PgTable).name));
    const actual = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    const names: string[] = actual.rows.map((row) => row.tablename);
    if (names.some((name) => !known.has(name))) throw new Error("DATABASE_UNRECOGNIZED_TABLE_ABORT");
    const targets = names.map((name) => `public.${quote(name)}`).join(", ");
    if (execute && targets) {
      await client.query("SELECT pg_advisory_xact_lock(hashtext('kinetix:database-reset'))");
      await client.query(`LOCK TABLE ${targets} IN ACCESS EXCLUSIVE MODE`);
    }
    const counts: Record<string, string> = {};
    for (const name of names) counts[name] = (await client.query(`SELECT count(*)::text AS count FROM public.${quote(name)}`)).rows[0].count;
    console.log(JSON.stringify({ status: "DATABASE_INVENTORY_VERIFIED", targetFingerprint: fingerprint, tables: counts, execute }));
    if (!execute) { await client.query("ROLLBACK"); return; }
    const tables: { name: string; rows: string[] }[] = [];
    for (const name of names) {
      // Giữ JSON gốc dạng text để bigint/numeric không mất độ chính xác khi backup.
      const result = await client.query(`SELECT row_to_json(row)::text AS data FROM public.${quote(name)} AS row`);
      if (String(result.rows.length) !== counts[name]) throw new Error("BACKUP_COUNT_MISMATCH");
      tables.push({ name, rows: result.rows.map((row) => row.data) });
    }
    const directory = resolve(".private/db-backups"); mkdirSync(directory, { recursive: true });
    const file = resolve(directory, `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.json`);
    const content = JSON.stringify({ format: "kinetix-data-backup-v1", targetFingerprint: fingerprint, createdAt: new Date().toISOString(), counts, tables });
    writeFileSync(file, content, { flag: "wx", mode: 0o600 });
    const descriptor = openSync(file, "r+"); try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
    if (createHash("sha256").update(readFileSync(file)).digest("hex") !== createHash("sha256").update(content).digest("hex")) throw new Error("BACKUP_VERIFICATION_FAILED");
    if (targets) await client.query(`TRUNCATE TABLE ${targets} RESTART IDENTITY RESTRICT`);
    for (const name of names) if ((await client.query(`SELECT count(*)::text AS count FROM public.${quote(name)}`)).rows[0].count !== "0") throw new Error("DATABASE_RESET_VERIFICATION_FAILED");
    await client.query("COMMIT");
    console.log(JSON.stringify({ status: "APPLICATION_DATA_CLEARED", targetFingerprint: fingerprint, backup: file, applicationTables: names.length, remainingRows: "0", migrationHistoryPreserved: true }));
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { client?.release(); await pool.end(); }
}
main().catch((error) => { console.error(JSON.stringify({ status: "RESET_NOT_CONFIRMED", code: /^[A-Z_]+$/.test(error?.code || "") ? error.code : /^[A-Z_]+$/.test(error?.message || "") ? error.message : "DATABASE_UNAVAILABLE", note: "Không công bố reset thành công nếu chưa có kết quả COMMIT và kiểm tra." })); process.exitCode = 1; });
