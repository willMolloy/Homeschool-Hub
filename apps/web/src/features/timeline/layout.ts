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
import { bandPath, rectsPath, type BandColumn } from "./paths";
import { packRows } from "./rows";
import { makeXScale, type XScale } from "./xscale";
import { resolveDetail, zoomRange, type Detail, type Zoom } from "./zoom";

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
/** A month label is shown only when its slot is at least this wide. */
export const MIN_TICK_LABEL_PX = 24;
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
  /** Pixels per thickness point; defaults to the shared scale (`PX_PER_THICKNESS`). */
  pxPerPoint?: number;
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
  detail: "daily" | "weekly";
  width: number;
  height: number;
  pxPerPoint: number;
  plot: { x: number; width: number; columnWidth: number; columns: number; first: number; last: number };
  rows: LaneRow[];
  labels: LaneLabel[];
  bands: LaneBand[];
  breaks: BreakRect[];
  events: EventStrip[];
  ticks: Tick[];
  /** Centre of today's column, or its boundary on a day off; null when today isn't shown. */
  todayX: number | null;
  totals: { y: number; height: number; cy: number; d: string };
  /** Top and bottom of the lane area (breaks span it). */
  lanesTop: number;
  lanesBottom: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_OF_START = { mon: 1, sun: 0 } as const;

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
  const detail = resolveDetail(options.zoom, options.detail);
  const width = Math.max(0, options.width);
  const plotX = Math.min(SIDE_PAD_PX, width / 2);
  const plotWidth = Math.max(0, width - 2 * SIDE_PAD_PX);
  const [first, last] = zoomRange(model, options.zoom) ?? [0, -1];
  const xs = makeXScale(model, first, last, plotX, plotWidth);
  const shown = (i: number) => i >= first && i <= last;

  // Ticks: a line at each month start (labels where they fit); week lines too at Fall and Spring.
  const ticks: Tick[] = [];
  const monthStarts: number[] = [];
  for (let i = first; i <= last; i++) if (i === first || model.dates[i]!.endsWith("-01")) monthStarts.push(i);
  monthStarts.forEach((i, k) => {
    const x = xs.start(i);
    const next = k + 1 < monthStarts.length ? xs.start(monthStarts[k + 1]!) : xs.x + xs.width;
    ticks.push({ index: i, x, kind: "month", label: next - x >= MIN_TICK_LABEL_PX ? MONTHS[Number(model.dates[i]!.slice(5, 7)) - 1]! : null });
  });
  if (options.zoom !== "year") {
    const startDay = WEEKDAY_OF_START[model.weekStart];
    const months = new Set(monthStarts);
    for (let i = first; i <= last; i++) {
      if (weekdayOf(model.dates[i]!) === startDay && !months.has(i)) ticks.push({ index: i, x: xs.start(i), kind: "week", label: null });
    }
    ticks.sort((a, b) => a.x - b.x || a.index - b.index);
  }

  // Event strips, one row each, under the axis.
  const events: EventStrip[] = model.events.map((e, row) => {
    const y = AXIS_HEIGHT_PX + row * (EVENT_ROW_PX + EVENT_ROW_GAP_PX);
    const spans = e.days.filter((i) => xs.isColumn(i)).map((i) => ({ x: xs.start(i), width: xs.columnWidth }));
    return { eventId: e.id, name: e.name, y, height: EVENT_ROW_PX, spans, d: rectsPath(spans.map((s) => ({ x: s.x, y, w: s.width, h: EVENT_ROW_PX }))) };
  });
  const lanesTop = AXIS_HEIGHT_PX + model.events.length * (EVENT_ROW_PX + EVENT_ROW_GAP_PX) + (model.events.length ? LANE_GAP_PX : 0);

  // Labels, rows and their bands. A child's name is only needed when there is more than one child.
  const manyChildren = new Set(model.lanes.flatMap((l) => l.children.map((c) => c.childId))).size > 1;
  const rows: LaneRow[] = [];
  const labels: LaneLabel[] = [];
  const bands: LaneBand[] = [];
  const childSpans = new Map<string, { childId: string; top: number; bottom: number }>();
  let y = lanesTop;
  model.lanes.forEach((subject, s) => {
    if (s > 0) y += SUBJECT_GAP_PX;
    subject.children.forEach((child, c) => {
      if (c > 0) y += LANE_GAP_PX;
      const text = c === 0 ? (manyChildren ? `${subject.name} · ${child.childName}` : subject.name) : child.childName;
      labels.push({ laneKey: child.key, text, x: plotX, y, height: LABEL_ROW_PX });
      y += LABEL_ROW_PX;
      const top = y;
      packRows(child.assignments).forEach((members, r) => {
        if (r > 0) y += LANE_GAP_PX;
        const height = rowHeight(members, pxPerPoint);
        const cy = y + height / 2;
        const key = `${child.key}#${r}`;
        rows.push({
          key, laneKey: child.key, row: r, subjectId: subject.subjectId, subjectName: subject.name, childId: child.childId,
          childName: child.childName, paletteSlot: subject.paletteSlot, step: child.step, y, height, cy,
        });
        for (const a of members) {
          const columns = bandColumns(detail === "weekly" ? a.weekly : a.daily, xs, cy, pxPerPoint);
          bands.push({
            rowKey: key, laneKey: child.key, assignmentId: a.assignmentId, childId: a.childId, title: a.title,
            paletteSlot: subject.paletteSlot, step: child.step, d: bandPath(columns), runs: runsOf(columns), cy,
          });
        }
        y += height;
      });
      childSpans.set(child.key, { childId: child.childId, top, bottom: y });
    });
  });
  const lanesBottom = y;

  // The total-load strip, on its own scale so the busiest day fills it.
  const totalsY = lanesBottom + (rows.length ? SUBJECT_GAP_PX : 0);
  const peak = Math.max(0, ...model.totals.daily, ...model.totals.weekly);
  const totalsScale = peak > 0 ? TOTALS_HEIGHT_PX / peak : 0;
  const totalsCy = totalsY + TOTALS_HEIGHT_PX / 2;
  const totalsSeries = detail === "weekly" ? model.totals.weekly : model.totals.daily;
  const totals = {
    y: totalsY,
    height: TOTALS_HEIGHT_PX,
    cy: totalsCy,
    d: totalsScale > 0 ? bandPath(bandColumns(totalsSeries, xs, totalsCy, totalsScale)) : "",
  };

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
      breaks.push({ breakId: b.id, label: b.label, x, y: lanesTop, width: w, height: totalsY + TOTALS_HEIGHT_PX - lanesTop });
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
    width,
    height: totalsY + TOTALS_HEIGHT_PX + BOTTOM_PAD_PX,
    pxPerPoint,
    plot: { x: plotX, width: plotWidth, columnWidth: xs.columnWidth, columns: xs.columns, first, last },
    rows,
    labels,
    bands,
    breaks,
    events,
    ticks,
    todayX,
    totals,
    lanesTop,
    lanesBottom,
  };
}
