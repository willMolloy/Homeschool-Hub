/** True for a Postgres unique violation (SQLSTATE 23505), optionally on a specific constraint/index. */
export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: unknown; constraint?: unknown };
  return e.code === "23505" && (constraint === undefined || e.constraint === constraint);
}
