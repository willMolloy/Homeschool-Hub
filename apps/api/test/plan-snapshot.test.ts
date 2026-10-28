import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { buildApp } from "../src/app";
import { withReadSnapshot } from "../src/db";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { seedFamily } from "./helpers/seed";
import { sessionCookie } from "./helpers/family";

/** Count checkouts made by callers (pool.query's own internal connect is not counted) and pool-level SQL. */
function countingPool(pool: pg.Pool) {
  const stats = { connect: 0, poolSql: [] as string[] };
  const connect = pool.connect.bind(pool) as (...a: unknown[]) => unknown;
  const query = pool.query.bind(pool) as (...a: unknown[]) => unknown;
  Object.assign(pool, {
    connect: (...a: unknown[]) => {
      if (a.length === 0) stats.connect++;
      return connect(...a);
    },
    query: (...a: unknown[]) => {
      stats.poolSql.push(typeof a[0] === "string" ? a[0] : String((a[0] as { text?: string }).text));
      return query(...a);
    },
  });
  return stats;
}

describe.skipIf(!hasDb)("plan inputs come from one snapshot on one connection (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const other = hasDb ? testPool() : null!;
  let fam: Awaited<ReturnType<typeof seedFamily>>;
  let cookie = "";
  beforeAll(async () => {
    fam = await seedFamily("plan-snapshot@example.com");
    const app = buildApp(testConfig(), { db: pool });
    const res = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: fam.email, password: fam.password } });
    cookie = sessionCookie(res)!;
    await app.close();
  });
  afterAll(async () => {
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
    await other.end();
  });

  it("GET /api/plan checks out exactly one connection; the pool itself only runs the session check", async () => {
    const stats = countingPool(pool);
    const app = buildApp(testConfig(), { db: pool });
    try {
      const res = await app.inject({ method: "GET", url: "/api/plan?from=2026-10-26&to=2026-11-01", cookies: { hh_session: cookie } });
      expect(res.statusCode).toBe(200);
      expect(res.json().plans.length).toBeGreaterThan(0);
      expect(stats.connect).toBe(1);
      for (const sql of stats.poolSql) expect(sql).toMatch(/\bsession\b/);
      expect(stats.poolSql.join("\n")).not.toMatch(/FROM (assignment|child|subject|event|blocked_range|week_override|log_child_progress)\b/);
    } finally {
      await app.close();
      delete (pool as unknown as Record<string, unknown>).connect;
      delete (pool as unknown as Record<string, unknown>).query;
    }
  });

  it("withReadSnapshot rejects writes, rolls back and releases on error", async () => {
    await expect(withReadSnapshot(pool, (c) => c.query("UPDATE family SET name = name WHERE id = $1", [fam.familyId])))
      .rejects.toThrow(/read-only transaction/);
    await expect(withReadSnapshot(pool, async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    expect(pool.totalCount - pool.idleCount).toBe(0); // every client went back
    // the released client is clean (no transaction left open)
    const c = await pool.connect();
    try {
      const { rows } = await c.query("SELECT now() = statement_timestamp() AS outside_tx");
      expect(rows[0].outside_tx).toBe(true);
    } finally {
      c.release();
    }
  });

  it("two reads inside one snapshot agree while another connection commits in between", async () => {
    const seen = await withReadSnapshot(pool, async (c) => {
      const a = (await c.query("SELECT name FROM family WHERE id = $1", [fam.familyId])).rows[0].name;
      await other.query("UPDATE family SET name = 'Renamed mid-snapshot' WHERE id = $1", [fam.familyId]);
      const b = (await c.query("SELECT name FROM family WHERE id = $1", [fam.familyId])).rows[0].name;
      return [a, b];
    });
    expect(seen[0]).toBe(seen[1]);
    expect(seen[0]).not.toBe("Renamed mid-snapshot");
    const after = await pool.query("SELECT name FROM family WHERE id = $1", [fam.familyId]);
    expect(after.rows[0].name).toBe("Renamed mid-snapshot");
  });

  it("family gone → 401", async () => {
    const gone = await seedFamily("plan-snapshot-gone@example.com");
    const app = buildApp(testConfig(), { db: pool });
    try {
      const login = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: gone.email, password: gone.password } });
      await pool.query("DELETE FROM family WHERE id = $1", [gone.familyId]);
      const res = await app.inject({ method: "GET", url: "/api/plan?from=2026-10-26&to=2026-11-01", cookies: { hh_session: sessionCookie(login)! } });
      expect(res.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });
});
