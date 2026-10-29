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
  startDate: "2026-11-02", endDate: "2026-12-18", childIds: ["margaret"], archived: false,
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
  await user.click(screen.getByRole("button", { name: "+ Add assignment" }));
  const sheet = await screen.findByRole("dialog", { name: "Add assignment" });
  return { ...r, user, sheet };
}

async function fillEssentials(user: ReturnType<typeof userEvent.setup>, sheet: HTMLElement, title = "Ancient Egypt") {
  await user.selectOptions(within(sheet).getByLabelText("Subject"), "hist");
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
    const { sheet } = await openForm();
    expect(sheet).toHaveAttribute("data-sheet", "side");
    // Essentials first, in order; the weight waits behind "More".
    const labels = [...sheet.querySelectorAll("label, legend, summary")].map((e) => e.textContent!.trim()).filter((t) => !["Frank", "Margaret"].includes(t));
    expect(labels.slice(0, 7)).toEqual(["Subject", "Title", "Children", "Start", "End", "Unit", "Total"]);
    const more = within(sheet).getByText("More").closest("details")!;
    expect(more.open).toBe(false);
    expect(within(more).getByLabelText(/^Weight per/)).toBeInTheDocument();
    // Nothing non-essential: the form's own buttons and the close button, no helper text or badges.
    expect(within(sheet).getAllByRole("button").map((b) => b.textContent)).toEqual(["×", "Add", "Cancel"]);
  });

  it("is a bottom sheet on phones", async () => {
    phone(true);
    stubSample();
    const { sheet } = await openForm();
    expect(sheet).toHaveAttribute("data-sheet", "drawer");
  });

  it("needs a title before it saves anything", async () => {
    stubSample();
    stubCreate();
    const { user, sheet } = await openForm();
    await fillEssentials(user, sheet, "");
    await user.type(within(sheet).getByLabelText("Title"), "   ");
    await user.click(within(sheet).getByRole("button", { name: "Add" }));
    expect(await within(sheet).findByText("Title is required.")).toBeInTheDocument();
    expect(fakeApi.calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("on save, closes, draws the new bar at once and highlights it briefly", async () => {
    stubSample();
    stubCreate();
    const { user, sheet } = await openForm();
    await fillEssentials(user, sheet);
    await user.click(within(sheet).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const post = fakeApi.calls.find((c) => c.method === "POST")!;
    expect(post.body).toMatchObject({ subjectId: "hist", title: "Ancient Egypt", childIds: ["margaret"], startDate: "2026-11-02", endDate: "2026-12-18", totalUnits: 10 });
    const band = await waitFor(() => {
      const b = document.querySelector('path.tl-band[data-assignment="new1"]');
      expect(b).not.toBeNull();
      return b!;
    });
    expect(band).toHaveClass("tl-flash");
    expect(screen.getByRole("button", { name: "+ Add assignment" })).toBeInTheDocument();
  });

  it("switches the child filter to All when it would hide the new bar", async () => {
    stubSample();
    stubCreate();
    const { user, sheet, router } = await openForm("/timeline?child=frank");
    await fillEssentials(user, sheet);
    await user.click(within(sheet).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(router.state.location.search).not.toContain("child=frank"));
    await waitFor(() => expect(document.querySelector('path.tl-band[data-assignment="new1"]')).not.toBeNull());
  });

  it("Cancel closes the panel without saving", async () => {
    stubSample();
    const { user, sheet } = await openForm();
    await user.click(within(sheet).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(fakeApi.calls.some((c) => c.method === "POST")).toBe(false);
  });
});
