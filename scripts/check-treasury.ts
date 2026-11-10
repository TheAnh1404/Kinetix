import { pool } from "../backend/src/db";

async function main() {
  const schema = await pool.query(
    "select to_regclass('public.treasury_jars')::text as jars, to_regclass('public.treasury_transfers')::text as transfers, to_regclass('public.treasury_entries')::text as entries, to_regclass('public.treasury_attempts')::text as attempts",
  );
  const history = await pool.query(
    "select max(created_at)::text as latest from drizzle.__drizzle_migrations",
  );
  console.log({ schema: schema.rows[0], migration: history.rows[0] });
  if (Object.values(schema.rows[0]).some((value) => !value))
    process.exitCode = 1;
}
main()
  .catch(() => {
    console.error("Treasury schema check unavailable.");
    process.exitCode = 1;
  })
  .finally(() => pool.end());
