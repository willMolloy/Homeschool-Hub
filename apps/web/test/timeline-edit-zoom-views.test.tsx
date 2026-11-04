/** S7-05: the quiet Edit at the end of the zoom row and the sheet behind it (EditZoomViews, ZoomPresets, TimelinePage). */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import type { ZoomViews } from "../src/api/types";
import { readFileSync } from "node:fs";
import { EditZoomViewsSheet } from "../src/features/timeline/EditZoomViews";
import { MAX_VISIBLE_ZOOMS, newViewId, viewProblem, visibleCount } from "../src/features/timeline/zoomViews";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_SUBJECTS, samplePlans } from "./helpers/timeline-fixtures";
import { writes } from "./helpers/schedule-fixtures";
import { render } from "@testing-library/react";
import { renderAt } from "./render";
import { rangeOptions, yearHalves, yearSpan } from "../src/features/records/ranges";
import { formatDate as usDate } from "../src/lib/dates";

const id = (n: number) => `70000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const TERM1 = { id: id(1), name: "Term 1", start: "2026-08-17", end: "2026-11-06" };
const TERM2 = { id: id(2), name: "Term 2", start: "2026-11-09", end: "2027-02-05" };
const FAMILY = { name: "F", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false };

function stub(zoomViews: ZoomViews = { hidden: [], custom: [] }) {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
  fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
  fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, SAMPLE_ASSIGNMENTS);
  fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
  fakeApi.on("GET /api/events", 200, []);
  fakeApi.on("GET /api/family", 200, { ...FAMILY, zoomViews });
  fakeApi.on("PATCH /api/family", (body) => [200, { ...FAMILY, ...(body as object) }]);
}
async function open(zoomViews?: ZoomViews) {
  stub(zoomViews);
  const user = userEvent.setup();
  renderAt("/timeline");
  await screen.findByRole("img", { name: "Year timeline" });
  return user;
}
// hidden: true, because the rest of the page is inert while the sheet is open.
const row = () => within(screen.getByRole("group", { name: "Zoom", hidden: true })).getAllByRole("button", { hidden: true }).map((b) => b.textContent);
async function edit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Edit views" }));
  return screen.findByRole("form", { name: "Zoom views" });
}
const sent = () => writes().map((w) => w.body);

/** Adds a view: Add a view, then fills the newest group. */
async function addView(user: ReturnType<typeof userEvent.setup>, form: HTMLElement, name: string, start: string, end: string) {
  await user.click(within(form).getByRole("button", { name: "Add a view" }));
  const groups = within(form).getAllByRole("group", { name: /^View: / });
  const g = groups[groups.length - 1]!;
  await user.type(within(g).getByLabelText("Name"), name);
  fireEvent.change(within(g).getByLabelText("First day"), { target: { value: start } });
  fireEvent.change(within(g).getByLabelText("Last day"), { target: { value: end } });
}

describe("the helpers (S7-05)", () => {
  it("counts the views the row would show", () => {
    expect(visibleCount({ hidden: [], custom: [] })).toBe(4);
    expect(visibleCount({ hidden: ["fall", "spring"], custom: [TERM1, TERM2] })).toBe(4);
    expect(visibleCount({ hidden: ["fall", "spring", "month"], custom: [TERM1, TERM2, TERM1, TERM2, TERM1] })).toBe(6);
    expect(MAX_VISIBLE_ZOOMS).toBe(6);
  });
  it("explains a view that can't be saved", () => {
    expect(viewProblem({ name: " ", start: "2026-08-17", end: "2026-09-01" })).toBe("Give it a name.");
    expect(viewProblem({ name: "x".repeat(31), start: "2026-08-17", end: "2026-09-01" })).toMatch(/30 characters/);
    expect(viewProblem({ name: "T", start: "", end: "2026-09-01" })).toBe("Pick the first and last day.");
    expect(viewProblem({ name: "T", start: "2026-09-02", end: "2026-09-01" })).toBe("The last day must be on or after the first day.");
    expect(viewProblem({ name: "T", start: "2026-01-01", end: "2027-02-05" })).toMatch(/400 days/);
    expect(viewProblem({ name: "T", start: "2026-01-01", end: "2027-02-04" })).toBeNull();
  });
  it("makes uuids", () => {
    expect(newViewId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe("the Edit button (S7-05)", () => {
  it("is a quiet pencil at the end of the zoom row, outside the toggle group, and 44 px (S10-08)", async () => {
    await open();
    const edit = screen.getByRole("button", { name: "Edit views" });
    expect(edit.querySelector("svg")).not.toBeNull(); // S10-08: the pencil, no words
    expect(edit.nextElementSibling).toBeNull();
    expect(edit.previousElementSibling).toBe(screen.getByRole("group", { name: "Zoom" }));
    expect(within(screen.getByRole("group", { name: "Zoom" })).queryByText("Edit")).toBeNull();
    const { readFileSync } = await import("node:fs");
    expect(readFileSync("src/features/timeline/timeline.css", "utf8")).toMatch(/\.tl-zoom-edit \{[^}]*min-height: 44px/);
  });

  it("is still there when every built-in is hidden and no views exist, so they can come back", async () => {
    await open({ hidden: ["fall", "spring", "month"], custom: [] });
    expect(screen.queryByRole("group", { name: "Zoom" })).toBeNull();
    expect(screen.getByRole("button", { name: "Edit views" })).toBeInTheDocument();
  });
});

describe("the zoom views sheet (S7-05)", () => {
  it("lists Year as always shown, the three built-ins with switches (all on) and Add a view", async () => {
    const user = await open();
    const form = await edit(user);
    const builtIns = within(form).getByRole("list", { name: "Built-in views" });
    expect(within(builtIns).getByText("Year")).toBeInTheDocument();
    expect(within(builtIns).getByText("Always shown")).toBeInTheDocument();
    expect(within(builtIns).getAllByRole("switch").map((s) => [s.closest("label")!.textContent, (s as HTMLInputElement).checked])).toEqual([["Fall", true], ["Spring", true], ["This month", true]]);
    expect(within(builtIns).getAllByRole("switch")).toHaveLength(3);
    expect(within(form).getByRole("button", { name: "Add a view" })).toBeEnabled();
  });

  it("hides Fall and Spring, adds Term 1 to 3, reorders them, and Save sends one PATCH; the row follows", async () => {
    const user = await open();
    const form = await edit(user);
    await user.click(within(form).getByRole("switch", { name: "Fall" }));
    await user.click(within(form).getByRole("switch", { name: "Spring" }));
    await addView(user, form, "Term 2", "2026-11-09", "2027-02-05");
    await addView(user, form, "Term 3", "2027-02-08", "2027-05-21");
    await addView(user, form, "Term 1", "2026-08-31", "2026-11-06");
    // Term 1 was added last: move it up twice to the front.
    await user.click(within(form).getByRole("button", { name: "Move Term 1 up" }));
    await user.click(within(form).getByRole("button", { name: "Move Term 1 up" }));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    const body = (writes()[0]!.body as { zoomViews: ZoomViews }).zoomViews;
    expect(writes()[0]).toMatchObject({ method: "PATCH", path: "/api/family" });
    expect(Object.keys(writes()[0]!.body as object)).toEqual(["zoomViews"]);
    expect(body.hidden).toEqual(["fall", "spring"]);
    expect(body.custom.map(({ id: _id, ...rest }) => rest)).toEqual([
      { name: "Term 1", start: "2026-08-31", end: "2026-11-06" },
      { name: "Term 2", start: "2026-11-09", end: "2027-02-05" },
      { name: "Term 3", start: "2027-02-08", end: "2027-05-21" },
    ]);
    for (const v of body.custom) expect(v.id).toMatch(/^[0-9a-f-]{36}$/);
    await waitFor(() => expect(screen.queryByRole("form", { name: "Zoom views" })).toBeNull());
    expect(row()).toEqual(["Year", "This month", "Term 1", "Term 2", "Term 3"]);
  });

  it("renames and re-dates a view", async () => {
    const user = await open({ hidden: [], custom: [TERM1] });
    const form = await edit(user);
    const g = within(form).getByRole("group", { name: "View: Term 1" });
    await user.clear(within(g).getByLabelText("Name"));
    await user.type(within(g).getByLabelText("Name"), "Autumn");
    fireEvent.change(within(g).getByLabelText("Last day"), { target: { value: "2026-11-13" } });
    await user.click(within(form).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(sent()[0]).toEqual({ zoomViews: { hidden: [], custom: [{ id: TERM1.id, name: "Autumn", start: "2026-08-17", end: "2026-11-13" }] } });
    await waitFor(() => expect(row()).toEqual(["Year", "Fall", "Spring", "This month", "Autumn"]));
  });

  it("deletes a view, and a zoom that was on it falls back to Year", async () => {
    const user = await open({ hidden: [], custom: [TERM1, TERM2] });
    await user.click(within(screen.getByRole("group", { name: "Zoom" })).getByRole("button", { name: "Term 2" }));
    await screen.findByRole("img", { name: "Term 2 timeline" });
    const form = await edit(user);
    await user.click(within(form).getByRole("button", { name: "Delete Term 2" }));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(row()).toEqual(["Year", "Fall", "Spring", "This month", "Term 1"]));
    expect(await screen.findByRole("img", { name: "Year timeline" })).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Zoom" })).getByRole("button", { name: "Year" })).toHaveAttribute("aria-pressed", "true");
    expect((sent()[0] as { zoomViews: ZoomViews }).zoomViews.custom).toEqual([TERM1]);
  });

  it("hiding the built-in being viewed also falls back to Year", async () => {
    const user = await open();
    await user.click(within(screen.getByRole("group", { name: "Zoom" })).getByRole("button", { name: "Fall" }));
    await screen.findByRole("img", { name: "Fall timeline" });
    const form = await edit(user);
    await user.click(within(form).getByRole("switch", { name: "Fall" }));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("img", { name: "Year timeline" })).toBeInTheDocument();
    expect(row()).toEqual(["Year", "Spring", "This month"]);
  });

  it("Up is off for the first view and Down for the last", async () => {
    const user = await open({ hidden: ["fall"], custom: [TERM1, TERM2] });
    const form = await edit(user);
    expect(within(form).getByRole("button", { name: "Move Term 1 up" })).toBeDisabled();
    expect(within(form).getByRole("button", { name: "Move Term 2 down" })).toBeDisabled();
    await user.click(within(form).getByRole("button", { name: "Move Term 1 down" }));
    expect(within(form).getAllByRole("group", { name: /^View: / }).map((g) => g.getAttribute("aria-label"))).toEqual(["View: Term 2", "View: Term 1"]);
  });

  it("with six views shown, Add a view is off and says so; switching a built-in on is off too", async () => {
    const user = await open({ hidden: ["fall", "spring"], custom: [TERM1, TERM2, { ...TERM2, id: id(3), name: "Term 3" }] });
    const form = await edit(user);
    // Year + This month + 3 = 5: one more fits.
    expect(within(form).getByRole("button", { name: "Add a view" })).toBeEnabled();
    await addView(user, form, "Term 4", "2027-02-08", "2027-05-21");
    expect(within(form).getByRole("button", { name: "Add a view" })).toBeDisabled();
    expect(within(form).getByText("You can show up to 6 views.")).toBeInTheDocument();
    expect(within(form).getByRole("switch", { name: "Fall" })).toBeDisabled();
    // Hiding This month makes room again.
    await user.click(within(form).getByRole("switch", { name: "This month" }));
    expect(within(form).getByRole("button", { name: "Add a view" })).toBeEnabled();
    expect(within(form).queryByText("You can show up to 6 views.")).toBeNull();
  });

  it("a view with no name or dates is explained and nothing is sent", async () => {
    const user = await open();
    const form = await edit(user);
    await user.click(within(form).getByRole("button", { name: "Add a view" }));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(await within(form).findByText("Give it a name.")).toBeInTheDocument();
    expect(writes()).toEqual([]);
    const g = within(form).getByRole("group", { name: "View: new view" });
    await user.type(within(g).getByLabelText("Name"), "Term 1");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(await within(form).findByText("Pick the first and last day.")).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });

  it("shows the API's message and keeps the sheet and the changes when Save fails", async () => {
    const user = await open();
    const form = await edit(user);
    fakeApi.on("PATCH /api/family", 400, { error: "invalid_request", message: "You can show up to 6 views; this shows 7." });
    await user.click(within(form).getByRole("switch", { name: "Fall" }));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(await within(form).findByRole("alert")).toHaveTextContent("You can show up to 6 views; this shows 7.");
    expect(within(form).getByRole("switch", { name: "Fall" })).not.toBeChecked();
    expect(row()).toEqual(["Year", "Fall", "Spring", "This month"]);
  });

  it("Cancel sends nothing and discards; reopening starts from what is stored", async () => {
    const user = await open();
    let form = await edit(user);
    await user.click(within(form).getByRole("switch", { name: "Fall" }));
    await addView(user, form, "Term 1", "2026-08-31", "2026-11-06");
    await user.click(within(form).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("form", { name: "Zoom views" })).toBeNull());
    expect(writes()).toEqual([]);
    expect(row()).toEqual(["Year", "Fall", "Spring", "This month"]);
    form = await edit(user);
    expect(within(form).getByRole("switch", { name: "Fall" })).toBeChecked();
    expect(within(form).queryByRole("group", { name: /^View: / })).toBeNull();
  });

  it("Save with nothing changed sends nothing and closes", async () => {
    const user = await open({ hidden: ["fall"], custom: [TERM1] });
    const form = await edit(user);
    await user.click(within(form).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.queryByRole("form", { name: "Zoom views" })).toBeNull());
    expect(writes()).toEqual([]);
  });
});

describe("the Zoom views sheet's small fixes (S7b-07)", () => {
  it("F3: Fall and Spring a grid can't offer say so instead of showing a switch; This month keeps its switch", async () => {
    render(<EditZoomViewsSheet open views={{ hidden: [], custom: [] }} unavailable={["fall", "spring"]} onSaved={() => {}} onClose={() => {}} />);
    const form = await screen.findByRole("form", { name: "Zoom views" });
    expect(within(form).queryByRole("switch", { name: "Fall" })).toBeNull();
    expect(within(form).queryByRole("switch", { name: "Spring" })).toBeNull();
    expect(within(form).getAllByText("Not in this year's dates")).toHaveLength(2);
    expect(within(form).getByText("Fall")).toBeInTheDocument();
    expect(within(form).getByRole("switch", { name: "This month" })).toBeChecked();
  });

  it("F3: with nothing unavailable all three switches show", async () => {
    render(<EditZoomViewsSheet open views={{ hidden: [], custom: [] }} onSaved={() => {}} onClose={() => {}} />);
    const form = await screen.findByRole("form", { name: "Zoom views" });
    expect(within(form).getAllByRole("switch")).toHaveLength(3);
    expect(within(form).queryByText("Not in this year's dates")).toBeNull();
  });

  it("F1: each switch's label is the whole 44 px row (CSS), so the label and switch are one target", () => {
    const css = readFileSync("src/features/timeline/timeline.css", "utf8");
    const rule = css.match(/\.zoom-edit-row \.choice \{[^}]*\}/)?.[0] ?? "";
    expect(rule).toMatch(/min-height: 44px/);
    expect(rule).toMatch(/flex: 1/);
  });

  it("F5: the tap-target script opens the Copy panels and the Zoom views sheet", () => {
    const script = readFileSync("../../scripts/smoke/scenarios/tap-targets.mjs", "utf8");
    expect(script).toMatch(/OPENER = \/\^\([^)]*Copy to /);
    expect(script).toContain(".tl-zoom-edit");
    expect(script).toContain("form[aria-label='Zoom views']");
    expect("Copy to a new year").toMatch(/^(Add|Import|Use a template|Save as a template|New |Copy to )/);
    expect("Copy to another child").toMatch(/^(Add|Import|Use a template|Save as a template|New |Copy to )/);
  });
});

describe("Fall and Spring can be renamed and re-dated (S9-06)", () => {
  const DEFAULTS = { fall: { start: "2026-08-31", end: "2026-12-31" }, spring: { start: "2027-01-01", end: "2027-05-28" } };
  const half = (form: HTMLElement, name: string) => within(form).getByRole("group", { name: `${name} name and dates` });

  it("shows Fall and Spring with their name and the default halves, and no Reset until something changes", async () => {
    render(<EditZoomViewsSheet open views={{ hidden: [], custom: [] }} defaults={DEFAULTS} onSaved={() => {}} onClose={() => {}} />);
    const form = await screen.findByRole("form", { name: "Zoom views" });
    const fall = half(form, "Fall");
    expect(within(fall).getByLabelText("Name")).toHaveValue("Fall");
    expect(within(fall).getByLabelText("First day")).toHaveValue("Aug 31, 2026");
    expect(within(fall).getByLabelText("Last day")).toHaveValue("Dec 31, 2026");
    expect(within(half(form, "Spring")).getByLabelText("First day")).toHaveValue("Jan 1, 2027");
    expect(within(fall).queryByRole("button", { name: /Reset/ })).toBeNull();
  });

  it("renames Fall to Term 1 with Aug 17 - Dec 18: one PATCH, the zoom row and the picture follow", async () => {
    const user = await open();
    const form = await edit(user);
    const fall = half(form, "Fall");
    await user.clear(within(fall).getByLabelText("Name"));
    await user.type(within(fall).getByLabelText("Name"), "Term 1");
    fireEvent.change(within(fall).getByLabelText("First day"), { target: { value: "2026-08-17" } });
    fireEvent.change(within(fall).getByLabelText("Last day"), { target: { value: "2026-12-18" } });
    await user.click(within(form).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect((writes()[0]!.body as { zoomViews: ZoomViews }).zoomViews).toEqual({ hidden: [], custom: [], overrides: { fall: { name: "Term 1", start: "2026-08-17", end: "2026-12-18" } } });
    await waitFor(() => expect(row()).toEqual(["Year", "Term 1", "Spring", "This month"]));
  });

  it("S9b-05 (N13): the sheet's default Spring ends on the same day as Records' Spring (one source: the assignments' year)", async () => {
    const user = await open();
    const form = await edit(user);
    const records = rangeOptions({ views: { hidden: [], custom: [] }, assignments: SAMPLE_ASSIGNMENTS, today: DEMO_ME.today, weekStart: "mon" });
    const spring = records.find((r) => r.key === "spring")!;
    expect(spring.end).toBe(yearHalves(yearSpan(SAMPLE_ASSIGNMENTS, DEMO_ME.today))!.spring.end);
    expect(within(half(form, "Spring")).getByLabelText("Last day")).toHaveValue(usDate(spring.end));
    expect(within(half(form, "Fall")).getByLabelText("First day")).toHaveValue(usDate(records.find((r) => r.key === "fall")!.start));
  });

  it("S9b-05 (N13): halves only when the year spans New Year", () => {
    expect(yearHalves({ start: "2026-08-31", end: "2026-12-18" })).toBeNull();
    expect(yearHalves({ start: "2026-08-31", end: "2027-05-21" })).toEqual({ fall: { start: "2026-08-31", end: "2026-12-31" }, spring: { start: "2027-01-01", end: "2027-05-21" } });
  });

  it("a half left at its defaults sends no entry; Reset to default puts it back and drops the entry", async () => {
    const user = await open({ hidden: [], custom: [], overrides: { spring: { name: "Term 2", start: "2027-01-04", end: "2027-05-28" } } });
    expect(row()).toContain("Term 2");
    const form = await edit(user);
    const spring = half(form, "Spring");
    expect(within(spring).getByLabelText("Name")).toHaveValue("Term 2");
    // S9b-05 (N10): the accessible name starts with the visible text (voice control: "click Reset to default")
    const reset = within(spring).getByRole("button", { name: "Reset to default: Spring" });
    expect(reset.getAttribute("aria-label")!.startsWith(reset.textContent!)).toBe(true);
    await user.click(reset);
    expect(within(half(form, "Spring")).getByLabelText("Name")).toHaveValue("Spring");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect((writes()[0]!.body as { zoomViews: ZoomViews }).zoomViews).toEqual({ hidden: [], custom: [] });
    await waitFor(() => expect(row()).toEqual(["Year", "Fall", "Spring", "This month"]));
  });

  it("explains a half with no name or backwards dates and sends nothing", async () => {
    const user = await open();
    const form = await edit(user);
    const fall = half(form, "Fall");
    await user.clear(within(fall).getByLabelText("Name"));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(await within(form).findByText("Give it a name.")).toBeInTheDocument();
    await user.type(within(fall).getByLabelText("Name"), "T");
    fireEvent.change(within(fall).getByLabelText("First day"), { target: { value: "2026-12-30" } });
    fireEvent.change(within(fall).getByLabelText("Last day"), { target: { value: "2026-12-01" } });
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(await within(form).findByText("The last day must be on or after the first day.")).toBeInTheDocument();
    expect(writes()).toHaveLength(0);
  });

  it("a hidden half has no name and dates to edit; a renamed one keeps its switch label", async () => {
    const user = await open({ hidden: ["fall"], custom: [], overrides: { fall: { name: "Term 1", start: "2026-08-17", end: "2026-12-18" } } });
    const form = await edit(user);
    expect(within(form).queryByRole("group", { name: "Fall name and dates" })).toBeNull();
    expect(within(form).getByRole("switch", { name: "Term 1" })).not.toBeChecked();
  });
});
