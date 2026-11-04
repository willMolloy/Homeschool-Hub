/** S9-07: log entries typed by the parent: one row per child, typed hours, school days counted from the calendar, undoable, never touching the plan. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("/api/log-entries (S9-07, integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => new Date("2026-11-04T15:00:00Z") }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let theirs: ReturnType<typeof inject>;
  let frank = "";
  let margaret = "";
  let math = "";
  let reading = "";
  let foreignKid = "";

  beforeAll(async () => {
    a = await signedInFamily(pool, "Log A");
    b = await signedInFamily(pool, "Log B");
    req = inject(app, a.cookies);
    theirs = inject(app, b.cookies);
    const r = await rosterFor(app, a.cookies, ["Frank", "Margaret"], ["Math", "Reading"]);
    [frank, margaret] = r.childIds as [string, string];
    [math, reading] = r.subjectIds as [string, string];
    foreignKid = (await rosterFor(app, b.cookies, ["Theirs"], [])).childIds[0]!;
  });
  beforeEach(async () => {
    await pool.query("DELETE FROM record_entry WHERE family_id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.query("DELETE FROM undo_entry WHERE family_id = $1", [a.familyId]);
    await pool.query("DELETE FROM blocked_range WHERE family_id = $1", [a.familyId]);
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  const WEEK = { startDate: "2026-11-02", endDate: "2026-11-06" }; // Mon-Fri
  const list = async (q = "") => (await req("GET", `/api/log-entries${q}`)).json() as Array<Record<string, unknown>>;
  const undoLabel = async () => (await req("GET", "/api/undo")).json()?.label as string | undefined;

  it("Mon-Fri for Frank and Margaret with Math 3 h 30 m and Reading 2 h: one entry each, 5 school days, those hours", async () => {
    const res = await req("POST", "/api/log-entries", { childIds: [frank, margaret], ...WEEK, subjectMinutes: { [math]: 210, [reading]: 120 } });
    expect(res.statusCode, res.body).toBe(201);
    const made = res.json() as Array<Record<string, unknown>>;
    expect(made).toHaveLength(2);
    expect(made.map((e) => e.childId).sort()).toEqual([frank, margaret].sort());
    for (const e of made) {
      expect(e).toEqual({ id: expect.any(String), childId: expect.any(String), ...WEEK, countsSchoolDay: true, schoolDays: 5, coveredDays: ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"], subjectMinutes: { [math]: 210, [reading]: 120 }, totalMinutes: null, homeMinutes: null, awayMinutes: null, notes: null, books: [], days: null });
    }
    expect(new Set(made.map((e) => e.id)).size).toBe(2);
    expect((await pool.query("SELECT count(*)::int AS n FROM record_entry WHERE family_id = $1", [a.familyId])).rows[0].n).toBe(2);
    expect(await list(`?childId=${frank}`)).toHaveLength(1);
  });

  it("nothing is prefilled: only what was typed is stored, and the school-day switch defaults on", async () => {
    const e = (await req("POST", "/api/log-entries", { childIds: [frank], startDate: "2026-11-02" })).json()[0];
    expect(e).toMatchObject({ countsSchoolDay: true, schoolDays: 1, subjectMinutes: {}, totalMinutes: null, homeMinutes: null, awayMinutes: null, notes: null, books: [], days: null });
  });

  describe("counting school days", () => {
    it("days off are left out of a run, for the whole family or one child", async () => {
      await req("POST", "/api/blocked-ranges", { startDate: "2026-11-04", endDate: "2026-11-04", kind: "holiday" }); // everyone
      await req("POST", "/api/blocked-ranges", { startDate: "2026-11-05", endDate: "2026-11-05", kind: "sick", childIds: [frank] });
      const made = (await req("POST", "/api/log-entries", { childIds: [frank, margaret], ...WEEK })).json() as Array<{ childId: string; schoolDays: number }>;
      expect(made.find((e) => e.childId === frank)!.schoolDays).toBe(3);
      expect(made.find((e) => e.childId === margaret)!.schoolDays).toBe(4);
    });
    it("weekends are not school days in a run; one chosen date always counts one", async () => {
      const run = (await req("POST", "/api/log-entries", { childIds: [frank], startDate: "2026-11-02", endDate: "2026-11-15" })).json()[0];
      expect(run.schoolDays).toBe(10);
      const sat = (await req("POST", "/api/log-entries", { childIds: [frank], startDate: "2026-11-07" })).json()[0];
      expect(sat.schoolDays).toBe(1);
      const weekend = (await req("POST", "/api/log-entries", { childIds: [frank], startDate: "2026-11-07", endDate: "2026-11-08" })).json()[0];
      expect(weekend.schoolDays).toBe(0);
    });
    it("days are worked out from the dates when read (S9b-01): a day off added later is left out of an older run", async () => {
      const e = (await req("POST", "/api/log-entries", { childIds: [frank], ...WEEK })).json()[0];
      expect(e.schoolDays).toBe(5);
      await req("POST", "/api/blocked-ranges", { startDate: "2026-11-03", endDate: "2026-11-03", kind: "holiday" });
      const [again] = await list();
      expect(again).toMatchObject({ schoolDays: 4, coveredDays: ["2026-11-02", "2026-11-04", "2026-11-05", "2026-11-06"] });
    });
    it("with the switch off the entry counts 0 days, and the switch is stored", async () => {
      const e = (await req("POST", "/api/log-entries", { childIds: [frank], ...WEEK, countsSchoolDay: false, totalMinutes: 60 })).json()[0];
      expect(e).toMatchObject({ countsSchoolDay: false, schoolDays: 0, totalMinutes: 60 });
    });
  });

  describe("validation", () => {
    const post = (b: object) => req("POST", "/api/log-entries", b);
    it("hours are 0-24 a day", async () => {
      expect((await post({ childIds: [frank], startDate: "2026-11-02", totalMinutes: 1440 })).statusCode).toBe(201);
      const over = await post({ childIds: [frank], startDate: "2026-11-02", totalMinutes: 1441 });
      expect(over.statusCode).toBe(400);
      expect(over.json().message).toMatch(/can't be more than 24 a day/);
      expect((await post({ childIds: [frank], startDate: "2026-11-02", subjectMinutes: { [math]: 1000, [reading]: 441 } })).statusCode).toBe(400);
      expect((await post({ childIds: [frank], startDate: "2026-11-02", homeMinutes: 800, awayMinutes: 700 })).statusCode).toBe(400);
      expect((await post({ childIds: [frank], ...WEEK, totalMinutes: 1440 * 5 })).statusCode).toBe(201);
      expect((await post({ childIds: [frank], ...WEEK, totalMinutes: 1440 * 5 + 1 })).statusCode).toBe(400);
      expect((await post({ childIds: [frank], startDate: "2026-11-02", totalMinutes: -1 })).statusCode).toBe(400);
      expect((await post({ childIds: [frank], startDate: "2026-11-02", totalMinutes: 1.5 })).statusCode).toBe(400);
    });
    it("needs a child that is the family's, a real date in order, and a run of at most a year", async () => {
      expect((await post({ childIds: [], startDate: "2026-11-02" })).statusCode).toBe(400);
      expect((await post({ childIds: [foreignKid], startDate: "2026-11-02" })).statusCode).toBe(400);
      expect((await post({ childIds: [frank, frank], startDate: "2026-11-02" })).statusCode).toBe(400);
      expect((await post({ childIds: [frank], startDate: "2026-11-31" })).statusCode).toBe(400);
      expect((await post({ childIds: [frank], startDate: "2026-11-06", endDate: "2026-11-02" })).json().error).toBe("invalid_range");
      expect((await post({ childIds: [frank], startDate: "2026-01-01", endDate: "2027-01-02" })).statusCode).toBe(400);
      expect((await post({ childIds: [frank], startDate: "2026-01-01", endDate: "2027-01-01" })).statusCode).toBe(201);
    });
    it("subjects must be the family's; unknown fields are refused", async () => {
      const theirSubject = (await rosterFor(app, b.cookies, [], ["Theirs"])).subjectIds[0]!;
      expect((await post({ childIds: [frank], startDate: "2026-11-02", subjectMinutes: { [theirSubject]: 30 } })).statusCode).toBe(400);
      expect((await post({ childIds: [frank], startDate: "2026-11-02", subjectMinutes: { nope: 30 } })).statusCode).toBe(400);
      expect((await post({ childIds: [frank], startDate: "2026-11-02", extra: 1 })).statusCode).toBe(400);
      expect((await post({ childIds: [frank], startDate: "2026-11-02", countsSchoolDay: "yes" })).statusCode).toBe(400);
    });
    it("notes are trimmed (blank is none), books are a list of titles, and both are bounded", async () => {
      const e = (await post({ childIds: [frank], startDate: "2026-11-02", notes: "  Nature walk  ", books: [" Treasure Island ", "Heidi"] })).json()[0];
      expect(e).toMatchObject({ notes: "Nature walk", books: ["Treasure Island", "Heidi"] });
      expect((await post({ childIds: [frank], startDate: "2026-11-03", notes: "   " })).json()[0].notes).toBeNull();
      expect((await post({ childIds: [frank], startDate: "2026-11-02", notes: "x".repeat(2001) })).statusCode).toBe(400);
      expect((await post({ childIds: [frank], startDate: "2026-11-02", books: [""] })).statusCode).toBe(400);
      expect((await post({ childIds: [frank], startDate: "2026-11-02", books: Array(51).fill("B") })).statusCode).toBe(400);
    });
  });

  describe("the list, edits and deletes", () => {
    it("lists newest first, and filters by range and child", async () => {
      for (const d of ["2026-11-02", "2026-11-09", "2026-11-16"]) await req("POST", "/api/log-entries", { childIds: [frank, margaret], startDate: d });
      const all = await list();
      expect(all.map((e) => e.startDate)).toEqual(["2026-11-16", "2026-11-16", "2026-11-09", "2026-11-09", "2026-11-02", "2026-11-02"]);
      expect(await list("?from=2026-11-09&to=2026-11-09")).toHaveLength(2);
      // S9b-01: a range holds every entry with a day in it, not only those that start in it
      await req("POST", "/api/log-entries", { childIds: [frank], startDate: "2026-11-05", endDate: "2026-11-10" });
      expect((await list("?from=2026-11-09&to=2026-11-09")).map((e) => e.startDate)).toEqual(["2026-11-09", "2026-11-09", "2026-11-05"]);
      expect(await list(`?childId=${margaret}&from=2026-11-05`)).toHaveLength(2);
      expect(await list(`?childId=${frank}&from=2026-11-11&to=2026-11-15`)).toHaveLength(0);
      expect((await req("GET", "/api/log-entries?bogus=1")).statusCode).toBe(400);
    });

    it("an edit changes only what was sent: hidden fields keep their typed values, and the school days are worked out again", async () => {
      const e = (await req("POST", "/api/log-entries", { childIds: [frank], ...WEEK, subjectMinutes: { [math]: 60 }, notes: "kept", books: ["Heidi"], homeMinutes: 30 })).json()[0];
      const p = await req("PATCH", `/api/log-entries/${e.id}`, { subjectMinutes: { [math]: 90 }, endDate: "2026-11-04" });
      expect(p.statusCode, p.body).toBe(200);
      expect(p.json()).toEqual({ ...e, subjectMinutes: { [math]: 90 }, endDate: "2026-11-04", schoolDays: 3, coveredDays: ["2026-11-02", "2026-11-03", "2026-11-04"] });
      expect((await req("PATCH", `/api/log-entries/${e.id}`, { countsSchoolDay: false })).json()).toMatchObject({ countsSchoolDay: false, schoolDays: 0, notes: "kept", books: ["Heidi"], homeMinutes: 30 });
      expect((await req("PATCH", `/api/log-entries/${e.id}`, { notes: null, homeMinutes: null })).json()).toMatchObject({ notes: null, homeMinutes: null, books: ["Heidi"] });
      expect((await req("PATCH", `/api/log-entries/${e.id}`, { totalMinutes: 99999 })).statusCode).toBe(400);
      expect((await req("PATCH", `/api/log-entries/${e.id}`, {})).statusCode).toBe(400);
      expect((await req("PATCH", `/api/log-entries/${e.id}`, { childId: margaret })).statusCode).toBe(400); // an entry stays its child's
    });

    it("moving a single day moves the whole entry; unknown and foreign ids are 404", async () => {
      const e = (await req("POST", "/api/log-entries", { childIds: [frank], startDate: "2026-11-02" })).json()[0];
      expect((await req("PATCH", `/api/log-entries/${e.id}`, { startDate: "2026-11-03" })).json()).toMatchObject({ startDate: "2026-11-03", endDate: "2026-11-03", schoolDays: 1 });
      expect((await theirs("PATCH", `/api/log-entries/${e.id}`, { notes: "mine now" })).statusCode).toBe(404);
      expect((await theirs("DELETE", `/api/log-entries/${e.id}`)).statusCode).toBe(404);
      expect((await req("PATCH", "/api/log-entries/not-an-id", { notes: "x" })).statusCode).toBe(404);
      expect((await req("DELETE", "/api/log-entries/00000000-0000-4000-8000-000000000000")).statusCode).toBe(404);
      expect(await theirs("GET", "/api/log-entries").then((r) => r.json())).toEqual([]);
    });

    it("delete is undoable, and so is an edit (one step back)", async () => {
      const e = (await req("POST", "/api/log-entries", { childIds: [frank], ...WEEK, totalMinutes: 300, notes: "first" })).json()[0];
      expect(await undoLabel()).toBeUndefined(); // creating leaves no undo entry
      await req("PATCH", `/api/log-entries/${e.id}`, { totalMinutes: 400, notes: "second" });
      expect(await undoLabel()).toBe("Changed Frank's log for Nov 2 to Nov 6");
      expect((await req("POST", "/api/undo")).statusCode).toBe(200);
      expect((await list())[0]).toMatchObject({ id: e.id, totalMinutes: 300, notes: "first" });
      expect((await req("DELETE", `/api/log-entries/${e.id}`)).statusCode).toBe(204);
      expect(await list()).toEqual([]);
      expect(await undoLabel()).toBe("Deleted Frank's log for Nov 2 to Nov 6");
      expect((await req("POST", "/api/undo")).statusCode).toBe(200);
      expect(await list()).toEqual([e]);
    });

    it("a family's undo of a log entry never reaches another family", async () => {
      const e = (await req("POST", "/api/log-entries", { childIds: [frank], startDate: "2026-11-02" })).json()[0];
      await req("DELETE", `/api/log-entries/${e.id}`);
      expect((await theirs("POST", "/api/undo")).statusCode).toBe(404);
    });
  });

  it("logging never changes the plan: no assignment, check-in, override, review or day off is written, and the plan is identical", async () => {
    await req("POST", "/api/assignments", { subjectId: math, title: "Math 5", unitType: "lessons", totalUnits: 100, weightPerUnit: 2, startDate: "2026-10-26", endDate: "2026-12-18", childIds: [frank, margaret] });
    const counts = async () => (await pool.query(
      `SELECT (SELECT count(*) FROM assignment WHERE family_id = $1)::int AS assignments, (SELECT count(*) FROM progress_checkin WHERE family_id = $1)::int AS checkins,
              (SELECT count(*) FROM week_override WHERE family_id = $1)::int AS overrides, (SELECT count(*) FROM week_review WHERE family_id = $1)::int AS reviews,
              (SELECT count(*) FROM blocked_range WHERE family_id = $1)::int AS blocked, (SELECT updated_at::text FROM assignment WHERE family_id = $1 LIMIT 1) AS touched`, [a.familyId])).rows[0];
    const plan = async () => (await req("GET", "/api/plan?from=2026-10-26&to=2026-12-31")).json().plans;
    const [c0, p0] = [await counts(), await plan()];
    const made = (await req("POST", "/api/log-entries", { childIds: [frank, margaret], ...WEEK, subjectMinutes: { [math]: 600 }, totalMinutes: 600 })).json() as Array<{ id: string }>;
    await req("PATCH", `/api/log-entries/${made[0]!.id}`, { subjectMinutes: { [math]: 1 } });
    await req("DELETE", `/api/log-entries/${made[1]!.id}`);
    await req("POST", "/api/undo");
    expect(await counts()).toEqual(c0);
    expect(await plan()).toEqual(p0);
  });

  it("deleting a child takes its entries with it; entries of an archived child stay listed", async () => {
    const kid = (await req("POST", "/api/children", { name: "Short-lived" })).json().id;
    await req("POST", "/api/log-entries", { childIds: [kid], startDate: "2026-11-02" });
    await req("PATCH", `/api/children/${kid}`, { archived: true });
    expect((await list(`?childId=${kid}`)).length).toBe(1);
    await pool.query("DELETE FROM child WHERE id = $1", [kid]);
    expect((await list(`?childId=${kid}`)).length).toBe(0);
  });
});
