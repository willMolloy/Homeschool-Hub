/** T-07: selection and the adjust sheet (select.ts, AdjustSheet, Timeline's dimming, the page). */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { addDays, ENGINE_VERSION, type LocalDate } from "@hh/engine";
import type { Assignment } from "../src/api/types";
import { canEndEarlier, shiftEnd } from "../src/features/timeline/select";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import {
  SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_EVENTS, SAMPLE_SUBJECTS, samplePlans,
} from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

const ADJUST = ["End one week earlier", "End one week later", "Reset"];

function stub(assignments: Assignment[] = SAMPLE_ASSIGNMENTS) {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
  fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
  fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, assignments);
  fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
  fakeApi.on("GET /api/events", 200, SAMPLE_EVENTS);
  for (const a of assignments) {
    fakeApi.on(`PATCH /api/assignments/${a.id}`, (body) => [200, { ...a, ...(body as Partial<Assignment>) }]);
  }
}

async function open() {
  renderAt("/timeline");
  return screen.findByRole("img", { name: "Year timeline" });
}

/** Taps the first band of the picture just inside its outline's first point. */
function tapBand(svg: Element, nth = 0): string {
  const band = svg.querySelectorAll("path.tl-band")[nth]!;
  const [x, y] = band.getAttribute("d")!.slice(1).split(/[ ,LCVHZ]+/).filter(Boolean).map(Number);
  fireEvent.click(svg, { clientX: x! + 1, clientY: y! + 1 });
  return band.getAttribute("data-assignment")!;
}

const sheet = () => screen.findByRole("dialog");
const patches = () => fakeApi.calls.filter((c) => c.method === "PATCH");
const planGets = () => fakeApi.calls.filter((c) => c.method === "GET" && c.path.startsWith("/api/plan")).length;

describe("end-date steps", () => {
  it("moves the end by whole weeks and never before the start", () => {
    expect(shiftEnd("2026-10-30", 1)).toBe("2026-11-06");
    expect(shiftEnd("2026-10-30", -1)).toBe("2026-10-23");
    expect(canEndEarlier("2026-10-20", "2026-10-30")).toBe(true);
    expect(canEndEarlier("2026-10-23", "2026-10-30")).toBe(true);
    expect(canEndEarlier("2026-10-24", "2026-10-30")).toBe(false);
  });
});

describe("the adjust sheet", () => {
  it("has no adjust buttons anywhere until something is selected (hidden, not disabled)", async () => {
    stub();
    await open();
    for (const name of ADJUST) expect(screen.queryByRole("button", { name })).toBeNull();
    for (const name of ADJUST) expect(screen.queryByText(name)).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens for the tapped bar with its title, subject · child and dates, and dims the other bars", async () => {
    stub();
    const svg = await open();
    const id = tapBand(svg);
    const a = SAMPLE_ASSIGNMENTS.find((x) => x.id === id)!;
    const dialog = await sheet();
    expect(within(dialog).getByText(a.title)).toBeInTheDocument();
    expect(within(dialog).getByText(/ · /)).toBeInTheDocument();
    expect(within(dialog).getByText(/ – /)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "End one week later" })).toBeEnabled();
    expect(within(dialog).queryByRole("button", { name: "Reset" })).toBeNull();
    const bands = [...svg.querySelectorAll("path.tl-band")];
    expect(bands.filter((b) => b.getAttribute("data-assignment") === id).every((b) => !b.classList.contains("tl-dim"))).toBe(true);
    expect(bands.filter((b) => b.getAttribute("data-assignment") !== id).every((b) => b.classList.contains("tl-dim"))).toBe(true);
  });

  it("selects nothing on empty space", async () => {
    stub();
    const svg = await open();
    fireEvent.click(svg, { clientX: 1, clientY: 1 });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(svg.querySelector(".tl-dim")).toBeNull();
  });

  it("ends a week later through the API, redraws from a fresh plan, then Reset puts the first end back", async () => {
    stub();
    const svg = await open();
    const id = tapBand(svg);
    const a = SAMPLE_ASSIGNMENTS.find((x) => x.id === id)!;
    const before = planGets();
    await userEvent.click(within(await sheet()).getByRole("button", { name: "End one week later" }));
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]).toMatchObject({ path: `/api/assignments/${id}`, body: { endDate: addDays(a.endDate as LocalDate, 7) } });
    await waitFor(() => expect(planGets()).toBeGreaterThan(before));
    const reset = await within(await sheet()).findByRole("button", { name: "Reset" });
    await userEvent.click(reset);
    await waitFor(() => expect(patches()).toHaveLength(2));
    expect(patches()[1]!.body).toEqual({ endDate: a.endDate });
    await waitFor(() => expect(within(screen.getByRole("dialog")).queryByRole("button", { name: "Reset" })).toBeNull());
  });

  it("leaves out End one week earlier when that would cross the start", async () => {
    const short = SAMPLE_ASSIGNMENTS.map((a, i) => (i === 0 ? { ...a, endDate: addDays(a.startDate as LocalDate, 3) } : a));
    stub(short);
    await open();
    await userEvent.click(screen.getAllByRole("button", { name: new RegExp(`^${short[0]!.title},`) })[0]!);
    const dialog = await sheet();
    expect(within(dialog).queryByRole("button", { name: "End one week earlier" })).toBeNull();
    expect(within(dialog).getByRole("button", { name: "End one week later" })).toBeInTheDocument();
  });

  it("shows the API's message when a save fails", async () => {
    stub();
    const svg = await open();
    const id = tapBand(svg);
    fakeApi.on(`PATCH /api/assignments/${id}`, 400, { error: "invalid", message: "End date is too far out" });
    await userEvent.click(within(await sheet()).getByRole("button", { name: "End one week later" }));
    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent("End date is too far out");
  });

  it("closing the sheet clears the selection", async () => {
    stub();
    const svg = await open();
    tapBand(svg);
    await userEvent.click(within(await sheet()).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(svg.querySelector(".tl-dim")).toBeNull();
  });

  it("selects from the lanes list with the keyboard", async () => {
    stub();
    await open();
    const a = SAMPLE_ASSIGNMENTS[1]!;
    const pick = screen.getAllByRole("button", { name: new RegExp(`^${a.title},`) })[0]!;
    pick.focus();
    await userEvent.keyboard("{Enter}");
    expect(within(await sheet()).getByText(a.title)).toBeInTheDocument();
  });
});
