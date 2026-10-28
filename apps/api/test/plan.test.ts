import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import type { PlanResponse } from "../src/routes/plan";
import { localToday } from "../src/http/today";
import { hashSessionToken, newSessionToken } from "../src/auth/session";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { seedFamily } from "./helpers/seed";

describe("localToday", () => {
  it("uses the family's zone, not the server clock", () => {
    const t = new Date("2026-10-28T03:30:00Z"); // 22:30 on the 27th in Chicago, already the 28th in UTC
    expect(localToday("America/Chicago", t)).toBe("2026-10-27");
    expect(localToday("UTC", t)).toBe("2026-10-28");
    expect(localToday("Pacific/Auckland", t)).toBe("2026-10-28");
  });
});

describe.skipIf(!hasDb)("GET /api/plan (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  // 10:00 in Chicago on Oct 28: "today" is pinned, never the wall clock.
  const NOW = new Date("2026-10-28T15:00:00Z");
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => NOW }) : null!;
  let fam: Awaited<ReturnType<typeof seedFamily>>;
  let cookies: { hh_session: string };

  beforeAll(async () => {
    fam = await seedFamily("plan-route@example.com");
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

  const get = (qs: string, c: { hh_session: string } | null = cookies) =>
    app.inject({ method: "GET", url: `/api/plan${qs}`, ...(c ? { cookies: c } : {}) });

  // asOf = TI's start (2026-10-19), which is the engine test's default. See the asOf=2026-10-26 case below.
  it("week of Oct 26: Treasure Island for Frank sums to 90 pages; days are trimmed to the range", async () => {
    const res = await get("?from=2026-10-26&to=2026-10-30&asOf=2026-10-19");
    expect(res.statusCode).toBe(200);
    const body = res.json<PlanResponse>();
    expect(body).toMatchObject({ engineVersion: "0.1.0", asOf: "2026-10-19", from: "2026-10-26", to: "2026-10-30" });
    const ti = body.plans.find((p) => p.assignmentId === fam.ids.assignment.ti && p.childId === fam.ids.child.frank)!;
    expect(ti.baseRate).toBeCloseTo(22.5);
    expect(ti.days.reduce((s, d) => s + d.units, 0)).toBeCloseTo(90);
    for (const p of body.plans) for (const d of p.days) {
      expect(d.date >= "2026-10-26" && d.date <= "2026-10-30").toBe(true);
    }
  });

  it("asOf=2026-10-26 with nothing logged: the unlogged week of Oct 19 rolls forward (33.75/day, 135 pages)", async () => {
    const body = (await get("?from=2026-10-26&to=2026-10-30&asOf=2026-10-26")).json<PlanResponse>();
    const ti = body.plans.find((p) => p.assignmentId === fam.ids.assignment.ti && p.childId === fam.ids.child.frank)!;
    expect(ti.rate).toBeCloseTo(33.75);
    expect(ti.days.reduce((s, d) => s + d.units, 0)).toBeCloseTo(135);
  });

  it("October 2026 has plans for both kids", async () => {
    const body = (await get("?from=2026-10-01&to=2026-10-31&asOf=2026-10-01")).json<PlanResponse>();
    const kids = new Set(body.plans.map((p) => p.childId));
    expect(kids).toEqual(new Set([fam.ids.child.frank, fam.ids.child.margaret]));
  });

  it("asOf defaults to the family's local today, from the injected clock", async () => {
    const body = (await get("?from=2026-10-26&to=2026-10-30")).json<PlanResponse>();
    expect(body.asOf).toBe("2026-10-28");
  });

  it("without an injected clock, asOf comes from the real clock", async () => {
    const real = buildApp(testConfig(), { db: pool });
    try {
      const before = new Date();
      const res = await real.inject({ method: "GET", url: "/api/plan?from=2026-10-26&to=2026-10-30", cookies });
      const after = new Date();
      expect([localToday("America/Chicago", before), localToday("America/Chicago", after)]).toContain(res.json().asOf);
    } finally {
      await real.close();
    }
  });

  it("no NaN, Infinity or null in any number field", async () => {
    const res = await get("?from=2026-08-01&to=2027-06-30&asOf=2026-10-26");
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toMatch(/NaN|Infinity/);
    const body = res.json<PlanResponse>();
    const numberFields = ["totalUnits", "doneUnits", "remainingUnits", "baseRate", "rate", "unplacedUnits", "minutesPerUnit"] as const;
    for (const p of body.plans) {
      for (const f of numberFields) expect(Number.isFinite(p[f]), `${p.assignmentId} ${f}`).toBe(true);
      for (const d of p.days) for (const f of ["capacity", "units", "minutes"] as const) {
        expect(Number.isFinite(d[f]), `${p.assignmentId} ${d.date} ${f}`).toBe(true);
      }
    }
  });

  it.each([
    ["from after to", "?from=2026-10-30&to=2026-10-26", "invalid_range"],
    ["impossible date", "?from=2026-02-30&to=2026-03-05", "invalid_date"],
    ["bad asOf", "?from=2026-10-26&to=2026-10-30&asOf=2026-13-01", "invalid_date"],
    ["not a date", "?from=yesterday&to=2026-10-30", "invalid_date"],
    ["missing to", "?from=2026-10-26", "invalid_request"],
    ["repeated from", "?from=2026-10-26&from=2026-10-27&to=2026-10-30", "invalid_request"],
    ["401 days", "?from=2026-01-01&to=2027-02-05", "range_too_long"],
  ])("%s → 400", async (_name, qs, code) => {
    const res = await get(qs);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: code });
  });

  it("exactly 400 days is allowed", async () => {
    expect((await get("?from=2026-01-01&to=2027-02-04&asOf=2026-10-26")).statusCode).toBe(200);
  });

  it("signed out → 401", async () => {
    const res = await get("?from=2026-10-26&to=2026-10-30", null);
    expect(res.statusCode).toBe(401);
  });
});
