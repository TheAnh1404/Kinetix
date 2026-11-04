import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { db } from "./index";

import { selectMigrations, AppliedMigration } from "./migrationPlan";

export async function applyDatabaseMigrations(memberUpgrade = false) {
  const migrationsFolder = resolve(__dirname, "../../drizzle");
  const journal = JSON.parse(
    readFileSync(resolve(migrationsFolder, "meta/_journal.json"), "utf8"),
  ) as { entries: { tag: string }[] };
  const files = readMigrationFiles({ migrationsFolder }).map((file, index) => ({
    ...file,
    tag: journal.entries[index]?.tag,
  }));
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('kinetix:database-migrations'))`,
    );
    await tx.execute(sql`set local lock_timeout = '5s'`);
    await tx.execute(sql`set local statement_timeout = '60s'`);
    await tx.execute(sql`create schema if not exists drizzle`);
    await tx.execute(
      sql`create table if not exists drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)`,
    );
    const applied = await tx.execute(
      sql`select hash, created_at from drizzle.__drizzle_migrations order by created_at`,
    );
    const pending = selectMigrations(
      files,
      applied.rows as unknown as AppliedMigration[],
      memberUpgrade,
    );
    for (const migration of pending) {
      for (const statement of migration.sql)
        await tx.execute(sql.raw(statement));
      await tx.execute(
        sql`insert into drizzle.__drizzle_migrations (hash, created_at) values (${migration.hash}, ${migration.folderMillis})`,
      );
    }
    return pending.length;
  });
}
