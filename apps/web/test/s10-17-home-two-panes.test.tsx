/** S10-17: Home in two panes from 840 px: Schedule in the wide pane, Records and the checklist in the narrow one, the
 *  header, greeting, date and briefing above both (the briefing spans both so the cards start level; Will, 2026-11-05). Under 840 px, one column in the old order. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ENGINE_VERSION, planAll, type Assignment as EngineAssignment, type ChildPlan, type ProgressCheckIn } from "@hh/engine";
import { HOME_PANES_QUERY } from "../src/features/home/HomePage";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const CALENDAR = { weekStart: "mon" as const, schoolDays: [1, 2, 3, 4, 5] as ChildPlan["weekdays"] & number[] };
const BOOK: EngineAssignment = { id: "ti", subjectId: "lit", childIds: ["c1"], unitType: "pages", totalUnits: 100, start: "2026-09-07", end: "2026-12-18" };
/** A real plan with two slow check-in weeks: Treasure Island is late, so the briefing shows (as in home-briefing.test). */
function slowPlan(): ChildPlan {
  const checkIns: ProgressCheckIn[] = [
    { assignmentId: "ti", childId: "c1", weekStart: "2026-09-14", position: 5, mode: "keepEndDate" },
    { assignmentId: "ti", childId: "c1", weekStart: "2026-09-21", position: 10, mode: "keepEndDate" },
  ];
  return planAll([BOOK], { calendar: CALENDAR, asOf: "2026-10-28", checkIns })[0]!;
}

function stub() {
  fakeApi.on("GET /api/children", 200, [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }]);
  fakeApi.on("GET /api/subjects", 200, [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false }]);
  fakeApi.on("GET /api/assignments", 200, [
    { id: "ti", subjectId: "lit", title: "Treasure Island", startDate: "2026-09-07", endDate: "2026-12-18", childIds: ["c1"], archived: false },
  ]);
  // The family put its breaks off in the setup flow (S11-05), so the getting-started checklist shows; Treasure Island runs late, so the briefing shows.
  fakeApi.on("GET /api/me", 200, { ...DEMO_ME, setupDeferred: ["breaks"] });
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "2026-08-01", to: "2027-06-30", plans: [slowPlan()] });
}

function width(wide: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === HOME_PANES_QUERY ? wide : false, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  }));
}

/** What Home shows, top to bottom, as short names. */
async function order(root: HTMLElement) {
  await screen.findByRole("region", { name: "Getting started" });
  await screen.findByRole("region", { name: "Needs you" });
  const parts = root.querySelectorAll(".home-briefing, .home-checklist, .home-card:not(.home-checklist)");
  return [...parts].map((el) => el.classList.contains("home-briefing") ? "briefing"
    : el.classList.contains("home-checklist") ? "checklist" : el.querySelector("h2")!.textContent!);
}

describe("Home's layout (S10-17)", () => {
  it("is two panes from 840 px: the briefing above both, Schedule wide, Records and the checklist narrow", async () => {
    stub();
    width(true);
    renderAt("/");
    const home = (await screen.findByRole("main")).querySelector(".home") as HTMLElement;
    await waitFor(async () => expect(await order(home)).toHaveLength(4));
    const wide = home.querySelector(".home-pane-wide") as HTMLElement;
    const narrow = home.querySelector(".home-pane-narrow") as HTMLElement;
    expect(await order(wide)).toEqual(["Schedule"]);
    expect(await order(narrow)).toEqual(["Records", "checklist"]);
    // The header, greeting, date and briefing span the top, above both panes, so Schedule and Records start level.
    const panes = home.querySelector(".home-panes")!;
    for (const top of [home.querySelector(".home-top")!, screen.getByRole("heading", { level: 1 }), home.querySelector(".home-date")!, home.querySelector(".home-briefing")!]) {
      expect(panes.contains(top)).toBe(false);
      expect(top.compareDocumentPosition(panes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(within(wide).getByRole("link", { name: "Schedule" })).toHaveAttribute("href", "/schedule");
    expect(within(narrow).getByRole("link", { name: "Records" })).toHaveAttribute("href", "/records");
  });

  it("is one column under 840 px, in the old order", async () => {
    stub();
    width(false);
    renderAt("/");
    const home = (await screen.findByRole("main")).querySelector(".home") as HTMLElement;
    await waitFor(async () => expect(await order(home)).toEqual(["briefing", "checklist", "Schedule", "Records"]));
    expect(home.querySelector(".home-panes, .home-pane")).toBeNull();
  });

  it("the panes are 24 px apart, the narrow one 320–360 px, and Home up to 1040 px wide from 840 px", () => {
    expect(HOME_PANES_QUERY).toBe("(min-width: 840px)");
    const home = readFileSync(join(process.cwd(), "src/features/home/home.css"), "utf8");
    expect(home).toMatch(/\.home-panes \{ display: grid; grid-template-columns: minmax\(0, 1fr\) clamp\(320px, calc\(100% - 504px\), 360px\); gap: 24px;/);
    const shell = readFileSync(join(process.cwd(), "src/layout/app-shell.css"), "utf8");
    expect(shell).toMatch(/--home-max: 1040px;/);
    expect(shell).toMatch(/@media \(min-width: 840px\) \{\s*\.shell-main:has\(\.home-panes\) \{\s*max-width: calc\(var\(--home-max\) \+ 2 \* var\(--page-pad\)\);/);
  });
});
