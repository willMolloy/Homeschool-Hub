/** S21-01: a break lists the open work it newly covers. Partial overlap counts; finished and stopped work does not. */
/** S21-02: keeping the end date is the plan that already runs: the break is empty, the end stays, the other days carry the work. */
import { describe, expect, it } from "vitest";
import { countWeekdays, listBreakOverlaps, overlapSummary, planChild, pushEndBySchoolDays, resolveEndDates, weekdayOf, type BlockedPeriod, type BreakSpan, type OverlapAssignment } from "../src";
import { book, MON_FRI, unitsOn } from "./helpers";

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

describe("keep the end date (S21-02)", () => {
  const span = book({ id: "hobbit", start: "2026-01-05", end: "2026-05-21", totalUnits: 100, unitType: "pages", weightPerUnit: 1 });
  const february: BlockedPeriod = { id: "feb", start: "2026-02-01", end: "2026-02-28", kind: "vacation" };

  it("leaves the end on May 21 and puts February's work on the other school days", () => {
    const open = planChild(span, "frank", { calendar: MON_FRI });
    const kept = planChild(span, "frank", { calendar: MON_FRI, blocked: [february] });
    expect(kept.plannedEnd).toBe("2026-05-21");
    expect(kept.end).toBe("2026-05-21");
    expect(unitsOn(kept, "2026-02-02")).toBe(0);
    expect(unitsOn(kept, "2026-02-27")).toBe(0);
    expect(unitsOn(kept, "2026-01-05")).toBeGreaterThan(unitsOn(open, "2026-01-05"));
    expect(unitsOn(kept, "2026-03-02")).toBeGreaterThan(0);
  });

  it("a book that only overlaps the first week of February loses that week, not the rest of the month", () => {
    const firstWeek: BlockedPeriod = { id: "week", start: "2026-02-02", end: "2026-02-06", kind: "vacation" };
    const kept = planChild(span, "frank", { calendar: MON_FRI, blocked: [firstWeek] });
    expect(kept.end).toBe("2026-05-21");
    expect(unitsOn(kept, "2026-02-02")).toBe(0);
    expect(unitsOn(kept, "2026-02-06")).toBe(0);
    expect(unitsOn(kept, "2026-02-09")).toBeGreaterThan(0);
    expect(unitsOn(kept, "2026-02-27")).toBeGreaterThan(0);
  });
});

describe("move the end date (S21-03)", () => {
  const school = [1, 2, 3, 4, 5];
  const hobbit = frank({ id: "hobbit", title: "The Hobbit", end: "2026-05-21" });
  const firstWeekOnly = frank({ id: "partial", title: "Partial", end: "2026-02-06" });

  it("moves by the overlapped school days, not by the calendar length of a longer break", () => {
    const [full] = list({ assignments: [hobbit] });
    expect(full!.schoolDays).toBe(20);
    expect(countWeekdays(hobbit.end, full!.pushedEnd, school) - 1).toBe(20);
    expect(weekdayOf(full!.pushedEnd)).toBeGreaterThanOrEqual(1);
    expect(weekdayOf(full!.pushedEnd)).toBeLessThanOrEqual(5);

    const [week] = list({
      breaks: [{ start: "2026-02-01", end: "2026-02-28", childIds: [] }],
      assignments: [firstWeekOnly],
    });
    expect(week!.schoolDays).toBe(5);
    expect(week!.pushedEnd).toBe("2026-03-06");
    expect(pushEndBySchoolDays("2026-02-06", 28, school, [])).not.toBe(week!.pushedEnd);
  });

  it("keeps the daily pace in the same neighborhood and leaves the break empty", () => {
    const span = book({ id: "hobbit", start: "2026-01-05", end: "2026-05-21", totalUnits: 100, unitType: "pages", weightPerUnit: 1 });
    const open = planChild(span, "frank", { calendar: MON_FRI });
    const [row] = list({ assignments: [hobbit] });
    const pushed = planChild(
      { ...span, end: row!.pushedEnd },
      "frank",
      { calendar: MON_FRI, blocked: [{ id: "feb", start: "2026-02-01", end: "2026-02-28", kind: "vacation" }] },
    );
    expect(pushed.baseRate).toBeCloseTo(open.baseRate, 5);
    expect(unitsOn(pushed, "2026-02-02")).toBe(0);
    expect(unitsOn(pushed, "2026-02-27")).toBe(0);
    expect(pushed.end).toBe(row!.pushedEnd);
  });

  it("two pushes add, a picked day is the end, and two picked days conflict", () => {
    const rows = list({
      breaks: [
        { start: "2026-02-02", end: "2026-02-06", childIds: [] },
        { start: "2026-03-02", end: "2026-03-06", childIds: [] },
      ],
      assignments: [hobbit, frank({ id: "other", title: "Other" })],
    });
    const hobbitRows = rows.filter((r) => r.assignmentId === "hobbit");
    const both = resolveEndDates(hobbitRows, [{ kind: "push" }, { kind: "push" }], [hobbit], [
      { start: "2026-02-02", end: "2026-02-06", childIds: [] },
      { start: "2026-03-02", end: "2026-03-06", childIds: [] },
    ], [], { schoolDays: SCHOOL });
    expect(both.conflict).toBeNull();
    expect(both.ends).toEqual([{ assignmentId: "hobbit", endDate: pushEndBySchoolDays(hobbit.end, hobbitRows[0]!.schoolDays + hobbitRows[1]!.schoolDays, school, [
      { start: "2026-02-02", end: "2026-02-06", childIds: [] },
      { start: "2026-03-02", end: "2026-03-06", childIds: [] },
    ]) }]);
    const picked = resolveEndDates(hobbitRows, [{ kind: "pick", date: "2026-06-01" }, { kind: "push" }], [hobbit], [
      { start: "2026-02-02", end: "2026-02-06", childIds: [] },
      { start: "2026-03-02", end: "2026-03-06", childIds: [] },
    ], [], { schoolDays: SCHOOL });
    expect(picked.ends).toEqual([{ assignmentId: "hobbit", endDate: "2026-06-01" }]);
    const clash = resolveEndDates(hobbitRows, [{ kind: "pick", date: "2026-06-01" }, { kind: "pick", date: "2026-06-15" }], [hobbit], [], [], { schoolDays: SCHOOL });
    expect(clash.conflict).toBe("Pick one end date for The Hobbit.");
    expect(clash.ends).toEqual([]);
  });
});
