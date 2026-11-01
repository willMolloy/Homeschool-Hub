/**
 * S8-05: Schedule's Week view as pastel bars (the T-03b "Make an adjustment" buttons and the per-student check-in
 * sheet are gone: a bar opens the adjustment, and a finished week is checked in on Track work, S8-06).
 */
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ENGINE_VERSION, type ChildPlan } from "@hh/engine";
import type { CheckInItem, ScheduleEvent, Subject, WeekCheckIn } from "../src/api/types";
import { forChild, withOtherChildren } from "../src/features/checkin/childWeek";
import { shownWeek } from "../src/features/plan/useShownWeek";
import { barsFromPlans, eventLines, rangeWords } from "../src/features/week/weekBars";
import { shownChoice } from "../src/features/week/useChildChoice";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const item = (over: Partial<CheckInItem>): CheckInItem => ({
  assignmentId: "ti", childId: "c1", childName: "Frank", title: "Treasure Island", unitType: "pages",
  plannedFrom: 0, plannedTo: 80, totalUnits: 270, actual: null, mode: null, ...over,
});
const TI = item({});
const MATH = item({ assignmentId: "math", title: "Math 5", unitType: "lessons", plannedFrom: 10, plannedTo: 15, totalUnits: 120 });
const VIOLIN_M = item({ assignmentId: "violin", childId: "c2", childName: "Margaret", title: "Violin", unitType: "minutes", plannedFrom: 600, plannedTo: 750, totalUnits: 3000, actual: 700, mode: "pushEndDate" });
const OCT19: WeekCheckIn = { weekStart: "2026-10-19", weekEnd: "2026-10-25", status: null, items: [TI, MATH, VIOLIN_M], addable: [] };
/** A plan for the week of Mon 2026-10-26: `before` units done in earlier weeks, then `week` units spread over Mon and Tue. */
const plan = (assignmentId: string, childId: string, subjectId: string, over: Partial<ChildPlan> & { before?: number; week?: number } = {}): ChildPlan => {
  const { before = 119, week = 31, ...rest } = over;
  const days = [
    ...(before > 0 ? [{ date: "2026-10-20", capacity: 1, schoolDay: true, units: before, thickness: before, kind: "planned" as const, position: before }] : []),
    ...["2026-10-26", "2026-10-27"].map((date, k) => ({ date, capacity: 1, schoolDay: true, units: week / 2, thickness: week / 2, kind: "planned" as const, position: before + (week / 2) * (k + 1) })),
  ];
  return {
    engineVersion: ENGINE_VERSION, assignmentId, childId, subjectId, unitType: "pages", weightPerUnit: 1,
    weightSource: "assignment", weekdays: null, weekdaysSource: "default", totalUnits: 270, doneUnits: 0, remainingUnits: 270, baseRate: 10, rate: 10,
    plannedEnd: "2026-12-01", end: "2026-12-01", mode: null, unplacedUnits: 0, noCapacity: false, complete: false,
    checkInWeeks: [], adjustedWeeks: [], weekdaysFrom: null, previousWeekdays: null, warnings: [], days, ...rest,
  } as ChildPlan;
};
const SUBJECTS: Subject[] = [
  { id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null },
  { id: "math", name: "Math", color: null, sortOrder: 1, archived: false, defaultWeight: null, defaultWeekdays: null },
];
const PLANS = [
  plan("math", "c1", "math", { unitType: "lessons", before: 30, week: 5, totalUnits: 120 }),
  plan("ti", "c1", "lit"),
  plan("violin", "c2", "math", { unitType: "minutes", before: 600, week: 150, totalUnits: 3000 }),
];
const CO_OP: ScheduleEvent = { id: "e1", name: "Co-op", weekdays: [2], startDate: null, endDate: null, capacityFraction: 0, defaultRule: "skip", subjectRules: {}, childIds: [], archived: false } as ScheduleEvent;

function stub(plans: ChildPlan[] = PLANS, events: ScheduleEvent[] = [CO_OP]) {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "2026-10-26", to: "2026-11-01", plans });
  fakeApi.on("GET /api/children", 200, [
    { id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false },
    { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false },
    { id: "c3", name: "Old Kid", color: null, sortOrder: 2, archived: true },
  ]);
  fakeApi.on("GET /api/subjects", 200, SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, [
    { id: "ti", subjectId: "lit", title: "Treasure Island" },
    { id: "math", subjectId: "math", title: "Math 5" },
    { id: "violin", subjectId: "math", title: "Violin" },
  ]);
  fakeApi.on("GET /api/events", 200, events);
  fakeApi.on("GET /api/week-overrides", 200, { overrides: [] });
}
const work = (name: string) => screen.findByRole("region", { name: `${name}'s work` });

describe("Schedule, Week view", () => {
  beforeEach(() => { stub(); localStorage.clear(); });

  it("has the title, the dates, previous and next week, and no engine numbers", async () => {
    renderAt("/schedule?view=week");
    await work("Frank");
    expect(screen.getByRole("heading", { level: 2, name: "This week" })).toBeInTheDocument();
    expect(screen.getByText("26 Oct – 1 Nov")).toBeInTheDocument();
    const steps = screen.getByRole("group", { name: "Week" });
    expect(within(steps).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Previous week", "Next week"]);
    expect(screen.getByRole("main").textContent).not.toMatch(/thickness|effort|\d+\.\d/i);
  });

  it("shows one bar per assignment in lane order, with the week's range in the family's units and an accessible name", async () => {
    renderAt("/schedule?view=week");
    const frank = await work("Frank");
    const bars = within(frank).getAllByRole("listitem");
    // Literature before Math, as the subjects are ordered.
    expect(bars.map((b) => b.querySelector(".bar-title")!.textContent)).toEqual(["Treasure Island", "Math 5"]);
    expect(within(frank).getByRole("button", { name: "Treasure Island, pages 120–150" })).toBeInTheDocument();
    expect(within(frank).getByRole("button", { name: "Math 5, lessons 31–35" })).toBeInTheDocument();
    // The subject's pastel and strong rule come from the tokens.
    expect(bars[0]!.getAttribute("style")).toMatch(/--c: var\(--tl-subject-\d\);.*--cs: var\(--tl-subject-\d-strong\)/);
    expect(within(frank).queryByRole("button", { name: /completed/ })).toBeNull(); // no check mid-week
  });

  it("one child at a time: Frank, Margaret or Both; the choice is remembered on this device", async () => {
    const user = userEvent.setup();
    const first = renderAt("/schedule?view=week");
    await work("Frank");
    const seg = screen.getByRole("group", { name: "Child" });
    expect(within(seg).getAllByRole("button").map((b) => b.textContent)).toEqual(["Frank", "Margaret", "Both"]);
    expect(within(seg).getByRole("button", { name: "Frank" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("region", { name: "Margaret's work" })).toBeNull();
    await user.click(within(seg).getByRole("button", { name: "Margaret" }));
    const margaret = await work("Margaret");
    expect(within(margaret).getByRole("button", { name: "Violin, 150 minutes" })).toBeInTheDocument();
    await user.click(within(seg).getByRole("button", { name: "Both" }));
    await work("Frank");
    await work("Margaret");
    expect(localStorage.getItem("hh.child")).toBe("both");
    first.unmount();
    renderAt("/schedule?view=week");
    await work("Frank");
    await work("Margaret");
    expect(screen.queryByRole("region", { name: "Old Kid's work" })).toBeNull();
  });

  it("a single child has no switch", async () => {
    fakeApi.on("GET /api/children", 200, [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }]);
    renderAt("/schedule?view=week");
    await work("Frank");
    expect(screen.queryByRole("group", { name: "Child" })).toBeNull();
  });

  it("a child with nothing that week says so; events are one quiet line each", async () => {
    stub([PLANS[1]!]);
    const user = userEvent.setup();
    renderAt("/schedule?view=week");
    await user.click(await screen.findByRole("button", { name: "Margaret" }));
    const margaret = await work("Margaret");
    expect(within(margaret).getByText("Nothing planned this week.")).toBeInTheDocument();
    expect(within(margaret).getByText("Tue · Co-op")).toBeInTheDocument();
  });

  it("tapping a bar opens that child's week adjustment", async () => {
    const user = userEvent.setup();
    renderAt("/schedule?view=week");
    await user.click(await screen.findByRole("button", { name: "Treasure Island, pages 120–150" }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByText(/Frank · This week · Oct 26 – Nov 1/)).toBeInTheDocument();
    expect(await within(sheet).findByRole("group", { name: "Amount this week for Treasure Island" })).toBeInTheDocument();
  });

  it("the previous and next buttons move a week", async () => {
    const user = userEvent.setup();
    renderAt("/schedule?view=week");
    await work("Frank");
    await user.click(screen.getByRole("button", { name: "Next week" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Coming week" })).toBeInTheDocument();
    expect(fakeApi.calls.map((c) => c.path)).toContain("/api/plan?from=2026-11-02&to=2026-11-08");
  });
});

describe("week bars (pure)", () => {
  it("says ranges in the family's words", () => {
    expect(rangeWords("pages", 119, 150)).toBe("pages 120–150");
    expect(rangeWords("pages", 119, 120)).toBe("page 120");
    expect(rangeWords("lessons", 30.2, 35)).toBe("lessons 31–35");
    expect(rangeWords("chapters", 8, 9)).toBe("chapter 9");
    expect(rangeWords("minutes", 600, 750)).toBe("150 minutes");
    expect(rangeWords("pages", 119.99, 150.01)).toBe("pages 120–151");
  });
  it("only assignments with work that week get a bar", () => {
    const look = { children: [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }], subjects: SUBJECTS, titleOf: () => "X", subjectOf: () => "lit" };
    const idle = plan("idle", "c1", "lit", { week: 0, before: 10 });
    expect(barsFromPlans([idle, plan("ti", "c1", "lit")], "2026-10-26", look).map((b) => b.assignmentId)).toEqual(["ti"]);
  });
  it("events: only those in the week, for that child or the whole family, with their days", () => {
    const e = (over: Partial<ScheduleEvent>) => ({ ...CO_OP, ...over }) as ScheduleEvent;
    const lines = eventLines([e({}), e({ id: "e2", name: "Piano", weekdays: [1, 3], childIds: ["c2"] }), e({ id: "e3", name: "Old", startDate: "2026-01-01", endDate: "2026-02-01" }), e({ id: "e4", archived: true })], "2026-10-26", "2026-11-01", "c1");
    expect(lines).toEqual([{ key: "e1", text: "Tue · Co-op" }]);
  });
  it("the shown choice: a saved child that exists, Both only with several children, else the first", () => {
    const kids = [{ id: "a", name: "A", color: null, sortOrder: 0, archived: false }, { id: "b", name: "B", color: null, sortOrder: 1, archived: false }];
    expect(shownChoice(kids, "b")).toBe("b");
    expect(shownChoice(kids, "both")).toBe("both");
    expect(shownChoice(kids, "gone")).toBe("a");
    expect(shownChoice(kids.slice(0, 1), "both")).toBe("a");
    expect(shownChoice([], "a")).toBeNull();
  });
});

describe("shownWeek", () => {
  it("shownWeek: the check-in week is the shown week once it's over, otherwise last week", () => {
    expect(shownWeek(null, "2026-10-28", "mon")).toEqual({ weekStart: "2026-10-26", weekEnd: "2026-11-01", currentWeekStart: "2026-10-26", checkInWeekStart: "2026-10-19" });
    expect(shownWeek("2026-10-14", "2026-10-28", "mon").checkInWeekStart).toBe("2026-10-12");
    expect(shownWeek("2026-11-04", "2026-10-28", "mon").checkInWeekStart).toBe("2026-10-19");
    expect(shownWeek("nonsense", "2026-10-28", "mon").weekStart).toBe("2026-10-26");
  });
});

describe("childWeek", () => {
  it("forChild keeps one child's rows and addable pairs", () => {
    const week = { ...OCT19, addable: [item({ assignmentId: "sci", childId: "c2" })] };
    expect(forChild(week, "c1").items.map((i) => i.assignmentId)).toEqual(["ti", "math"]);
    expect(forChild(week, "c1").addable).toEqual([]);
    expect(forChild(week, "c2").addable).toHaveLength(1);
  });
  it("withOtherChildren appends only the other children's stored rows", () => {
    expect(withOtherChildren(OCT19, "c1", [])).toEqual([{ assignmentId: "violin", childId: "c2", position: 700, mode: "pushEndDate" }]);
    expect(withOtherChildren(OCT19, "c2", [])).toEqual([]);
  });
});
