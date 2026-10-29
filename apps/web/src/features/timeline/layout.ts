/**
 * T-03: the timeline layout. A pure function of (model, zoom, width) that returns every position the SVG
 * needs: rows and centerlines, band paths, lane labels, break and event shapes, Today and month ticks.
 * The renderer (T-04) only draws what this returns.
 *
 * Agreed rules:
 * - No overlap: within a child's sub-lane, assignments that overlap in time go on separate rows (rows.ts).
 * - Each row has a fixed centerline and its bar thickens symmetrically about it.
 * - Row spacing comes from each row's thickest point (daily or weekly, so rows never move between zooms)
 *   plus one small uniform gap.
 * - A drawn band is never thinner than 2 px; bars have slightly rounded corners.
 * - Horizontal room: labels sit above their rows, not in a column, so the plot spans the width.
 */
import { weekdayOf } from "@hh/engine";
import { PX_PER_THICKNESS } from "../plan/scale";
import type { ChildStep, TimelineAssignment, TimelineModel } from "./model";
import { estimateTextWidth, outsideNameLimit, placeName, placeOutsideName, type MeasureText } from "./names";
import { bandPath, rectsPath, smoothBandPath, type BandColumn } from "./paths";
import { drawnExtent, packRows } from "./rows";
import { sumSeries } from "./grid";
import { cleanSeries, smoothSeries } from "./smooth";
import { makeXScale, type XScale } from "./xscale";
import { resolveDetail, spanWeeks, zoomRange, type Detail, type DrawnDetail, type Zoom } from "./zoom";

/**
 * Horizontal room (DeeDee): no label column. Lane labels sit on their own short line above the lane, so
 * the plot runs edge to edge apart from this small side padding (the renderer draws it full-bleed on
 * phones, with nothing beside it).
 */
export const SIDE_PAD_PX = 4;
/** The label line above each child's rows (12 px text). */
export const LABEL_ROW_PX = 16;
/** Month ticks along the top. */
export const AXIS_HEIGHT_PX = 20;
/** A month label is shown only when its slot is at least this wide. T-05c: on phones, labels also keep this far apart. */
export const MIN_TICK_LABEL_PX = 24;
export const PHONE_MIN_TICK_LABEL_PX = 48;
/** Layout widths under this are phones (matches the app's 640 px breakpoint). */
export const PHONE_WIDTH_PX = 640;
/** One strip row per recurring event, above the lanes. */
export const EVENT_ROW_PX = 6;
export const EVENT_ROW_GAP_PX = 2;
/** The one uniform gap between rows (agreed: spacing = each row's thickest point + the same small gap). */
export const LANE_GAP_PX = 4;
/** The extra gap before each subject. */
export const SUBJECT_GAP_PX = 8;
/** Any band with thickness is drawn at least this thick (agreed 2 px floor); an empty row is this tall too. */
export const MIN_BAND_PX = 2;
/** The total-load strip's fixed height; its own scale fits the year's busiest day. */
export const TOTALS_HEIGHT_PX = 32;
export const BOTTOM_PAD_PX = 4;

export interface LayoutOptions {
  zoom: Zoom;
  /** Available width in CSS px. */
  width: number;
  detail?: Detail;
  /** T-05c: the detail drawn before this layout, for the threshold's hysteresis. */
  previousDetail?: DrawnDetail;
  /** T-05c: the calendar month ("YYYY-MM") for the month zoom; defaults to the one holding today. */
  month?: string | null;
  /** Pixels per thickness point; defaults to the shared scale (`PX_PER_THICKNESS`). */
  pxPerPoint?: number;
  /** T-06: text width for in-bar names; defaults to an over-estimate (the page passes a canvas measure). */
  measureText?: MeasureText;
}

/** One row: a child's sub-lane has one or more, each with its own fixed centerline. */
export interface LaneRow {
  /** Stable key: `${subjectId}:${childId}#${row}`. */
  key: string;
  /** The child sub-lane it belongs to (`ChildLane.key`). */
  laneKey: string;
  row: number;
  subjectId: string;
  subjectName: string;
  childId: string;
  childName: string;
  paletteSlot: number;
  step: ChildStep;
  y: number;
  height: number;
  /** The fixed centerline. */
  cy: number;
}

/** The short label line above a child's rows. */
export interface LaneLabel {
  laneKey: string;
  /** Subject name on a subject's first child, with the child's name when the family has more than one. */
  text: string;
  x: number;
  y: number;
  height: number;
}

export interface LaneBand {
  rowKey: string;
  laneKey: string;
  assignmentId: string;
  childId: string;
  title: string;
  paletteSlot: number;
  step: ChildStep;
  /** One closed subpath per run of touching columns; "" when nothing shows at this zoom. */
  d: string;
  /** The same runs as x spans, for hit-testing (hit.ts) and in-bar names (T-06). */
  runs: { x0: number; x1: number }[];
  /** The row's centerline. */
  cy: number;
}

/** T-06: a name drawn inside its bar, on a solid patch of the bar's swatch. */
export interface BarName {
  rowKey: string;
  assignmentId: string;
  /** The full title, or a prefix with "…". */
  text: string;
  paletteSlot: number;
  step: ChildStep;
  x: number;
  y: number;
  width: number;
  height: number;
  textX: number;
  textY: number;
  /** T-10: a plain label past the bar's end (no patch), for a bar too short for a name inside it. */
  outside?: true;
}

export interface BreakRect {
  breakId: string;
  label: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EventStrip {
  eventId: string;
  name: string;
  y: number;
  height: number;
  /** All of the event's day marks as one path. */
  d: string;
  /** The same marks as x spans, for hit-testing and tests. */
  spans: { x: number; width: number }[];
}

export interface Tick {
  index: number;
  x: number;
  kind: "month" | "week";
  /** Month abbreviation, or null when there is no room (and for week lines). */
  label: string | null;
}

export interface TimelineLayout {
  zoom: Zoom;
  /** T-05c: daily steps (with events) at DETAIL_SPAN_WEEKS or less, smooth curves above. */
  detail: DrawnDetail;
  /** Visible span in calendar weeks. */
  spanWeeks: number;
  width: number;
  height: number;
  pxPerPoint: number;
  plot: { x: number; width: number; columnWidth: number; columns: number; first: number; last: number };
  rows: LaneRow[];
  labels: LaneLabel[];
  bands: LaneBand[];
  /** T-06: names that fit inside their bars (at most one per bar). */
  names: BarName[];
  breaks: BreakRect[];
  events: EventStrip[];
  ticks: Tick[];
  /** Centre of today's column, or its boundary on a day off; null when today isn't shown. */
  todayX: number | null;
  /** The total-load strip, with its "Total" label row above it (labelY). */
  totals: { labelY: number; y: number; height: number; cy: number; d: string };
  /** Top and bottom of the lane area (breaks span it). */
  lanesTop: number;
  lanesBottom: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_OF_START = { mon: 1, sun: 0 } as const;

/**
 * T-05b: px per point for the "All subjects" bar, so the family's heaviest point (daily or weekly) is
 * TOTALS_HEIGHT_PX thick. 0 when nothing is planned.
 */
export function totalsPxPerPoint(totals: { daily: readonly number[]; weekly: readonly number[] }, maxPx = TOTALS_HEIGHT_PX): number {
  const peak = Math.max(0, ...totals.daily, ...totals.weekly);
  return peak > 0 ? maxPx / peak : 0;
}

/** Drawn height of one value: nothing at zero, otherwise at least the 2 px floor. */
export const bandHeight = (value: number, pxPerPoint: number): number => (value > 0 ? Math.max(value * pxPerPoint, MIN_BAND_PX) : 0);

/** A row's height: its thickest drawn point anywhere on the grid, daily or weekly, so it never moves between zooms. */
function rowHeight(assignments: readonly TimelineAssignment[], pxPerPoint: number): number {
  let max = MIN_BAND_PX;
  for (const a of assignments) {
    for (const v of a.daily) max = Math.max(max, bandHeight(v, pxPerPoint));
    for (const v of a.weekly) max = Math.max(max, bandHeight(v, pxPerPoint));
  }
  return max;
}

/** A band's columns over the shown range, centred on cy (null where it is zero). */
function bandColumns(series: readonly number[], xs: XScale, cy: number, pxPerPoint: number): (BandColumn | null)[] {
  const out: (BandColumn | null)[] = [];
  for (let i = xs.first; i <= xs.last; i++) {
    if (!xs.isColumn(i)) continue;
    const h = bandHeight(series[i] ?? 0, pxPerPoint);
    out.push(h > 0 ? { x0: xs.start(i), x1: xs.end(i), top: cy - h / 2, bottom: cy + h / 2 } : null);
  }
  return out;
}

/** T-05c: the smooth look ignores thickness changes smaller than this, so the curve has no tiny jogs. */
export const SMOOTH_DEADBAND_PX = 3;

/**
 * T-05c: columns for the smooth (zoomed-out) look: the smoothed series rounded to even pixels, held through
 * changes under SMOOTH_DEADBAND_PX (no tiny jogs), and capped at the row's height.
 */
export function smoothColumns(series: readonly number[], xs: XScale, cy: number, pxPerPoint: number, maxPx: number): (BandColumn | null)[] {
  const out: (BandColumn | null)[] = [];
  let held = 0;
  for (let i = xs.first; i <= xs.last; i++) {
    if (!xs.isColumn(i)) continue;
    const raw = (series[i] ?? 0) * pxPerPoint;
    // Even heights keep both edges on whole pixels; a change under the dead band keeps the height held.
    if (raw <= 0) held = 0;
    else if (held === 0 || Math.abs(raw - held) >= SMOOTH_DEADBAND_PX) held = Math.max(MIN_BAND_PX, 2 * Math.round(raw / 2));
    const h = Math.min(maxPx, held);
    out.push(h > 0 ? { x0: xs.start(i), x1: xs.end(i), top: cy - h / 2, bottom: cy + h / 2 } : null);
  }
  return out;
}

/** Runs of touching columns as x spans. */
function runsOf(columns: readonly (BandColumn | null)[]): { x0: number; x1: number }[] {
  const runs: { x0: number; x1: number }[] = [];
  let open: { x0: number; x1: number } | null = null;
  for (const c of columns) {
    if (c) {
      if (open) open.x1 = c.x1;
      else runs.push((open = { x0: c.x0, x1: c.x1 }));
    } else {
      open = null;
    }
  }
  return runs;
}

export function layoutTimeline(model: TimelineModel, options: LayoutOptions): TimelineLayout {
  const pxPerPoint = options.pxPerPoint ?? PX_PER_THICKNESS;
  const range = zoomRange(model, options.zoom, options.month);
  const weeks = spanWeeks(model, range);
  const detail = resolveDetail(weeks, options.detail, options.previousDetail);
  const width = Math.max(0, options.width);
  const plotX = Math.min(SIDE_PAD_PX, width / 2);
  const plotWidth = Math.max(0, width - 2 * SIDE_PAD_PX);
  const [first, last] = range ?? [0, -1];
  const xs = makeXScale(model, first, last, plotX, plotWidth);
  const shown = (i: number) => i >= first && i <= last;

  // Ticks: a line at each month start (labels where they fit).
  const ticks: Tick[] = [];
  const monthStarts: number[] = [];
  for (let i = first; i <= last; i++) if (i === first || model.dates[i]!.endsWith("-01")) monthStarts.push(i);
  monthStarts.forEach((i, k) => {
    const x = xs.start(i);
    const next = k + 1 < monthStarts.length ? xs.start(monthStarts[k + 1]!) : xs.x + xs.width;
    ticks.push({ index: i, x, kind: "month", label: next - x >= MIN_TICK_LABEL_PX ? MONTHS[Number(model.dates[i]!.slice(5, 7)) - 1]! : null });
  });
  // Phones: every other month label at most, so the axis stays calm.
  if (width < PHONE_WIDTH_PX) {
    let lastLabel = -Infinity;
    for (const t of ticks) {
      if (!t.label) continue;
      if (t.x - lastLabel < PHONE_MIN_TICK_LABEL_PX) t.label = null;
      else lastLabel = t.x;
    }
  }
  // Week lines only with daily detail (T-05c: zoomed out they are noise).
  if (detail === "daily") {
    const startDay = WEEKDAY_OF_START[model.weekStart];
    const months = new Set(monthStarts);
    for (let i = first; i <= last; i++) {
      if (weekdayOf(model.dates[i]!) !== startDay || months.has(i)) continue;
      // Daily detail: week lines carry their day of the month, so a month's weeks can be told apart.
      const label = detail === "daily" && xs.columnWidth * 5 >= MIN_TICK_LABEL_PX ? String(Number(model.dates[i]!.slice(8, 10))) : null;
      ticks.push({ index: i, x: xs.start(i), kind: "week", label });
    }
    ticks.sort((a, b) => a.x - b.x || a.index - b.index);
  }

  // Event strips, one row each, under the axis. T-05c: only with daily detail; zoomed out they are noise.
  const shownEvents = detail === "smooth" ? [] : model.events;
  const events: EventStrip[] = shownEvents.map((e, row) => {
    const y = AXIS_HEIGHT_PX + row * (EVENT_ROW_PX + EVENT_ROW_GAP_PX);
    const spans = e.days.filter((i) => xs.isColumn(i)).map((i) => ({ x: xs.start(i), width: xs.columnWidth }));
    return { eventId: e.id, name: e.name, y, height: EVENT_ROW_PX, spans, d: rectsPath(spans.map((s) => ({ x: s.x, y, w: s.width, h: EVENT_ROW_PX }))) };
  });
  const eventsBottom = AXIS_HEIGHT_PX + shownEvents.length * (EVENT_ROW_PX + EVENT_ROW_GAP_PX) + (shownEvents.length ? LANE_GAP_PX : 0);

  // T-05c: which series and outline a band uses at this detail.
  const schoolColumns = model.dates.map((_, i) => i).filter((i) => model.schoolDay[i]);
  // T-08b: zoomed out, an assignment is its clean shape (no lumps); All subjects smooths the sum of those shapes.
  const clean = new Map<TimelineAssignment, number[]>();
  const cleanOf = (a: TimelineAssignment) => {
    let c = clean.get(a);
    if (!c) clean.set(a, (c = cleanSeries(a.daily, schoolColumns)));
    return c;
  };
  const seriesFor = (a: TimelineAssignment) => (detail === "smooth" ? cleanOf(a) : detail === "weekly" ? a.weekly : a.daily);
  const totalsSeries = () =>
    detail === "smooth"
      ? smoothSeries(sumSeries(model.lanes.flatMap((l) => l.children.flatMap((c) => c.assignments.map(cleanOf))), model.dates.length), schoolColumns)
      : detail === "weekly" ? model.totals.weekly : model.totals.daily;
  const columnsFor = (series: readonly number[], cy: number, scale: number, maxPx: number) =>
    detail === "smooth" ? smoothColumns(series, xs, cy, scale, maxPx) : bandColumns(series, xs, cy, scale);
  const pathFor = detail === "smooth" ? smoothBandPath : bandPath;

  // T-05b: the "All subjects" bar, pinned above the lanes on its own label row and centerline. Its thickness is
  // the sum of every lane, normalised so the family's heaviest point (at any zoom) is TOTALS_HEIGHT_PX.
  const totalsLabelY = eventsBottom;
  const totalsY = totalsLabelY + LABEL_ROW_PX;
  const totalsScale = totalsPxPerPoint(model.totals);
  const totalsCy = totalsY + TOTALS_HEIGHT_PX / 2;
  const totals = {
    labelY: totalsLabelY,
    y: totalsY,
    height: TOTALS_HEIGHT_PX,
    cy: totalsCy,
    d: totalsScale > 0 ? pathFor(columnsFor(totalsSeries(), totalsCy, totalsScale, TOTALS_HEIGHT_PX)) : "",
  };
  const lanesTop = totalsY + TOTALS_HEIGHT_PX + SUBJECT_GAP_PX;

  // Labels, rows and their bands. A child's name is only needed when there is more than one child.
  const manyChildren = new Set(model.lanes.flatMap((l) => l.children.map((c) => c.childId))).size > 1;
  const rows: LaneRow[] = [];
  const labels: LaneLabel[] = [];
  const bands: LaneBand[] = [];
  const names: BarName[] = [];
  const measure = options.measureText ?? estimateTextWidth;
  const childSpans = new Map<string, { childId: string; top: number; bottom: number }>();
  let y = lanesTop;
  // T-07f: This month leaves out rows, lanes and subjects with nothing in the month. Rows are packed from every
  // assignment first, so a bar keeps its row across zooms.
  const inMonth = (a: TimelineAssignment) => {
    const span = drawnExtent(a);
    return span !== null && span[0] <= last && span[1] >= first;
  };
  const rowsOf = (assignments: readonly TimelineAssignment[]) =>
    options.zoom === "month" ? packRows(assignments).map((m) => m.filter(inMonth)).filter((m) => m.length > 0) : packRows(assignments);
  const shownLanes = model.lanes
    .map((subject) => ({ subject, children: subject.children.map((child) => ({ child, packed: rowsOf(child.assignments) })).filter((c) => c.packed.length > 0) }))
    .filter((l) => l.children.length > 0);
  shownLanes.forEach(({ subject, children }, s) => {
    if (s > 0) y += SUBJECT_GAP_PX;
    children.forEach(({ child, packed }, c) => {
      if (c > 0) y += LANE_GAP_PX;
      const text = c === 0 ? (manyChildren ? `${subject.name} · ${child.childName}` : subject.name) : child.childName;
      labels.push({ laneKey: child.key, text, x: plotX, y, height: LABEL_ROW_PX });
      y += LABEL_ROW_PX;
      const top = y;
      packed.forEach((members, r) => {
        if (r > 0) y += LANE_GAP_PX;
        const height = rowHeight(members, pxPerPoint);
        const cy = y + height / 2;
        const key = `${child.key}#${r}`;
        rows.push({
          key, laneKey: child.key, row: r, subjectId: subject.subjectId, subjectName: subject.name, childId: child.childId,
          childName: child.childName, paletteSlot: subject.paletteSlot, step: child.step, y, height, cy,
        });
        const placed = members.map((a) => {
          const columns = columnsFor(seriesFor(a), cy, pxPerPoint, height);
          bands.push({
            rowKey: key, laneKey: child.key, assignmentId: a.assignmentId, childId: a.childId, title: a.title,
            paletteSlot: subject.paletteSlot, step: child.step, d: pathFor(columns), runs: runsOf(columns), cy,
          });
          const name = placeName(a.title, columns, cy, measure);
          if (name) names.push({ rowKey: key, assignmentId: a.assignmentId, paletteSlot: subject.paletteSlot, step: child.step, ...name });
          return { a, columns, named: name !== null, start: Math.min(...columns.flatMap((c) => (c ? [c.x0] : []))) };
        });
        // T-10: bars with no inside name get a label past their end, up to the next bar in the row.
        for (const p of placed) {
          if (p.named) continue;
          const limit = outsideNameLimit(placed.map((o) => o.start), p.start, plotX + plotWidth);
          const label = placeOutsideName(p.a.title, p.columns, y, height, cy, limit, measure);
          if (label) names.push({ rowKey: key, assignmentId: p.a.assignmentId, paletteSlot: subject.paletteSlot, step: child.step, ...label, outside: true });
        }
        y += height;
      });
      childSpans.set(child.key, { childId: child.childId, top, bottom: y });
    });
  });
  const lanesBottom = y;

  // Breaks: family-wide ones span every lane and the totals; per-child ones only that child's rows.
  const breaks: BreakRect[] = [];
  for (const b of model.breaks) {
    const from = Math.max(b.first, first);
    const to = Math.min(b.last, last);
    if (from > to) continue;
    const x = xs.start(from);
    const w = xs.end(to) - x;
    if (w <= 0) continue;
    if (b.childIds.length === 0) {
      breaks.push({ breakId: b.id, label: b.label, x, y: totalsY, width: w, height: Math.max(lanesBottom, totalsY + TOTALS_HEIGHT_PX) - totalsY });
    } else {
      for (const span of childSpans.values()) {
        if (b.childIds.includes(span.childId)) breaks.push({ breakId: b.id, label: b.label, x, y: span.top, width: w, height: span.bottom - span.top });
      }
    }
  }

  const t = model.todayIndex;
  const todayX = t >= 0 && shown(t) ? (xs.isColumn(t) ? xs.start(t) + xs.columnWidth / 2 : xs.start(t)) : null;

  return {
    zoom: options.zoom,
    detail,
    spanWeeks: weeks,
    width,
    height: Math.max(lanesBottom, totalsY + TOTALS_HEIGHT_PX) + BOTTOM_PAD_PX,
    pxPerPoint,
    plot: { x: plotX, width: plotWidth, columnWidth: xs.columnWidth, columns: xs.columns, first, last },
    rows,
    labels,
    bands,
    names,
    breaks,
    events,
    ticks,
    todayX,
    totals,
    lanesTop,
    lanesBottom,
  };
}
