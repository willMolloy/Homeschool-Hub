/** T-03: the timeline's three zoom levels (agreed: Year, Fall and Spring only) and their detail. */
import type { TimelineModel } from "./model";

export const ZOOMS = ["year", "fall", "spring"] as const;
export type Zoom = (typeof ZOOMS)[number];
/** Which series the bars draw. "auto" is weekly at Year zoom and daily at Fall and Spring (the spec). */
export type Detail = "auto" | "daily" | "weekly";

export const resolveDetail = (zoom: Zoom, detail: Detail = "auto"): "daily" | "weekly" =>
  detail !== "auto" ? detail : zoom === "year" ? "weekly" : "daily";

/**
 * Inclusive grid indices a zoom shows. Fall runs to Dec 31 of the year the grid starts in, Spring from Jan 1
 * after it. A half with no days on the grid falls back to the whole grid; an empty grid gives null.
 */
export function zoomRange(model: Pick<TimelineModel, "dates">, zoom: Zoom): [number, number] | null {
  const n = model.dates.length;
  if (n === 0) return null;
  if (zoom === "year") return [0, n - 1];
  const newYear = `${Number(model.dates[0]!.slice(0, 4)) + 1}-01-01`;
  const split = model.dates.findIndex((d) => d >= newYear);
  const range: [number, number] | null =
    zoom === "fall" ? (split === 0 ? null : [0, split < 0 ? n - 1 : split - 1]) : split < 0 ? null : [split, n - 1];
  return range ?? [0, n - 1];
}

/**
 * T-05: the zooms worth offering. Fall and Spring only when the grid spans New Year; otherwise either half is the
 * whole grid again, so only Year is offered (and the page shows no zoom control at all).
 */
export function availableZooms(model: Pick<TimelineModel, "dates">): Zoom[] {
  const n = model.dates.length;
  if (n === 0) return ["year"];
  const newYear = `${Number(model.dates[0]!.slice(0, 4)) + 1}-01-01`;
  const split = model.dates.findIndex((d) => d >= newYear);
  return split > 0 ? [...ZOOMS] : ["year"];
}

export const ZOOM_LABEL: Record<Zoom, string> = { year: "Year", fall: "Fall", spring: "Spring" };
