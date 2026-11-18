/** S21-01: a break lists the open work it newly covers. Partial overlap counts; finished and stopped work does not. */
import { describe, expect, it } from "vitest";
import { listBreakOverlaps, overlapSummary, type BreakSpan, type OverlapAssignment } from "../src";

const SCHOOL = [1, 2, 3, 4, 5];
const feb: BreakSpan = { start: "2026-02-01", end: "2026-02-28", childIds: [] };
const frank = (over: Partial<OverlapAssignment> = {}): OverlapAssignment => ({
  id: "hobbit",
  title: "The Hobbit",
  start: "2026-01-05",
  end: "2026-05-21",
  childIds: ["frank"],
  weekdays: null,
  subjectId: "lit",
  ...over,
});

const list = (over: Partial<Parameters<typeof listBreakOverlaps>[0]> = {}) => listBreakOverlaps({
  breaks: [feb],
  assignments: [frank()],
  existing: [],
  schoolDays: SCHOOL,
  ...over,
});

describe("break overlap list (S21-01)", () => {
  it("says how many school days a full February covers", () => {
    const [row] = list();
    expect(row).toMatchObject({ assignmentId: "hobbit", title: "The Hobbit", schoolDays: 20, shared: false });
    expect(row!.summary).toBe("covers 20 school days in February");
    expect(row!.dates[0]).toBe("2026-02-02");
    expect(row!.dates.at(-1)).toBe("2026-02-27");
  });

  it("includes a book that only overlaps the first week of February", () => {
    const [row] = list({ assignments: [frank({ id: "partial", title: "Partial", end: "2026-02-06" })] });
    expect(row).toMatchObject({ schoolDays: 5, summary: "covers 5 school days in February" });
    expect(row!.dates).toEqual(["2026-02-02", "2026-02-03", "2026-02-04", "2026-02-05", "2026-02-06"]);
  });

  it("leaves a finished book and a stopped book off the list", () => {
    const rows = list({
      assignments: [
        frank({ id: "done", endedAs: "finished" }),
        frank({ id: "stopped", title: "Stopped", endedAs: "stopped" }),
        frank({ id: "open", title: "Open" }),
        frank({ id: "archived", title: "Old", archived: true }),
      ],
    });
    expect(rows.map((r) => r.assignmentId)).toEqual(["open"]);
  });

  it("a break for one child skips the other child's book, and a shared book is one row", () => {
    const rows = list({
      breaks: [{ start: "2026-02-01", end: "2026-02-28", childIds: ["frank"] }],
      assignments: [
        frank({ id: "maggie", title: "Maggie's book", childIds: ["maggie"] }),
        frank({ id: "shared", title: "Shared", childIds: ["frank", "maggie"] }),
        frank(),
      ],
    });
    expect(rows.map((r) => r.assignmentId)).toEqual(["shared", "hobbit"]);
    expect(rows[0]!.shared).toBe(true);
    expect(rows[1]!.shared).toBe(false);
  });

  it("no overlap is an empty list, including a day already off", () => {
    expect(list({ breaks: [{ start: "2026-07-06", end: "2026-07-10", childIds: [] }] })).toEqual([]);
    expect(list({ existing: [feb] })).toEqual([]);
  });

  it("lengthening a break lists only the school days it newly covers", () => {
    const [row] = list({
      breaks: [{ start: "2026-02-01", end: "2026-03-06", childIds: [] }],
      existing: [feb],
    });
    expect(row!.summary).toBe("covers 5 school days in March");
    expect(row!.dates).toEqual(["2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05", "2026-03-06"]);
  });

  it("uses the subject's days, then the family's school days", () => {
    const tueThu = list({
      assignments: [frank({ weekdays: null })],
      subjectWeekdays: [{ subjectId: "lit", weekdays: [2, 4] }],
    });
    expect(tueThu[0]!.schoolDays).toBe(8);
    const monThu = list({ schoolDays: [1, 2, 3, 4], assignments: [frank({ weekdays: null, subjectId: "other" })] });
    expect(monThu[0]!.dates).not.toContain("2026-02-06");
    expect(monThu[0]!.schoolDays).toBe(16);
  });

  it("a template lists each book under the break that covers it", () => {
    const rows = list({
      breaks: [
        { start: "2026-02-02", end: "2026-02-06", childIds: [] },
        { start: "2026-03-02", end: "2026-03-06", childIds: [] },
      ],
      assignments: [frank(), frank({ id: "march", title: "March only", start: "2026-03-01", end: "2026-03-31" })],
    });
    expect(rows.map((r) => [r.breakIndex, r.assignmentId])).toEqual([[0, "hobbit"], [1, "hobbit"], [1, "march"]]);
  });

  it("names one school day, and days that cross two months", () => {
    expect(overlapSummary(["2026-02-02"])).toBe("covers 1 school day in February");
    expect(overlapSummary(["2026-02-27", "2026-03-02"])).toBe("covers 2 school days in February and March");
  });
});
