/** T-08b: clean bars zoomed out, a solid selected bar with grips, the cursors, and live date fields while dragging. */
import { readFileSync } from "node:fs";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import type { Assignment } from "../src/api/types";
import { grabSelected, HANDLE_HALF_PX, handleReach } from "../src/features/timeline/drag";
import { layoutTimeline } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import { cleanSeries, PHASE_MIN_DAYS, smoothSeries } from "../src/features/timeline/smooth";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import {
  SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_EVENTS, SAMPLE_SUBJECTS, sampleInput, samplePlans,
} from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

const model = buildTimelineModel(sampleInput({ today: DEMO_ME.today }));
const cols = Array.from({ length: 60 }, (_, i) => i);
const distinct = (xs: readonly number[]) => new Set(xs.filter((v) => v > 0).map((v) => v.toFixed(6))).size;

describe("clean bars zoomed out (item 1)", () => {
  it("a lumpy assignment becomes one thickness, its average daily load, with no edge wobble", () => {
    const lumpy = cols.map((i) => (i >= 5 && i < 20 ? [3, 5, 2, 6, 4][i % 5]! : 0));
    const out = cleanSeries(lumpy, cols);
    expect(distinct(out)).toBe(1);
    expect(out[5]).toBeCloseTo(4, 6);
    expect(out[19]).toBeCloseTo(4, 6);
    expect(out[4]).toBe(0);
    expect(out[20]).toBe(0);
  });

  it("keeps clearly distinct phases (heavy weeks, then light) and folds a short lump into its neighbour", () => {
    const phases = cols.map((i) => (i < 15 ? 6 : i < 30 ? 2 : 0));
    expect(distinct(cleanSeries(phases, cols))).toBe(2);
    const lump = cols.map((i) => (i < 30 ? (i >= 10 && i < 10 + PHASE_MIN_DAYS / 2 ? 5 : 3) : 0));
    expect(distinct(cleanSeries(lump, cols))).toBe(1);
  });

  it("never reaches across a break (a week off); a day off is bridged", () => {
    const s = cols.map((i) => (i < 30 && !(i >= 12 && i < 17) && i !== 22 ? 4 : 0));
    const out = cleanSeries(s, cols);
    expect(out.slice(12, 17)).toEqual([0, 0, 0, 0, 0]);
    expect(out[11]).toBeCloseTo(out[17]!, 6); // one thickness for the whole assignment, either side of the break
    expect(out[22]).toBeGreaterThan(0);
    expect(distinct(out.slice(17, 30))).toBe(1);
    // The moving average (All subjects) over clean shapes doesn't dip at a break's edges or bridge it.
    const sm = smoothSeries(out, cols);
    expect(sm[11]).toBeCloseTo(out[11]!, 6);
    expect(sm[17]).toBeCloseTo(out[17]!, 6);
    expect(sm[29]).toBeCloseTo(out[29]!, 6);
    expect(sm[14]).toBe(0);
  });

  it("Year draws every single-phase assignment as one clean shape (no curves), even where the daily plan is lumpy", () => {
    const year = layoutTimeline(model, { zoom: "year", width: 1280 });
    const school = model.dates.map((_, i) => i).filter((i) => model.schoolDay[i]);
    const all = model.lanes.flatMap((l) => l.children.flatMap((c) => c.assignments));
    let lumpyChecked = 0;
    for (const band of year.bands) {
      const a = all.find((x) => x.assignmentId === band.assignmentId)!;
      if (distinct(cleanSeries(a.daily, school)) !== 1 || !band.d) continue;
      expect(band.d).not.toMatch(/C/);
      if (distinct(a.daily) > 1) lumpyChecked++;
    }
    expect(lumpyChecked).toBeGreaterThan(0);
  });

  it("detail at 8 weeks or less is unchanged: daily steps", () => {
    const month = layoutTimeline(model, { zoom: "month", width: 1280, month: "2026-11" });
    expect(month.detail).toBe("daily");
    expect(month.bands.some((b) => /C/.test(b.d))).toBe(false);
  });
});

describe("the selected bar's grips (item 3)", () => {
  it("each end is at least a 44 px target, even on a short bar", () => {
    expect(handleReach([0, 300])).toBe(HANDLE_HALF_PX);
    expect(handleReach([0, 30])).toBe(2 * HANDLE_HALF_PX);
    const year = layoutTimeline(model, { zoom: "year", width: 1280 });
    const band = year.bands.find((b) => b.runs.length > 0)!;
    const x0 = Math.min(...band.runs.map((r) => r.x0));
    const reach = handleReach([x0, Math.max(...band.runs.map((r) => r.x1))]);
    expect(grabSelected(year, band.assignmentId, x0 - reach + 1, band.cy)?.kind).toBe("start");
    expect(grabSelected(year, band.assignmentId, x0 - reach - 1, band.cy)).toBeNull();
    expect(grabSelected(year, null, x0, band.cy)).toBeNull();
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

/** The widest bar's left and right x (all its runs) and a y just inside its top. */
function widest(svg: Element) {
  const bands = [...svg.querySelectorAll("path.tl-band")].map((band) => {
    const d = band.getAttribute("d")!;
    const xs: number[] = [];
    for (const [, cmd, args] of d.matchAll(/([MLCVHQZ])([^MLCVHQZ]*)/g)) {
      const n = args!.trim().split(/[ ,]+/).filter(Boolean).map(Number);
      if (cmd === "H") xs.push(...n);
      else if (cmd !== "V") xs.push(...n.filter((_, i) => i % 2 === 0));
    }
    const y = Number(d.slice(1).split(/[ ,]/)[1]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y: y + 1, id: band.getAttribute("data-assignment")! };
  });
  return bands.reduce((a, b) => (b.x1 - b.x0 > a.x1 - a.x0 ? b : a));
}

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
const mouse = { pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0 };

async function selectWidest() {
  stub();
  renderAt("/timeline");
  const svg = await screen.findByRole("img", { name: "Year timeline" });
  const stage = svg.closest(".tl-stage") as HTMLElement;
  const w = widest(svg);
  const a = SAMPLE_ASSIGNMENTS.find((s) => s.id === w.id)!;
  expect(svg.querySelector(".tl-handle")).toBeNull();
  fireEvent.click(svg, { clientX: w.x0 + 30, clientY: w.y });
  const bar = await screen.findByRole("region", { name: `Edit ${a.title}` });
  return { svg, stage, w, a, bar };
}

describe("on the page", () => {
  it("the selected bar is solid and only it gets grips, one at each end (items 2 and 3)", async () => {
    const { svg, w } = await selectWidest();
    const mine = [...svg.querySelectorAll(`path.tl-band[data-assignment="${w.id}"]`)];
    expect(mine.every((b) => b.classList.contains("tl-selected") && !b.classList.contains("tl-dim"))).toBe(true);
    expect(svg.querySelectorAll("path.tl-band.tl-selected")).toHaveLength(mine.length);
    const grips = [...svg.querySelectorAll(".tl-handles .tl-handle")].map((h) => Number(h.getAttribute("x")));
    expect(grips.length % 2).toBe(0);
    expect(grips.some((x) => x >= w.x0 && x < w.x0 + 10)).toBe(true);
    expect(grips.some((x) => x <= w.x1 && x > w.x1 - 12)).toBe(true);
    const css = readFileSync("src/features/timeline/timeline.css", "utf8");
    expect(css).toMatch(/\.tl-band\.tl-selected\s*\{\s*fill-opacity:\s*1;/);
    expect(css).toMatch(/\.tl-handles\s*\{\s*pointer-events:\s*none;/);
  });

  it("a mouse sees the move cursor over the body and the resize cursor over the ends (item 3)", async () => {
    const { stage, w } = await selectWidest();
    fireEvent.pointerMove(stage, { ...mouse, clientX: (w.x0 + w.x1) / 2, clientY: w.y });
    expect(stage.style.cursor).toBe("move");
    fireEvent.pointerMove(stage, { ...mouse, clientX: w.x0 + 2, clientY: w.y });
    expect(stage.style.cursor).toBe("ew-resize");
    fireEvent.pointerMove(stage, { ...mouse, clientX: w.x1 - 2, clientY: w.y });
    expect(stage.style.cursor).toBe("ew-resize");
  });

  it("the date fields follow a drag live: the body moves both, an end only its own (item 4)", async () => {
    const { svg, stage, w, a, bar } = await selectWidest();
    const start = () => (within(bar).getByLabelText("Start") as HTMLInputElement).value;
    const end = () => (within(bar).getByLabelText("End") as HTMLInputElement).value;
    const body = w.x0 + 30;
    fireEvent.pointerDown(svg, { ...mouse, clientX: body, clientY: w.y });
    fireEvent.pointerMove(stage, { ...mouse, clientX: body + 80, clientY: w.y });
    await waitFor(() => expect(start() > a.startDate && end() > a.endDate).toBe(true));
    fireEvent.pointerCancel(stage, { ...mouse });
    await waitFor(() => expect(start()).toBe(a.startDate));
    fireEvent.pointerDown(svg, { ...mouse, clientX: w.x1 - 2, clientY: w.y });
    fireEvent.pointerMove(stage, { ...mouse, clientX: w.x1 + 80, clientY: w.y });
    await waitFor(() => expect(end() > a.endDate).toBe(true));
    expect(start()).toBe(a.startDate);
    fireEvent.pointerCancel(stage, { ...mouse });
  });
});
