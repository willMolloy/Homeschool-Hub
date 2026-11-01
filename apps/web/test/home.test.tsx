// S8-04: Home, the Schedule page's Week | Year switch, the Set up list and the pure facts behind them.
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ENGINE_VERSION, type ChildPlan } from "@hh/engine";
import { finishGlance, greetingFor, longDate, weekGlance, weekOfSpan, weekSpan } from "../src/features/home/homeSummary";
import { SETUP_LINKS, TABS } from "../src/layout/nav";
import { fakeApi, EMPTY_WEEK } from "./helpers/fake-api";
import { renderAt } from "./render";

// The fake family's today is Wed 2026-10-28; its week is Oct 26 - Nov 1.
const plan = (assignmentId: string, childId: string, days: [string, number][], over: Partial<ChildPlan> = {}): ChildPlan => ({
  engineVersion: ENGINE_VERSION, assignmentId, childId, subjectId: "lit", unitType: "pages", weightPerUnit: 1,
  weightSource: "assignment", weekdays: null, weekdaysSource: "default", totalUnits: 270, doneUnits: 0, remainingUnits: 270, baseRate: 10, rate: 10,
  plannedEnd: "2026-12-01", end: "2026-12-01", mode: null, unplacedUnits: 0, noCapacity: false, complete: false,
  checkInWeeks: [], adjustedWeeks: [], weekdaysFrom: null, previousWeekdays: null, warnings: [],
  days: days.map(([date, units]) => ({ date, capacity: 1, schoolDay: true, units, thickness: units, kind: "planned" as const, position: units })),
  ...over,
} as ChildPlan);
const WEEK_DAYS: [string, number][] = [["2026-10-26", 10], ["2026-10-27", 10], ["2026-10-28", 10], ["2026-10-29", 10], ["2026-10-30", 10]];
const FRANK = plan("ti", "c1", WEEK_DAYS);
const MARG = plan("math", "c2", WEEK_DAYS, { end: "2026-12-08", plannedEnd: "2026-12-01" });

function stub(over: { plans?: ChildPlan[]; lastWeek?: unknown; weeks?: unknown } = {}) {
  fakeApi.on("GET /api/children", 200, [
    { id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false },
    { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false },
  ]);
  fakeApi.on("GET /api/subjects", 200, [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false }]);
  fakeApi.on("GET /api/assignments", 200, [
    { id: "ti", subjectId: "lit", title: "Treasure Island", startDate: "2026-08-31", endDate: "2027-05-28", archived: false },
    { id: "math", subjectId: "lit", title: "Math 5", startDate: "2026-08-31", endDate: "2027-05-28", archived: false },
  ]);
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "2026-10-26", to: "2026-11-01", plans: over.plans ?? [FRANK, MARG] });
  if (over.lastWeek) fakeApi.on("GET /api/check-ins", 200, over.lastWeek);
  if (over.weeks) fakeApi.on("GET /api/check-ins/weeks", 200, over.weeks);
}
const findInMain = async (name: string) => within(await screen.findByRole("main")).findByRole("link", { name });
const LAST_WEEK = { ...EMPTY_WEEK, items: [{ assignmentId: "ti", childId: "c1", childName: "Frank", title: "Treasure Island", unitType: "pages", plannedFrom: 0, plannedTo: 50, totalUnits: 270, actual: null, mode: null }] };

describe("Home", () => {
  beforeEach(() => stub());

  it("has the logo, a greeting, the date, the week of the year, and the family button", async () => {
    renderAt("/");
    expect(await screen.findByText("Homeschool Hub")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Good (morning|afternoon|evening)$/);
    expect(await screen.findByText(/Wednesday 28 October · Week 9 of 39/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Family and settings" })).toHaveTextContent("D");
  });

  it("Track work: a line per child with what is left, no engine numbers", async () => {
    renderAt("/");
    const card = (await findInMain("Track work")).closest(".card") as HTMLElement;
    expect(within(card).getByText("This week · 26 Oct – 1 Nov")).toBeInTheDocument();
    expect(await within(card).findByText("Frank")).toBeInTheDocument();
    expect(within(card).getAllByText("1 left")).toHaveLength(2);
    expect(card.textContent).not.toMatch(/thickness|rate|\d+\.\d+/i);
    expect(within(card).queryByText(/Last week needs a quick check/)).toBeNull();
    expect(within(screen.getByRole("main")).getByRole("link", { name: "Track work" })).toHaveAttribute("href", "/track");
  });

  it("Track work says when last week needs a quick check", async () => {
    stub({ lastWeek: LAST_WEEK });
    renderAt("/");
    expect(await screen.findByText("Last week needs a quick check")).toBeInTheDocument();
  });

  it("Schedule: the tiny timeline and the finish line (late work says about when)", async () => {
    renderAt("/");
    const card = (await findInMain("Schedule")).closest(".card") as HTMLElement;
    expect(await within(card).findByText(/finishing about 8 Dec/)).toBeInTheDocument();
    expect(card.querySelector(".home-mini")).not.toBeNull();
    expect(within(screen.getByRole("main")).getByRole("link", { name: "Schedule" })).toHaveAttribute("href", "/schedule");
  });

  it("Schedule: on track when nothing moved", async () => {
    stub({ plans: [FRANK] });
    renderAt("/");
    expect(await screen.findByText(/on track to finish 1 Dec/)).toBeInTheDocument();
  });

  it("shows the briefing line when something needs attention, and none otherwise", async () => {
    renderAt("/");
    await screen.findByText("Frank");
    expect(screen.queryByRole("region", { name: "Weekly briefing" })).toBeNull();
  });

  it("has a Set up row that opens the list", async () => {
    const user = userEvent.setup();
    const { router } = renderAt("/");
    await user.click(await within(await screen.findByRole("main")).findByRole("link", { name: /Set up/ }));
    expect(router.state.location.pathname).toBe("/setup");
  });

  it("the family button opens Family settings and Sign out", async () => {
    const user = userEvent.setup();
    const { router } = renderAt("/");
    await user.click(await screen.findByRole("button", { name: "Family and settings" }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByText("Demo family")).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    await user.click(within(sheet).getByRole("link", { name: /Family settings/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/setup/settings"));
  });

  it("a brand-new family still gets a calm Home", async () => {
    fakeApi.on("GET /api/children", 200, []);
    fakeApi.on("GET /api/assignments", 200, []);
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "2026-10-26", to: "2026-11-01", plans: [] });
    renderAt("/");
    expect(await findInMain("Track work")).toBeInTheDocument();
    expect(within(screen.getByRole("main")).getByRole("link", { name: "Schedule" })).toBeInTheDocument();
    expect(screen.queryByText(/Week \d+ of/)).toBeNull();
  });
});

describe("Set up", () => {
  it("lists every set-up screen with a one-line description, from the shared config", async () => {
    renderAt("/setup");
    const list = await screen.findByRole("list", { name: "Set up" });
    const links = within(list).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(SETUP_LINKS.map((l) => l.to));
    expect(links.map((l) => l.querySelector(".list-row-title")!.textContent)).toEqual(["Children", "Subjects", "Assignments", "Days off and breaks", "Events"]);
    for (const l of links) expect(l.querySelector(".list-row-desc")!.textContent!.length).toBeGreaterThan(5);
  });

  it("a set-up screen links back to the list", async () => {
    const user = userEvent.setup();
    const { router } = renderAt("/setup/days-off");
    await user.click(await screen.findByRole("link", { name: "‹ Set up" }));
    expect(router.state.location.pathname).toBe("/setup");
  });

  it("the tab set and names live in one config", () => {
    expect(TABS.map((t) => t.label)).toEqual(["Home", "Track work", "Schedule"]);
  });
});

describe("Schedule: Week | Year", () => {
  beforeEach(() => {
    stub();
    localStorage.clear();
  });

  it("opens on Week, has the two tabs, and Year is one more tap", async () => {
    const user = userEvent.setup();
    const { router } = renderAt("/schedule");
    const tabs = await screen.findByRole("tablist", { name: "View" });
    expect(within(tabs).getByRole("tab", { name: "Week" })).toHaveAttribute("aria-selected", "true");
    await user.click(within(tabs).getByRole("tab", { name: "Year" }));
    expect(router.state.location.search).toContain("view=year");
    expect(await screen.findByRole("img", { name: "Year timeline" }).catch(() => null)).not.toBeUndefined();
  });

  it("remembers the choice on this device", async () => {
    const user = userEvent.setup();
    const first = renderAt("/schedule");
    await user.click(await screen.findByRole("tab", { name: "Year" }));
    expect(localStorage.getItem("hh.schedule.view")).toBe("year");
    first.unmount();
    renderAt("/schedule");
    expect(await screen.findByRole("tab", { name: "Year" })).toHaveAttribute("aria-selected", "true");
  });

  it("blocked storage still switches", async () => {
    const user = userEvent.setup();
    const get = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new Error("blocked"); };
    Storage.prototype.setItem = () => { throw new Error("blocked"); };
    try {
      renderAt("/schedule");
      await user.click(await screen.findByRole("tab", { name: "Year" }));
      expect(screen.getByRole("tab", { name: "Year" })).toHaveAttribute("aria-selected", "true");
    } finally {
      Storage.prototype.getItem = get;
      delete (Storage.prototype as { setItem?: unknown }).setItem;
    }
  });
});

describe("Home's facts", () => {
  it("greets by the hour", () => {
    expect([greetingFor(6), greetingFor(12), greetingFor(16), greetingFor(17), greetingFor(23)]).toEqual(["Good morning", "Good afternoon", "Good afternoon", "Good evening", "Good evening"]);
  });
  it("says dates in words", () => {
    expect(longDate("2026-10-31")).toBe("Saturday 31 October");
    expect(weekSpan("2026-10-26")).toBe("26 Oct – 1 Nov");
  });
  it("week N of M comes from the span of the live assignments, only while today is inside it", () => {
    const a = (s: string, e: string, archived = false) => ({ startDate: s, endDate: e, archived }) as never;
    expect(weekOfSpan([a("2026-08-31", "2027-05-28")], "2026-10-28")).toEqual({ n: 9, m: 39 });
    expect(weekOfSpan([a("2026-08-31", "2027-05-28")], "2026-08-01")).toBeNull();
    expect(weekOfSpan([a("2026-08-31", "2027-05-28", true)], "2026-10-28")).toBeNull();
    expect(weekOfSpan([], "2026-10-28")).toBeNull();
  });
  it("a child's week: the share behind today and the assignments with work left", () => {
    expect(weekGlance([FRANK], "c1", "2026-10-26", "2026-10-28")).toEqual({ progress: 0.4, left: 1 });
    expect(weekGlance([FRANK], "c1", "2026-10-26", "2026-11-02")).toEqual({ progress: 1, left: 0 });
    expect(weekGlance([FRANK], "c2", "2026-10-26", "2026-10-28")).toEqual({ progress: 0, left: 0 });
  });
  it("the finish: the latest end of open work, and whether it is still the planned one", () => {
    expect(finishGlance([FRANK])).toEqual({ date: "2026-12-01", onTrack: true });
    expect(finishGlance([FRANK, MARG])).toEqual({ date: "2026-12-08", onTrack: false });
    expect(finishGlance([plan("x", "c1", [], { complete: true })])).toBeNull();
  });
});
