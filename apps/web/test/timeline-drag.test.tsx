/** T-08: dragging bars (drag.ts, useBarDrag, the page). */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { addDays, diffDays, ENGINE_VERSION, type LocalDate } from "@hh/engine";
import type { Assignment } from "../src/api/types";
import { bandExtent, draggedSpan, dragKind, HANDLE_HALF_PX, previewModel, shiftSchoolDays } from "../src/features/timeline/drag";
import { layoutTimeline } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import {
  SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_EVENTS, SAMPLE_SUBJECTS, sampleInput, samplePlans,
} from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

const model = buildTimelineModel(sampleInput({ today: DEMO_ME.today }));
const year = layoutTimeline(model, { zoom: "year", width: 1280 });
const month = layoutTimeline(model, { zoom: "month", width: 1280, month: "2026-11" });
const span = { startDate: "2026-11-02", endDate: "2026-11-27" };
const total = (xs: readonly number[]) => xs.reduce((s, v) => s + v, 0);

describe("which part is grabbed", () => {
  it("edges are 44 px handles; a short bar is body except outside its ends", () => {
    expect(dragKind([100, 300], 100 + HANDLE_HALF_PX)).toBe("start");
    expect(dragKind([100, 300], 100 - HANDLE_HALF_PX)).toBe("start");
    expect(dragKind([100, 300], 300 - HANDLE_HALF_PX)).toBe("end");
    expect(dragKind([100, 300], 200)).toBe("move");
    expect(dragKind([100, 140], 120)).toBe("move");
    expect(dragKind([100, 140], 95)).toBe("start");
    expect(dragKind([100, 140], 145)).toBe("end");
  });

  it("measures the bar in the lane that was grabbed", () => {
    const band = year.bands[0]!;
    const [x0, x1] = bandExtent(year, band)!;
    expect(x0).toBeLessThan(x1);
    expect(band.runs.every((r) => r.x0 >= x0 && r.x1 <= x1)).toBe(true);
  });
});

describe("how far a drag moves the dates", () => {
  it("snaps to whole weeks zoomed out, both dates for the body", () => {
    const week = year.plot.columnWidth * Math.round(year.plot.columns / year.spanWeeks);
    expect(draggedSpan(model, year, "year", "move", span, week * 2.2)).toEqual({ startDate: "2026-11-16", endDate: "2026-12-11" });
    expect(draggedSpan(model, year, "year", "move", span, week * 0.4)).toEqual(span);
    expect(draggedSpan(model, year, "year", "end", span, -week)).toEqual({ ...span, endDate: "2026-11-20" });
    expect(draggedSpan(model, year, "year", "start", span, week)).toEqual({ ...span, startDate: "2026-11-09" });
  });

  it("snaps to school days at This month, skipping weekends", () => {
    const day = month.plot.columnWidth;
    expect(shiftSchoolDays(model, "2026-11-06" as LocalDate, 1)).toBe("2026-11-09");
    expect(shiftSchoolDays(model, "2026-11-09" as LocalDate, -1)).toBe("2026-11-06");
    expect(draggedSpan(model, month, "month", "start", span, day * 5)).toEqual({ ...span, startDate: "2026-11-09" });
    expect(draggedSpan(model, month, "month", "end", span, -day)).toEqual({ ...span, endDate: "2026-11-26" });
  });

  it("never lets an edge cross the other end", () => {
    expect(draggedSpan(model, month, "month", "start", span, 10_000)).toEqual({ ...span, startDate: span.endDate });
    expect(draggedSpan(model, month, "month", "end", span, -10_000)).toEqual({ ...span, endDate: span.startDate });
  });
});

describe("the live preview", () => {
  const lane = model.lanes[0]!.children[0]!;
  const a = lane.assignments[0]!;
  const moved = { startDate: addDays(model.dates[a.first]!, 14), endDate: addDays(model.dates[a.last]!, 14) };
  const p = previewModel(model, a.assignmentId, moved);
  const pa = p.lanes[0]!.children[0]!.assignments.find((x) => x.assignmentId === a.assignmentId)!;

  it("redraws the dragged assignment over its new dates with the same total", () => {
    expect(diffDays(model.dates[a.first]!, p.dates[pa.first]!)).toBeGreaterThanOrEqual(14);
    expect(total(pa.daily)).toBeCloseTo(total(a.daily), 6);
    expect(pa.weekly.some((v) => v > 0)).toBe(true);
  });

  it("updates only that lane and All subjects", () => {
    expect(p.lanes[0]!.children[0]!.daily).not.toEqual(lane.daily);
    expect(p.totals.daily).not.toEqual(model.totals.daily);
    expect(total(p.totals.daily)).toBeCloseTo(total(model.totals.daily), 6);
    p.lanes.slice(1).forEach((s, i) => expect(s).toBe(model.lanes[i + 1]));
  });
});

function stub(assignments: Assignment[] = SAMPLE_ASSIGNMENTS) {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
  fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
  fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, assignments);
  fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
  fakeApi.on("GET /api/events", 200, SAMPLE_EVENTS);
  for (const a of assignments) fakeApi.on(`PATCH /api/assignments/${a.id}`, (body) => [200, { ...a, ...(body as Partial<Assignment>) }]);
}
const patches = () => fakeApi.calls.filter((c) => c.method === "PATCH");

/** Just inside the left end (the start handle) of the widest bar, in the picture's coordinates. */
function leftEnd(svg: Element) {
  const bands = [...svg.querySelectorAll("path.tl-band")].map((band) => {
    const nums = band.getAttribute("d")!.slice(1).split(/[ ,LCVHZ]+/).filter(Boolean).map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0);
    return { band, x: nums[0]!, y: nums[1]!, width: Math.max(...xs) - Math.min(...xs) };
  });
  const widest = bands.reduce((a, b) => (b.width > a.width ? b : a));
  return { x: widest.x + 1, y: widest.y + 1, id: widest.band.getAttribute("data-assignment")! };
}

// jsdom has no PointerEvent; a MouseEvent with the pointer fields is enough for React's handlers.
beforeAll(() => {
  if (typeof window.PointerEvent !== "undefined") return;
  class FakePointerEvent extends MouseEvent {
    pointerId: number; pointerType: string; isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? "mouse";
      this.isPrimary = init.isPrimary ?? true;
    }
  }
  window.PointerEvent = FakePointerEvent as unknown as typeof PointerEvent;
});

const pointer = (type: "mouse" | "touch") => ({ pointerId: 1, pointerType: type, isPrimary: true, button: 0 });

describe("dragging on the page", () => {
  it("a mouse drags the start earlier: the edit bar previews the dates, release saves only the start in whole weeks", async () => {
    stub();
    renderAt("/timeline");
    const svg = await screen.findByRole("img", { name: "Year timeline" });
    const stage = svg.closest(".tl-stage")!;
    const { x, y, id } = leftEnd(svg);
    const a = SAMPLE_ASSIGNMENTS.find((s) => s.id === id)!;
    fireEvent.pointerDown(svg, { ...pointer("mouse"), clientX: x, clientY: y });
    fireEvent.pointerMove(stage, { ...pointer("mouse"), clientX: x - 60, clientY: y });
    const bar = await screen.findByRole("region", { name: `Edit ${a.title}` });
    const previewed = (within(bar).getByLabelText("Start") as HTMLInputElement).value;
    expect(previewed < a.startDate).toBe(true);
    expect(patches()).toHaveLength(0);
    fireEvent.pointerUp(stage, { ...pointer("mouse"), clientX: x - 60, clientY: y });
    fireEvent.click(svg, { clientX: x - 60, clientY: y });
    await waitFor(() => expect(patches()).toHaveLength(1));
    const body = patches()[0]!.body as { startDate: LocalDate };
    expect(Object.keys(body)).toEqual(["startDate"]);
    expect(body.startDate).toBe(previewed);
    expect(diffDays(body.startDate, a.startDate as LocalDate) % 7).toBe(0);
    // The click that ends a drag doesn't change the selection.
    expect(screen.getByRole("region", { name: `Edit ${a.title}` })).toBeInTheDocument();
  });

  it("a finger on a bar that isn't selected doesn't drag (the page scrolls instead)", async () => {
    stub();
    renderAt("/timeline");
    const svg = await screen.findByRole("img", { name: "Year timeline" });
    const stage = svg.closest(".tl-stage")!;
    expect(stage.hasAttribute("data-drag-ready")).toBe(false);
    const { x, y } = leftEnd(svg);
    fireEvent.pointerDown(svg, { ...pointer("touch"), clientX: x, clientY: y });
    fireEvent.pointerMove(stage, { ...pointer("touch"), clientX: x - 60, clientY: y });
    fireEvent.pointerUp(stage, { ...pointer("touch"), clientX: x - 60, clientY: y });
    expect(screen.queryByRole("region", { name: /^Edit / })).toBeNull();
    expect(patches()).toHaveLength(0);
  });

  it("a finger drags the selected bar, and a cancelled pointer drops the drag", async () => {
    stub();
    renderAt("/timeline");
    const svg = await screen.findByRole("img", { name: "Year timeline" });
    const stage = svg.closest(".tl-stage")!;
    const { x, y, id } = leftEnd(svg);
    const a = SAMPLE_ASSIGNMENTS.find((s) => s.id === id)!;
    fireEvent.click(svg, { clientX: x, clientY: y });
    const bar = await screen.findByRole("region", { name: `Edit ${a.title}` });
    expect(stage.hasAttribute("data-drag-ready")).toBe(true);
    fireEvent.pointerDown(svg, { ...pointer("touch"), clientX: x, clientY: y });
    fireEvent.pointerMove(stage, { ...pointer("touch"), clientX: x - 60, clientY: y });
    await waitFor(() => expect((within(bar).getByLabelText("Start") as HTMLInputElement).value < a.startDate).toBe(true));
    fireEvent.pointerCancel(stage, { ...pointer("touch") });
    await waitFor(() => expect(within(bar).getByLabelText("Start")).toHaveValue(a.startDate));
    expect(patches()).toHaveLength(0);
  });
});
