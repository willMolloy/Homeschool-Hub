/**
 * S7b-02: "Update time estimate" under the edit bar's More (it replaced the S6-10 Heavier and Lighter nudges, so the old
 * timeline-nudge.test.tsx and the nudgedWeight unit tests went with them).
 */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, weightFromMinutesPerDay } from "@hh/engine";
import type { Assignment, Subject } from "../src/api/types";
import { unitsPerDay } from "../src/features/schedule/effort";
import { startingChoice } from "../src/features/timeline/UpdateEstimate";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_EVENTS, SAMPLE_SUBJECTS, samplePlans } from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

const TI = SAMPLE_ASSIGNMENTS.find((a) => a.id === "ti")!;
const PACE = unitsPerDay(TI.totalUnits, TI.startDate, TI.endDate, DEMO_ME.schoolDays)!;
const w = (minutes: number) => weightFromMinutesPerDay(minutes, PACE);
const patches = () => fakeApi.calls.filter((c) => c.method === "PATCH");
const planGets = () => fakeApi.calls.filter((c) => c.method === "GET" && c.path.startsWith("/api/plan")).length;

function stub(over: Partial<Assignment>, subjects: Subject[] = SAMPLE_SUBJECTS) {
  const ti = { ...TI, ...over };
  const all = SAMPLE_ASSIGNMENTS.map((a) => (a.id === "ti" ? ti : a));
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
  fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
  fakeApi.on("GET /api/subjects", 200, subjects);
  fakeApi.on("GET /api/assignments", 200, all);
  fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
  fakeApi.on("GET /api/events", 200, SAMPLE_EVENTS);
  fakeApi.on("PATCH /api/assignments/ti", (body) => [200, { ...ti, ...(body as Partial<Assignment>) }]);
}
async function openSheet() {
  renderAt("/timeline");
  const svg = await screen.findByRole("img", { name: "Year timeline" });
  const band = svg.querySelector('path.tl-band[data-assignment="ti"]')!;
  const [x, y] = band.getAttribute("d")!.slice(1).split(/[ ,LCQVHZ]+/).filter(Boolean).map(Number);
  fireEvent.click(svg, { clientX: x! + 1, clientY: y! + 1 });
  const edit = await screen.findByRole("region", { name: /^Edit / });
  await userEvent.click(within(edit).getByRole("button", { name: "More" }));
  await userEvent.click(within(edit).getByRole("button", { name: "Update time estimate" }));
  return screen.findByRole("dialog");
}

describe("Update time estimate", () => {
  it("replaces Heavier and Lighter in More", async () => {
    stub({ weightPerUnit: w(30) });
    renderAt("/timeline");
    const svg = await screen.findByRole("img", { name: "Year timeline" });
    const [x, y] = svg.querySelector('path.tl-band[data-assignment="ti"]')!.getAttribute("d")!.slice(1).split(/[ ,LCQVHZ]+/).filter(Boolean).map(Number);
    fireEvent.click(svg, { clientX: x! + 1, clientY: y! + 1 });
    const edit = await screen.findByRole("region", { name: /^Edit / });
    await userEvent.click(within(edit).getByRole("button", { name: "More" }));
    expect(within(edit).getAllByRole("button").map((b) => b.textContent)).toEqual(expect.arrayContaining(["Update time estimate", "Reset to original"]));
    expect(within(edit).queryByRole("button", { name: "Heavier" })).toBeNull();
    expect(within(edit).queryByRole("button", { name: "Lighter" })).toBeNull();
  });

  it("says what was estimated, preselects the nearest choice and never says weight", async () => {
    stub({ weightPerUnit: w(30) });
    const sheet = await openSheet();
    expect(within(sheet).getByText("Treasure Island")).toBeInTheDocument();
    expect(sheet).toHaveTextContent(/We estimated about 30 min a day \(about [\d.,]+ pages a day\)\./);
    expect(within(sheet).getByText("How long is it actually taking?")).toBeInTheDocument();
    expect(within(sheet).getByRole("radio", { name: "30 min a day" })).toBeChecked();
    expect(sheet).toHaveTextContent("Frank's next Literature books will start from this too.");
    expect(sheet.textContent).not.toMatch(/weight/i);
  });

  it("45 then Save PATCHes only the weight for 45 minutes at this pace, reloads the plan and closes", async () => {
    stub({ weightPerUnit: w(30) });
    const sheet = await openSheet();
    const before = planGets();
    await userEvent.click(within(sheet).getByRole("radio", { name: "45 min a day" }));
    await userEvent.click(within(sheet).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]).toMatchObject({ path: "/api/assignments/ti", body: { weightPerUnit: w(45) } });
    expect(Object.keys(patches()[0]!.body as object)).toEqual(["weightPerUnit"]);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(planGets()).toBeGreaterThan(before));
  });

  it("Custom takes minutes, prefilled from the estimate, and refuses a bad number", async () => {
    stub({ weightPerUnit: w(90) });
    const sheet = await openSheet();
    expect(within(sheet).getByRole("radio", { name: "Custom" })).toBeChecked();
    const field = within(sheet).getByLabelText("Minutes a day");
    expect(field).toHaveValue(90);
    await userEvent.clear(field);
    await userEvent.type(field, "0");
    await userEvent.click(within(sheet).getByRole("button", { name: "Save" }));
    expect(await within(sheet).findByRole("alert")).toHaveTextContent("Minutes must be more than 0");
    expect(patches()).toEqual([]);
    await userEvent.clear(field);
    await userEvent.type(field, "40");
    await userEvent.click(within(sheet).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]!.body).toEqual({ weightPerUnit: w(40) });
  });

  it("starts from the subject's usual when the assignment has no weight of its own; Cancel sends nothing", async () => {
    const subjects = SAMPLE_SUBJECTS.map((s) => (s.id === TI.subjectId ? { ...s, defaultWeight: { unitType: TI.unitType, weightPerUnit: w(60) } } : s));
    stub({ weightPerUnit: null }, subjects);
    const sheet = await openSheet();
    expect(within(sheet).getByRole("radio", { name: "60 min a day" })).toBeChecked();
    await userEvent.click(within(sheet).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(patches()).toEqual([]);
  });

  it("a lessons assignment doesn't promise to teach the next book", async () => {
    stub({ unitType: "lessons", weightPerUnit: 2 });
    const sheet = await openSheet();
    expect(sheet.textContent).not.toMatch(/next .* books/);
  });

  it("a refused save shows its message and keeps the sheet", async () => {
    stub({ weightPerUnit: w(30) });
    fakeApi.on("PATCH /api/assignments/ti", 400, { error: "invalid_request", message: "Nope." });
    const sheet = await openSheet();
    await userEvent.click(within(sheet).getByRole("radio", { name: "45 min a day" })); // S7b-16: Save is off until something changes
    await userEvent.click(within(sheet).getByRole("button", { name: "Save" }));
    expect(await within(sheet).findByRole("alert")).toHaveTextContent("Nope.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("can be undone from the undo bar, whose label has no 'weight'", async () => {
    stub({ weightPerUnit: w(30) });
    fakeApi.on("GET /api/undo", 200, { label: "Updated the time estimate for Treasure Island", createdAt: "2026-10-28T15:00:00.000Z" });
    fakeApi.on("POST /api/undo", 200, { label: "x" });
    const sheet = await openSheet();
    await userEvent.click(within(sheet).getByRole("radio", { name: "45 min a day" }));
    await userEvent.click(within(sheet).getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Updated the time estimate for Treasure Island.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(fakeApi.calls.filter((c) => c.method === "POST" && c.path === "/api/undo")).toHaveLength(1));
  });

  it("S7b-16: opens at the current estimate: 30 selected for about 30 min, Custom 35 for about 37, and Save is off until changed", async () => {
    stub({ weightPerUnit: w(30) });
    const sheet = await openSheet();
    expect(within(sheet).getByRole("radio", { name: "30 min a day" })).toBeChecked();
    expect(within(sheet).getByRole("button", { name: "Save" })).toBeDisabled();
    // Tapping the one already chosen is not a change.
    await userEvent.click(within(sheet).getByRole("radio", { name: "30 min a day" }));
    expect(within(sheet).getByRole("button", { name: "Save" })).toBeDisabled();
    await userEvent.click(within(sheet).getByRole("radio", { name: "45 min a day" }));
    expect(within(sheet).getByRole("button", { name: "Save" })).toBeEnabled();
    await userEvent.click(within(sheet).getByRole("radio", { name: "30 min a day" }));
    expect(patches()).toEqual([]);
  });

  it("S7b-16: about 37 min a day opens on Custom 35; typing a different number turns Save on", async () => {
    stub({ weightPerUnit: w(37) });
    const sheet = await openSheet();
    expect(sheet).toHaveTextContent("We estimated about 37 min a day");
    expect(within(sheet).getByRole("radio", { name: "Custom" })).toBeChecked();
    const field = within(sheet).getByLabelText("Minutes a day");
    expect(field).toHaveValue(35);
    expect(within(sheet).getByRole("button", { name: "Save" })).toBeDisabled();
    await userEvent.clear(field);
    await userEvent.type(field, "40");
    expect(within(sheet).getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("S7b-16: the starting choice follows the estimate until touched (the real day count arrives after the sheet opens)", () => {
    expect(startingChoice(30)).toEqual({ choice: 30, custom: "30" });
    expect(startingChoice(31.9)).toEqual({ choice: 30, custom: "30" });
    expect(startingChoice(37)).toEqual({ choice: "custom", custom: "35" });
    expect(startingChoice(90)).toEqual({ choice: "custom", custom: "90" });
    expect(startingChoice(1)).toEqual({ choice: "custom", custom: "5" });
  });
});
