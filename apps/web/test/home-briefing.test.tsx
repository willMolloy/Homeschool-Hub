/** S9-05: Home's one briefing line: the most important item, one action, and nothing at all when nothing is due. */
import { readFileSync } from "node:fs";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, planAll, type Assignment as EngineAssignment, type ChildPlan, type ProgressCheckIn } from "@hh/engine";
import { topBriefingLine, type ChildBriefing } from "../src/features/plan/briefingLines";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const CALENDAR = { weekStart: "mon" as const, schoolDays: [1, 2, 3, 4, 5] as ChildPlan["weekdays"] & number[] };
const TODAY = "2026-10-28";
const BOOK: EngineAssignment = { id: "ti", subjectId: "lit", childIds: ["c1"], unitType: "pages", totalUnits: 100, start: "2026-09-07", end: "2026-12-18" };

/** A real plan for a book with two slow check-in weeks: Treasure Island is late. */
function slowPlan(): ChildPlan {
  const checkIns: ProgressCheckIn[] = [
    { assignmentId: "ti", childId: "c1", weekStart: "2026-09-14", position: 5, mode: "keepEndDate" },
    { assignmentId: "ti", childId: "c1", weekStart: "2026-09-21", position: 10, mode: "keepEndDate" },
  ];
  return planAll([BOOK], { calendar: CALENDAR, asOf: TODAY, checkIns })[0]!;
}
const onPlan = (): ChildPlan => planAll([BOOK], { calendar: CALENDAR, asOf: TODAY })[0]!;

const group = (childId: string, childName: string, keys: string[]): ChildBriefing => ({ childId, childName, lines: keys.map((key) => ({ key, text: `${key} text` })) });

describe("which line Home shows (pure)", () => {
  it("none when there is nothing", () => {
    expect(topBriefingLine([])).toBeNull();
  });
  it("late or stalled work beats plan problems, and those beat a heavy week, across children", () => {
    expect(topBriefingLine([group("c1", "Frank", ["heavy", "nocap-x"]), group("c2", "Margaret", ["late-y"])])!.key).toBe("late-y");
    expect(topBriefingLine([group("c1", "Frank", ["heavy"]), group("c2", "Margaret", ["unplaced-z"])])!.key).toBe("unplaced-z");
    expect(topBriefingLine([group("c1", "Frank", ["noprogress-a"]), group("c2", "Margaret", ["late-b"])])!.key).toBe("noprogress-a");
    expect(topBriefingLine([group("c1", "Frank", ["heavy"])])!.key).toBe("heavy");
  });
  it("ties go to the earlier child, then the earlier line", () => {
    expect(topBriefingLine([group("c1", "Frank", ["late-1", "late-2"]), group("c2", "Margaret", ["late-3"])])!.key).toBe("late-1");
  });
});

function stub(plans: ChildPlan[]) {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: TODAY, from: "2026-08-01", to: "2027-06-30", plans });
  fakeApi.on("GET /api/children", 200, [
    { id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false },
    { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false },
  ]);
  fakeApi.on("GET /api/subjects", 200, [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false }]);
  fakeApi.on("GET /api/assignments", 200, [{ id: "ti", subjectId: "lit", title: "Treasure Island", startDate: "2026-09-07", endDate: "2026-12-18", childIds: ["c1"], archived: false }]);
}
const briefingFetched = async () => {
  await waitFor(() => expect(fakeApi.calls.some((c) => c.path.startsWith("/api/plan?from=2026-09-07"))).toBe(true));
  await new Promise((r) => setTimeout(r, 30));
};

describe("Home's briefing line", () => {
  it("shows one line with a working Review action when something is late", async () => {
    stub([slowPlan()]);
    const user = userEvent.setup();
    const { router } = renderAt("/");
    const line = await screen.findByRole("region", { name: "Needs you" });
    expect(within(line).getByText(/^Treasure Island will finish about \d+ weeks? late at this pace\.$/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Weekly briefing" })).toBeNull();
    expect(line.querySelectorAll("li, p")).toHaveLength(1);
    await user.click(within(line).getByRole("link", { name: "Review" }));
    expect(router.state.location.pathname).toBe("/schedule");
    expect(router.state.location.search).toContain("view=week");
    // The Week view carries the same line with its Move and Keep buttons.
    expect(await screen.findByRole("button", { name: /^Move end to / })).toBeInTheDocument();
  });

  it("shows nothing at all, no 'All good', when nothing needs the parent", async () => {
    stub([onPlan()]);
    renderAt("/");
    await briefingFetched();
    expect(screen.queryByRole("region", { name: "Needs you" })).toBeNull();
    expect(screen.queryByText(/all good|on track|nothing/i, { selector: ".home-briefing *" })).toBeNull();
  });

  it("is hidden once the parent keeps the date", async () => {
    stub([slowPlan()]);
    const user = userEvent.setup();
    localStorage.clear();
    renderAt("/schedule?view=week");
    await user.click(await screen.findByRole("button", { name: /^Keep / }));
    const { unmount } = renderAt("/");
    await briefingFetched();
    expect(screen.queryByRole("region", { name: "Needs you" })).toBeNull();
    unmount();
    localStorage.clear();
  });

  it("the action is a 44 px target in a soft pill", () => {
    const css = readFileSync("src/features/plan/plan.css", "utf8");
    expect(css).toMatch(/\.home-briefing-action \{[^}]*min-height: 44px/);
    expect(css).toMatch(/\.home-briefing \{[^}]*border-radius: 999px[^}]*background: var\(--tl-primary-soft\)/);
  });
});
