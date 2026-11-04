/** S9-08: Records totals for a range, from log entries only. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { addDays, weekdayOf } from "@hh/engine";
import { shareInRange, totalsOf } from "../src/services/recordTotals";
import type { RecordEntryRow } from "../src/repos/recordEntryRepo";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

const row = (over: Partial<RecordEntryRow>): RecordEntryRow => ({ id: "x", family_id: "f", child_id: "c1", start_date: "2026-11-02", end_date: "2026-11-02", counts_school_day: true, school_days: 1, subject_minutes: {}, total_minutes: null, home_minutes: null, away_minutes: null, notes: null, books: [], days: null, ...over });

const days = (start: string, end: string) => { const out: string[] = []; for (let d = start; d <= end; d = addDays(d, 1)) if (![0, 6].includes(weekdayOf(d))) out.push(d); return start === end ? [start] : out; };
const covered = (e: RecordEntryRow) => days(e.start_date, e.end_date);

describe("totalsOf (pure)", () => {
  it("adds subjects, splits core and non-core, keeps a typed total, and lists each book once", () => {
    const t = totalsOf([
      row({ start_date: "2026-11-02", end_date: "2026-11-06", subject_minutes: { m: 210, a: 60 }, books: ["Heidi", "treasure island"], home_minutes: 90, away_minutes: 30 }),
      row({ child_id: "c2", start_date: "2026-11-09", end_date: "2026-11-11", subject_minutes: {}, total_minutes: 120, books: [" Treasure  Island ", "Heidi"] }),
    ], (id) => id === "m", covered);
    expect(t).toEqual({ entries: 2, schoolDays: 8, totalMinutes: 390, coreMinutes: 210, nonCoreMinutes: 60, homeMinutes: 90, awayMinutes: 30, books: ["Heidi", "treasure island"], bySubject: [{ subjectId: "m", minutes: 210 }, { subjectId: "a", minutes: 60 }] });
    expect(totalsOf([], () => false, covered)).toMatchObject({ entries: 0, schoolDays: 0, totalMinutes: 0, books: [], bySubject: [] });
  });
  it("S9b-01: a day is counted once, however many entries or children hold it", () => {
    // Frank Mon-Fri, then Monday again: 5, not 6
    expect(totalsOf([row({ start_date: "2026-11-02", end_date: "2026-11-06" }), row({ start_date: "2026-11-02" })], () => false, covered).schoolDays).toBe(5);
    // Frank Mon-Thu and Margaret Tue-Fri: the days any child did school are Mon to Fri
    expect(totalsOf([row({ start_date: "2026-11-02", end_date: "2026-11-05" }), row({ child_id: "c2", start_date: "2026-11-03", end_date: "2026-11-06" })], () => false, covered).schoolDays).toBe(5);
    // the switch off adds no days
    expect(totalsOf([row({ start_date: "2026-11-02", end_date: "2026-11-06", counts_school_day: false })], () => false, covered).schoolDays).toBe(0);
  });
  it("S9b-01: an entry overlapping a range counts its days inside, and its hours in proportion", () => {
    const run = row({ start_date: "2026-11-02", end_date: "2026-11-06", subject_minutes: { m: 600 }, home_minutes: 300 });
    expect(totalsOf([run], (id) => id === "m", covered, { from: "2026-11-04", to: "2026-11-05" })).toMatchObject({ entries: 1, schoolDays: 2, totalMinutes: 240, coreMinutes: 240, homeMinutes: 120, bySubject: [{ subjectId: "m", minutes: 240 }] });
    expect(totalsOf([run], () => false, covered, { from: "2026-11-09", to: "2026-11-13" })).toMatchObject({ entries: 0, schoolDays: 0, totalMinutes: 0 });
    // a weekend-only run covers no school days: its hours split by calendar days
    expect(totalsOf([row({ start_date: "2026-11-07", end_date: "2026-11-08", total_minutes: 120 })], () => false, covered, { from: "2026-11-08", to: "2026-11-08" })).toMatchObject({ schoolDays: 0, totalMinutes: 60 });
  });
  it("shareInRange: whole when the entry is inside, nothing when it is outside", () => {
    expect(shareInRange({ start: "2026-11-02", end: "2026-11-06", covered: days("2026-11-02", "2026-11-06") }, { from: "2026-11-01", to: "2026-11-30" })).toEqual({ days: days("2026-11-02", "2026-11-06"), fraction: 1 });
    expect(shareInRange({ start: "2026-11-02", end: "2026-11-06", covered: days("2026-11-02", "2026-11-06") }, { from: "2026-11-07" })).toEqual({ days: [], fraction: 0 });
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
    // S9b-01: Frank's Nov 9-11 run, 60 m over 3 days, seen through Nov 10-12: 2 days and 2/3 of the hour
    expect(await totals("?from=2026-11-10&to=2026-11-12")).toMatchObject({ entries: 1, schoolDays: 2, totalMinutes: 40 });
    expect(await totals("")).toMatchObject({ entries: 3, from: null, to: null, childId: null });
  });

  it("S9b-01, the tester's cases: a second entry on a day, children on different days, and a range inside a run", async () => {
    const week = "from=2026-11-02&to=2026-11-08";
    await log({ childIds: [frank], startDate: "2026-11-02", endDate: "2026-11-06", subjectMinutes: { [math]: 600 } });
    await log({ childIds: [frank], startDate: "2026-11-02", subjectMinutes: { [reading]: 75 } });
    expect(await totals(`?${week}&childId=${frank}`)).toMatchObject({ entries: 2, schoolDays: 5, totalMinutes: 675 });
    await pool.query("DELETE FROM record_entry WHERE family_id = $1", [a.familyId]);
    await log({ childIds: [frank], startDate: "2026-11-02", endDate: "2026-11-05" });
    await log({ childIds: [margaret], startDate: "2026-11-03", endDate: "2026-11-06" });
    expect(await totals(`?${week}`)).toMatchObject({ entries: 2, schoolDays: 5 });
    expect(await totals(`?${week}&childId=${frank}`)).toMatchObject({ schoolDays: 4 });
    await pool.query("DELETE FROM record_entry WHERE family_id = $1", [a.familyId]);
    await log({ childIds: [frank], startDate: "2026-11-02", endDate: "2026-11-06", totalMinutes: 600 });
    expect(await totals("?from=2026-11-04&to=2026-11-05")).toMatchObject({ entries: 1, schoolDays: 2, totalMinutes: 240 });
  });

  it("S9b-01: days off inside a run are not counted, and the switch off counts none", async () => {
    await req("POST", "/api/blocked-ranges", { startDate: "2026-11-24", endDate: "2026-11-25", kind: "holiday" });
    await log({ childIds: [frank], startDate: "2026-11-23", endDate: "2026-11-27" });
    await log({ childIds: [margaret], startDate: "2026-11-23", endDate: "2026-11-27", countsSchoolDay: false });
    expect(await totals("?from=2026-11-23&to=2026-11-29")).toMatchObject({ entries: 2, schoolDays: 3 });
    expect(await totals(`?from=2026-11-23&to=2026-11-29&childId=${margaret}`)).toMatchObject({ entries: 1, schoolDays: 0 });
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
