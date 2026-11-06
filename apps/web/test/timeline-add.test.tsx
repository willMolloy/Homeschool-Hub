/** T-10: "+ Add assignment" on the timeline (AddAssignment.tsx, afterAdd.ts, TimelinePage, the shared form, makeLookups). */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ENGINE_VERSION, planAll } from "@hh/engine";
import * as S from "../../../packages/engine/test/fixtures/sample-family";
import type { Assignment } from "../src/api/types";
import { afterAdd } from "../src/features/timeline/afterAdd";
import { makeLookups } from "../src/features/schedule/lookups";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import {
  SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_SUBJECTS, samplePlans,
} from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

function stubSample() {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
  fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
  fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, SAMPLE_ASSIGNMENTS);
  fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
  fakeApi.on("GET /api/events", 200, []);
}

const NEW: Assignment = {
  id: "new1", subjectId: "hist", title: "Ancient Egypt", unitType: "lessons", totalUnits: 10, weightPerUnit: null,
  startDate: "2026-11-02", endDate: "2026-12-18", childIds: ["margaret"], archived: false, weekdays: null,
};

/** The API answers the POST with NEW, and the next plan fetch includes it. */
function stubCreate() {
  fakeApi.on("POST /api/assignments", (body) => {
    const plans = planAll(
      [...S.assignments, { id: NEW.id, subjectId: NEW.subjectId, unitType: NEW.unitType, totalUnits: NEW.totalUnits, start: NEW.startDate, end: NEW.endDate, childIds: NEW.childIds }],
      { calendar: S.calendar, events: S.events, blocked: S.blocked, subjectWeights: S.subjectWeights, asOf: "2026-10-14" },
    );
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans });
    fakeApi.on("GET /api/assignments", 200, [...SAMPLE_ASSIGNMENTS, NEW]);
    return [201, { ...NEW, ...(body as object), id: NEW.id, archived: false }];
  });
}

function phone(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: matches && query.includes("max-width"), media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  }));
}
afterEach(() => vi.unstubAllGlobals());

async function openForm(path = "/timeline") {
  const user = userEvent.setup();
  const r = renderAt(path);
  await screen.findByRole("img", { name: "Year timeline" });
  await user.click(screen.getByRole("button", { name: "Add assignment" }));
  const sheet = await screen.findByRole("dialog", { name: "Add assignment" });
  return { ...r, user, sheet };
}

async function fillEssentials(user: ReturnType<typeof userEvent.setup>, sheet: HTMLElement, title = "Ancient Egypt") {
  // S10-07: the Subject row opens a picker sheet.
  await user.click(within(sheet).getByRole("button", { name: /^Subject/ }));
  await user.click(within(await screen.findByRole("dialog", { name: "Subject" })).getByRole("button", { name: "History" }));
  // S18-04 (E8): no unit is chosen when the sheet opens.
  await user.click(within(within(sheet).getByRole("radiogroup", { name: "Unit" })).getByRole("radio", { name: "Lessons" }));
  if (title) await user.type(within(sheet).getByLabelText("Title"), title);
  await user.click(within(sheet).getByLabelText("Margaret"));
  fireEvent.change(within(sheet).getByLabelText("Start"), { target: { value: "2026-11-02" } });
  fireEvent.change(within(sheet).getByLabelText("End"), { target: { value: "2026-12-18" } });
  await user.type(within(sheet).getByLabelText("Total"), "10");
  // The weight suggestion (S2b-11) loads before Add is enabled.
  await waitFor(() => expect(within(sheet).getByRole("button", { name: "Add" })).toBeEnabled());
}

describe("afterAdd", () => {
  const months = ["2026-09", "2026-10", "2026-11", "2026-12", "2027-01"];
  it("switches to All only when the filtered child would not see the new bar", () => {
    expect(afterAdd(NEW, { childId: "frank", zoom: "year", month: null, months }).showAllChildren).toBe(true);
    expect(afterAdd(NEW, { childId: "margaret", zoom: "year", month: null, months }).showAllChildren).toBe(false);
    expect(afterAdd(NEW, { childId: null, zoom: "year", month: null, months }).showAllChildren).toBe(false);
  });

  it("at This month, moves to the bar's first month unless the shown month already has it; otherwise stays", () => {
    expect(afterAdd(NEW, { childId: null, zoom: "month", month: "2026-10", months }).month).toBe("2026-11");
    expect(afterAdd(NEW, { childId: null, zoom: "month", month: "2026-12", months }).month).toBeNull();
    expect(afterAdd({ ...NEW, startDate: "2026-06-01", endDate: "2026-07-01" }, { childId: null, zoom: "month", month: "2026-10", months }).month).toBe("2026-09");
    expect(afterAdd({ ...NEW, startDate: "2027-03-01", endDate: "2027-04-01" }, { childId: null, zoom: "month", month: "2026-10", months }).month).toBe("2027-01");
    expect(afterAdd(NEW, { childId: null, zoom: "year", month: null, months }).month).toBeNull();
  });
});

describe("makeLookups", () => {
  it("sorts children and subjects and names them, with a fallback for unknown ids", () => {
    const l = makeLookups([...SAMPLE_CHILDREN].reverse(), [...SAMPLE_SUBJECTS].reverse());
    expect(l.children.map((c) => c.id)).toEqual(["frank", "margaret"]);
    expect(l.subjects[0]!.id).toBe("lit");
    expect(l.childName("margaret")).toBe("Margaret");
    expect(l.subjectName("math")).toBe("Math");
    expect(l.subjectName("nope")).toBe("Unknown subject");
  });
});

describe("adding an assignment from the timeline", () => {
  it("one calm button in the header opens the assignment form in a side panel on wide screens", async () => {
    stubSample();
    const { sheet, user } = await openForm();
    expect(sheet).toHaveAttribute("data-sheet", "side");
    // Essentials first, in order; then the effort question (S6-09), asked in time, with no weight field and no "More".
    const labels = [...sheet.querySelectorAll("label, legend, summary")].map((e) => e.textContent!.trim()).filter((t) => !["Frank", "Margaret", "Mon", "Tue", "Wed", "Thu", "Fri", "Pages", "Chapters", "Lessons", "Minutes"].includes(t));
    // S10-16 (L5): Unit is a group of chips (Pages, Chapters, Lessons, Minutes), left out above like the day chips.
    // S4-07: the Days chips sit right under the dates.
    // S10-07: the sheet's own controls: For (child chips), Dates (tiles), School days (soft chips).
    expect(labels.slice(0, 9)).toEqual(["Subject", "Title", "For", "Dates", "Start", "End", "School days", "Unit", "Total"]);
    // S18-04 (E8): the effort question waits until a unit is chosen (it is in minutes per that unit).
    expect(labels[9]).toBeUndefined();
    await user.click(within(within(sheet).getByRole("radiogroup", { name: "Unit" })).getByRole("radio", { name: "Pages" }));
    expect([...sheet.querySelectorAll("label, legend, summary")].map((e) => e.textContent!.trim())).toContain("About how long will that take?");
    expect(within(sheet).queryByText("More")).toBeNull();
    expect(within(sheet).queryByLabelText(/^Weight per/)).toBeNull();
    // Nothing non-essential: the form's own buttons and the close button, no helper text or badges.
    expect(within(sheet).getAllByRole("button").map((b) => b.textContent)).toEqual(["×", "Choose a subject…", "", "", "Add", "Cancel"]) /* S10-07: the subject picker row (S18-04, E8: nothing chosen yet); S9-04: the two calendar buttons (icon only, named "Choose a date") sit after Start and End */;
  });

  it("is a bottom sheet on phones", async () => {
    phone(true);
    stubSample();
    const { sheet } = await openForm();
    expect(sheet).toHaveAttribute("data-sheet", "drawer");
  });

  it("S18-04 (E8): opens with no subject and no unit chosen, and Add says so instead of filing the book under the first subject", async () => {
    stubSample();
    stubCreate();
    const { user, sheet } = await openForm();
    expect(within(sheet).getByRole("button", { name: /^Subject/ })).toHaveTextContent("Choose a subject…");
    for (const r of within(within(sheet).getByRole("radiogroup", { name: "Unit" })).getAllByRole("radio")) expect(r).not.toBeChecked();
    await user.type(within(sheet).getByLabelText("Title"), "Ancient Egypt");
    await user.click(within(sheet).getByLabelText("Margaret"));
    await waitFor(() => expect(within(sheet).getByRole("button", { name: "Add" })).toBeEnabled());
    await user.click(within(sheet).getByRole("button", { name: "Add" }));
    expect(await within(sheet).findByText("Pick a subject.")).toBeInTheDocument();
    expect(within(sheet).getByText("Pick a unit.")).toBeInTheDocument();
    expect(fakeApi.calls.some((c) => c.method === "POST" && c.path === "/api/assignments")).toBe(false);
  });

  it("needs a title before it saves anything", async () => {
    stubSample();
    stubCreate();
    const { user, sheet } = await openForm();
    await fillEssentials(user, sheet, "");
    await user.type(within(sheet).getByLabelText("Title"), "   ");
    await user.click(within(sheet).getByRole("button", { name: "Add" }));
    expect(await within(sheet).findByText("Title is required.")).toBeInTheDocument();
    expect(fakeApi.calls.some((c) => c.method === "POST" && c.path !== "/api/plan/pace")).toBe(false); // S7b-10: the pace count is a read
  });

  it("on save, closes, draws the new bar at once and highlights it briefly", async () => {
    stubSample();
    stubCreate();
    const { user, sheet } = await openForm();
    await fillEssentials(user, sheet);
    await user.click(within(sheet).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const post = fakeApi.calls.find((c) => c.method === "POST" && c.path === "/api/assignments")!;
    expect(post.body).toMatchObject({ subjectId: "hist", title: "Ancient Egypt", childIds: ["margaret"], startDate: "2026-11-02", endDate: "2026-12-18", totalUnits: 10 });
    const band = await waitFor(() => {
      const b = document.querySelector('path.tl-band[data-assignment="new1"]');
      expect(b).not.toBeNull();
      return b!;
    });
    expect(band).toHaveClass("tl-flash");
    expect(screen.getByRole("button", { name: "Add assignment" })).toBeInTheDocument();
  });

  it("switches the child filter to All when it would hide the new bar", async () => {
    stubSample();
    stubCreate();
    localStorage.setItem("hh.child", "frank"); // S8b-07: the shared child switch (it was ?child= on the page)
    const { user, sheet } = await openForm("/timeline");
    await fillEssentials(user, sheet);
    await user.click(within(sheet).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(localStorage.getItem("hh.child")).toBe("all"));
    await waitFor(() => expect(document.querySelector('path.tl-band[data-assignment="new1"]')).not.toBeNull());
  });

  it("S6b-09: from an empty calendar, Add assignment works and the first bar replaces the empty line", async () => {
    stubSample();
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: [] });
    fakeApi.on("GET /api/assignments", 200, []);
    fakeApi.on("POST /api/assignments", (body) => {
      const plans = planAll(
        [{ id: NEW.id, subjectId: NEW.subjectId, unitType: NEW.unitType, totalUnits: NEW.totalUnits, start: NEW.startDate, end: NEW.endDate, childIds: NEW.childIds }],
        { calendar: S.calendar, events: [], blocked: [], subjectWeights: S.subjectWeights, asOf: "2026-10-14" },
      );
      fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans });
      fakeApi.on("GET /api/assignments", 200, [NEW]);
      return [201, { ...NEW, ...(body as object), id: NEW.id, archived: false }];
    });
    const { user, sheet } = await openForm();
    expect(screen.getByText("Nothing planned yet.")).toBeInTheDocument();
    await fillEssentials(user, sheet);
    await user.click(within(sheet).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(document.querySelector('path.tl-band[data-assignment="new1"]')).not.toBeNull());
    expect(screen.queryByText("Nothing planned yet.")).toBeNull();
  });

  it("Cancel closes the panel without saving", async () => {
    stubSample();
    const { user, sheet } = await openForm();
    await user.click(within(sheet).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(fakeApi.calls.some((c) => c.method === "POST")).toBe(false);
  });
});
