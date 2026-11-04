/** S10-18: from 840 px the Year edit sheet is a 360 px side panel (no backdrop, not modal) that stays open while other bars
 *  are picked, and closes with Esc, × or a click on empty timeline space; focus goes to its heading on open and back to
 *  the bar on close. Under 840 px the bottom bar is unchanged. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import type { Assignment } from "../src/api/types";
import { EDIT_PANEL_QUERY } from "../src/features/timeline/EditBar";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_EVENTS, SAMPLE_SUBJECTS, samplePlans } from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

function stub() {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
  fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
  fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, SAMPLE_ASSIGNMENTS);
  fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
  fakeApi.on("GET /api/events", 200, SAMPLE_EVENTS);
  fakeApi.on("POST /api/plan/pace", (body) => [200, {
    paces: (body as { drafts: { childIds: string[] }[] }).drafts.map((d) => ({ capacityDays: 7, perChild: d.childIds.map((childId) => ({ childId, capacityDays: 7 })) })),
  }]);
  for (const a of SAMPLE_ASSIGNMENTS) fakeApi.on(`PATCH /api/assignments/${a.id}`, (body) => [200, { ...a, ...(body as Partial<Assignment>) }]);
}

function width(wide: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === EDIT_PANEL_QUERY ? wide : false, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  }));
}

/** Where a band starts, in the picture's own coordinates (jsdom's picture sits at 0, 0). */
const startOf = (band: Element) => band.getAttribute("d")!.slice(1).split(/[ ,LCQVHZ]+/).filter(Boolean).map(Number) as [number, number];

async function open() {
  renderAt("/timeline");
  const svg = await screen.findByRole("img", { name: "Year timeline" });
  const bands = [...svg.querySelectorAll("path.tl-band")];
  const distinct = bands.filter((b, i) => bands.findIndex((x) => x.getAttribute("data-assignment") === b.getAttribute("data-assignment")) === i);
  const clickBand = (band: Element) => { const [x, y] = startOf(band); fireEvent.click(svg, { clientX: x + 1, clientY: y + 1 }); };
  const titleOf = (band: Element) => SAMPLE_ASSIGNMENTS.find((a) => a.id === band.getAttribute("data-assignment"))!.title;
  return { svg, distinct, clickBand, titleOf };
}
const panelEl = () => screen.queryByRole("region", { name: /^Edit / });

describe("the Year edit sheet as a side panel (S10-18)", () => {
  it("from 840 px: a panel, focus on its heading; another bar swaps it and it stays open", async () => {
    stub();
    width(true);
    const { distinct, clickBand, titleOf, svg } = await open();
    clickBand(distinct[0]!);
    const panel = await screen.findByRole("region", { name: `Edit ${titleOf(distinct[0]!)}` });
    expect(panel).toHaveAttribute("data-panel");
    const heading = within(panel).getByRole("heading", { level: 2, name: titleOf(distinct[0]!) });
    await waitFor(() => expect(heading).toHaveFocus());
    // Not modal: no backdrop, no dialog, and the timeline still takes picks; no room is kept under the timeline.
    expect(document.querySelector(".sheet-backdrop, [role=dialog]")).toBeNull();
    expect(document.querySelector(".tl-edit-room")).toBeNull();
    // The calendars open downward from the top of the panel.
    fireEvent.click(within(panel).getAllByRole("button", { name: "Choose a date" })[0]!);
    expect(panel.querySelector(".date-cal")).not.toHaveClass("date-cal-up");
    fireEvent.keyDown(document, { key: "Escape" });

    clickBand(distinct[1]!);
    const same = await screen.findByRole("region", { name: `Edit ${titleOf(distinct[1]!)}` });
    expect(document.querySelectorAll(".tl-edit")).toHaveLength(1);
    expect(same).toBe(panelEl());
    expect(svg.querySelector(`path.tl-band.tl-selected[data-assignment="${distinct[1]!.getAttribute("data-assignment")}"]`)).not.toBeNull();
  });

  it("closes with Esc, with the 44 px Close button, and with a click on empty timeline; focus goes back to the timeline", async () => {
    stub();
    width(true);
    const { distinct, clickBand, svg } = await open();

    clickBand(distinct[0]!);
    await waitFor(() => expect(panelEl()).not.toBeNull());
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(panelEl()).toBeNull());
    await waitFor(() => expect(svg).toHaveFocus());

    clickBand(distinct[0]!);
    await waitFor(() => expect(panelEl()).not.toBeNull());
    fireEvent.click(within(panelEl()!).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(panelEl()).toBeNull());
    await waitFor(() => expect(svg).toHaveFocus());

    clickBand(distinct[0]!);
    await waitFor(() => expect(panelEl()).not.toBeNull());
    fireEvent.click(svg, { clientX: 1, clientY: 100000 });
    await waitFor(() => expect(panelEl()).toBeNull());
  });

  it("opened from the lanes list (the keyboard path), focus goes back to that assignment's button", async () => {
    stub();
    width(true);
    const user = userEvent.setup();
    await open();
    const a = SAMPLE_ASSIGNMENTS[0]!;
    const button = document.querySelector<HTMLButtonElement>(`.tl-lane-pick[data-assignment="${a.id}"]`)!;
    button.focus();
    await user.keyboard("{Enter}");
    const panel = await screen.findByRole("region", { name: `Edit ${a.title}` });
    await waitFor(() => expect(within(panel).getByRole("heading", { level: 2 })).toHaveFocus());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(panelEl()).toBeNull());
    await waitFor(() => expect(document.querySelector(`.tl-lane-pick[data-assignment="${a.id}"]`)).toHaveFocus());
  });

  it("under 840 px it is the bottom bar, unchanged: no panel, focus stays put", async () => {
    stub();
    width(false);
    const { distinct, clickBand } = await open();
    clickBand(distinct[0]!);
    await waitFor(() => expect(panelEl()).not.toBeNull());
    expect(panelEl()).not.toHaveAttribute("data-panel");
    expect(document.querySelector(".tl-edit-room")).not.toBeNull();
    expect(within(panelEl()!).getByRole("heading", { level: 2 })).not.toHaveFocus();
    fireEvent.click(within(panelEl()!).getAllByRole("button", { name: "Choose a date" })[0]!);
    expect(panelEl()!.querySelector(".date-cal")).toHaveClass("date-cal-up");
  });

  it("the panel is 360 px on the right, full height, and the page narrows beside it", () => {
    expect(EDIT_PANEL_QUERY).toBe("(min-width: 840px)");
    const css = readFileSync(join(process.cwd(), "src/features/timeline/timeline.css"), "utf8");
    expect(css).toMatch(/--edit-panel-width: 360px;/);
    const block = css.slice(css.indexOf("@media (min-width: 840px)"));
    expect(block).toMatch(/\.tl-edit\[data-panel\] \{\s*top: 0; bottom: 0; left: auto; right: 0; width: var\(--edit-panel-width\);/);
    expect(block).toMatch(/\.shell-main:has\(\.tl-edit\[data-panel\]\) \{ padding-right: calc\(var\(--edit-panel-width\) \+ var\(--page-pad\)\); \}/);
    expect(css).toMatch(/\.tl-edit-close \{[^}]*width: 44px; height: 44px;/);
  });
});
