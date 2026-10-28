/**
 * S2b-28 tester pass: check-in edge cases end to end through the API, on the sample family.
 * Engine-level edges are in packages/engine/test/tester.checkins.test.ts; manual notes in docs/progress/tester-report.md.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import type { PlanResponse } from "../src/routes/plan";
import { hashSessionToken, newSessionToken } from "../src/auth/session";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { seedFamily } from "./helpers/seed";

type Item = { assignmentId: string; childId: string; plannedFrom: number; plannedTo: number; totalUnits: number; actual: number | null; mode: string | null };
type Plan = PlanResponse["plans"][number];

describe.skipIf(!hasDb)("S2b-28 check-in edge cases (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const at = (iso: string) => buildApp(testConfig(), { db: pool, now: () => new Date(iso) });
  // Wed Oct 28 in Chicago: last week is Oct 19–25.
  const app = hasDb ? at("2026-10-28T15:00:00Z") : null!;
  const apps = hasDb ? [app, at("2026-10-27T15:00:00Z"), at("2026-10-30T20:00:00Z")] : [];
  let fam: Awaited<ReturnType<typeof seedFamily>>;
  let cookies: { hh_session: string };
  let cookies2: { hh_session: string };
  let ti = "", hist = "", frank = "", margaret = "";
  const W = "2026-10-19";

  const session = async () => {
    const token = newSessionToken();
    await pool.query("INSERT INTO session (id, family_id, expires_at) VALUES ($1, $2, now() + interval '1 day')", [hashSessionToken(token), fam.familyId]);
    return { hh_session: token };
  };
  const put = (body: unknown, week = W, c = cookies) => app.inject({ method: "PUT", url: `/api/check-ins/${week}`, cookies: c, payload: body as object });
  const ok = async (body: unknown, week = W) => {
    const res = await put(body, week);
    expect(res.statusCode, res.body).toBe(200);
    return res.json<{ status: string; items: Item[]; planChanged: boolean }>();
  };
  const get = async (week?: string, c = cookies, on = app) => {
    const res = await on.inject({ method: "GET", url: `/api/check-ins${week ? `?weekStart=${week}` : ""}`, cookies: c });
    expect(res.statusCode, res.body).toBe(200);
    return res.json<{ weekStart: string; status: string | null; items: Item[] }>();
  };
  const plans = async (on = app, from = "2026-10-19", to = "2027-06-30") => {
    const res = await on.inject({ method: "GET", url: `/api/plan?from=${from}&to=${to}`, cookies });
    expect(res.statusCode, res.body).toBe(200);
    return res.json<PlanResponse>().plans;
  };
  const planOf = (ps: Plan[], a: string, c: string) => ps.find((p) => p.assignmentId === a && p.childId === c);
  const sumWeek = (p: Plan, w: string) => p.days.filter((d) => d.date >= w && d.date <= addDays(w, 6)).reduce((s, d) => s + d.units, 0);
  const itemOf = (items: Item[], a: string, c: string) => items.find((i) => i.assignmentId === a && i.childId === c);

  beforeAll(async () => {
    fam = await seedFamily("tester3-checkins@example.com");
    cookies = await session();
    cookies2 = await session();
    ti = fam.ids.assignment.ti!; hist = fam.ids.assignment.hist!;
    frank = fam.ids.child.frank!; margaret = fam.ids.child.margaret!;
  });
  beforeEach(async () => {
    await pool.query("DELETE FROM progress_checkin WHERE family_id = $1", [fam.familyId]);
    await pool.query("DELETE FROM week_review WHERE family_id = $1", [fam.familyId]);
    await pool.query("DELETE FROM log_entry WHERE family_id = $1", [fam.familyId]);
    await pool.query("DELETE FROM blocked_range WHERE family_id = $1 AND label = 'tester3'", [fam.familyId]);
    await pool.query("UPDATE child SET archived_at = NULL WHERE family_id = $1", [fam.familyId]);
    await pool.query("UPDATE assignment SET total_units = 270 WHERE id = $1", [ti]);
  });
  afterAll(async () => {
    await Promise.all(apps.map((a) => a.close()));
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });

  describe("case 1: no logging needed", () => {
    it("a family that never logs sees 90 pages of Treasure Island the week of Oct 26, the same on any day", async () => {
      const seen = [];
      for (const on of apps) {
        const p = planOf(await plans(on), ti, frank)!;
        expect(sumWeek(p, "2026-10-26")).toBeCloseTo(90);
        seen.push(p.days.map((d) => [d.date, d.units]));
      }
      expect(seen[1]).toEqual(seen[0]);
      expect(seen[2]).toEqual(seen[0]);
    });

    it("adding log rows doesn't move any bar", async () => {
      const before = await plans();
      const id = randomUUID();
      await pool.query("INSERT INTO log_entry (id, family_id, assignment_id, log_date, kind, minutes_spent) VALUES ($1, $2, $3, '2026-10-20', 'session', 40)", [id, fam.familyId, ti]);
      await pool.query("INSERT INTO log_child_progress (log_entry_id, child_id, assignment_id, log_date, kind, units) VALUES ($1, $2, $3, '2026-10-20', 'session', 5)", [id, frank, ti]);
      const after = await plans();
      expect(after.map((p) => p.days.map((d) => d.units))).toEqual(before.map((p) => p.days.map((d) => d.units)));
    });
  });

  describe("case 2: multi-child on a shared assignment", () => {
    it.each(["keepEndDate", "pushEndDate"] as const)("Margaret all done, Frank at 65 (%s): only Frank's plan changes", async (mode) => {
      const before = await plans();
      const week = await get();
      expect(itemOf(week.items, hist, frank)).toBeDefined();
      const total = itemOf(week.items, hist, margaret)!.totalUnits;
      await ok({ status: "reviewed", items: [
        { assignmentId: hist, childId: margaret, position: total, mode: null },
        { assignmentId: hist, childId: frank, position: 65, mode },
      ] });
      const after = await plans();
      const m = planOf(after, hist, margaret)!;
      expect(m.finishedEarly).toBe(true);
      expect(m.days.filter((d) => d.date >= "2026-10-26").every((d) => d.units === 0)).toBe(true);
      expect(planOf(after, hist, frank)!.days).not.toEqual(planOf(before, hist, frank)!.days);
      // Every other plan is untouched.
      for (const p of after.filter((x) => x.assignmentId !== hist))
        expect(p.days).toEqual(planOf(before, p.assignmentId, p.childId)!.days);
    });

    it("archiving Frank drops his plans and other weeks' rows but keeps the stored check-in (shown in its week)", async () => {
      await ok({ status: "reviewed", items: [{ assignmentId: hist, childId: frank, position: 65, mode: "keepEndDate" }] });
      const res = await app.inject({ method: "PATCH", url: `/api/children/${frank}`, cookies, payload: { archived: true } });
      expect(res.statusCode, res.body).toBe(200);
      expect((await plans()).some((p) => p.childId === frank)).toBe(false);
      expect((await get("2026-10-12")).items.some((i) => i.childId === frank)).toBe(false);
      const w = await get(W);
      expect(w.items.filter((i) => i.childId === frank).map((i) => [i.assignmentId, i.actual])).toEqual([[hist, 65]]);
      const { rows } = await pool.query("SELECT position::float AS p FROM progress_checkin WHERE child_id = $1", [frank]);
      expect(rows).toEqual([{ p: 65 }]);
    });
  });

  describe("case 3: finished early", () => {
    it("position = total: no bars after it, finishedEarly; editing the week back to as planned brings them back", async () => {
      const original = planOf(await plans(), ti, frank)!;
      await ok({ status: "reviewed", items: [{ assignmentId: ti, childId: frank, position: 270, mode: null }] });
      const done = planOf(await plans(), ti, frank)!;
      expect(done.finishedEarly).toBe(true);
      expect(done.days.filter((d) => d.date >= "2026-10-26").every((d) => d.units === 0)).toBe(true);
      // Nothing left to ask about the next week.
      const later = at("2026-11-04T15:00:00Z");
      try {
        expect(itemOf((await get(undefined, cookies, later)).items, ti, frank)).toBeUndefined();
      } finally {
        await later.close();
      }
      await ok({ status: "reviewed", items: [] });
      expect(planOf(await plans(), ti, frank)!.days).toEqual(original.days);
    });
  });

  describe("case 4: ahead", () => {
    it.each(["keepEndDate", "pushEndDate"] as const)("120 of 90 with %s: end earlier or equal, days still sum to the total", async (mode) => {
      const before = planOf(await plans(app, "2026-10-19", "2026-12-31"), ti, frank)!;
      await ok({ status: "reviewed", items: [{ assignmentId: ti, childId: frank, position: 120, mode }] });
      const full = planOf(await plans(app, "2026-08-31", "2026-12-31"), ti, frank)!;
      expect(full.end <= before.end).toBe(true);
      expect(full.days.reduce((s, d) => s + d.units, 0) + full.unplacedUnits).toBeCloseTo(270, 6);
    });
  });

  describe("case 5: vacation weeks", () => {
    const block = (startDate: string, endDate: string) =>
      app.inject({ method: "POST", url: "/api/blocked-ranges", cookies, payload: { label: "tester3", startDate, endDate } });

    it("a fully blocked last week → no items (no card)", async () => {
      expect((await block("2026-10-19", "2026-10-25")).statusCode).toBe(201);
      expect((await get()).items).toEqual([]);
    });

    it("a partly blocked week → the planned range covers only the open days", async () => {
      expect((await block("2026-10-21", "2026-10-25")).statusCode).toBe(201); // Wed–Sun off
      const p = planOf(await plans(), ti, frank)!;
      const open = p.days.filter((d) => d.date >= "2026-10-19" && d.date <= "2026-10-20").reduce((s, d) => s + d.units, 0);
      expect(p.days.filter((d) => d.date >= "2026-10-21" && d.date <= "2026-10-25").every((d) => d.units === 0)).toBe(true);
      const i = itemOf((await get()).items, ti, frank)!;
      expect(i.plannedTo - i.plannedFrom).toBeCloseTo(open, 2);
    });

    it("behind + push across a future vacation → no work in the vacation, the end after it", async () => {
      expect((await block("2026-11-09", "2026-11-13")).statusCode).toBe(201);
      await ok({ status: "reviewed", items: [{ assignmentId: ti, childId: frank, position: 40, mode: "pushEndDate" }] });
      const p = planOf(await plans(), ti, frank)!;
      expect(p.days.filter((d) => d.date >= "2026-11-09" && d.date <= "2026-11-13").every((d) => d.units === 0)).toBe(true);
      expect(p.end > "2026-11-13").toBe(true);
    });
  });

  describe("case 6: editing a past check-in", () => {
    it("week 1 at 65 (keep), week 2 at 140 (push); edit week 1 to 80 → from week 3 on starts from week 2's 140", async () => {
      const app2 = at("2026-11-04T15:00:00Z"); // so Oct 26 is a finished week too
      try {
        const putOn = (week: string, position: number, mode: string) =>
          app2.inject({ method: "PUT", url: `/api/check-ins/${week}`, cookies, payload: { status: "reviewed", items: [{ assignmentId: ti, childId: frank, position, mode }] } });
        expect((await putOn("2026-10-19", 65, "keepEndDate")).statusCode).toBe(200);
        expect((await putOn("2026-10-26", 140, "pushEndDate")).statusCode).toBe(200);
        const a = planOf(await plans(app2), ti, frank)!;
        expect((await putOn("2026-10-19", 80, "keepEndDate")).statusCode).toBe(200);
        const b = planOf(await plans(app2), ti, frank)!;
        for (const p of [a, b]) {
          expect(p.days.find((d) => d.date === "2026-11-01")!.position).toBeCloseTo(140);
          expect(p.days.filter((d) => d.date >= "2026-11-02").reduce((s, d) => s + d.units, 0)).toBeCloseTo(130, 6);
        }
        // Clearing week 2 → driven by week 1 again.
        const clear = await app2.inject({ method: "PUT", url: "/api/check-ins/2026-10-26", cookies, payload: { status: "reviewed", items: [] } });
        expect(clear.statusCode).toBe(200);
        const c = planOf(await plans(app2), ti, frank)!;
        expect(c.checkInWeeks).toEqual(["2026-10-19"]);
        expect(c.days.find((d) => d.date === "2026-10-25")!.position).toBeCloseTo(80);
        expect(c.end).toBe(planOf(await plans(), ti, frank)!.end); // keep: the original end (Nov 6)
      } finally {
        await app2.close();
      }
    });
  });

  describe("case 7: a week with no planned work", () => {
    it("before any start → items [] and nothing to review", async () => {
      expect((await get("2026-08-24")).items).toEqual([]);
    });
    it("every assignment finished → the next week has items []", async () => {
      const week = await get();
      await ok({ status: "reviewed", items: week.items.map((i) => ({ assignmentId: i.assignmentId, childId: i.childId, position: i.totalUnits, mode: null })) });
      const later = at("2026-11-04T15:00:00Z");
      try {
        expect((await get(undefined, cookies, later)).items).toEqual([]);
      } finally {
        await later.close();
      }
    });
    it("a stored check-in in a week that later lost its planned work → unplanned-progress, and a whole plan", async () => {
      await ok({ status: "reviewed", items: [{ assignmentId: ti, childId: frank, position: 100, mode: "keepEndDate" }] });
      expect((await block2("2026-10-19", "2026-10-25")).statusCode).toBe(201);
      const p = planOf(await plans(app, "2026-08-31", "2026-12-31"), ti, frank)!;
      expect(p.warnings).toContain("unplanned-progress");
      expect(p.days.find((d) => d.date === "2026-10-25")!.position).toBeCloseTo(100);
      expect(p.days.reduce((s, d) => s + d.units, 0) + p.unplacedUnits).toBeCloseTo(270, 6);
      // The week still lists the stored row so it can be corrected.
      expect(itemOf((await get()).items, ti, frank)!.actual).toBe(100);
    });
    it("a PUT for a pair with nothing planned that week (and nothing stored) → 400 invalid_reference", async () => {
      const crusoe = fam.ids.assignment.crusoe!;
      const res = await put({ status: "reviewed", items: [{ assignmentId: crusoe, childId: frank, position: 10, mode: "keepEndDate" }] });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe("invalid_reference");
    });
    const block2 = (startDate: string, endDate: string) =>
      app.inject({ method: "POST", url: "/api/blocked-ranges", cookies, payload: { label: "tester3", startDate, endDate } });
  });

  describe("case 8: skip", () => {
    it("counts as done, stays gone on reload and on another device, and can be edited later", async () => {
      const before = await plans();
      expect((await ok({ status: "skipped", items: [] })).planChanged).toBe(false);
      expect((await get()).status).toBe("skipped");
      expect((await get(undefined, cookies2)).status).toBe("skipped");
      expect(await plans()).toEqual(before);
      const edited = await ok({ status: "reviewed", items: [{ assignmentId: ti, childId: frank, position: 75, mode: "keepEndDate" }] });
      expect(edited).toMatchObject({ status: "reviewed", planChanged: true });
    });
  });

  describe("case 9: bad input", () => {
    const item = (over: Record<string, unknown>) => ({ assignmentId: ti, childId: frank, position: 75, mode: "keepEndDate", ...over });
    it.each([
      ["-1", { position: -1 }],
      ["> total", { position: 270.01 }],
      ["3 decimals", { position: 75.123 }],
      ["a string", { position: "75" }],
      ["null", { position: null }],
      ["a huge number", { position: 1e308 }],
      ["missing mode when behind", { mode: undefined }],
      ["an unknown mode", { mode: "later" }],
    ])("position/mode %s → 400", async (_label, over) => {
      const res = await put({ status: "reviewed", items: [item(over)] });
      expect(res.statusCode, res.body).toBe(400);
    });
    it("a non-JSON number (NaN as text) → 400", async () => {
      const res = await app.inject({ method: "PUT", url: `/api/check-ins/${W}`, cookies, headers: { "content-type": "application/json" },
        payload: `{"status":"reviewed","items":[{"assignmentId":"${ti}","childId":"${frank}","position":NaN,"mode":"keepEndDate"}]}` });
      expect(res.statusCode).toBe(400);
    });
    it.each(["2026-10-26", "2026-11-02", "2026-10-20", "2026-13-01"])("week %s → 400", async (week) => {
      expect((await put({ status: "reviewed", items: [] }, week)).statusCode).toBe(400);
    });
    it("a foreign assignment or child → 400, and nothing is stored", async () => {
      const other = await seedFamily("tester3-checkins-other@example.com");
      try {
        for (const over of [{ assignmentId: other.ids.assignment.ti }, { childId: other.ids.child.frank }])
          expect((await put({ status: "reviewed", items: [item(over)] })).statusCode).toBe(400);
        const { rows } = await pool.query("SELECT 1 FROM progress_checkin WHERE family_id = ANY($1::uuid[])", [[fam.familyId, other.familyId]]);
        expect(rows).toEqual([]);
      } finally {
        await pool.query("DELETE FROM family WHERE id = $1", [other.familyId]);
      }
    });
  });

  describe("case 10: the total is edited below a stored position", () => {
    it("the engine clamps with a warning, and the card shows the clamped value", async () => {
      await ok({ status: "reviewed", items: [{ assignmentId: ti, childId: frank, position: 150, mode: "keepEndDate" }] });
      const res = await app.inject({ method: "PATCH", url: `/api/assignments/${ti}`, cookies, payload: { totalUnits: 120 } });
      expect(res.statusCode, res.body).toBe(200);
      const p = planOf(await plans(app, "2026-08-31", "2026-12-31"), ti, frank)!;
      expect(p.warnings).toContain("checkin-clamped");
      expect(p.complete).toBe(true);
      const i = itemOf((await get()).items, ti, frank)!;
      expect(i.totalUnits).toBe(120);
      expect(i.actual).toBe(120);
    });
  });
});

function addDays(d: string, n: number): string {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}
