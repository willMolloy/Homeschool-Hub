/** S9-08: Records totals for a range, from log entries only. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { shareInRange, totalsOf, type DatedEntry } from "../src/services/recordTotals";
import type { RecordEntryRow } from "../src/repos/recordEntryRepo";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

const row = (over: Partial<RecordEntryRow> & { days?: string[] }): DatedEntry => ({ id: "x", family_id: "f", child_id: "c1", start_date: "2026-11-02", end_date: "2026-11-02", counts_school_day: true, school_days: 1, subject_minutes: {}, total_minutes: null, home_minutes: null, away_minutes: null, notes: null, books: [], days: over.days ?? [over.start_date ?? "2026-11-02"], ...over });
const MON_FRI = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"];

describe("totalsOf (pure)", () => {
  it("adds subjects, splits core and non-core, keeps a typed total, and lists each book once", () => {
    const t = totalsOf([
      row({ start_date: "2026-11-02", end_date: "2026-11-06", days: MON_FRI, subject_minutes: { m: 210, a: 60 }, books: ["Heidi", "treasure island"], home_minutes: 90, away_minutes: 30 }),
      row({ child_id: "c2", subject_minutes: {}, total_minutes: 120, books: [" Treasure  Island ", "Heidi"], start_date: "2026-11-09", days: ["2026-11-09"] }),
    ], (id) => id === "m");
    expect(t).toMatchObject({ entries: 2, partialEntries: 0, schoolDays: 6, totalMinutes: 390, coreMinutes: 210, nonCoreMinutes: 60, homeMinutes: 90, awayMinutes: 30, books: ["Heidi", "treasure island"], bySubject: [{ subjectId: "m", minutes: 210 }, { subjectId: "a", minutes: 60 }] });
    expect(t.perChild).toEqual([{ childId: "c1", schoolDays: 5 }, { childId: "c2", schoolDays: 1 }]);
  });
  it("two entries for one child on one day count the day once; All children is the union of days, with each child's own count", () => {
    expect(totalsOf([row({}), row({ subject_minutes: { m: 30 } })], () => false).schoolDays).toBe(1);
    const t = totalsOf([
      row({ start_date: "2026-11-02", end_date: "2026-11-05", days: MON_FRI.slice(0, 4) }),
      row({ child_id: "c2", start_date: "2026-11-03", end_date: "2026-11-06", days: MON_FRI.slice(1) }),
    ], () => false);
    expect(t.schoolDays).toBe(5);
    expect(t.perChild).toEqual([{ childId: "c1", schoolDays: 4 }, { childId: "c2", schoolDays: 4 }]);
    expect(totalsOf([], () => false)).toMatchObject({ entries: 0, schoolDays: 0, totalMinutes: 0, books: [], bySubject: [], perChild: [] });
  });
  it("a range inside a run takes only its days and the same share of the typed hours", () => {
    const run = row({ start_date: "2026-11-02", end_date: "2026-11-06", days: MON_FRI, subject_minutes: { m: 600 }, home_minutes: 300, books: ["Heidi"] });
    const t = totalsOf([run], (id) => id === "m", { from: "2026-11-04", to: "2026-11-05" });
    expect(t).toMatchObject({ entries: 1, partialEntries: 1, schoolDays: 2, totalMinutes: 240, coreMinutes: 240, homeMinutes: 120, books: ["Heidi"] });
    expect(shareInRange(run, { from: "2026-11-04", to: "2026-11-05" })).toBeCloseTo(0.4);
    expect(totalsOf([run], () => false, { from: "2026-11-09", to: "2026-11-10" })).toMatchObject({ entries: 0, schoolDays: 0, totalMinutes: 0 });
    expect(totalsOf([run], () => false, { from: "2026-10-01", to: "2026-12-01" })).toMatchObject({ partialEntries: 0, totalMinutes: 600 });
  });
  it("days off inside a run are not days; a switch-off or weekend run is cut by calendar days", () => {
    const run = row({ start_date: "2026-11-02", end_date: "2026-11-06", days: ["2026-11-02", "2026-11-06"], total_minutes: 300 });
    expect(totalsOf([run], () => false, { from: "2026-11-02", to: "2026-11-03" })).toMatchObject({ schoolDays: 1, totalMinutes: 150 });
    const off = row({ start_date: "2026-11-02", end_date: "2026-11-06", days: [], counts_school_day: false, total_minutes: 500 });
    expect(totalsOf([off], () => false, { from: "2026-11-02", to: "2026-11-03" })).toMatchObject({ schoolDays: 0, totalMinutes: 200 });
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
    // S9b-01: Frank's Nov 9-11 run overlaps Nov 10-12 by 2 of its 3 days: 2 days and 2/3 of its hour (it was "by first day" before).
    expect(await totals("?from=2026-11-10&to=2026-11-12")).toMatchObject({ entries: 1, partialEntries: 1, schoolDays: 2, totalMinutes: 40 });
    expect(await totals("?from=2026-11-16&to=2026-11-20")).toMatchObject({ entries: 0, schoolDays: 0, totalMinutes: 0 });
    expect(await totals("")).toMatchObject({ entries: 3, from: null, to: null, childId: null });
  });

  it("the tester's cases (S9b-01): a second entry on a day counts it once; Mon-Thu and Tue-Fri is 5 days for All children; Wed-Thu inside Mon-Fri is 2 days and 2/5 of its hours", async () => {
    await log({ childIds: [frank], startDate: "2026-11-02", endDate: "2026-11-06", totalMinutes: 600 });
    await log({ childIds: [frank], startDate: "2026-11-02", subjectMinutes: { [math]: 60 } });
    const week = "from=2026-11-02&to=2026-11-08";
    expect(await totals(`?${week}&childId=${frank}`)).toMatchObject({ schoolDays: 5, entries: 2, totalMinutes: 660 });
    expect(await totals(`?from=2026-11-04&to=2026-11-05&childId=${frank}`)).toMatchObject({ schoolDays: 2, entries: 1, partialEntries: 1, totalMinutes: 240 });
    await pool.query("DELETE FROM record_entry WHERE family_id = $1", [a.familyId]);
    await log({ childIds: [frank], startDate: "2026-11-02", endDate: "2026-11-05" });
    await log({ childIds: [margaret], startDate: "2026-11-03", endDate: "2026-11-06" });
    const both = await totals(`?${week}`);
    expect(both.schoolDays).toBe(5);
    expect(both.perChild).toEqual([{ childId: frank, schoolDays: 4 }, { childId: margaret, schoolDays: 4 }].sort((x, y) => x.childId.localeCompare(y.childId)));
  });

  it("days off inside a run, added later, are left out of the days; the entry's own days follow the calendar", async () => {
    const e = (await log({ childIds: [frank], startDate: "2026-11-02", endDate: "2026-11-06" })).json()[0];
    expect(e.countedDays).toEqual(["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"]);
    await req("POST", "/api/blocked-ranges", { startDate: "2026-11-04", endDate: "2026-11-04", kind: "holiday" });
    expect(await totals(`?from=2026-11-02&to=2026-11-08&childId=${frank}`)).toMatchObject({ schoolDays: 4 });
    const listed = (await req("GET", "/api/log-entries")).json()[0];
    expect(listed).toMatchObject({ schoolDays: 4 });
    expect(listed.countedDays).not.toContain("2026-11-04");
  });

  it("a switch-off entry adds no days but its hours still count", async () => {
    await log({ childIds: [frank], startDate: "2026-11-02", endDate: "2026-11-06", countsSchoolDay: false, totalMinutes: 300 });
    expect(await totals(`?from=2026-11-02&to=2026-11-08`)).toMatchObject({ schoolDays: 0, totalMinutes: 300, perChild: [{ childId: frank, schoolDays: 0 }] });
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
