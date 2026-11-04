/** S12-05: the needs-you dot on Home's tab and the rail: it follows the waiting list, never a warning, and clears without a reload. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, planAll, type Assignment as EngineAssignment, type ChildPlan, type ProgressCheckIn } from "@hh/engine";
import type { Assignment } from "../src/api/types";
import { homeLabel } from "../src/features/completion/NeedsYou";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const book = (over: Partial<Assignment>): Assignment => ({
  id: "ti", subjectId: "lit", title: "Treasure Island", unitType: "pages", totalUnits: 100, weightPerUnit: null,
  startDate: "2026-10-05", endDate: "2026-10-23", childIds: ["c1"], archived: false, weekdays: null, endedAs: null, endedOn: null, ...over,
});
function stub(initial: Assignment[]) {
  let list = initial;
  fakeApi.on("GET /api/children", 200, [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }]);
  fakeApi.on("GET /api/subjects", 200, [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false }]);
  fakeApi.on("GET /api/assignments", () => [200, list]);
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "2026-08-01", to: "2027-06-30", plans: [] });
  for (const a of initial) {
    fakeApi.on(`PATCH /api/assignments/${a.id}`, (b) => {
      list = list.map((x) => (x.id === a.id ? { ...x, ...(b as object) } as Assignment : x));
      return [200, list.find((x) => x.id === a.id)];
    });
  }
}
const nav = async () => within(await screen.findByRole("navigation", { name: "Main" }));
const dot = () => document.querySelector(".shell-nav-dot");

describe("the needs-you dot (S12-05)", () => {
  it("homeLabel says how many things need you", () => {
    expect(homeLabel(0)).toBe("Home");
    expect(homeLabel(1)).toBe("Home, 1 thing needs you");
    expect(homeLabel(2)).toBe("Home, 2 things need you");
  });

  it("one waiting: Home's link is \"Home, 1 thing needs you\" and carries the dot (one nav: the bar and the rail)", async () => {
    stub([book({})]);
    renderAt("/");
    expect(await (await nav()).findByRole("link", { name: "Home, 1 thing needs you" })).toBeInTheDocument();
    expect(dot()).toHaveAttribute("aria-hidden", "true");
    expect(document.querySelectorAll(".shell-nav-dot")).toHaveLength(1);
    expect(document.querySelectorAll("nav")).toHaveLength(1);
    // The other tabs keep plain names.
    for (const name of ["Schedule", "Records", "Set up"]) expect(within(await screen.findByRole("navigation", { name: "Main" })).getByRole("link", { name })).toBeInTheDocument();
  });

  it("two waiting: \"Home, 2 things need you\", and it shows on every screen", async () => {
    stub([book({}), book({ id: "b", title: "Aesop" })]);
    renderAt("/records");
    expect(await (await nav()).findByRole("link", { name: "Home, 2 things need you" })).toBeInTheDocument();
  });

  it("nothing waiting: plain \"Home\" and no dot", async () => {
    stub([book({ endDate: "2026-11-20" }), book({ id: "b", endedAs: "finished", endedOn: "2026-10-23" })]);
    renderAt("/");
    const n = await nav();
    expect(await n.findByRole("link", { name: "Home" })).toBeInTheDocument();
    await waitFor(() => expect(fakeApi.calls.some((c) => c.path === "/api/assignments")).toBe(true));
    await new Promise((r) => setTimeout(r, 50));
    expect(dot()).toBeNull();
  });

  it("never for a warning: a late line and a heavy week light nothing", async () => {
    const LATE: EngineAssignment = { id: "late", subjectId: "lit", childIds: ["c1"], unitType: "pages", totalUnits: 100, start: "2026-09-07", end: "2026-12-18" };
    const checkIns: ProgressCheckIn[] = [
      { assignmentId: "late", childId: "c1", weekStart: "2026-09-14", position: 5, mode: "keepEndDate" },
      { assignmentId: "late", childId: "c1", weekStart: "2026-09-21", position: 10, mode: "keepEndDate" },
    ];
    const slow: ChildPlan = planAll([LATE], { calendar: { weekStart: "mon", schoolDays: [1, 2, 3, 4, 5] }, asOf: "2026-10-28", checkIns })[0]!;
    stub([book({ id: "late", title: "Long book", startDate: "2026-09-07", endDate: "2026-12-18" })]);
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "x", to: "y", plans: [slow] });
    renderAt("/");
    expect(await screen.findByRole("region", { name: "Needs you" })).toHaveTextContent("will finish about");
    await new Promise((r) => setTimeout(r, 50));
    expect(dot()).toBeNull();
    expect(screen.queryByRole("region", { name: "A question for you" })).not.toBeInTheDocument();
    expect(await (await nav()).findByRole("link", { name: "Home" })).toBeInTheDocument();
  });

  it("clears the moment the last question is answered, with no reload; the first of two only lowers the count", async () => {
    stub([book({}), book({ id: "b", title: "Aesop", endDate: "2026-10-16" })]);
    const user = userEvent.setup();
    renderAt("/");
    // The sheet makes the rest of the page inert for assistive tech, so the Home link is read from the DOM.
    const homeName = () => document.querySelector('.shell-nav a[href="/"]')?.getAttribute("aria-label") ?? "Home";
    await waitFor(() => expect(homeName()).toBe("Home, 2 things need you"));
    await user.click(await screen.findByRole("button", { name: "Answer them" }));
    await user.click(await screen.findByRole("button", { name: "Yes, finished: Aesop" }));
    await waitFor(() => expect(homeName()).toBe("Home, 1 thing needs you"));
    await user.click(await screen.findByRole("button", { name: "We stopped: Treasure Island" }));
    await user.click(await screen.findByRole("button", { name: "Save" }));
    await waitFor(() => expect(homeName()).toBe("Home"));
    await waitFor(() => expect(dot()).toBeNull());
    expect(fakeApi.calls.filter((c) => c.path === "/api/me")).toHaveLength(1); // no reload of the session either
  });

  it("is the fern accent, never red", () => {
    const css = readFileSync(join(process.cwd(), "src/layout/app-shell.css"), "utf8");
    const rule = css.match(/\.shell-nav-dot \{[^}]*\}/)![0];
    expect(rule).toContain("background: var(--tl-primary)");
    expect(rule).not.toMatch(/red|danger|#[eE][0-9a-fA-F]{2}[0-4]/);
    expect(DEMO_ME.today).toBe("2026-10-28");
  });
});
