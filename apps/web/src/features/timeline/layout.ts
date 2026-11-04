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
import { PX_PER_THICKNESS, softCapPx } from "../plan/scale";
import type { ChildStep, SubjectLane, TimelineAssignment, TimelineModel } from "./model";
import { estimateTextWidth, placePieceNames, type MeasureText } from "./names";
import { connectorsOf, insetEnds, piecesOf } from "./pieces";
import { bandPath, rectsPath, smoothBandPath, type BandColumn } from "./paths";
import { drawnExtent, packRows } from "./rows";
import { sumSeries } from "./grid";
import { calmSeries, limitSlope } from "./smooth";
import { makeXScale, type XScale } from "./xscale";
import { resolveDetail, spanWeeks, zoomRange, type Detail, type DrawnDetail, type Zoom } from "./zoom";

/**
 * Horizontal room (DeeDee): no label column. Lane labels sit on their own short line above the lane, so
 * the plot runs edge to edge apart from this small side padding (the renderer draws it full-bleed on
 * phones, with nothing beside it).
 */
export const SIDE_PAD_PX = 4;
/** Month ticks along the top. */
export const AXIS_HEIGHT_PX = 20;
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
/** Any band with thickness is drawn at least this thick (agreed 2 px floor); an empty row is this tall too. */
export const MIN_BAND_PX = 2;
export const BOTTOM_PAD_PX = 8;

/**
 * S10-02: the Year view's measurements, from the mockup (docs/design/year-polish-notes.md). Phones (under
 * PHONE_WIDTH_PX) and wider screens differ slightly. `barMax` is the tallest bar (S10-04 tunes the heights);
 * `ribbonMax` the tallest load ribbon in a child's header row.
 */
export interface TimelineMetrics {
  gutter: number; badge: number; header: number; pitch: number; sub: number; groupGap: number; pad: number;
  barMax: number; ribbonMax: number; font: number;
}
export const PHONE_METRICS: TimelineMetrics = { gutter: 36, badge: 24, header: 34, pitch: 36, sub: 28, groupGap: 10, pad: 8, barMax: 28, ribbonMax: 12, font: 12 };
export const DESKTOP_METRICS: TimelineMetrics = { gutter: 40, badge: 26, header: 36, pitch: 40, sub: 30, groupGap: 12, pad: 10, barMax: 32, ribbonMax: 14, font: 13 };
export const metricsFor = (width: number): TimelineMetrics => (width < PHONE_WIDTH_PX ? PHONE_METRICS : DESKTOP_METRICS);
/** S10-02: a lane's extra rows are a touch thinner, so its first row leads (mockup: 0.8). */
export const SUB_ROW_SCALE = 0.8;
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
  /** S10-02: the group the row is in (a child's id, or TOGETHER_KEY). */
  groupKey: string;
  paletteSlot: number;
  step: ChildStep;
  y: number;
  height: number;
  /** The fixed centerline. */
  cy: number;
  /** T-11d/T-11e: extra space just above `y` for names outside thin bars: only what they need, else 0. */
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
  /** T-11d: written in the label lane above the row, in page text, because the piece is too thin to hold it. */
  outside: boolean;
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
  pxPerPoint: number;
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
  /** Where the Today line starts: just under the axis (S8-07: lanes have no name rows any more). */
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

/**
 * Drawn height of one value: nothing at zero, otherwise at least the 2 px floor. S6b-06: soft-capped, so no bar
 * passes `MAX_BAR_PX` and a heavier day still looks heavier (the All subjects strip stays under the knee).
 */
export const bandHeight = (value: number, pxPerPoint: number): number => (value > 0 ? Math.max(softCapPx(value * pxPerPoint), MIN_BAND_PX) : 0);

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
function bandColumns(series: readonly number[], xs: XScale, cy: number, pxPerPoint: number, maxPx = Infinity): (BandColumn | null)[] {
  const out: (BandColumn | null)[] = [];
  for (let i = xs.first; i <= xs.last; i++) {
    if (!xs.isColumn(i)) continue;
    const h = Math.min(maxPx, bandHeight(series[i] ?? 0, pxPerPoint));
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
  // S7-21: the heights first, then their change from column to column is limited (a gentle slope per week).
  const at: number[] = [];
  for (let i = xs.first; i <= xs.last; i++) if (xs.isColumn(i)) at.push(i);
  const heights = limitSlope(at.map((i) => softCapPx((series[i] ?? 0) * pxPerPoint)), at.map((i, k) => (k === 0 ? 1 : i - at[k - 1]!)));
  for (const [k, i] of at.entries()) {
    const raw = heights[k]!;
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
  const range = zoomRange(model, options.zoom, options.month, options.customViews, options.viewOverrides);
  const weeks = spanWeeks(model, range);
  const detail = resolveDetail(weeks, options.detail, options.previousDetail);
  const width = Math.max(0, options.width);
  // S10-02 (mockup): the plot starts just past the badge gutter and ends a small pad short of the edge.
  const m = metricsFor(width);
  const plotX = Math.min(m.gutter + SIDE_PAD_PX, width / 2);
  const plotWidth = Math.max(0, width - plotX - m.pad);
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
    const y = AXIS_HEIGHT_PX + row * (EVENT_ROW_PX + EVENT_ROW_GAP_PX);
    const spans = e.days.filter((i) => xs.isColumn(i)).map((i) => ({ x: xs.start(i), width: xs.columnWidth }));
    return { eventId: e.id, name: e.name, y, height: EVENT_ROW_PX, spans, d: rectsPath(spans.map((s) => ({ x: s.x, y, w: s.width, h: EVENT_ROW_PX }))) };
  });
  const eventsBottom = AXIS_HEIGHT_PX + shownEvents.length * (EVENT_ROW_PX + EVENT_ROW_GAP_PX) + (shownEvents.length ? LANE_GAP_PX : 0);

  // T-05c: which series and outline a band uses at this detail.
  const schoolColumns = model.dates.map((_, i) => i).filter((i) => model.schoolDay[i]);
  // T-08b: zoomed out, an assignment is its clean shape (no lumps); S10-02: the ribbons smooth the sum of those shapes.
  // S7-21: that shape is now a four-week moving average (`calmSeries`) with the slope limited in `smoothColumns`.
  const clean = new Map<TimelineAssignment, number[]>();
  const cleanOf = (a: TimelineAssignment) => {
    let c = clean.get(a);
    if (!c) clean.set(a, (c = calmSeries(a.daily, schoolColumns)));
    return c;
  };
  const seriesFor = (a: TimelineAssignment) => (detail === "smooth" ? cleanOf(a) : detail === "weekly" ? a.weekly : a.daily);
  const columnsFor = (series: readonly number[], cy: number, scale: number, maxPx: number) =>
    detail === "smooth" ? smoothColumns(series, xs, cy, scale, maxPx) : bandColumns(series, xs, cy, scale, maxPx);
  const pathFor = detail === "smooth" ? smoothBandPath : bandPath;

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

  // The ribbons: each child's whole load (shared work included), all on one scale, so the busiest child's
  // heaviest point is the tallest ribbon in this view.
  const ribbonSeries = new Map<string, number[]>();
  for (const c of children) {
    const own = model.lanes.flatMap((l) => l.children.filter((cl) => cl.childId === c.childId).flatMap((cl) => cl.assignments));
    ribbonSeries.set(c.childId, detail === "smooth"
      ? calmSeries(sumSeries(own.map(cleanOf), model.dates.length), schoolColumns)
      : sumSeries(own.map((a) => (detail === "weekly" ? a.weekly : a.daily)), model.dates.length));
  }
  const ribbonPeak = Math.max(0, ...[...ribbonSeries.values()].flatMap((series) => series.slice(first, last + 1)));
  const ribbonScale = ribbonPeak > 0 ? m.ribbonMax / ribbonPeak : 0;

  const rows: LaneRow[] = [];
  const badges: LaneBadge[] = [];
  const bands: LaneBand[] = [];
  const names: BarName[] = [];
  const groups: LaneGroup[] = [];
  const rules: Rule[] = [];
  const barHeight = (members: readonly TimelineAssignment[], scale: number) => Math.min(rowHeight(members, pxPerPoint), m.barMax * scale);
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
    const ribbonD = ribbon && ribbonScale > 0 ? pathFor(columnsFor(ribbon, headerCy, ribbonScale, m.ribbonMax)) : "";
    y += m.header;
    const groupBadges: LaneBadge[] = [];
    for (const lane of lanes) {
      rules.push({ kind: "lane", x0: m.gutter, y });
      const laneTop = y;
      lane.packed.forEach((members, r) => {
        // S10-02 (mockup): the first row is centred in the lane's pitch; overlapping work stacks below in thinner sub-rows.
        const scale = r === 0 ? 1 : SUB_ROW_SCALE;
        const cy = r === 0 ? laneTop + m.pitch / 2 : laneTop + m.pitch + (r - 0.5) * m.sub;
        const height = barHeight(members, scale);
        const key = `${lane.laneKey}#${r}`;
        // The room above the bar inside its own row: the only place an outside name may go (S10-04b reworks names).
        const slotTop = r === 0 ? laneTop : laneTop + m.pitch + (r - 1) * m.sub;
        rows.push({
          key, laneKey: lane.laneKey, row: r, subjectId: lane.subjectId, subjectName: lane.subjectName, childId: g.childId ?? "",
          childName: g.name, groupKey: g.key, paletteSlot: lane.paletteSlot, step: "base", y: cy - height / 2, height, cy, labelLane: 0,
        });
        const row = rows[rows.length - 1]!;
        for (const a of members) {
          // T-11: the outer ends pulled in, so neighbouring assignments never touch.
          const columns = insetEnds(columnsFor(seriesFor(a), cy, pxPerPoint, height));
          const pieces = piecesOf(columns);
          bands.push({
            rowKey: key, laneKey: lane.laneKey, assignmentId: a.assignmentId, childId: a.childId, title: a.title,
            paletteSlot: lane.paletteSlot, step: "base", d: pathFor(columns), runs: runsOf(columns), cy,
            connectors: connectorsOf(pieces),
          });
          for (const name of placePieceNames(a.title, pieces, cy, detail === "smooth", measure, true)) {
            if (name.outside && name.y < slotTop - 0.01) continue;
            // labelLane: how far the row's highest outside name reaches above its bar (no extra space is added).
            if (name.outside) row.labelLane = Math.max(row.labelLane, row.y - name.y);
            names.push({ rowKey: key, assignmentId: a.assignmentId, paletteSlot: lane.paletteSlot, step: "base", ...name });
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
    pxPerPoint,
    plot: { x: plotX, width: plotWidth, columnWidth: xs.columnWidth, columns: xs.columns, first, last },
    rows,
    badges,
    bands,
    names,
    breaks,
    events,
    ticks,
    todayX,
    todayTop: AXIS_HEIGHT_PX - 4,
    groups,
    rules,
    lanesTop,
    lanesBottom,
  };
}
