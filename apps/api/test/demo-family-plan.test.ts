// T-07d: the richer demo family (db/demo-family.ts) seeds and plans through the API, check-ins and overrides included.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_FAMILY } from "../../../db/demo-family";
import { seed, type SeedSummary } from "../../../db/seed";
import { buildApp } from "../src/app";
import { hashSessionToken, newSessionToken } from "../src/auth/session";
import type { PlanResponse } from "../src/routes/plan";
import { testConfig } from "./helpers/config";
import { DATABASE_URL, hasDb, testPool } from "./helpers/db";

describe.skipIf(!hasDb)("the demo family through GET /api/plan (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const NOW = new Date("2026-10-28T15:00:00Z"); // 10:00 in Chicago
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => NOW }) : null!;
  // Its own login, so the read-only demo test can own demo@example.com; the 403 rule is keyed on that login, not the data.
  let fam: SeedSummary;
  let cookies: { hh_session: string };

  beforeAll(async () => {
    fam = await seed(DATABASE_URL!, "demo-family-plan@example.com", DEMO_FAMILY);
    const token = newSessionToken();
    await pool.query("INSERT INTO session (id, family_id, expires_at) VALUES ($1, $2, now() + interval '1 day')",
      [hashSessionToken(token), fam.familyId]);
    cookies = { hh_session: token };
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });

  it("plans the whole year, with the check-ins and the fair's heavy weeks applied", async () => {
    const res = await app.inject({ method: "GET", url: "/api/plan?from=2026-08-31&to=2027-05-23", cookies });
    expect(res.statusCode).toBe(200);
    const { plans } = res.json<PlanResponse>();
    expect(plans).toHaveLength(21);
    const p = (key: string) => plans.find((x) => x.assignmentId === fam.ids.assignment[key])!;
    for (const x of plans) expect(x.unplacedUnits).toBe(0);
    expect(p("hobbit").end < "2026-11-13").toBe(true); // read ahead, pushEndDate
    expect(p("garden").end).toBe("2026-11-20");         // behind, keepEndDate
    expect(p("garden").doneUnits).toBe(11);
    const fair = (from: string, to: string) => p("fair").days.filter((d) => d.date >= from && d.date <= to).reduce((n, d) => n + d.units, 0);
    expect(fair("2026-11-02", "2026-11-06")).toBeCloseTo(6, 6);
    expect(fair("2026-12-14", "2026-12-18")).toBeCloseTo(2, 6);
  });
});
