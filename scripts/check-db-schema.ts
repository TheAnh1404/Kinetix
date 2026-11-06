import { getTableColumns, getTableName, is, Table } from "drizzle-orm";
import { pool } from "../backend/src/db";
import * as schema from "../backend/src/db/schema";

/** Read-only drift check; never prints account rows, queries or credentials. */
async function main() {
  try {
    const result = await pool.query<{ table_name: string; column_name: string }>(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'",
    );
    const present = new Set(result.rows.map((row) => `${row.table_name}.${row.column_name}`));
    const missing: string[] = [];
    for (const table of Object.values(schema)) {
      if (!is(table, Table)) continue;
      for (const column of Object.values(getTableColumns(table))) {
        const name = `${getTableName(table)}.${column.name}`;
        if (!present.has(name)) missing.push(name);
      }
    }
    console.log(JSON.stringify({
      status: missing.length ? "DATABASE_SCHEMA_OUTDATED" : "DATABASE_COLUMNS_PRESENT",
      missingColumns: missing,
      ...(missing.length ? { action: "npm run db:migrate" } : {}),
    }, null, 2));
    if (missing.length) process.exitCode = 1;
  } catch (error: any) {
    console.error(JSON.stringify({ status: "DATABASE_CHECK_FAILED", code: error.code || error.cause?.code || "DATABASE_UNAVAILABLE" }));
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
