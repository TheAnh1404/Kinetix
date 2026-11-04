export const MEMBER_MIGRATION = "0002_member_experience";
export interface MigrationFile {
  hash: string;
  folderMillis: number;
  sql: string[];
  tag?: string;
}
export interface AppliedMigration {
  hash: string;
  created_at: string | number;
}

/** Database cũ có thể được dựng bằng SQL riêng; không phát lại migration tạo bảng/auth. */
export function selectMigrations(
  files: MigrationFile[],
  applied: AppliedMigration[],
  memberUpgrade: boolean,
) {
  const latest = Math.max(0, ...applied.map((row) => Number(row.created_at)));
  const candidates = memberUpgrade
    ? files.filter((file) => file.tag === MEMBER_MIGRATION)
    : files.filter((file) => file.folderMillis > latest);
  if (memberUpgrade && candidates.length !== 1)
    throw new Error("MEMBER_MIGRATION_NOT_FOUND");
  const latestUnknown = applied.some(
    (row) =>
      Number(row.created_at) === latest &&
      !files.some((file) => file.hash === row.hash),
  );
  if (!memberUpgrade && candidates.length && latestUnknown)
    throw new Error(
      "LEGACY_MIGRATION_HISTORY: use npm run db:migrate:member for the member upgrade; existing data will not be reset.",
    );
  return candidates.filter((file) => {
    if (applied.some((row) => row.hash === file.hash)) return false;
    if (
      applied.some((row) => Number(row.created_at) === file.folderMillis) ||
      (memberUpgrade && latest > file.folderMillis)
    )
      throw new Error("MIGRATION_HISTORY_CONFLICT");
    return true;
  });
}
