/** S10-13: Schedule · Week's ‹ range › group shares the Week | Year row; the old "This week" row and dates line are gone. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

function stub() {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "2026-10-26", to: "2026-11-01", plans: [] });
  fakeApi.on("GET /api/children", 200, [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }]);
  fakeApi.on("GET /api/subjects", 200, []);
  fakeApi.on("GET /api/assignments", 200, []);
  fakeApi.on("GET /api/events", 200, []);
  fakeApi.on("GET /api/week-overrides", 200, { overrides: [] });
}
const viewRow = () => screen.getByRole("tablist", { name: "View" }).parentElement as HTMLElement;

describe("S10-13: week arrows and dates in the Week | Year row", () => {
  beforeEach(() => { stub(); localStorage.clear(); });

  it("Week view has one header row: the switch, then ‹, the range with its word, then ›", async () => {
    renderAt("/schedule?view=week&week=2026-10-28");
    const group = await screen.findByRole("group", { name: "Week" });
    const row = viewRow();
    expect(row).toHaveClass("schedule-view-row");
    expect(row.contains(group)).toBe(true);
    expect(row.firstElementChild).toContainElement(screen.getByRole("tab", { name: "Week" }));
    expect(within(group).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Previous week", "Next week"]);
    const range = group.querySelector(".week-range") as HTMLElement;
    expect(group.children[1]).toBe(range);
    expect(range.textContent).toBe("This week\u00a0·\u00a0Oct 26 – Nov 1");
    expect(document.querySelector("p.week-dates")).toBeNull();
    expect(document.querySelector(".week-head")).toBeNull();
  });

  it("keeps a visually hidden h2 with the week's word", async () => {
    renderAt("/schedule?view=week&week=2026-10-28");
    const h2 = await screen.findByRole("heading", { level: 2, name: "This week" });
    expect(h2).toHaveClass("sr-only");
  });

  it("the arrows step weeks and the range is announced", async () => {
    renderAt("/schedule?view=week&week=2026-10-28");
    const user = userEvent.setup();
    const group = await screen.findByRole("group", { name: "Week" });
    const range = group.querySelector(".week-range") as HTMLElement;
    expect(range).toHaveAttribute("aria-live", "polite");
    await user.click(within(group).getByRole("button", { name: "Next week" }));
    expect(await screen.findByText("Nov 2 – Nov 8")).toBeInTheDocument();
    expect(range.textContent).toMatch(/^Coming week.*Nov 2 – Nov 8$/);
    await user.click(within(group).getByRole("button", { name: "Previous week" }));
    await user.click(within(group).getByRole("button", { name: "Previous week" }));
    expect(await screen.findByText("Oct 19 – Oct 25")).toBeInTheDocument();
    expect(range.textContent).toMatch(/^Last week/);
  });

  it("the Year view has no week group", async () => {
    renderAt("/schedule?view=year");
    await screen.findByRole("tab", { name: "Year", selected: true });
    expect(screen.queryByRole("group", { name: "Week" })).toBeNull();
    expect(viewRow().querySelector(".schedule-view-actions")?.childElementCount).toBe(0);
  });

  it("CSS: arrows stay 44 px and do not shrink; the word is only spoken under 360 px", () => {
    const css = readFileSync(join(process.cwd(), "src/features/week/week.css"), "utf8");
    expect(css).toMatch(/\.round-btn \{ width: 44px; height: 44px;/);
    expect(css).toMatch(/\.week-step-row \.round-btn \{ flex: none; \}/);
    expect(css).toMatch(/@media \(max-width: 359\.98px\) \{[^}]*\}\s*\.week-word \{ position: absolute; width: 1px;|@media \(max-width: 359\.98px\) \{[\s\S]*?\.week-word \{ position: absolute;/);
  });
});
