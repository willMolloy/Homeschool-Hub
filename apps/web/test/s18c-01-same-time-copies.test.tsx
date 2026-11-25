// S18c-01: Other copies are the workbooks running at the same time. A next-year copy is not one.
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { planAll, type Assignment as EngineAssignment } from "@hh/engine";
import type { Assignment } from "../src/api/types";
import { otherCopies, rangesShareADay, twinIds } from "../src/features/schedule/bookCopies";
import { copyRows } from "../src/features/schedule/OtherCopies";
import { buildTimelineModel } from "../src/features/timeline/model";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, MATH, READING, rowId, withRoster } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

const ELIAS = { ...FRANK, id: rowId(11), name: "Elias", sortOrder: 0 };
const WREN = { ...FRANK, id: rowId(13), name: "Wren", color: "#7dcea0", sortOrder: 1 };
const LIT = { ...READING, id: rowId(21), name: "Literature", sortOrder: 0 };
const book = (n: number, over: Partial<Assignment>): Assignment => ({
  id: rowId(n), subjectId: LIT.id, title: "Treasure Island", unitType: "pages", totalUnits: 200, weightPerUnit: null,
  startDate: "2026-08-17", endDate: "2027-05-28", childIds: [ELIAS.id], archived: false, weekdays: [1, 2, 3, 4, 5], ...over,
});
const names = (id: string) => ({ [ELIAS.id]: "Elias", [WREN.id]: "Wren" }[id] ?? "");

describe("other copies are the workbooks running at the same time (S18c-01)", () => {
  const thisYear = book(1, {});
  const nextYear = book(2, { startDate: "2027-08-16", endDate: "2028-05-28" });
  const sameTime = book(3, { startDate: "2026-10-01", endDate: "2027-03-01", title: "Treasure Island (copy)" });
  const wren = book(4, { childIds: [WREN.id], weekdays: [2, 3, 4, 5], startDate: "2026-08-18", endDate: "2026-12-18", title: "The Hobbit" });
  const shared = book(5, { childIds: [ELIAS.id], weekdays: [1, 2, 3, 4], startDate: "2026-08-17", endDate: "2026-12-18", title: "The Hobbit" });

  it("ignores a copy whose dates do not overlap, and still counts one whose dates do", () => {
    expect(rangesShareADay(thisYear, nextYear)).toBe(false);
    expect(rangesShareADay(thisYear, { startDate: "2027-05-28", endDate: "2027-06-01" })).toBe(true);
    expect(rangesShareADay(thisYear, { startDate: "2027-05-29", endDate: "2027-06-01" })).toBe(false);
    expect(otherCopies([thisYear, nextYear, sameTime], thisYear).map((a) => a.id)).toEqual([sameTime.id]);
    expect(otherCopies([thisYear, nextYear], nextYear)).toEqual([]);
    expect(twinIds([thisYear, nextYear])).toEqual(new Set());
    expect(twinIds([shared, wren])).toEqual(new Set([shared.id, wren.id]));
  });

  it("adds the copy's own dates when the child and the days match, and leaves a different schedule as it was", () => {
    const rows = copyRows(thisYear, [thisYear, sameTime, nextYear], names, (a) => a.weekdays ?? []);
    expect(rows.map((r) => r.label)).toEqual(["Elias · Mon–Fri · Oct 1, 2026 – Mar 1, 2027"]);
    const hobbits = copyRows(shared, [shared, wren], names, (a) => a.weekdays ?? []);
    expect(hobbits.map((r) => r.label)).toEqual(["Wren · Tue–Fri"]);
  });

  it("does not add a days suffix on the year bar from a next-year copy", () => {
    const engine = (a: Assignment): EngineAssignment => ({
      id: a.id, subjectId: a.subjectId, childIds: a.childIds, unitType: "pages", totalUnits: 200, start: a.startDate, end: a.endDate,
    });
    const plans = planAll([engine(thisYear), engine(nextYear), engine(shared), engine(wren)], {
      calendar: { weekStart: "mon", schoolDays: [1, 2, 3, 4, 5] }, asOf: "2026-11-05",
    });
    const model = buildTimelineModel({
      from: "2026-08-17", to: "2028-05-28", today: "2026-11-05", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5],
      plans, assignments: [thisYear, nextYear, shared, wren], children: [ELIAS, WREN], subjects: [LIT, MATH], blocked: [], events: [],
    });
    const titles = model.lanes.flatMap((l) => l.children.flatMap((c) => c.assignments.map((a) => [a.assignmentId, a.title])));
    expect(titles).toContainEqual([thisYear.id, "Treasure Island"]);
    expect(titles).toContainEqual([nextYear.id, "Treasure Island"]);
    expect(titles).toContainEqual([shared.id, "The Hobbit · Mon–Thu"]);
    expect(titles).toContainEqual([wren.id, "The Hobbit · Tue–Fri"]);
  });

  it("this year's Treasure Island does not list the 2027–28 copy", async () => {
    withRoster([ELIAS, WREN], [LIT]);
    fakeApi.on("GET /api/assignments", 200, [thisYear, nextYear]);
    const user = userEvent.setup();
    renderAt("/schedule/assignments");
    const list = await screen.findByRole("list", { name: "Assignments" });
    const cards = within(list).getAllByRole("listitem").map((li) => li.textContent ?? "");
    expect(cards.filter((t) => t.includes("Treasure Island")).every((t) => !t.includes("Mon–Fri"))).toBe(true);
    await user.click(screen.getAllByRole("button", { name: /Treasure Island/ })[0]!);
    const form = screen.getByRole("form", { name: "Edit Treasure Island" });
    expect(within(form).queryByRole("region", { name: "Other copies" })).toBeNull();
  });
});
