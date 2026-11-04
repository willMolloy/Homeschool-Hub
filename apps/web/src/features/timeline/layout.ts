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
import type { BuiltInZoomOverrides, CustomZoomView } from "../../api/types";
import type { ChildStep, SubjectLane, TimelineAssignment, TimelineModel } from "./model";
import { barTitle, estimateTextWidth, placePieceNames, type MeasureText } from "./names";
import { connectorsOf, insetEnds, piecesOf } from "./pieces";
import { bandPath, rectsPath, smoothBandPath, type BandColumn } from "./paths";
import { drawnExtent, packRows } from "./rows";
import { sumSeries } from "./grid";
import { bridgeBreaks, smoothSeries } from "./smooth";
import { makeXScale, type XScale } from "./xscale";
import { resolveDetail, spanWeeks, zoomRange, type Detail, type DrawnDetail, type Zoom } from "./zoom";

/**
 * Horizontal room (DeeDee): no label column. Lane labels sit on their own short line above the lane, so
 * the plot runs edge to edge apart from this small side padding (the renderer draws it full-bleed on
 * phones, with nothing beside it).
 */
export const SIDE_PAD_PX = 4;
/** Month ticks along the top. S10-03: the phone axis (months on line 1, the Today pill on line 2); see `metrics.axis`. */
export const AXIS_HEIGHT_PX = 42;
/** A month label is shown only when its slot is at least this wide. T-05c: on phones, labels also keep this far apart. */
export const MIN_TICK_LABEL_PX = 24;
export const PHONE_MIN_TICK_LABEL_PX = 48;
/**
 * S7-19: how far a week's day label must be from a month label, in px of axis. A month label ("Dec", 11 px text) starts
 * 3 px right of its tick and is about 23 px wide, so a day label just after it needs `MONTH_LABEL_CLEAR_PX`; one just
 * before it ("30" is about 12 px wide, 3 px right of its tick) needs `DAY_LABEL_CLEAR_PX`.
 */
export const MONTH_LABEL_CLEAR_PX = 28;
export const DAY_LABEL_CLEAR_PX = 16;
/** Layout widths under this are phones (matches the app's 640 px breakpoint). */
export const PHONE_WIDTH_PX = 640;
/** One strip row per recurring event, above the lanes. */
export const EVENT_ROW_PX = 6;
export const EVENT_ROW_GAP_PX = 2;
/** The gap under the event strips. (S10-02: lanes now use the pitch in TimelineMetrics.) */
export const LANE_GAP_PX = 2;
/** An empty row's height (S10-04: drawn bars are at least BAR_H_MIN). */
export const MIN_BAND_PX = 2;
export const BOTTOM_PAD_PX = 8;

/**
 * S10-04 (DeeDee, 2026-11-03; percentile reviewed 2026-11-04): bar heights always follow effort, at every zoom,
 * between a named minimum and maximum, scaled to the loads in the current view. Tunable on real data (see
 * `parseBarsOverride` for the dev-only `?debug=1&bars=min,max,curve`).
 */
export const BAR_H_MIN = { phone: 8, desktop: 8 } as const;
export const BAR_H_MAX = { phone: 28, desktop: 32 } as const;
/** The curve's bend: 0 is a straight line; higher lifts light loads more. */
export const BAR_CURVE = 1.5;
/** A lane's extra rows (overlapping work) are this much of the first row's maximum, so the first row leads. */
export const EXTRA_ROW_FACTOR = 0.8;
export const RIBBON_H_MIN = { phone: 4, desktop: 5 } as const;
export const RIBBON_H_MAX = { phone: 12, desktop: 14 } as const;
/** The view's maximum is this percentile of its bar loads, so one unusually heavy week doesn't flatten the rest. */
export const VIEW_MAX_PERCENTILE = 0.95;
/** The space between the tallest bar and the lane's edges: the pitch is BAR_H_MAX plus this. */
export const LANE_PITCH_GAP_PX = 8;
/** Zoom smoothing (mockup): about 3 school weeks at Year, 1 at a term, none at month (daily detail). */
export const SMOOTH_YEAR_DAYS = 15;
export const SMOOTH_TERM_DAYS = 5;
/** Smooth spans longer than this many weeks smooth like Year; shorter ones like a term. */
export const YEAR_SMOOTH_FROM_WEEKS = 26;

/**
 * S10-02: the Year view's measurements, from the mockup (docs/design/year-polish-notes.md). Phones (under
 * PHONE_WIDTH_PX) and wider screens differ slightly. `barMin`/`barMax` bound a bar (S10-04);
 * `ribbonMin`/`ribbonMax` the load ribbon in a child's header row. The pitch is `barMax` + LANE_PITCH_GAP_PX.
 */
export interface TimelineMetrics {
  gutter: number; badge: number; header: number; pitch: number; sub: number; groupGap: number; pad: number;
  barMin: number; barMax: number; ribbonMin: number; ribbonMax: number; curve: number; font: number;
  /** S10-03: the sticky two-line axis (months, then the Today pill). */
  axis: number;
}
export const PHONE_METRICS: TimelineMetrics = {
  gutter: 36, badge: 24, header: 34, pitch: BAR_H_MAX.phone + LANE_PITCH_GAP_PX, sub: 28, groupGap: 10, pad: 8,
  barMin: BAR_H_MIN.phone, barMax: BAR_H_MAX.phone, ribbonMin: RIBBON_H_MIN.phone, ribbonMax: RIBBON_H_MAX.phone, curve: BAR_CURVE, font: 12, axis: AXIS_HEIGHT_PX,
};
export const DESKTOP_METRICS: TimelineMetrics = {
  gutter: 40, badge: 26, header: 36, pitch: BAR_H_MAX.desktop + LANE_PITCH_GAP_PX, sub: 30, groupGap: 12, pad: 10,
  barMin: BAR_H_MIN.desktop, barMax: BAR_H_MAX.desktop, ribbonMin: RIBBON_H_MIN.desktop, ribbonMax: RIBBON_H_MAX.desktop, curve: BAR_CURVE, font: 13, axis: 44,
};
/** S10-15: every lane badge takes taps through at least a 44 x 44 px zone, centred on the badge. */
export const BADGE_HIT_PX = 44;
/** S10-15: neighbouring zones can overlap (rows are 36/40 px apart); a tap goes to the badge whose centre is nearest. */
export const nearestBadge = <T extends { cy: number }>(badges: readonly T[], y: number): T | null =>
  badges.reduce<T | null>((best, b) => (best === null || Math.abs(b.cy - y) < Math.abs(best.cy - y) ? b : best), null);
/** S10-04: the dev-only bar tuning (`&bars=min,max,curve`); any part left out keeps its constant. */
export interface BarsOverride { min?: number; max?: number; curve?: number }
export function metricsFor(width: number, bars?: BarsOverride | null): TimelineMetrics {
  const base = width < PHONE_WIDTH_PX ? PHONE_METRICS : DESKTOP_METRICS;
  if (!bars) return base;
  const barMax = bars.max ?? base.barMax;
  const barMin = Math.min(bars.min ?? base.barMin, barMax);
  return {
    ...base, barMin, barMax, curve: bars.curve ?? base.curve, pitch: barMax + LANE_PITCH_GAP_PX,
    sub: Math.max(base.sub, Math.ceil(barMax * EXTRA_ROW_FACTOR) + LANE_PITCH_GAP_PX / 2),
  };
}
/** S10-02's name for EXTRA_ROW_FACTOR. */
export const SUB_ROW_SCALE = EXTRA_ROW_FACTOR;

/** S10-04: `bars=min,max,curve` from the URL (dev builds with ?debug=1 only; the caller checks). Bad parts are ignored. */
export function parseBarsOverride(value: string | null | undefined): BarsOverride | null {
  if (!value) return null;
  const [min, max, curve] = value.split(",").map((v) => (v.trim() === "" ? NaN : Number(v)));
  const ok = (v: number | undefined, lo: number, hi: number) => (v !== undefined && Number.isFinite(v) && v >= lo && v <= hi ? v : undefined);
  const out: BarsOverride = { min: ok(min, 1, 200), max: ok(max, 1, 200), curve: ok(curve, 0, 20) };
  return out.min === undefined && out.max === undefined && out.curve === undefined ? null : out;
}

/**
 * S10-04: a bar's height for a load. `r = min(load / viewMax, 1)`;
 * `h = min + (max − min) × (1 − e^(−curve·r)) / (1 − e^(−curve))`. A load of 0 draws nothing, any load above 0 at
 * least `min`, loads at or above `viewMax` exactly `max`; it rises smoothly in between (a straight line at curve 0).
 */
export function effortHeight(load: number, viewMax: number, min: number, max: number, curve = BAR_CURVE): number {
  if (!(load > 0) || !Number.isFinite(load)) return 0;
  const r = viewMax > 0 ? Math.min(load / viewMax, 1) : 1;
  const t = curve > 1e-6 ? (1 - Math.exp(-curve * r)) / (1 - Math.exp(-curve)) : r;
  return min + (max - min) * t;
}

/** S10-04: the p-th percentile (0..1) of `values`, linearly interpolated between ranks; 0 when there are none. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const at = Math.min(1, Math.max(0, p)) * (sorted.length - 1);
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (at - lo);
}

/** S10-04: the zoom smoothing window in school days: none at daily (month) detail, 1 week at a term, 3 at Year. */
export function smoothingWindowDays(detail: DrawnDetail, weeks: number): number {
  if (detail !== "smooth") return 0;
  return weeks > YEAR_SMOOTH_FROM_WEEKS ? SMOOTH_YEAR_DAYS : SMOOTH_TERM_DAYS;
}
/** S10-02 (Will, 2026-11-01): work shared by two or more children is drawn once, in this group at the top. */
export const TOGETHER_KEY = "together";
export const TOGETHER_LABEL = "Together";
/** S10-02: a Together bar names at most this many children by initial, then "+N". */
export const TOGETHER_MAX_INITIALS = 4;

export interface LayoutOptions {
  zoom: Zoom;
  /** S7-04: the family's own zoom views, for a custom `zoom`. */
  customViews?: readonly CustomZoomView[];
  /** S9-06: Fall and Spring renamed and re-dated. */
  viewOverrides?: BuiltInZoomOverrides;
  /** Available width in CSS px. */
  width: number;
  detail?: Detail;
  /** T-05c: the detail drawn before this layout, for the threshold's hysteresis. */
  previousDetail?: DrawnDetail;
  /** T-05c: the calendar month ("YYYY-MM") for the month zoom; defaults to the one holding today. */
  month?: string | null;
  /** S10-04: the dev-only bar tuning (parsed from `&bars=` with ?debug=1 in a dev build). */
  bars?: BarsOverride | null;
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
  /** S10-02: the group the row is in (a child's id, or TOGETHER_KEY). */
  groupKey: string;
  paletteSlot: number;
  step: ChildStep;
  y: number;
  height: number;
  /** The fixed centerline. */
  cy: number;
  /** T-11d/T-11e: space above `y` for names over thin bars. S10-04b: always 0 (outside names sit to the right). */
  labelLane: number;
}

/** S8-07: a lane's badge in the left gutter (replaces the name row above each lane). */
export interface LaneBadge {
  laneKey: string;
  subjectId: string;
  subjectName: string;
  childName: string;
  groupKey: string;
  /** What the badge says when tapped: the subject's name. */
  text: string;
  /** Its accessible name: the subject, with the group (child or Together) when the family has more than one child. */
  label: string;
  paletteSlot: number;
  step: ChildStep;
  /** Centre of the badge. */
  cx: number;
  cy: number;
  /** The lane's box, for the highlight. */
  top: number;
  bottom: number;
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
  /** T-11: the spans between this assignment's own pieces (split by a break), drawn as a faint centre line. */
  connectors: { x0: number; x1: number }[];
  /** S12-04: the parent said it ended: finished (calmer, a check after the name) or stopped (muted, "Stopped"). */
  ended?: "finished" | "stopped";
}

/** T-06: a name drawn inside its bar (T-11c: straight on the bar, no patch). */
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
  /** T-11: which piece of the bar (split by breaks) it names, from 0. */
  piece: number;
  /** S10-04b: written to the right of the piece, in muted page text, because the piece can't hold it in full. */
  outside: boolean;
  /** S12-04: on an ended bar (drawn in the lighter step, and muted when stopped). */
  ended?: "finished" | "stopped";
}

/** S10-02: a group of lanes: Together, or one child. Its header row holds the initial and the load ribbon. */
export interface LaneGroup {
  key: string;
  kind: "together" | "child";
  childId: string | null;
  name: string;
  /** The child's initial for the gutter ("" for Together). */
  initial: string;
  top: number;
  bottom: number;
  /** The header row; `ribbon` is a path in the header's own coordinates (y from 0 to height), x as the plot. */
  header: { y: number; height: number; cy: number; ribbon: string };
}

/** S10-02: hairlines between lanes (from the gutter's edge) and between groups (full width). */
export interface Rule { kind: "lane" | "group"; x0: number; y: number }

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
  /** S10-04: the load drawn at the maximum height (the 95th percentile of the view's bar loads). */
  viewMax: number;
  plot: { x: number; width: number; columnWidth: number; columns: number; first: number; last: number };
  rows: LaneRow[];
  badges: LaneBadge[];
  bands: LaneBand[];
  /** T-06: names that fit inside their bars (at most one per bar). */
  names: BarName[];
  breaks: BreakRect[];
  events: EventStrip[];
  ticks: Tick[];
  /** Centre of today's column, or its boundary on a day off; null when today isn't shown. */
  todayX: number | null;
  /** Where the dashed Today line starts: the foot of the sticky axis (S10-03; the pill is in the axis). */
  todayTop: number;
  /** S10-02: the measurements used (phone or desktop). */
  metrics: TimelineMetrics;
  /** S10-02: Together first (All children only), then each child, in order. */
  groups: LaneGroup[];
  rules: Rule[];
  /** Top and bottom of the lane area (breaks span it). */
  lanesTop: number;
  lanesBottom: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_OF_START = { mon: 1, sun: 0 } as const;

/** S10-02: a name's initial, upper-case ("" for a blank name). */
export const initialOf = (name: string): string => (name.trim()[0] ?? "").toUpperCase();

/** S10-02: the initials a Together bar carries: up to TOGETHER_MAX_INITIALS, then "+N". */
export function togetherInitials(initials: readonly string[]): string {
  const shown = initials.slice(0, TOGETHER_MAX_INITIALS).join(" ");
  return initials.length > TOGETHER_MAX_INITIALS ? `${shown} +${initials.length - TOGETHER_MAX_INITIALS}` : shown;
}

/** S10-02: the assignments that two or more children share (each child has its own plan for them). */
export function sharedAssignmentIds(model: Pick<TimelineModel, "lanes">): Set<string> {
  const seen = new Map<string, Set<string>>();
  for (const l of model.lanes) for (const c of l.children) for (const a of c.assignments) {
    const kids = seen.get(a.assignmentId) ?? new Set<string>();
    kids.add(c.childId);
    seen.set(a.assignmentId, kids);
  }
  return new Set([...seen].filter(([, kids]) => kids.size > 1).map(([id]) => id));
}

/**
 * S10-02: a subject's shared assignments, one each, for the Together group. The bar is titled with the children's
 * initials ("History spine · F M"); its thickness is the largest of the children's plans on each day, so it covers
 * every child's days (they differ only where one child has a day off).
 */
export function togetherAssignments(lane: SubjectLane, sharedIds: ReadonlySet<string>, initials: ReadonlyMap<string, string>): TimelineAssignment[] {
  const byId = new Map<string, TimelineAssignment[]>();
  for (const c of lane.children) for (const a of c.assignments) {
    if (sharedIds.has(a.assignmentId)) byId.set(a.assignmentId, [...(byId.get(a.assignmentId) ?? []), a]);
  }
  const maxOf = (series: readonly (readonly number[])[]) => series[0]!.map((_, i) => Math.max(...series.map((s) => s[i] ?? 0)));
  return [...byId.values()].map((copies) => {
    const a = copies[0]!;
    const daily = maxOf(copies.map((c) => c.daily));
    const firsts = copies.map((c) => c.first).filter((f) => f >= 0);
    return {
      ...a,
      title: `${a.title} · ${togetherInitials(copies.map((c) => initials.get(c.childId) ?? initialOf("")).filter(Boolean))}`,
      daily,
      weekly: maxOf(copies.map((c) => c.weekly)),
      first: firsts.length ? Math.min(...firsts) : -1,
      last: Math.max(...copies.map((c) => c.last)),
    };
  }).sort((a, b) => (a.first < 0 ? Infinity : a.first) - (b.first < 0 ? Infinity : b.first) || a.title.localeCompare(b.title));
}

/** A height function: load → px (0 draws nothing). */
export type HeightOf = (load: number) => number;

/** A band's columns over the shown range, centred on cy (null where it is zero). */
export function bandColumns(series: readonly number[], xs: XScale, cy: number, heightOf: HeightOf): (BandColumn | null)[] {
  const out: (BandColumn | null)[] = [];
  for (let i = xs.first; i <= xs.last; i++) {
    if (!xs.isColumn(i)) continue;
    const h = heightOf(series[i] ?? 0);
    out.push(h > 0 ? { x0: xs.start(i), x1: xs.end(i), top: cy - h / 2, bottom: cy + h / 2 } : null);
  }
  return out;
}

/** T-05c: the smooth look ignores thickness changes smaller than this, so the curve has no tiny jogs. */
export const SMOOTH_DEADBAND_PX = 3;

/**
 * T-05c: columns for the smooth (zoomed-out) look. The series is already smoothed for the zoom (S10-04); a height is
 * held through changes under SMOOTH_DEADBAND_PX, so a lumpy day-to-day plan has no tiny jogs, and the curve eases
 * between held heights, so it never steps. (S10-04: no rounding, so a bar stays within BAR_H_MIN..BAR_H_MAX.)
 */
export function smoothColumns(series: readonly number[], xs: XScale, cy: number, heightOf: HeightOf): (BandColumn | null)[] {
  const out: (BandColumn | null)[] = [];
  let held = 0;
  for (let i = xs.first; i <= xs.last; i++) {
    if (!xs.isColumn(i)) continue;
    const raw = heightOf(series[i] ?? 0);
    if (raw <= 0) held = 0;
    else if (held === 0 || Math.abs(raw - held) >= SMOOTH_DEADBAND_PX) held = raw;
    out.push(held > 0 ? { x0: xs.start(i), x1: xs.end(i), top: cy - held / 2, bottom: cy + held / 2 } : null);
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
  const range = zoomRange(model, options.zoom, options.month, options.customViews, options.viewOverrides);
  const weeks = spanWeeks(model, range);
  const detail = resolveDetail(weeks, options.detail, options.previousDetail);
  const width = Math.max(0, options.width);
  // S10-02 (mockup): the plot starts just past the badge gutter and ends a small pad short of the edge.
  const m = metricsFor(width, options.bars);
  const plotX = Math.min(m.gutter + SIDE_PAD_PX, width / 2);
  const plotWidth = Math.max(0, width - plotX - m.pad);
  const plotRight = plotX + plotWidth;
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
    // S7-19: a day label that would touch a month label is dropped (its tick line stays).
    const labelled = ticks.filter((t) => t.kind === "month" && t.label);
    for (const t of ticks) {
      if (t.kind !== "week" || !t.label) continue;
      if (labelled.some((m) => (t.x >= m.x ? t.x - m.x < MONTH_LABEL_CLEAR_PX : m.x - t.x < DAY_LABEL_CLEAR_PX))) t.label = null;
    }
  }

  // Event strips, one row each, under the axis. T-05c: only with daily detail; zoomed out they are noise.
  const shownEvents = detail === "smooth" ? [] : model.events;
  const events: EventStrip[] = shownEvents.map((e, row) => {
    const y = m.axis + row * (EVENT_ROW_PX + EVENT_ROW_GAP_PX);
    const spans = e.days.filter((i) => xs.isColumn(i)).map((i) => ({ x: xs.start(i), width: xs.columnWidth }));
    return { eventId: e.id, name: e.name, y, height: EVENT_ROW_PX, spans, d: rectsPath(spans.map((s) => ({ x: s.x, y, w: s.width, h: EVENT_ROW_PX }))) };
  });
  const eventsBottom = m.axis + shownEvents.length * (EVENT_ROW_PX + EVENT_ROW_GAP_PX) + (shownEvents.length ? LANE_GAP_PX : 0);

  // T-05c: which series and outline a band uses at this detail. S10-04: the zoom's smoothing (3 school weeks at
  // Year, 1 at a term, none at month) is a moving average over each assignment's own school days.
  const schoolColumns = model.dates.map((_, i) => i).filter((i) => model.schoolDay[i]);
  const window = smoothingWindowDays(detail, weeks);
  const smoothed = new Map<TimelineAssignment, number[]>();
  const seriesFor = (a: TimelineAssignment) => {
    if (detail === "weekly") return a.weekly;
    if (window === 0) return a.daily;
    let c = smoothed.get(a);
    if (!c) smoothed.set(a, (c = smoothSeries(a.daily, schoolColumns, window)));
    return c;
  };
  const columnsFor = (series: readonly number[], cy: number, heightOf: HeightOf) =>
    detail === "smooth" ? smoothColumns(series, xs, cy, heightOf) : bandColumns(series, xs, cy, heightOf);
  const pathFor = detail === "smooth" ? smoothBandPath : bandPath;
  // S10-05: a bar runs straight through the breaks that close its child's school days (family-wide or the child's own).
  const throughBreaks = (a: TimelineAssignment) => {
    const own = model.breaks.filter((b) => b.childIds.length === 0 || b.childIds.includes(a.childId));
    if (own.length === 0) return seriesFor(a);
    return bridgeBreaks(seriesFor(a), model.schoolDay, (i) => own.some((b) => i >= b.first && i <= b.last), (i) => a.idle?.[i] === true);
  };

  // S10-02: lanes grouped by child. Under All children, work shared by two or more children is drawn once, in a
  // Together group at the top; each child's group holds that child's own work, one lane per subject. Every group
  // starts with a header row: the child's initial in the gutter and their load ribbon (shared work included).
  const groupsTop = eventsBottom;
  const measure = options.measureText ?? estimateTextWidth;
  const inMonth = (a: TimelineAssignment) => {
    const span = drawnExtent(a);
    return span !== null && span[0] <= last && span[1] >= first;
  };
  // T-07f: This month leaves out rows, lanes and groups with nothing in the month. Rows are packed from every
  // assignment first, so a bar keeps its row across zooms.
  const rowsOf = (assignments: readonly TimelineAssignment[]) =>
    options.zoom === "month" ? packRows(assignments).map((r) => r.filter(inMonth)).filter((r) => r.length > 0) : packRows(assignments);
  const children = model.children ?? [...new Map(model.lanes.flatMap((l) => l.children.map((c) => [c.childId, { childId: c.childId, name: c.childName }] as const))).values()];
  const sharedIds = children.length > 1 ? sharedAssignmentIds(model) : new Set<string>();
  const initials = new Map(children.map((c) => [c.childId, initialOf(c.name)]));

  type LaneSource = { subjectId: string; subjectName: string; paletteSlot: number; laneKey: string; assignments: TimelineAssignment[] };
  type GroupSource = { key: string; kind: "together" | "child"; childId: string | null; name: string; lanes: LaneSource[]; ribbon: number[] | null };
  const sources: GroupSource[] = [];
  if (sharedIds.size > 0) {
    sources.push({
      key: TOGETHER_KEY, kind: "together", childId: null, name: TOGETHER_LABEL, ribbon: null,
      lanes: model.lanes.map((l) => ({
        subjectId: l.subjectId, subjectName: l.name, paletteSlot: l.paletteSlot, laneKey: `${l.subjectId}:${TOGETHER_KEY}`,
        assignments: togetherAssignments(l, sharedIds, initials),
      })),
    });
  }
  for (const c of children) {
    sources.push({
      key: c.childId, kind: "child", childId: c.childId, name: c.name, ribbon: null,
      lanes: model.lanes.flatMap((l) => l.children.filter((cl) => cl.childId === c.childId).map((cl) => ({
        subjectId: l.subjectId, subjectName: l.name, paletteSlot: l.paletteSlot, laneKey: cl.key,
        assignments: cl.assignments.filter((a) => !sharedIds.has(a.assignmentId)),
      }))),
    });
  }

  // S10-04: the view's scale. viewMax is the 95th percentile of the bar loads in the view: every drawn bar's
  // (smoothed) load on each school day where it is above 0, over the whole school year so scrolling never rescales.
  // One child: that child's bars; All children: every child's, with Together bars counted once (as drawn).
  const positives = (series: readonly number[]) => schoolColumns.map((i) => series[i] ?? 0).filter((v) => v > 0);
  const viewMax = percentile(sources.flatMap((g) => g.lanes.flatMap((l) => l.assignments.flatMap((a) => positives(seriesFor(a))))), VIEW_MAX_PERCENTILE);
  const barHeightOf = (rowMax: number): HeightOf => (load) => effortHeight(load, viewMax, Math.min(m.barMin, rowMax), rowMax, m.curve);

  // The ribbons: each child's whole load (shared work included), all on one scale: the child's total for the day
  // against the 95th percentile of child-day totals in the view, clamped (S10-04).
  const ribbonSeries = new Map<string, number[]>();
  for (const c of children) {
    const own = model.lanes.flatMap((l) => l.children.filter((cl) => cl.childId === c.childId).flatMap((cl) => cl.assignments));
    ribbonSeries.set(c.childId, sumSeries(own.map(seriesFor), model.dates.length));
  }
  const ribbonMax = percentile([...ribbonSeries.values()].flatMap(positives), VIEW_MAX_PERCENTILE);
  const ribbonHeightOf: HeightOf = (load) => effortHeight(load, ribbonMax, m.ribbonMin, m.ribbonMax, m.curve);

  const rows: LaneRow[] = [];
  const badges: LaneBadge[] = [];
  const bands: LaneBand[] = [];
  const names: BarName[] = [];
  const groups: LaneGroup[] = [];
  const rules: Rule[] = [];
  // A row's height: its tallest drawn point over the year (at least the 2 px of an empty row).
  const rowHeight = (members: readonly TimelineAssignment[], heightOf: HeightOf) =>
    Math.max(MIN_BAND_PX, ...members.flatMap((a) => positives(seriesFor(a)).map(heightOf)));
  let y = groupsTop;
  for (const g of sources) {
    const lanes = g.lanes.map((l) => ({ ...l, packed: rowsOf(l.assignments).filter((r) => r.length > 0) })).filter((l) => l.packed.length > 0);
    const ribbon = g.childId === null ? null : ribbonSeries.get(g.childId) ?? null;
    const hasRibbon = ribbon !== null && ribbon.slice(first, last + 1).some((v) => v > 0);
    if (lanes.length === 0 && !hasRibbon) continue;
    if (groups.length > 0) {
      y += m.groupGap;
      rules.push({ kind: "group", x0: 0, y: y - m.groupGap / 2 });
    }
    const top = y;
    const headerCy = m.header / 2;
    const ribbonD = ribbon && ribbonMax > 0 ? pathFor(columnsFor(ribbon, headerCy, ribbonHeightOf)) : "";
    y += m.header;
    const groupBadges: LaneBadge[] = [];
    for (const lane of lanes) {
      rules.push({ kind: "lane", x0: m.gutter, y });
      const laneTop = y;
      lane.packed.forEach((members, r) => {
        // S10-02 (mockup): the first row is centred in the lane's pitch; overlapping work stacks below in thinner sub-rows.
        // S10-04: extra rows use the same curve, topping out at EXTRA_ROW_FACTOR of the maximum (minimum still BAR_H_MIN).
        const heightOf = barHeightOf(r === 0 ? m.barMax : Math.max(m.barMin, m.barMax * EXTRA_ROW_FACTOR));
        const cy = r === 0 ? laneTop + m.pitch / 2 : laneTop + m.pitch + (r - 0.5) * m.sub;
        const height = rowHeight(members, heightOf);
        const key = `${lane.laneKey}#${r}`;
        rows.push({
          key, laneKey: lane.laneKey, row: r, subjectId: lane.subjectId, subjectName: lane.subjectName, childId: g.childId ?? "",
          childName: g.name, groupKey: g.key, paletteSlot: lane.paletteSlot, step: "base", y: cy - height / 2, height, cy, labelLane: 0,
        });
        // T-11: the outer ends pulled in, so neighbouring assignments never touch.
        const drawnPieces = members.map((a) => {
          const columns = insetEnds(columnsFor(throughBreaks(a), cy, heightOf));
          return { a, columns, pieces: piecesOf(columns) };
        });
        // S10-04b: where each piece's row stops being free on the right: the next piece in the row, or the plot's edge.
        const starts = drawnPieces.flatMap((d) => d.pieces.map((p) => p[0]!.x0)).sort((x, z) => x - z);
        const freeTo = (end: number) => starts.find((x) => x > end + 0.01) ?? plotRight;
        for (const { a, columns, pieces } of drawnPieces) {
          bands.push({
            rowKey: key, laneKey: lane.laneKey, assignmentId: a.assignmentId, childId: a.childId, title: a.title,
            paletteSlot: lane.paletteSlot, step: "base", d: pathFor(columns), runs: runsOf(columns), cy,
            connectors: connectorsOf(pieces), ...(a.endedAs ? { ended: a.endedAs } : {}),
          });
          const limits = pieces.map((p) => freeTo(p[p.length - 1]!.x1));
          for (const name of placePieceNames(barTitle(a.title, a.endedAs), pieces, cy, detail === "smooth", measure, limits, a.endedAs === "stopped" ? { left: plotX, right: plotRight } : undefined)) {
            names.push({ rowKey: key, assignmentId: a.assignmentId, paletteSlot: lane.paletteSlot, step: "base", ...(a.endedAs ? { ended: a.endedAs } : {}), ...name });
          }
        }
      });
      y = laneTop + m.pitch + (lane.packed.length - 1) * m.sub;
      // S10-02: the badge is pinned to the centre of the lane's first row, however many rows the lane has.
      groupBadges.push({
        laneKey: lane.laneKey, subjectId: lane.subjectId, subjectName: lane.subjectName, childName: g.name, groupKey: g.key,
        text: lane.subjectName, label: children.length > 1 ? `${lane.subjectName} · ${g.name}` : lane.subjectName,
        paletteSlot: lane.paletteSlot, step: "base", cx: m.gutter / 2, cy: laneTop + m.pitch / 2, top: laneTop, bottom: y,
      });
    }
    badges.push(...groupBadges);
    groups.push({
      key: g.key, kind: g.kind, childId: g.childId, name: g.name, initial: g.kind === "together" ? "" : initialOf(g.name),
      top, bottom: y, header: { y: top, height: m.header, cy: top + headerCy, ribbon: ribbonD },
    });
  }
  const lanesTop = groupsTop;
  // S6b-09: with nothing planned there is still a strip, so the calendar's days off and today show.
  const lanesBottom = groups.length === 0 ? y + m.pitch : y;

  // Breaks: family-wide ones span every group; per-child ones only that child's group (its header included).
  const breaks: BreakRect[] = [];
  for (const b of model.breaks) {
    const from = Math.max(b.first, first);
    const to = Math.min(b.last, last);
    if (from > to) continue;
    const x = xs.start(from);
    const w = xs.end(to) - x;
    if (w <= 0) continue;
    if (b.childIds.length === 0 || groups.length === 0) {
      breaks.push({ breakId: b.id, label: b.label, x, y: lanesTop, width: w, height: lanesBottom - lanesTop });
    } else {
      for (const g of groups) {
        if (g.childId !== null && b.childIds.includes(g.childId)) breaks.push({ breakId: b.id, label: b.label, x, y: g.top, width: w, height: g.bottom - g.top });
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
    height: lanesBottom + BOTTOM_PAD_PX,
    metrics: m,
    viewMax,
    plot: { x: plotX, width: plotWidth, columnWidth: xs.columnWidth, columns: xs.columns, first, last },
    rows,
    badges,
    bands,
    names,
    breaks,
    events,
    ticks,
    todayX,
    todayTop: m.axis,
    groups,
    rules,
    lanesTop,
    lanesBottom,
  };
}
