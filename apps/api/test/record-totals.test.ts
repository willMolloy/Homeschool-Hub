/** S9-08: Records totals for a range, from log entries only. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { totalsOf } from "../src/services/recordTotals";
import type { RecordEntryRow } from "../src/repos/recordEntryRepo";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

const row = (over: Partial<RecordEntryRow>): RecordEntryRow => ({ id: "x", family_id: "f", child_id: "c1", start_date: "2026-11-02", end_date: "2026-11-02", counts_school_day: true, school_days: 1, subject_minutes: {}, total_minutes: null, home_minutes: null, away_minutes: null, notes: null, books: [], ...over });

describe("totalsOf (pure)", () => {
  it("adds subjects, splits core and non-core, keeps a typed total, and lists each book once", () => {
    const t = totalsOf([
      row({ school_days: 5, subject_minutes: { m: 210, a: 60 }, books: ["Heidi", "treasure island"], home_minutes: 90, away_minutes: 30 }),
      row({ child_id: "c2", school_days: 3, subject_minutes: {}, total_minutes: 120, books: [" Treasure  Island ", "Heidi"], start_date: "2026-11-09" }),
    ], (id) => id === "m");
    expect(t).toEqual({ entries: 2, schoolDays: 5, totalMinutes: 390, coreMinutes: 210, nonCoreMinutes: 60, homeMinutes: 90, awayMinutes: 30, books: ["Heidi", "treasure island"], bySubject: [{ subjectId: "m", minutes: 210 }, { subjectId: "a", minutes: 60 }] });
  });
  it("school days add up within a child and the family shows the most any one child logged", () => {
    expect(totalsOf([row({ school_days: 2 }), row({ school_days: 3 }), row({ child_id: "c2", school_days: 4 })], () => false).schoolDays).toBe(5);
    expect(totalsOf([], () => false)).toMatchObject({ entries: 0, schoolDays: 0, totalMinutes: 0, books: [], bySubject: [] });
  });
});

describe.skipIf(!hasDb)("GET /api/records/totals (S9-08, integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let frank = "", margaret = "", math = "", reading = "";
  beforeAll(async () => {
    a = await signedInFamily(pool, "Totals A");
    b = await signedInFamily(pool, "Totals B");
    req = inject(app, a.cookies);
    const r = await rosterFor(app, a.cookies, ["Frank", "Margaret"], ["Math", "Reading"]);
    [frank, margaret] = r.childIds as [string, string];
    [math, reading] = r.subjectIds as [string, string];
    await req("PATCH", `/api/subjects/${math}`, { core: true });
  });
  beforeEach(async () => {
    await pool.query("DELETE FROM record_entry WHERE family_id = $1", [a.familyId]);
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });
  const totals = async (q: string) => (await req("GET", `/api/records/totals${q}`)).json();
  const log = (body: object) => req("POST", "/api/log-entries", body);

  it("the S9-07 example: Mon-Fri for both children, then a second week for Frank; right totals by range and child", async () => {
    await log({ childIds: [frank, margaret], startDate: "2026-11-02", endDate: "2026-11-06", subjectMinutes: { [math]: 210, [reading]: 120 } });
    await log({ childIds: [frank], startDate: "2026-11-09", endDate: "2026-11-11", subjectMinutes: { [math]: 60 }, books: ["Heidi"] });
    const week1 = "from=2026-11-02&to=2026-11-08";
    expect(await totals(`?${week1}&childId=${frank}`)).toMatchObject({ entries: 1, schoolDays: 5, totalMinutes: 330, coreMinutes: 210, nonCoreMinutes: 120, books: [], bySubject: [{ subjectId: math, minutes: 210 }, { subjectId: reading, minutes: 120 }] });
    expect(await totals(`?${week1}`)).toMatchObject({ entries: 2, schoolDays: 5, totalMinutes: 660 });
    const fall = "from=2026-08-17&to=2026-12-18";
    expect(await totals(`?${fall}&childId=${frank}`)).toMatchObject({ entries: 2, schoolDays: 8, totalMinutes: 390, coreMinutes: 270, nonCoreMinutes: 120, books: ["Heidi"] });
    expect(await totals(`?${fall}&childId=${margaret}`)).toMatchObject({ entries: 1, schoolDays: 5, totalMinutes: 330 });
    expect(await totals(`?${fall}`)).toMatchObject({ entries: 3, schoolDays: 8, totalMinutes: 720 });
    expect(await totals("?from=2026-11-10&to=2026-11-12")).toMatchObject({ entries: 0, schoolDays: 0, totalMinutes: 0 }); // by first day
    expect(await totals("")).toMatchObject({ entries: 3, from: null, to: null, childId: null });
  });

  it("reads only log entries: the plan's check-ins never count", async () => {
    await req("POST", "/api/assignments", { subjectId: math, title: "Math 5", unitType: "lessons", totalUnits: 100, weightPerUnit: 2, startDate: "2026-10-05", endDate: "2026-12-18", childIds: [frank] });
    const a1 = (await req("GET", "/api/assignments")).json()[0].id;
    await pool.query("INSERT INTO progress_checkin (family_id, assignment_id, child_id, week_start, position) VALUES ($1,$2,$3,'2026-10-12',10)", [a.familyId, a1, frank]);
    expect(await totals("?from=2026-01-01&to=2026-12-31")).toMatchObject({ entries: 0, schoolDays: 0, totalMinutes: 0 });
  });

  it("is private to the family, strict about its query, and writes nothing", async () => {
    await log({ childIds: [frank], startDate: "2026-11-02", totalMinutes: 60 });
    const theirs = await inject(app, b.cookies)("GET", "/api/records/totals");
    expect(theirs.json()).toMatchObject({ entries: 0 });
    expect((await req("GET", "/api/records/totals?bogus=1")).statusCode).toBe(400);
    expect((await req("GET", "/api/records/totals?from=nope")).statusCode).toBe(400);
    expect((await app.inject({ method: "POST", url: "/api/records/totals", cookies: a.cookies, payload: {} })).statusCode).toBe(404);
  });
});
