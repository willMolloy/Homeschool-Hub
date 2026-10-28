/**
 * T-08: dragging a bar. Pure: which part was grabbed, how far a drag moves the dates (whole weeks zoomed out, school
 * days at This month), and a preview model with the dragged assignment redrawn over its new dates (the lane sums and
 * All subjects follow; every other lane is untouched).
 */
import { addDays, diffDays, weekStartOf, type LocalDate } from "@hh/engine";
import { sumSeries } from "./grid";
import type { LaneBand, TimelineLayout } from "./layout";
import type { TimelineAssignment, TimelineModel } from "./model";
import type { DateSpan } from "./select";
import type { Zoom } from "./zoom";

export type DragKind = "move" | "start" | "end";

/** Half a 44 px handle: an edge zone reaches this far either side of the bar's end. */
export const HANDLE_HALF_PX = 22;
/** A pointer must travel this far before a press becomes a drag (smaller is a tap). */
export const DRAG_THRESHOLD_PX = 4;

/** Left and right of the assignment's drawn runs in the grabbed lane. */
export function bandExtent(layout: Pick<TimelineLayout, "bands">, band: Pick<LaneBand, "assignmentId" | "laneKey">): [number, number] | null {
  const runs = layout.bands.filter((b) => b.assignmentId === band.assignmentId && b.laneKey === band.laneKey).flatMap((b) => b.runs);
  return runs.length ? [Math.min(...runs.map((r) => r.x0)), Math.max(...runs.map((r) => r.x1))] : null;
}

/** Edges are 44 px handles centred on each end. On a bar too short for both plus a body, only outside its ends. */
export function dragKind(extent: [number, number], x: number): DragKind {
  const [x0, x1] = extent;
  const roomy = x1 - x0 >= 3 * HANDLE_HALF_PX;
  if (roomy ? x <= x0 + HANDLE_HALF_PX : x < x0) return "start";
  if (roomy ? x >= x1 - HANDLE_HALF_PX : x > x1) return "end";
  return "move";
}

/** `date` moved by `n` school days on the grid (calendar days off the grid). */
export function shiftSchoolDays(model: Pick<TimelineModel, "from" | "dates" | "schoolDay">, date: LocalDate, n: number): LocalDate {
  let i = diffDays(model.from, date);
  if (n === 0 || i < 0 || i >= model.dates.length) return addDays(date, n);
  const step = n > 0 ? 1 : -1;
  for (let left = Math.abs(n); left > 0; ) {
    i += step;
    if (i < 0 || i >= model.dates.length) return addDays(model.dates[i - step]!, step * left);
    if (model.schoolDay[i]) left--;
  }
  return model.dates[i]!;
}

/**
 * The dates after dragging `dx` px. Year, Fall and Spring snap to whole weeks (7 days per school week's width);
 * This month snaps to school days. An edge never crosses the other end.
 */
export function draggedSpan(
  model: Pick<TimelineModel, "from" | "dates" | "schoolDay">,
  layout: Pick<TimelineLayout, "plot" | "spanWeeks">,
  zoom: Zoom,
  kind: DragKind,
  span: DateSpan,
  dx: number,
): DateSpan {
  const { columnWidth, columns } = layout.plot;
  if (columnWidth <= 0) return span;
  const shift = (d: LocalDate): LocalDate => {
    if (zoom === "month") return shiftSchoolDays(model, d, Math.round(dx / columnWidth));
    const perWeek = Math.max(1, Math.round(columns / Math.max(1, layout.spanWeeks)));
    return addDays(d, 7 * Math.round(dx / (columnWidth * perWeek)));
  };
  if (kind === "move") return { startDate: shift(span.startDate), endDate: shift(span.endDate) };
  if (kind === "start") { const s = shift(span.startDate); return { ...span, startDate: s > span.endDate ? span.endDate : s }; }
  const e = shift(span.endDate);
  return { ...span, endDate: e < span.startDate ? span.startDate : e };
}

/** The assignment's planned values spread over the school days of `span` that aren't a break for it. Same total. */
function resample(model: TimelineModel, a: TimelineAssignment, span: DateSpan): Pick<TimelineAssignment, "daily" | "weekly" | "first" | "last"> {
  const n = model.dates.length;
  const values = a.daily.filter((v, i) => v > 0 && model.schoolDay[i]);
  const off = (i: number) => model.breaks.some((b) => i >= b.first && i <= b.last && (b.childIds.length === 0 || b.childIds.includes(a.childId)));
  const from = Math.max(0, diffDays(model.from, span.startDate));
  const to = Math.min(n - 1, diffDays(model.from, span.endDate));
  const days: number[] = [];
  for (let i = from; i <= to; i++) if (model.schoolDay[i] && !off(i)) days.push(i);
  const daily = new Array<number>(n).fill(0);
  const m = values.length;
  const k = days.length;
  days.forEach((i, j) => { if (m) daily[i] = values[Math.floor((j * m) / k)]! * (m / k); });
  // The weekly series: each counted day carries its week's average, as the engine's aggregate does.
  const weekly = new Array<number>(n).fill(0);
  const byWeek = new Map<string, number[]>();
  for (const i of days) {
    const w = weekStartOf(model.dates[i]!, model.weekStart);
    byWeek.set(w, [...(byWeek.get(w) ?? []), i]);
  }
  for (const idx of byWeek.values()) {
    const avg = idx.reduce((s, i) => s + daily[i]!, 0) / idx.length;
    for (const i of idx) weekly[i] = avg;
  }
  const drawn = days.filter((i) => daily[i]! > 0);
  return { daily, weekly, first: drawn[0] ?? -1, last: drawn[drawn.length - 1] ?? -1 };
}

/** The model with one assignment redrawn over new dates: its lanes' sums and the totals follow. */
export function previewModel(model: TimelineModel, assignmentId: string, span: DateSpan): TimelineModel {
  const n = model.dates.length;
  let touched = false;
  const lanes = model.lanes.map((subject) => {
    if (!subject.children.some((c) => c.assignments.some((a) => a.assignmentId === assignmentId))) return subject;
    return {
      ...subject,
      children: subject.children.map((child) => {
        if (!child.assignments.some((a) => a.assignmentId === assignmentId)) return child;
        touched = true;
        const assignments = child.assignments.map((a) => (a.assignmentId === assignmentId ? { ...a, ...resample(model, a, span) } : a));
        return { ...child, assignments, daily: sumSeries(assignments.map((a) => a.daily), n), weekly: sumSeries(assignments.map((a) => a.weekly), n) };
      }),
    };
  });
  if (!touched) return model;
  const subLanes = lanes.flatMap((l) => l.children);
  return { ...model, lanes, totals: { daily: sumSeries(subLanes.map((c) => c.daily), n), weekly: sumSeries(subLanes.map((c) => c.weekly), n) } };
}
