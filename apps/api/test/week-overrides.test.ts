/** S6-02: PUT/GET/DELETE /api/week-overrides. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import type { PlanResponse } from "../src/routes/plan";
import { hashSessionToken, newSessionToken } from "../src/auth/session";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { seedFamily } from "./helpers/seed";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("/api/week-overrides (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  // Wed Oct 28, 10:00 in Chicago: the current week starts Monday Oct 26. Treasure Island (270 pages, Oct 19 to Nov 6) is Frank's.
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => new Date("2026-10-28T15:00:00Z") }) : null!;
  let fam: Awaited<ReturnType<typeof seedFamily>>;
  let cookies: { hh_session: string };
  let other: Awaited<ReturnType<typeof signedInFamily>>;
  let ti = "", frank = "", margaret = "";
  const NEXT = "2026-11-02";

  const put = (body: unknown, c: { hh_session: string } | null = cookies) =>
    app.inject({ method: "PUT", url: "/api/week-overrides", ...(c ? { cookies: c } : {}), payload: body as object });
  const body = (over: Record<string, unknown> = {}) => ({ assignmentId: ti, childId: frank, weekStart: NEXT, plannedUnits: 10, mode: "keepEndDate", ...over });
  const list = (week: string, c: { hh_session: string } | null = cookies) =>
    app.inject({ method: "GET", url: `/api/week-overrides?weekStart=${week}`, ...(c ? { cookies: c } : {}) });
  const bad = async (over: Record<string, unknown>, msg: RegExp) => {
    const res = await put(body(over));
    expect(res.statusCode, res.body).toBe(400);
    expect(res.json()).toMatchObject({ error: "invalid_request" });
    expect(res.json().message).toMatch(msg);
  };
  const count = async () => Number((await pool.query("SELECT count(*) FROM week_override WHERE family_id = $1", [fam.familyId])).rows[0].count);

  beforeAll(async () => {
    fam = await seedFamily("week-overrides@example.com");
    const token = newSessionToken();
    await pool.query("INSERT INTO session (id, family_id, expires_at) VALUES ($1, $2, now() + interval '1 day')", [hashSessionToken(token), fam.familyId]);
    cookies = { hh_session: token };
    other = await signedInFamily(pool, "Week overrides other");
    ti = fam.ids.assignment.ti!; frank = fam.ids.child.frank!; margaret = fam.ids.child.margaret!;
  });
  beforeEach(async () => { await pool.query("DELETE FROM week_override WHERE family_id = $1", [fam.familyId]); });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1::uuid[])", [[fam.familyId, other.familyId]]);
    await pool.end();
  });

  it("401 without a session", async () => {
    expect((await put(body(), null)).statusCode).toBe(401);
    expect((await list(NEXT, null)).statusCode).toBe(401);
    expect((await app.inject({ method: "DELETE", url: `/api/week-overrides/${ti}` })).statusCode).toBe(401);
  });

  it("creates, lists by week and deletes", async () => {
    const res = await put(body());
    expect(res.statusCode, res.body).toBe(200);
    const row = res.json();
    expect(row).toMatchObject({ assignmentId: ti, childId: frank, weekStart: NEXT, plannedUnits: 10, mode: "keepEndDate" });
    expect((await list(NEXT)).json()).toEqual({ overrides: [row] });
    expect((await list("2026-11-09")).json()).toEqual({ overrides: [] });
    expect((await app.inject({ method: "DELETE", url: `/api/week-overrides/${row.id}`, cookies })).statusCode).toBe(204);
    expect((await list(NEXT)).json()).toEqual({ overrides: [] });
    expect((await app.inject({ method: "DELETE", url: `/api/week-overrides/${row.id}`, cookies })).statusCode).toBe(404);
  });

  it("the current week and a whole-family adjustment (childId null) are allowed", async () => {
    expect((await put(body({ weekStart: "2026-10-26" }))).statusCode).toBe(200);
    expect((await put(body({ weekStart: NEXT, childId: null, plannedUnits: 0 }))).json()).toMatchObject({ childId: null, plannedUnits: 0 });
  });

  it("setting the same week again replaces the row, bumps updated_at and lists it last (newest edit wins)", async () => {
    const a = (await put(body({ weekStart: NEXT }))).json();
    const b = (await put(body({ weekStart: "2026-11-09", plannedUnits: 5 }))).json();
    const again = (await put(body({ weekStart: NEXT, plannedUnits: 20, mode: "pushEndDate" }))).json();
    expect(again).toMatchObject({ id: a.id, plannedUnits: 20, mode: "pushEndDate" });
    expect(again.updatedAt > a.updatedAt).toBe(true);
    expect(await count()).toBe(2);
    const rows = await pool.query("SELECT id FROM week_override WHERE family_id = $1 ORDER BY updated_at, id", [fam.familyId]);
    expect(rows.rows.map((r) => r.id)).toEqual([b.id, a.id]);
  });

  it("rejects a misaligned week, a finished week and bad units or mode", async () => {
    await bad({ weekStart: "2026-11-03" }, /first day of a week \(a Monday\)/);
    await bad({ weekStart: "2026-10-19" }, /finished week/);
    await bad({ plannedUnits: -1 }, /negative/);
    await bad({ plannedUnits: 270.01 }, /more than the assignment's total \(270\)/);
    await bad({ plannedUnits: 1.234 }, /2 decimal places/);
    await bad({ plannedUnits: "5" }, /must be a number/);
    await bad({ mode: "later" }, /mode must be/);
    await bad({ weekStart: "nope" }, /dates/i);
    await bad({ extra: 1 }, /extra|unrecognized/i);
    expect((await put({ assignmentId: ti, childId: frank, weekStart: NEXT, plannedUnits: 1 })).statusCode).toBe(400);
    expect(await count()).toBe(0);
    expect(270).toBe((await pool.query("SELECT total_units::float AS t FROM assignment WHERE id = $1", [ti])).rows[0].t);
    expect((await put(body({ plannedUnits: 270 }))).statusCode).toBe(200);
  });

  it("rejects another family's assignment or child, a child not on the assignment, and an archived assignment", async () => {
    const foreign = (await pool.query<{ id: string }>("INSERT INTO child (family_id, name, color) VALUES ($1, 'Zed', '#112233') RETURNING id", [other.familyId])).rows[0]!.id;
    await bad({ childId: foreign }, /isn't on this assignment/);
    await bad({ childId: margaret }, /isn't on this assignment/);
    await bad({ assignmentId: "00000000-0000-4000-8000-000000000000" }, /no such assignment/);
    // Another family's session cannot use this family's assignment.
    const res = await put(body(), other.cookies);
    expect(res.statusCode).toBe(400);
    await pool.query("UPDATE assignment SET archived_at = now() WHERE id = $1", [ti]);
    try { await bad({}, /no such assignment/); } finally { await pool.query("UPDATE assignment SET archived_at = NULL WHERE id = $1", [ti]); }
    expect(await count()).toBe(0);
  });

  it("a family cannot list or delete another family's adjustment", async () => {
    const row = (await put(body())).json();
    expect((await list(NEXT, other.cookies)).json()).toEqual({ overrides: [] });
    expect((await app.inject({ method: "DELETE", url: `/api/week-overrides/${row.id}`, cookies: other.cookies })).statusCode).toBe(404);
    expect((await app.inject({ method: "DELETE", url: "/api/week-overrides/not-an-id", cookies })).statusCode).toBe(404);
    expect(await count()).toBe(1);
  });

  it("list needs an aligned weekStart", async () => {
    expect((await app.inject({ method: "GET", url: "/api/week-overrides", cookies })).statusCode).toBe(400);
    expect((await list("2026-11-03")).statusCode).toBe(400);
    expect((await list("2026-10-19")).statusCode).toBe(200); // a past week can be read
  });

  it("the plan reflects a saved adjustment, and a delete restores it", async () => {
    const plan = async () => {
      const res = await app.inject({ method: "GET", url: "/api/plan?from=2026-10-26&to=2026-11-13&asOf=2026-10-28", cookies });
      return res.json<PlanResponse>().plans.find((p) => p.assignmentId === ti && p.childId === frank)!;
    };
    const next = (p: Awaited<ReturnType<typeof plan>>) => p.days.filter((d) => d.date >= NEXT && d.date <= "2026-11-08").reduce((s, d) => s + d.units, 0);
    const before = next(await plan());
    const row = (await put(body({ plannedUnits: 10 }))).json();
    const after = await plan();
    expect(next(after)).toBeCloseTo(10);
    expect(next(after)).not.toBeCloseTo(before);
    await app.inject({ method: "DELETE", url: `/api/week-overrides/${row.id}`, cookies });
    expect(next(await plan())).toBeCloseTo(before);
  });
});
