/**
 * T-03/T-05/T-05c: the timeline's zoom presets and the detail each one draws.
 *
 * T-05c (DeeDee, replacing the earlier "Year, Fall and Spring only"): the presets are Year, Fall, Spring and
 * This month, and detail follows the *visible span*, not the preset: at DETAIL_SPAN_WEEKS or less the bars are
 * the daily, stepped ones with event strips; above it they are smooth curves with events hidden.
 */
import type { TimelineModel } from "./model";

export const ZOOMS = ["year", "fall", "spring", "month"] as const;
export type Zoom = (typeof ZOOMS)[number];

/** The one threshold: spans of this many weeks or fewer show daily detail. */
export const DETAIL_SPAN_WEEKS = 8;
/** Hysteresis: once daily, a span must grow past DETAIL_SPAN_WEEKS + this before turning smooth again. */
export const DETAIL_HYSTERESIS_WEEKS = 1;

/** What the bars draw: daily steps, weekly steps (tests only), or a smooth curve. "auto" follows the span. */
export type DrawnDetail = "daily" | "weekly" | "smooth";
export type Detail = "auto" | DrawnDetail;

/** Detail for a visible span in weeks, with hysteresis against the detail shown before (if any). */
export function detailForSpan(weeks: number, previous?: DrawnDetail): "daily" | "smooth" {
  if (previous === "daily") return weeks <= DETAIL_SPAN_WEEKS + DETAIL_HYSTERESIS_WEEKS ? "daily" : "smooth";
  return weeks <= DETAIL_SPAN_WEEKS ? "daily" : "smooth";
}

const dayNumber = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86_400_000;

/** Calendar weeks from the first to the last shown day, inclusive. */
export function spanWeeks(model: Pick<TimelineModel, "dates">, range: readonly [number, number] | null): number {
  if (!range || range[1] < range[0]) return 0;
  return (dayNumber(model.dates[range[1]]!) - dayNumber(model.dates[range[0]]!) + 1) / 7;
}

export const resolveDetail = (weeks: number, detail: Detail = "auto", previous?: DrawnDetail): DrawnDetail =>
  detail !== "auto" ? detail : detailForSpan(weeks, previous);

/** The calendar months ("YYYY-MM") on the grid, in order. */
export function gridMonths(model: Pick<TimelineModel, "dates">): string[] {
  const out: string[] = [];
  for (const d of model.dates) if (out[out.length - 1] !== d.slice(0, 7)) out.push(d.slice(0, 7));
  return out;
}

/** "This month": the month holding today, clamped to the grid's first or last month. */
export function defaultMonth(model: Pick<TimelineModel, "dates" | "today">): string | null {
  const months = gridMonths(model);
  if (months.length === 0) return null;
  const m = model.today.slice(0, 7);
  return m < months[0]! ? months[0]! : m > months[months.length - 1]! ? months[months.length - 1]! : m;
}

/**
 * Inclusive grid indices a zoom shows. Fall runs to Dec 31 of the year the grid starts in, Spring from Jan 1
 * after it, Month is one calendar month (`month`, default: the one holding today). A half or month with no days
 * on the grid falls back to the whole grid; an empty grid gives null.
 */
export function zoomRange(model: Pick<TimelineModel, "dates" | "today">, zoom: Zoom, month?: string | null): [number, number] | null {
  const n = model.dates.length;
  if (n === 0) return null;
  if (zoom === "year") return [0, n - 1];
  if (zoom === "month") {
    const m = month ?? defaultMonth(model);
    const a = model.dates.findIndex((d) => d.startsWith(`${m}-`));
    if (a < 0) return [0, n - 1];
    let b = a;
    while (b + 1 < n && model.dates[b + 1]!.startsWith(`${m}-`)) b++;
    return [a, b];
  }
  const newYear = `${Number(model.dates[0]!.slice(0, 4)) + 1}-01-01`;
  const split = model.dates.findIndex((d) => d >= newYear);
  const range: [number, number] | null =
    zoom === "fall" ? (split === 0 ? null : [0, split < 0 ? n - 1 : split - 1]) : split < 0 ? null : [split, n - 1];
  return range ?? [0, n - 1];
}

/**
 * The presets worth offering. Fall and Spring only when the grid spans New Year (otherwise either half is the
 * whole grid again); This month whenever there is a grid.
 */
export function availableZooms(model: Pick<TimelineModel, "dates">): Zoom[] {
  const n = model.dates.length;
  if (n === 0) return ["year"];
  const newYear = `${Number(model.dates[0]!.slice(0, 4)) + 1}-01-01`;
  const split = model.dates.findIndex((d) => d >= newYear);
  return split > 0 ? [...ZOOMS] : ["year", "month"];
}

export const ZOOM_LABEL: Record<Zoom, string> = { year: "Year", fall: "Fall", spring: "Spring", month: "This month" };
