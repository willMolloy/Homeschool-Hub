/** S13-04, S16-10: Term in review, the numbers: exactly what the family's log setup tracks (one case per template style), real data only, nothing from completions. */
import { describe, expect, it } from "vitest";
import type { Child, LogFields, RecordTotals, Subject } from "../src/api/types";
import { NO_FIELDS, TEMPLATES } from "../src/features/records/logSetup";
import { buildTermReview, partCount } from "../src/features/review/termReview";

const FRANK: Child = { id: "c1", name: "Frank", color: "#3b6fb0", sortOrder: 0, archived: false };
const SUBJECTS = [{ id: "lit", name: "Literature", sortOrder: 0 }, { id: "math", name: "Math", sortOrder: 1 }, { id: "hist", name: "History", sortOrder: 2 }] as Subject[];
const FALL = { start: "2026-08-17", end: "2026-12-31" };
/** A term where everything was logged, so what shows is decided by the switches alone. */
const totals = (over: Partial<RecordTotals> = {}): RecordTotals => ({
  from: FALL.start, to: FALL.end, childId: "c1", entries: 4, schoolDays: 60, totalMinutes: 3600, coreMinutes: 2400, nonCoreMinutes: 1200, homeMinutes: 3000, awayMinutes: 600,
  books: ["Treasure Island", "Heidi"], bySubject: [{ subjectId: "math", minutes: 900 }, { subjectId: "lit", minutes: 2700 }], ...over,
});
const review = (fields: Partial<LogFields>, t: Partial<RecordTotals> = {}) =>
  buildTermReview({ child: FRANK, range: FALL, subjects: SUBJECTS, fields: { ...NO_FIELDS, ...fields }, totals: totals(t) });

describe("one card per log template style (S16-10)", () => {
  for (const t of TEMPLATES) {
    it(`${t.title}: shows exactly its fields`, () => {
      const r = review(t.fields);
      const f = t.fields;
      expect(r.schoolDays !== null).toBe(f.schoolDays);
      expect(r.totalHours).toBe(f.totalHours);
      expect(r.totalMinutes !== null).toBe(f.subjectHours || f.totalHours);
      expect(r.coreMinutes !== null && r.nonCoreMinutes !== null).toBe(f.coreSplit);
      expect(r.bySubject.length > 0).toBe(f.subjectHours);
      expect(r.homeMinutes !== null && r.awayMinutes !== null).toBe(f.homeAway);
      expect(r.books.length > 0).toBe(f.books);
      expect(partCount(r)).toBeGreaterThan(0);
    });
  }
  it("the five templates, by name, show these parts", () => {
    const parts = (title: string) => {
      const r = review(TEMPLATES.find((t) => t.title === title)!.fields);
      return [r.schoolDays !== null && "days", r.totalHours && "total", r.coreMinutes !== null && "core", r.bySubject.length > 0 && "subjects", r.homeMinutes !== null && "home", r.books.length > 0 && "books"].filter(Boolean);
    };
    expect(TEMPLATES.map((t) => t.title)).toEqual(["Hours by subject", "Core and non-core hours", "Days attended", "Days and hours", "Detailed log"]);
    expect(parts("Hours by subject")).toEqual(["subjects"]);
    expect(parts("Core and non-core hours")).toEqual(["core", "subjects"]);
    expect(parts("Days attended")).toEqual(["days"]);
    expect(parts("Days and hours")).toEqual(["days", "total"]);
    expect(parts("Detailed log")).toEqual(["subjects", "books"]); // notes are tracked but never on the card
  });
});

describe("what the card holds (S16-10)", () => {
  it("takes the Records totals as they are: school days, total, core split, subjects (most first), home and away, typed books", () => {
    const r = review({ schoolDays: true, totalHours: true, coreSplit: true, subjectHours: true, homeAway: true, books: true });
    expect(r).toMatchObject({ schoolDays: 60, totalMinutes: 3600, totalHours: true, coreMinutes: 2400, nonCoreMinutes: 1200, homeMinutes: 3000, awayMinutes: 600, books: ["Treasure Island", "Heidi"] });
    expect(r.bySubject.map((s) => [s.name, s.minutes])).toEqual([["Literature", 2700], ["Math", 900]]);
    expect(partCount(r)).toBe(6);
  });
  it("notes are never on it, and nothing from completions is in the model", () => {
    const r = review({ notes: true });
    expect(Object.keys(r).sort()).not.toContain("finished");
    expect(JSON.stringify(r)).not.toMatch(/note|finished/i);
    expect(partCount(r)).toBe(0);
  });
  it("a part the family doesn't track is absent, not zero", () => {
    const r = review({});
    expect(r).toMatchObject({ books: [], bySubject: [], totalMinutes: null, schoolDays: null, coreMinutes: null, homeMinutes: null });
    expect(partCount(r)).toBe(0);
  });
  it("tracked but empty is absent too: nothing logged gives no card", () => {
    const r = review({ schoolDays: true, subjectHours: true, books: true, coreSplit: true, homeAway: true, totalHours: true },
      { books: [], bySubject: [], totalMinutes: 0, schoolDays: 0, coreMinutes: 0, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0, entries: 0 });
    expect(r).toMatchObject({ books: [], bySubject: [], totalMinutes: null, schoolDays: null, coreMinutes: null, nonCoreMinutes: null, homeMinutes: null, awayMinutes: null });
    expect(partCount(r)).toBe(0);
  });
  it("total hours without subject hours gives the total and no subject bars", () => {
    const r = review({ totalHours: true });
    expect(r.bySubject).toEqual([]);
    expect(r.totalMinutes).toBe(3600);
    expect(r.totalHours).toBe(true);
  });
  it("a subject with no time is left out of the bars", () => {
    expect(review({ subjectHours: true }, { bySubject: [{ subjectId: "lit", minutes: 600 }, { subjectId: "math", minutes: 0 }] }).bySubject).toHaveLength(1);
  });
  it("carries the child's name and stored colour, and the range", () => {
    expect(review({ schoolDays: true })).toMatchObject({ childId: "c1", childName: "Frank", childColor: "#3b6fb0", ...FALL });
  });
});
