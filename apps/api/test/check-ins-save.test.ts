/** S2b-24: PUT /api/check-ins/:weekStart — save a week's review in one transaction. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import type { PlanResponse } from "../src/routes/plan";
import { checkItem } from "../src/services/checkInService";
import { hashSessionToken, newSessionToken } from "../src/auth/session";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { seedFamily } from "./helpers/seed";
import { signedInFamily } from "./helpers/session";

describe("checkItem (D11)", () => {
  const p = { plannedTo: 80, totalUnits: 184 };
  const it_ = (position: number, mode: "keepEndDate" | "pushEndDate" | null) => () => checkItem({ assignmentId: "a", childId: "c", position, mode }, p, "items.0");
  it("as planned (within 0.5) is not stored and takes no mode", () => {
    expect(it_(80, null)()).toBe(false);
    expect(it_(80.5, null)()).toBe(false);
    expect(it_(79.5, null)()).toBe(false);
    expect(it_(80, "keepEndDate")).toThrow(/leave it empty/);
  });
  it("off plan needs a mode; finishing takes none", () => {
    expect(it_(65, "keepEndDate")()).toBe(true);
    expect(it_(80.51, "pushEndDate")()).toBe(true);
    expect(it_(65, null)).toThrow(/choose how to catch up or use the extra time/);
    expect(it_(184, null)()).toBe(true);
    expect(it_(184, "pushEndDate")).toThrow(/leave it empty/);
    expect(it_(184.01, null)).toThrow(/more than the total \(184\)/);
  });
});

describe.skipIf(!hasDb)("PUT /api/check-ins/:weekStart (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  // Wed Oct 28, 10:00 in Chicago: last week is Oct 19–25, where Treasure Island for Frank was planned 0–90.
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => new Date("2026-10-28T15:00:00Z") }) : null!;
  let fam: Awaited<ReturnType<typeof seedFamily>>;
  let cookies: { hh_session: string };
  let other: Awaited<ReturnType<typeof signedInFamily>>;
  let ti = "", frank = "", margaret = "";
  const W = "2026-10-19";

  const put = (body: unknown, week = W) =>
    app.inject({ method: "PUT", url: `/api/check-ins/${week}`, cookies, payload: body as object });
  const saved = async (body: unknown) => {
    const res = await put(body);
    expect(res.statusCode, res.body).toBe(200);
    return res.json();
  };
  const bad = async (body: unknown, code: string, msg: RegExp, week = W) => {
    const res = await put(body, week);
    expect(res.statusCode, res.body).toBe(400);
    expect(res.json()).toMatchObject({ error: code });
    expect(res.json().message).toMatch(msg);
  };
  const tiItem = (position: number, mode: string | null = null, childId = frank) => ({ assignmentId: ti, childId, position, mode });
  const rows = async () => (await pool.query("SELECT position::float AS position, mode FROM progress_checkin WHERE family_id = $1", [fam.familyId])).rows;
  const review = async () => (await pool.query("SELECT status FROM week_review WHERE family_id = $1 AND week_start = $2", [fam.familyId, W])).rows[0]?.status ?? null;
  const tiPlan = async () => {
    const res = await app.inject({ method: "GET", url: "/api/plan?from=2026-10-19&to=2026-11-13&asOf=2026-10-28", cookies });
    expect(res.statusCode, res.body).toBe(200);
    return res.json<PlanResponse>().plans.find((p) => p.assignmentId === ti && p.childId === frank)!;
  };
  const weekOf26 = (p: Awaited<ReturnType<typeof tiPlan>>) => p.days.filter((d) => d.date >= "2026-10-26" && d.date <= "2026-10-30");

  beforeAll(async () => {
    fam = await seedFamily("check-ins-save@example.com");
    const token = newSessionToken();
    await pool.query("INSERT INTO session (id, family_id, expires_at) VALUES ($1, $2, now() + interval '1 day')",
      [hashSessionToken(token), fam.familyId]);
    cookies = { hh_session: token };
    other = await signedInFamily(pool, "Check-ins save other");
    ti = fam.ids.assignment.ti!; frank = fam.ids.child.frank!; margaret = fam.ids.child.margaret!;
  });
  beforeEach(async () => {
    await pool.query("DELETE FROM progress_checkin WHERE family_id = $1", [fam.familyId]);
    await pool.query("DELETE FROM week_review WHERE family_id = $1", [fam.familyId]);
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1::uuid[])", [[fam.familyId, other.familyId]]);
    await pool.end();
  });

  it("401 without a session", async () => {
    expect((await app.inject({ method: "PUT", url: `/api/check-ins/${W}`, payload: { status: "reviewed", items: [] } })).statusCode).toBe(401);
  });

  it("went as planned: no rows, status reviewed, plan unchanged", async () => {
    const body = await saved({ status: "reviewed", items: [] });
    expect(body).toMatchObject({ weekStart: W, status: "reviewed", planChanged: false });
    expect(await rows()).toEqual([]);
    expect(await review()).toBe("reviewed");
  });

  it("an item within 0.5 of the plan is not stored", async () => {
    const body = await saved({ status: "reviewed", items: [tiItem(89.6)] });
    expect(body.planChanged).toBe(false);
    expect(await rows()).toEqual([]);
  });

  it("75 of a planned 90 with keepEndDate: a row, and the next week's bars are thicker", async () => {
    const before = await tiPlan();
    const body = await saved({ status: "reviewed", items: [tiItem(75, "keepEndDate")] });
    expect(body.planChanged).toBe(true);
    expect(body.items.find((i: { assignmentId: string; childId: string }) => i.assignmentId === ti && i.childId === frank))
      .toMatchObject({ plannedTo: 90, actual: 75, mode: "keepEndDate" });
    expect(await rows()).toEqual([{ position: 75, mode: "keepEndDate" }]);
    const after = await tiPlan();
    expect(after.end).toBe(before.end);
    const sum = (ds: { units: number }[]) => ds.reduce((s, d) => s + d.units, 0);
    expect(sum(weekOf26(after))).toBeGreaterThan(sum(weekOf26(before)));
    const thick = (ds: { thickness: number }[]) => Math.max(...ds.map((d) => d.thickness));
    expect(thick(weekOf26(after))).toBeGreaterThan(thick(weekOf26(before)));
  });

  it("off plan with no mode → 400", async () => {
    await bad({ status: "reviewed", items: [tiItem(75)] }, "invalid_request", /mode: choose how to catch up or use the extra time/);
    expect(await rows()).toEqual([]);
    expect(await review()).toBeNull();
  });

  it("120 of a planned 90 with pushEndDate: the end moves earlier (7 days left at 22.5 instead of 8)", async () => {
    const before = await tiPlan();
    await saved({ status: "reviewed", items: [tiItem(120, "pushEndDate")] });
    expect((await tiPlan()).end < before.end).toBe(true);
  });

  it("position = total with no mode finishes early; with a mode → 400", async () => {
    await saved({ status: "reviewed", items: [tiItem(270)] });
    expect(await rows()).toEqual([{ position: 270, mode: null }]);
    expect((await tiPlan()).finishedEarly).toBe(true);
    await bad({ status: "reviewed", items: [tiItem(270, "pushEndDate")] }, "invalid_request", /mode: leave it empty/);
  });

  it.each([
    [271, /more than the total \(270\)/],
    [-1, /position must be at least 0/],
    [12.345, /at most 2 decimal places/],
  ])("position %s → 400", async (position, msg) => {
    await bad({ status: "reviewed", items: [tiItem(position, "keepEndDate")] }, "invalid_request", msg);
  });

  it("a child not on the assignment, or a foreign id → 400 invalid_reference", async () => {
    await bad({ status: "reviewed", items: [tiItem(75, "keepEndDate", margaret)] }, "invalid_reference", /items\.0/);
    const theirs = await pool.query<{ id: string }>("INSERT INTO child (family_id, name) VALUES ($1, 'Zed') RETURNING id", [other.familyId]);
    await bad({ status: "reviewed", items: [tiItem(75, "keepEndDate", theirs.rows[0]!.id)] }, "invalid_reference", /items\.0/);
    await bad({ status: "reviewed", items: [{ ...tiItem(75, "keepEndDate"), assignmentId: "00000000-0000-4000-8000-000000000000" }] }, "invalid_reference", /items\.0/);
  });

  it("strict body: unknown keys, bad ids, bad status and duplicates → 400", async () => {
    await bad({ status: "reviewed", items: [], extra: 1 }, "invalid_request", /extra|Unrecognized/i);
    await bad({ status: "done", items: [] }, "invalid_request", /status must be/);
    await bad({ status: "reviewed", items: [{ ...tiItem(75, "keepEndDate"), childId: "nope" }] }, "invalid_request", /childId must be a UUID/);
    await bad({ status: "reviewed", items: [tiItem(75, "keepEndDate"), tiItem(70, "keepEndDate")] }, "invalid_request", /listed twice/);
  });

  it("skip: with items → 400; without → status skipped and no rows", async () => {
    await bad({ status: "skipped", items: [tiItem(75, "keepEndDate")] }, "invalid_request", /skipped week/);
    await saved({ status: "reviewed", items: [tiItem(75, "keepEndDate")] });
    const body = await saved({ status: "skipped", items: [] });
    expect(body).toMatchObject({ status: "skipped", planChanged: true });
    expect(await rows()).toEqual([]);
    expect(await review()).toBe("skipped");
  });

  it("edit a past week: save 75, then save again with no items → the row is gone and the plan is the original", async () => {
    const original = await tiPlan();
    await saved({ status: "reviewed", items: [tiItem(75, "keepEndDate")] });
    expect(await tiPlan()).not.toEqual(original);
    const again = await saved({ status: "reviewed", items: [] });
    expect(again.planChanged).toBe(true);
    expect(await rows()).toEqual([]);
    expect(await tiPlan()).toEqual(original);
  });

  it("re-saving the same values reports no change and keeps created_at", async () => {
    await saved({ status: "reviewed", items: [tiItem(75, "keepEndDate")] });
    const c1 = (await pool.query("SELECT created_at FROM progress_checkin WHERE family_id = $1", [fam.familyId])).rows[0].created_at;
    expect((await saved({ status: "reviewed", items: [tiItem(75, "keepEndDate")] })).planChanged).toBe(false);
    const c2 = (await pool.query("SELECT created_at FROM progress_checkin WHERE family_id = $1", [fam.familyId])).rows[0].created_at;
    expect(c2).toEqual(c1);
  });

  it.each([
    ["2026-10-26", /finished week/],
    ["2026-11-02", /finished week/],
    ["2026-10-21", /first day of a week/],
    ["junk", /weekStart/],
  ])("week %s → 400", async (week, msg) => {
    await bad({ status: "reviewed", items: [] }, "invalid_request", msg, week);
  });

  it("a failure part-way through writes nothing", async () => {
    // Fail the last write (week_review), for this family only, so other suites sharing the DB are unaffected.
    await pool.query(`CREATE OR REPLACE FUNCTION s2b24_fail() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.family_id = '${fam.familyId}' THEN RAISE EXCEPTION 's2b24 injected failure'; END IF; RETURN NEW; END $$`);
    await pool.query("CREATE TRIGGER s2b24_fail BEFORE INSERT OR UPDATE ON week_review FOR EACH ROW EXECUTE FUNCTION s2b24_fail()");
    try {
      const res = await put({ status: "reviewed", items: [tiItem(75, "keepEndDate")] });
      expect(res.statusCode).toBe(500);
    } finally {
      await pool.query("DROP TRIGGER s2b24_fail ON week_review");
      await pool.query("DROP FUNCTION s2b24_fail()");
    }
    expect(await rows()).toEqual([]);
    expect(await review()).toBeNull();
  });
});
