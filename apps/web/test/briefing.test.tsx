/** S4-09: the weekly briefing on This Week (briefingLines.ts, Briefing.tsx). */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { addDays, ENGINE_VERSION, forecastFinish, planAll, type Assignment as EngineAssignment, type ChildPlan, type ProgressCheckIn } from "@hh/engine";
import { briefingRanges, mergePlans } from "../src/features/plan/Briefing";
import { buildBriefing, weeksLate } from "../src/features/plan/briefingLines";
import { EMPTY_WEEK, fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const CALENDAR = { weekStart: "mon" as const, schoolDays: [1, 2, 3, 4, 5] as ChildPlan["weekdays"] & number[] };
const TODAY = "2026-10-28"; // a Wednesday; the shown week is Oct 26 - Nov 1

const CHILDREN = [
  { id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false },
  { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false },
];
const ASSIGNMENTS = [
  { id: "ti", subjectId: "lit", title: "Treasure Island", startDate: "2026-09-07", endDate: "2026-12-18", childIds: ["c1"], archived: false },
  { id: "math", subjectId: "math", title: "Math 5", startDate: "2026-10-26", endDate: "2026-11-26", childIds: ["c1"], archived: false },
  { id: "poems", subjectId: "lit", title: "Poems", startDate: "2026-10-26", endDate: "2026-11-26", childIds: ["c2"], archived: false },
];
const titles = new Map(ASSIGNMENTS.map((a) => [a.id, a.title]));

/** A real plan for a 100-page book with check-ins that show a slow pace (about 1 page a day against 1.3 planned). */
function slowPlan(): ChildPlan {
  const a: EngineAssignment = { id: "ti", subjectId: "lit", childIds: ["c1"], unitType: "pages", totalUnits: 100, start: "2026-09-07", end: "2026-12-18" };
  const checkIns: ProgressCheckIn[] = [
    { assignmentId: "ti", childId: "c1", weekStart: "2026-09-14", position: 5, mode: "keepEndDate" },
    { assignmentId: "ti", childId: "c1", weekStart: "2026-09-21", position: 10, mode: "keepEndDate" },
  ];
  return planAll([a], { calendar: CALENDAR, asOf: TODAY, checkIns })[0]!;
}
/** The same book on plan: one check-in per week, right on pace. */
function onPacePlan(): ChildPlan {
  const base = planAll([{ id: "ti", subjectId: "lit", childIds: ["c1"], unitType: "pages", totalUnits: 100, start: "2026-09-07", end: "2026-12-18" }], { calendar: CALENDAR, asOf: TODAY })[0]!;
  const at = (date: string) => base.days.find((d) => d.date === date)!.position;
  const checkIns: ProgressCheckIn[] = [
    { assignmentId: "ti", childId: "c1", weekStart: "2026-09-14", position: at("2026-09-18"), mode: "keepEndDate" },
    { assignmentId: "ti", childId: "c1", weekStart: "2026-09-21", position: at("2026-09-25"), mode: "keepEndDate" },
  ];
  return planAll([{ id: "ti", subjectId: "lit", childIds: ["c1"], unitType: "pages", totalUnits: 100, start: "2026-09-07", end: "2026-12-18" }], { calendar: CALENDAR, asOf: TODAY, checkIns })[0]!;
}

/** A hand-built plan: `thickness` per school day on each given Monday-Friday week. */
function loadPlan(assignmentId: string, childId: string, weeks: Record<string, number>): ChildPlan {
  const days = Object.entries(weeks).flatMap(([monday, thickness]) =>
    [0, 1, 2, 3, 4].map((i) => {
      const date = new Date(Date.UTC(+monday.slice(0, 4), +monday.slice(5, 7) - 1, +monday.slice(8) + i)).toISOString().slice(0, 10);
      return { date, capacity: 1, schoolDay: true, units: thickness, thickness, kind: "planned" as const, position: 0 };
    }));
  return { ...onPaceBase(assignmentId, childId), days };
}
function onPaceBase(assignmentId: string, childId: string): ChildPlan {
  return { ...slowPlan(), assignmentId, childId, checkInWeeks: [], days: [], plannedEnd: "2026-12-18", end: "2026-12-18", remainingUnits: 100 };
}

describe("briefing lines (pure)", () => {
  const input = (plans: ChildPlan[]) => ({ plans, children: CHILDREN, titleOf: (id: string) => titles.get(id) ?? id, weekStart: "2026-10-26", calendar: CALENDAR });

  it("a slow pace is a late line; on pace, or with fewer than two check-in weeks, is nothing", () => {
    const [frank] = buildBriefing(input([slowPlan()]));
    expect(frank!.childName).toBe("Frank");
    expect(frank!.lines[0]!.text).toMatch(/^Treasure Island will finish about \d+ weeks? late at this pace\.$/);
    expect(buildBriefing(input([onPacePlan()]))).toEqual([]);
    expect(buildBriefing(input([{ ...slowPlan(), checkInWeeks: ["2026-09-14"] }]))).toEqual([]);
  });

  it("S4b-03: zero progress over two check-in weeks is a no-progress line; one check-in shows nothing", () => {
    const base = planAll([{ id: "ti", subjectId: "lit", childIds: ["c1"], unitType: "pages", totalUnits: 100, start: "2026-09-07", end: "2026-12-18" }], { calendar: CALENDAR, asOf: TODAY })[0]!;
    const before = base.days.find((d) => d.date === "2026-09-11")!.position;
    const flat = planAll([{ id: "ti", subjectId: "lit", childIds: ["c1"], unitType: "pages", totalUnits: 100, start: "2026-09-07", end: "2026-12-18" }], {
      calendar: CALENDAR, asOf: TODAY,
      checkIns: ["2026-09-14", "2026-09-21"].map((weekStart) => ({ assignmentId: "ti", childId: "c1", weekStart, position: before, mode: "keepEndDate" as const })),
    })[0]!;
    expect(buildBriefing(input([flat]))[0]!.lines.map((l) => l.text)).toEqual(["No progress on Treasure Island in the last 2 weeks."]);
    expect(buildBriefing(input([{ ...flat, checkInWeeks: ["2026-09-14"] }]))).toEqual([]);
  });

  it("S4b-03: a forecast over 26 weeks late is plain; 3 weeks late is unchanged", () => {
    const slow = slowPlan();
    const forecast = forecastFinish(slow, slow.checkInWeeks.map((weekStart) => ({ assignmentId: "ti", childId: "c1", weekStart, position: 0, mode: null })), CALENDAR)!;
    const text = (end: string) => buildBriefing(input([{ ...slow, end }]))[0]!.lines[0]!.text;
    expect(text(addDays(forecast, -21))).toBe("Treasure Island will finish about 3 weeks late at this pace.");
    expect(text(addDays(forecast, -26 * 7))).toBe("Treasure Island will finish about 26 weeks late at this pace.");
    expect(text(addDays(forecast, -61 * 7))).toBe("Treasure Island won't finish this school year at this pace.");
  });

  it("orders late, plan problems, heavy; leaves out a child with nothing", () => {
    const heavy = loadPlan("math", "c1", { "2026-10-26": 30, "2026-11-02": 10, "2026-11-09": 10, "2026-11-16": 10 });
    const stuck = { ...onPaceBase("poems", "c1"), unplacedUnits: 12, end: "2026-11-26" };
    const out = buildBriefing(input([heavy, stuck, slowPlan()]));
    expect(out.map((g) => g.childName)).toEqual(["Frank"]);
    expect(out[0]!.lines.map((l) => l.text)).toEqual([
      expect.stringMatching(/^Treasure Island will finish about/),
      "Poems has work that doesn't fit before Nov 26, 2026.",
      "This is a heavy week for Frank.",
    ]);
  });

  it("no capacity says so, and a complete assignment says nothing", () => {
    const none = { ...onPaceBase("poems", "c2"), noCapacity: true, unplacedUnits: 100 };
    expect(buildBriefing(input([none]))[0]!.lines.map((l) => l.text)).toEqual(["Poems has no school days left."]);
    expect(buildBriefing(input([{ ...none, complete: true }]))).toEqual([]);
  });

  it("an even load is not a heavy week", () => {
    const even = loadPlan("math", "c1", { "2026-10-26": 12, "2026-11-02": 10, "2026-11-09": 10 });
    expect(buildBriefing(input([even]))).toEqual([]);
  });

  it("rounds weeks late to at least one", () => {
    expect(weeksLate("2026-12-18", "2026-12-21")).toBe(1);
    expect(weeksLate("2026-12-18", "2027-01-15")).toBe(4);
  });

  it("asks for the span of the assignments, widened to the shown week, as one range", () => {
    const a = (startDate: string, endDate: string, archived = false) => ({ ...ASSIGNMENTS[0]!, startDate, endDate, archived }) as never;
    expect(briefingRanges([a("2026-09-07", "2026-12-18")] as never[], "2026-10-26")).toEqual([{ from: "2026-09-07", to: "2026-12-18" }]);
    expect(briefingRanges([a("2026-09-07", "2026-09-30"), a("2020-01-01", "2030-01-01", true)] as never[], "2026-10-26")).toEqual([{ from: "2026-09-07", to: "2026-11-01" }]);
  });

  it("over 400 days keeps the earliest start and cuts the far end (S4b-01)", () => {
    const a = (startDate: string, endDate: string) => ({ ...ASSIGNMENTS[0]!, startDate, endDate }) as never;
    expect(briefingRanges([a("2026-09-07", "2028-01-20")] as never[], "2026-10-26")).toEqual([{ from: "2026-09-07", to: "2027-10-11" }]);
  });

  it("with the shown week past the first range, a second range ends at the shown week (S4b-01)", () => {
    const a = (startDate: string, endDate: string) => ({ ...ASSIGNMENTS[0]!, startDate, endDate }) as never;
    const ranges = briefingRanges([a("2026-09-07", "2030-01-01")] as never[], "2028-03-06");
    expect(ranges).toEqual([{ from: "2026-09-07", to: "2027-10-11" }, { from: "2027-10-12", to: "2028-03-12" }]);
    for (const r of ranges) expect((Date.parse(r.to) - Date.parse(r.from)) / 86_400_000 + 1).toBeLessThanOrEqual(400);
  });

  it("merges the plans of two ranges per assignment and child, keeping the first plan's fields and every day once", () => {
    const day = (date: string) => ({ date, capacity: 1, schoolDay: true, units: 1, thickness: 1, kind: "planned" as const, position: 0 });
    const plan = (days: string[], end: string) => ({ ...onPaceBase("ti", "c1"), end, days: days.map(day) });
    const res = (plans: ChildPlan[]) => ({ engineVersion: ENGINE_VERSION, asOf: TODAY, from: "", to: "", plans });
    const merged = mergePlans([
      res([plan(["2026-09-07", "2026-09-08"], "2026-12-18"), { ...plan(["2026-09-07"], "x"), assignmentId: "other" }]),
      res([plan(["2026-09-08", "2028-03-06"], "2026-12-18")]),
    ]);
    expect(merged).toHaveLength(2);
    expect(merged[0]!.days.map((d) => d.date)).toEqual(["2026-09-07", "2026-09-08", "2028-03-06"]);
  });
});

const WEEKS_CHECKED = { weeks: [{ weekStart: "2026-10-12", weekEnd: "2026-10-18", status: "reviewed", hasCheckIns: false }] };
const LAST_WEEK = {
  weekStart: "2026-10-19", weekEnd: "2026-10-25", status: null, addable: [],
  items: [{ assignmentId: "ti", childId: "c1", childName: "Frank", title: "Treasure Island", unitType: "pages", plannedFrom: 0, plannedTo: 10, totalUnits: 100, actual: null, mode: null }],
};

function stub(plans: ChildPlan[], opts: { weeks?: unknown; lastWeek?: unknown } = {}) {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: TODAY, from: "2026-08-01", to: "2027-06-30", plans });
  fakeApi.on("GET /api/children", 200, CHILDREN);
  fakeApi.on("GET /api/subjects", 200, [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false }]);
  fakeApi.on("GET /api/assignments", 200, ASSIGNMENTS);
  fakeApi.on("GET /api/check-ins/weeks", 200, opts.weeks ?? { weeks: [] });
  fakeApi.on("GET /api/check-ins", 200, opts.lastWeek ?? EMPTY_WEEK);
}
/** The briefing's own plan request (it starts at the earliest assignment) has been answered. */
const briefingFetched = async () => {
  await waitFor(() => expect(fakeApi.calls.some((c) => c.path.startsWith("/api/plan?from=2026-09-07"))).toBe(true));
  await new Promise((r) => setTimeout(r, 30));
};
const region = () => screen.queryByRole("region", { name: "Weekly briefing" });

describe("Weekly briefing on This Week (S4-09)", () => {
  it("shows a late line for a child at a slow pace", async () => {
    stub([slowPlan()]);
    renderAt("/");
    const briefing = await screen.findByRole("region", { name: "Weekly briefing" });
    expect(within(briefing).getByText("Frank")).toBeInTheDocument();
    expect(within(briefing).getByText(/^Treasure Island will finish about \d+ weeks? late at this pace\.$/)).toBeInTheDocument();
    expect(within(briefing).queryByRole("link")).toBeNull();
  });

  it("shows unplaced work and no-capacity lines with the end date", async () => {
    stub([{ ...onPaceBase("poems", "c2"), unplacedUnits: 12, end: "2026-11-26" }, { ...onPaceBase("math", "c1"), noCapacity: true, unplacedUnits: 100 }]);
    renderAt("/");
    const briefing = await screen.findByRole("region", { name: "Weekly briefing" });
    expect(within(briefing).getByText("Poems has work that doesn't fit before Nov 26, 2026.")).toBeInTheDocument();
    expect(within(briefing).getByText("Math 5 has no school days left.")).toBeInTheDocument();
  });

  it("shows a heavy week for the shown week only", async () => {
    const plans = [loadPlan("math", "c1", { "2026-10-26": 30, "2026-11-02": 10, "2026-11-09": 10, "2026-11-16": 10 })];
    stub(plans);
    const { unmount } = renderAt("/");
    expect(await screen.findByText("This is a heavy week for Frank.")).toBeInTheDocument();
    unmount();
    renderAt("/?week=2026-11-02");
    await briefingFetched();
    expect(screen.queryByText("This is a heavy week for Frank.")).toBeNull();
    expect(region()).toBeNull();
  });

  it("nudges about last week, with a link, once the family has checked in before", async () => {
    stub([], { weeks: WEEKS_CHECKED, lastWeek: LAST_WEEK });
    renderAt("/");
    const link = await screen.findByRole("link", { name: "Last week isn't checked in yet." });
    expect(link).toHaveAttribute("href", "#last-week-checkin");
    expect(document.getElementById("last-week-checkin")).not.toBeNull();
  });

  it("the nudge goes once last week is confirmed from the card", async () => {
    stub([], { weeks: WEEKS_CHECKED, lastWeek: LAST_WEEK });
    fakeApi.on("PUT /api/check-ins/2026-10-19", () => {
      fakeApi.on("GET /api/check-ins", 200, { ...LAST_WEEK, status: "reviewed" });
      return [200, { ...LAST_WEEK, status: "reviewed", planChanged: false }];
    });
    renderAt("/");
    await screen.findByRole("link", { name: "Last week isn't checked in yet." });
    await userEvent.click(screen.getByRole("button", { name: "Looks right" }));
    await waitFor(() => expect(screen.queryByRole("link", { name: "Last week isn't checked in yet." })).toBeNull());
  });

  it("never nudges a family that has not checked in before, or when last week is done", async () => {
    stub([], { weeks: { weeks: [] }, lastWeek: LAST_WEEK });
    renderAt("/");
    await screen.findByRole("group", { name: "Week" });
    await screen.findByText(/How did last week go\?|Last week/);
    expect(screen.queryByText("Last week isn't checked in yet.")).toBeNull();
    expect(region()).toBeNull();
  });

  it("no nudge once last week is reviewed", async () => {
    stub([], { weeks: WEEKS_CHECKED, lastWeek: { ...LAST_WEEK, status: "reviewed" } });
    renderAt("/");
    await screen.findByRole("group", { name: "Week" });
    await screen.findByText("Nothing planned this week.");
    expect(screen.queryByText("Last week isn't checked in yet.")).toBeNull();
  });

  it("more than 3 lines collapse to 'and N more', which expands", async () => {
    const stuck = (id: string) => ({ ...onPaceBase(id, "c1"), unplacedUnits: 5, end: "2026-11-26" });
    const many = ["a1", "a2", "a3", "a4", "a5"];
    fakeApi.on("GET /api/assignments", 200, []);
    stub(many.map(stuck));
    fakeApi.on("GET /api/assignments", 200, many.map((id, i) => ({ ...ASSIGNMENTS[0], id, title: `Book ${i + 1}` })));
    renderAt("/");
    const list = await screen.findByRole("list", { name: "Briefing for Frank" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    await userEvent.click(screen.getByRole("button", { name: "and 2 more" }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    expect(screen.queryByRole("button", { name: /more$/ })).toBeNull();
  });

  it("a clean plan shows no briefing at all", async () => {
    stub([onPacePlan()]);
    renderAt("/");
    await screen.findAllByRole("button", { name: /^Make an adjustment for/ });
    await briefingFetched();
    expect(region()).toBeNull();
  });

  it("an API failure shows no briefing and doesn't break the page", async () => {
    stub([slowPlan()]);
    fakeApi.on("GET /api/assignments", 500, { error: "boom" });
    renderAt("/");
    await screen.findAllByRole("button", { name: /^Make an adjustment for/ });
    expect(region()).toBeNull();
  });

  it("one very long assignment doesn't hide a short one's late line: the request keeps the earliest start (S4b-01)", async () => {
    stub([slowPlan()]);
    fakeApi.on("GET /api/assignments", 200, [...ASSIGNMENTS, { ...ASSIGNMENTS[0], id: "long", title: "Epic", startDate: "2026-09-07", endDate: "2028-06-30" }]);
    renderAt("/");
    expect(await screen.findByText(/^Treasure Island will finish about \d+ weeks? late at this pace\.$/)).toBeInTheDocument();
    const plans = fakeApi.calls.filter((c) => c.path.startsWith("/api/plan?"));
    expect(plans.map((c) => c.path)).toContain("/api/plan?from=2026-09-07&to=2027-10-11");
    expect(plans.every((c) => !c.path.startsWith("/api/plan?from=2026-10-26&to=") || c.path.endsWith("2026-11-01"))).toBe(true);
  });

  it("a normal family makes one briefing request", async () => {
    stub([onPacePlan()]);
    renderAt("/");
    await briefingFetched();
    expect(fakeApi.calls.filter((c) => c.path.startsWith("/api/plan?from=2026-09-07"))).toHaveLength(1);
  });
});
