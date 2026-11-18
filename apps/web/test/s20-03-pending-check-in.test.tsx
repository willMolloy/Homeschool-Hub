/** S20-03: a pending last-week check-in is obvious on Home, counts on the needs-you dot, and is not a gate. */
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { hasPendingCheckIn } from "../src/features/home/pendingCheckIn";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const ITEM = {
  assignmentId: "ti", childId: "c1", childName: "Frank", title: "Treasure Island", unitType: "pages" as const,
  plannedFrom: 0, plannedTo: 10, totalUnits: 100, actual: null, mode: null,
};
const PENDING = { weekStart: "2026-10-19", weekEnd: "2026-10-25", status: null, items: [ITEM], addable: [] };
const CHECKED = { ...PENDING, status: "reviewed" as const };

function stub(week: unknown, me: unknown = DEMO_ME) {
  fakeApi.on("GET /api/me", 200, me);
  fakeApi.on("GET /api/children", 200, [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }]);
  fakeApi.on("GET /api/subjects", 200, [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false }]);
  fakeApi.on("GET /api/assignments", 200, [
    { id: "ti", subjectId: "lit", title: "Treasure Island", unitType: "pages", totalUnits: 100, weightPerUnit: null, startDate: "2026-08-31", endDate: "2027-05-28", childIds: ["c1"], archived: false, weekdays: null, endedAs: null, endedOn: null },
  ]);
  fakeApi.on("GET /api/plan", 200, { engineVersion: "0.15.0", asOf: "2026-10-28", from: "2026-10-26", to: "2026-11-01", plans: [] });
  fakeApi.on("GET /api/check-ins", 200, week);
}

describe("a pending check-in on Home (S20-03)", () => {
  it("counts only an unchecked week that had work", () => {
    expect(hasPendingCheckIn(PENDING)).toBe(true);
    expect(hasPendingCheckIn(CHECKED)).toBe(false);
    expect(hasPendingCheckIn({ ...PENDING, items: [] })).toBe(false);
    expect(hasPendingCheckIn(null)).toBe(false);
  });

  it("shows one card and raises the needs-you count, and Schedule still opens", async () => {
    stub(PENDING);
    const user = userEvent.setup();
    renderAt("/");
    const main = await screen.findByRole("main");
    expect(await within(main).findByText("How did last week go? Updating it keeps the schedule honest.")).toBeInTheDocument();
    expect(within(main).getByRole("link", { name: "Update last week" })).toHaveAttribute("href", "/schedule?view=week&week=2026-10-19");
    const home = await within(screen.getByRole("navigation", { name: "Main" })).findByRole("link", { name: "Home, 1 thing needs you" });
    expect(home.querySelector(".shell-nav-dot")).toBeTruthy();
    await user.click(within(main).getByRole("link", { name: "Schedule" }));
    expect(fakeApi.calls.some((c) => c.path.startsWith("/api/log-entries") && c.method !== "GET")).toBe(false);
  });

  it("a checked week shows no card and no dot", async () => {
    stub(CHECKED);
    renderAt("/");
    await within(await screen.findByRole("main")).findByRole("link", { name: "Schedule" });
    expect(screen.queryByText(/How did last week go/)).toBeNull();
    expect(document.querySelector(".shell-nav-dot")).toBeNull();
  });

  it("the finish question still shows beside the check-in, and both count", async () => {
    fakeApi.on("GET /api/children", 200, [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }]);
    fakeApi.on("GET /api/subjects", 200, [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false }]);
    fakeApi.on("GET /api/assignments", 200, [
      { id: "ti", subjectId: "lit", title: "Treasure Island", unitType: "pages", totalUnits: 100, weightPerUnit: null, startDate: "2026-08-31", endDate: "2026-10-23", childIds: ["c1"], archived: false, weekdays: null, endedAs: null, endedOn: null },
    ]);
    fakeApi.on("GET /api/plan", 200, { engineVersion: "0.15.0", asOf: "2026-10-28", from: "2026-10-26", to: "2026-11-01", plans: [] });
    fakeApi.on("GET /api/check-ins", 200, PENDING);
    renderAt("/");
    const main = await screen.findByRole("main");
    expect(await within(main).findByText(/Did Frank finish Treasure Island/)).toBeInTheDocument();
    expect(within(main).getByText(/How did last week go/)).toBeInTheDocument();
    await within(screen.getByRole("navigation", { name: "Main" })).findByRole("link", { name: "Home, 2 things need you" });
  });

  it("a viewer sees neither the card nor the dot", async () => {
    stub(PENDING, { ...DEMO_ME, role: "viewer", accounts: [{ ...DEMO_ME.accounts[0], role: "viewer" }] });
    renderAt("/");
    await screen.findByText("View only");
    expect(screen.queryByText(/How did last week go/)).toBeNull();
    expect(document.querySelector(".shell-nav-dot")).toBeNull();
  });
});
