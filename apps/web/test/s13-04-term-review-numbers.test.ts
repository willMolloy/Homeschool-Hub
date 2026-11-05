/** S13-04: Term in review, the numbers: finished work in the range, books, time by subject and school days, only what is tracked and real. */
import { describe, expect, it } from "vitest";
import type { Assignment, Child, LogFields, RecordTotals, Subject } from "../src/api/types";
import { buildTermReview, finishedIn, partCount } from "../src/features/review/termReview";

const FRANK: Child = { id: "c1", name: "Frank", color: "#3b6fb0", sortOrder: 0, archived: false };
const SUBJECTS = [
  { id: "lit", name: "Literature", sortOrder: 0 }, { id: "math", name: "Math", sortOrder: 1 }, { id: "hist", name: "History", sortOrder: 2 },
] as Subject[];
const asg = (over: Partial<Assignment>): Assignment => ({
  id: "a", subjectId: "lit", title: "Treasure Island", unitType: "pages", totalUnits: 100, weightPerUnit: null, startDate: "2026-08-17", endDate: "2026-10-23",
  childIds: ["c1"], archived: false, weekdays: null, endedAs: "finished", endedOn: "2026-10-16", ...over,
});
const ALL_ON: LogFields = { subjectHours: true, coreSplit: false, totalHours: true, schoolDays: true, homeAway: false, notes: false, books: true };
const totals = (over: Partial<RecordTotals> = {}): RecordTotals => ({
  from: "2026-08-17", to: "2026-12-31", childId: "c1", entries: 4, schoolDays: 60, totalMinutes: 3600, coreMinutes: 0, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0,
  books: ["Treasure Island", "Heidi"], bySubject: [{ subjectId: "math", minutes: 900 }, { subjectId: "lit", minutes: 2700 }], ...over,
});
const FALL = { start: "2026-08-17", end: "2026-12-31" };
const review = (over: { fields?: Partial<LogFields>; totals?: Partial<RecordTotals>; assignments?: Assignment[]; range?: typeof FALL } = {}) =>
  buildTermReview({ child: FRANK, range: over.range ?? FALL, assignments: over.assignments ?? [asg({})], subjects: SUBJECTS, fields: { ...ALL_ON, ...over.fields }, totals: totals(over.totals) });

describe("finished work (S13-04)", () => {
  it("lists what the parent marked finished inside the range, with subject and title, in the order they finished", () => {
    const r = review({ assignments: [asg({ id: "b", title: "Times tables", subjectId: "math", endedOn: "2026-10-02" }), asg({}), asg({ id: "c", title: "Aesop", endedOn: "2026-10-16" })] });
    expect(r.finished.map((f) => [f.title, f.subjectName, f.finishedOn])).toEqual([
      ["Times tables", "Math", "2026-10-02"], ["Aesop", "Literature", "2026-10-16"], ["Treasure Island", "Literature", "2026-10-16"],
    ]);
  });
  it("the range's first and last days count; the day before and the day after do not", () => {
    const at = (endedOn: string) => finishedIn(FRANK, FALL, [asg({ endedOn })], SUBJECTS).length;
    expect([at("2026-08-16"), at("2026-08-17"), at("2026-12-31"), at("2027-01-01")]).toEqual([0, 1, 1, 0]);
  });
  it("only finished: stopped, open and reopened work, another child's, and archived work are left out", () => {
    const list = [asg({ id: "s", endedAs: "stopped" }), asg({ id: "o", endedAs: null, endedOn: null }), asg({ id: "k", childIds: ["c2"] }), asg({ id: "x", archived: true }), asg({ id: "ok" })];
    expect(finishedIn(FRANK, FALL, list, SUBJECTS).map((f) => f.assignmentId)).toEqual(["ok"]);
  });
  it("a shared book counts for each child on it", () => {
    expect(finishedIn(FRANK, FALL, [asg({ childIds: ["c2", "c1"] })], SUBJECTS)).toHaveLength(1);
  });
  it("an older answer with no ended fields is simply open", () => {
    const old = { ...asg({}) } as Partial<Assignment>;
    delete old.endedAs; delete old.endedOn;
    expect(finishedIn(FRANK, FALL, [old as Assignment], SUBJECTS)).toEqual([]);
  });
});

describe("what Records tracks (S13-04)", () => {
  it("takes the Records totals as they are: books, hours by subject (most first), total, school days", () => {
    const r = review();
    // S16-05: books are the reading assignments marked finished in the range (completions), not the titles typed in the log
    expect(r.books).toEqual(["Treasure Island"]);
    expect(r.bySubject.map((s) => [s.name, s.minutes])).toEqual([["Literature", 2700], ["Math", 900]]);
    expect(r.totalMinutes).toBe(3600);
    expect(r.schoolDays).toBe(60);
    expect(partCount(r)).toBe(4);
  });
  it("a part the family doesn't track is absent, not zero", () => {
    const r = review({ fields: { subjectHours: false, totalHours: false, books: false, schoolDays: false } });
    expect(r).toMatchObject({ books: [], bySubject: [], totalMinutes: null, schoolDays: null });
    expect(partCount(r)).toBe(1); // only the finished list
  });
  it("tracked but empty is absent too: no books, no time, no school days", () => {
    const r = review({ assignments: [], totals: { books: [], bySubject: [], totalMinutes: 0, schoolDays: 0, entries: 0 } });
    expect(r).toMatchObject({ finished: [], books: [], bySubject: [], totalMinutes: null, schoolDays: null });
    expect(partCount(r)).toBe(0);
  });
  it("total hours without subject hours gives the total and no subject bars", () => {
    const r = review({ fields: { subjectHours: false } });
    expect(r.bySubject).toEqual([]);
    expect(r.totalMinutes).toBe(3600);
  });
  it("a subject with no time is left out of the bars", () => {
    expect(review({ totals: { bySubject: [{ subjectId: "lit", minutes: 600 }, { subjectId: "math", minutes: 0 }] } }).bySubject).toHaveLength(1);
  });
  it("carries the child's name and stored colour, and the range", () => {
    expect(review()).toMatchObject({ childId: "c1", childName: "Frank", childColor: "#3b6fb0", ...FALL });
  });
});
