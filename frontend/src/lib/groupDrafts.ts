/** Session-scoped, account/group-specific drafts; never reuse signers across groups. */
export function readGroupDraft<T extends Record<string, unknown>>(
  key: string,
  empty: T,
): T {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || "null");
    if (!saved || saved.version !== 1 || typeof saved.fields !== "object")
      return empty;
    const result: Record<string, unknown> = { ...empty };
    for (const field of Object.keys(empty) as (keyof T)[]) {
      const value = saved.fields[field];
      if (Array.isArray(empty[field])) {
        if (
          Array.isArray(value) &&
          value.every((item) => typeof item === "string")
        )
          result[String(field)] = value;
      } else if (typeof value === typeof empty[field])
        result[String(field)] = value;
    }
    return result as T;
  } catch {
    return empty;
  }
}
export function saveGroupDraft(key: string, fields: object) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ version: 1, fields }));
  } catch {
    /* API transfer instructions remain durable even without browser storage. */
  }
}
export function clearGroupDraft(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* No storage. */
  }
}
export async function groupDraftFingerprint(fields: object) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(fields)),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
