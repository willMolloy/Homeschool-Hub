/**
 * S7-05: the rules for a family's zoom views, as the edit sheet needs them. Mirrors apps/api/src/http/zoomViews.ts (S7-03).
 */
import { diffDays, isValidLocalDate } from "@hh/engine";
import type { CustomZoomView, ZoomViews } from "../../api/types";

/** The built-in views a family may hide, in the order the row shows them. */
export const HIDEABLE_ZOOMS: ZoomViews["hidden"] = ["fall", "spring", "month"];
/** Year, the built-ins left showing and the family's own views, all together. */
export const MAX_VISIBLE_ZOOMS = 6;
export const MAX_ZOOM_NAME = 30;
export const MAX_ZOOM_DAYS = 400;
export const LIMIT_TEXT = `You can show up to ${MAX_VISIBLE_ZOOMS} views.`;

/** How many views the row would show: Year, the built-ins not hidden, and the custom ones. */
export const visibleCount = (v: ZoomViews): number => 1 + (HIDEABLE_ZOOMS.length - v.hidden.length) + v.custom.length;

/** A view's problem in the parent's words, or null when it is fine to save. */
export function viewProblem(v: Pick<CustomZoomView, "name" | "start" | "end">): string | null {
  const name = v.name.trim();
  if (!name) return "Give it a name.";
  if (name.length > MAX_ZOOM_NAME) return `Names can be up to ${MAX_ZOOM_NAME} characters.`;
  if (!isValidLocalDate(v.start) || !isValidLocalDate(v.end)) return "Pick the first and last day.";
  const days = diffDays(v.start, v.end) + 1;
  if (days < 1) return "The last day must be on or after the first day.";
  if (days > MAX_ZOOM_DAYS) return `A view can cover up to ${MAX_ZOOM_DAYS} days.`;
  return null;
}

/** A new view's id: a uuid (crypto.randomUUID only exists on secure pages, so fall back to random bytes). */
export function newViewId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
