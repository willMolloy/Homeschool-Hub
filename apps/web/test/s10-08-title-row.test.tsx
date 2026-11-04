/** S10-08: Schedule's title row holds the Year view's "+" (Add assignment); the zoom row ends in a pinned pencil (Edit views). */
import { readFileSync } from "node:fs";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_SUBJECTS, samplePlans } from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

function stub() {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
  fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
  fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, SAMPLE_ASSIGNMENTS);
  fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
  fakeApi.on("GET /api/events", 200, []);
}

const css = (f: string) => readFileSync(f, "utf8");
const rule = (text: string, sel: string) => text.match(new RegExp(`(^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{[^}]*\\}`))?.[0] ?? "";

describe("Schedule title row and zoom row (S10-08)", () => {
  it("a \"+\" named Add assignment sits in the title row beside Schedule, and opens the Add sheet", async () => {
    stub();
    const user = userEvent.setup();
    renderAt("/schedule?view=year");
    await screen.findByRole("img", { name: "Year timeline" });
    const add = screen.getByRole("button", { name: "Add assignment" });
    const row = add.closest(".schedule-title-row")!;
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByRole("heading", { level: 1 })).toHaveTextContent("Schedule");
    expect(add.querySelector("svg")).not.toBeNull();
    expect(document.querySelector(".timeline-page-header .tl-add-btn")).toBeNull(); // not twice
    await user.click(add);
    expect(await screen.findByRole("dialog", { name: "Add assignment" })).toBeInTheDocument();
  });

  it("the Week view has no \"+\"", async () => {
    stub();
    fakeApi.on("GET /api/plan/week", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, days: [] });
    renderAt("/schedule?view=week");
    await screen.findByRole("heading", { level: 1, name: "Schedule" });
    expect(screen.queryByRole("button", { name: "Add assignment" })).toBeNull();
  });

  it("the pencil, named Edit views, is pinned after the scrolling chips", async () => {
    stub();
    renderAt("/schedule?view=year");
    await screen.findByRole("img", { name: "Year timeline" });
    const pencil = screen.getByRole("button", { name: "Edit views" });
    const chips = screen.getByRole("group", { name: "Zoom" });
    expect(pencil.querySelector("svg")).not.toBeNull();
    expect(chips.contains(pencil)).toBe(false); // it does not scroll with them
    expect(pencil.previousElementSibling).toBe(chips);
    expect(pencil.parentElement).toHaveClass("tl-zoom-row");
    const t = css("src/features/timeline/timeline.css");
    expect(rule(t, ".tl-zoom")).toMatch(/overflow-x: auto/);
    expect(rule(t, ".tl-zoom-edit")).toMatch(/flex: none/);
    expect(rule(t, ".tl-zoom-edit")).toMatch(/min-height: 44px/);
    expect(rule(t, ".tl-zoom-edit")).toMatch(/min-width: 44px/);
    expect(rule(t, ".tl-add-btn")).toMatch(/min-height: 44px/);
    expect(rule(t, ".tl-add-btn")).toMatch(/min-width: 44px/);
  });
});
