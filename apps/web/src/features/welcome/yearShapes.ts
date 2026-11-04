/**
 * S11-03: the five shapes a new family can give its school year, and what each one adds. Pure; dates are "YYYY-MM-DD".
 * The breaks are the existing calendar templates' (S5: `plannedBreaks` with the engine's `CALENDAR_SHAPES` patterns), with no
 * holidays ticked (the breaks step offers those). Term views are the zoom views of S7-05 / S9-06: Fall and Spring renamed and
 * re-dated to the year, or three views of the family's own.
 */
import { addDays, CALENDAR_SHAPES, diffDays } from "@hh/engine";
import type { BlockedRange, BuiltInZoomOverrides, CustomZoomView, WeekStart, ZoomViews } from "../../api/types";
import { breakDates, leaveOutExisting, plannedBreaks, type PlannedBreak } from "../schedule/templates";
import { newViewId } from "../timeline/zoomViews";

export type ShapeId = "fall-spring" | "three-terms" | "36-weeks" | "sabbath" | "later";

export interface Shape {
  id: ShapeId;
  label: string;
  /** One line under the name, in a parent's words. */
  hint: string;
}

/** In the order the cards show; Fall and Spring is the default. */
export const SHAPES: readonly Shape[] = [
  { id: "fall-spring", label: "Fall and Spring", hint: "Two terms, split at New Year" },
  { id: "three-terms", label: "Three terms", hint: "12 weeks of school, then 2 weeks off" },
  { id: "36-weeks", label: "36 weeks", hint: "No pattern of breaks" },
  { id: "sabbath", label: "6 weeks on, 1 off", hint: "A week off after every 6 weeks" },
  { id: "later", label: "I'll set this later", hint: "We'll remind you on Home" },
];

/** The first of January after `start`, or null when the year ends before it (a year inside one calendar year). */
export function newYearSplit(start: string, end: string): string | null {
  const jan1 = `${Number(start.slice(0, 4)) + 1}-01-01`;
  return jan1 <= end ? jan1 : null;
}

/** The names the three term views carry (a later apply replaces them rather than adding three more). */
export const TERM_NAMES = ["Term 1", "Term 2", "Term 3"] as const;
export const isTermView = (v: Pick<CustomZoomView, "name">) => (TERM_NAMES as readonly string[]).includes(v.name);

interface Span { name: string; start: string; end: string }

/**
 * Three terms: the stretches between the pattern's first two breaks (a term is 12 weeks, then 2 off). A year too short to have
 * two breaks is cut into thirds instead.
 */
export function threeTerms(start: string, end: string, breaks: readonly PlannedBreak[]): Span[] {
  const pattern = breaks.filter((b) => b.kind === "vacation");
  if (pattern.length >= 2) {
    const [a, b] = [pattern[0]!, pattern[1]!];
    return [
      { name: TERM_NAMES[0], start, end: addDays(a.start, -1) },
      { name: TERM_NAMES[1], start: addDays(a.end, 1), end: addDays(b.start, -1) },
      { name: TERM_NAMES[2], start: addDays(b.end, 1), end },
    ];
  }
  const n = diffDays(start, end) + 1;
  return [0, 1, 2].map((i) => ({ name: TERM_NAMES[i]!, start: addDays(start, Math.floor((n * i) / 3)), end: addDays(start, Math.floor((n * (i + 1)) / 3) - 1) }));
}

/** What a shape adds for a year: the breaks (before leaving out days off that are already there), the zoom views, and the preview line. */
export interface YearPlan {
  breaks: PlannedBreak[];
  /** Fall and Spring re-dated to the year; or null. */
  halves: BuiltInZoomOverrides | null;
  /** Three term views; or null. */
  terms: Span[] | null;
}

export function planYear(shape: ShapeId, start: string, end: string, weekStart: WeekStart): YearPlan {
  if (shape === "later") return { breaks: [], halves: null, terms: null };
  if (shape === "fall-spring") {
    // No breaks of its own: two views, Fall to the end of December and Spring from New Year.
    const split = newYearSplit(start, end);
    return { breaks: [], halves: split ? { fall: { name: "Fall", start, end: addDays(split, -1) }, spring: { name: "Spring", start: split, end } } : null, terms: null };
  }
  const pattern = CALENDAR_SHAPES.find((s) => s.id === shape)?.pattern ?? null;
  const breaks = plannedBreaks(start, end, pattern, new Set(), weekStart);
  return { breaks, halves: null, terms: shape === "three-terms" ? threeTerms(start, end, breaks) : null };
}

/** The preview line: what the shape would add, given the days off the family already has. */
export function previewLine(shape: ShapeId, plan: YearPlan, existing: readonly BlockedRange[]): string {
  if (shape === "later") return "We'll remind you on Home.";
  const { add, skipped } = leaveOutExisting(plan.breaks, [...existing]);
  const parts: string[] = [];
  if (plan.terms) parts.push("3 term views");
  if (plan.halves) parts.push("Fall and Spring views");
  if (add.length > 0) parts.push(`${add.length} ${add.length === 1 ? "break" : "breaks"}`);
  let line = parts.length === 0 ? "Adds nothing yet; you can add breaks next." : `Adds ${parts.join(" and ")}${add.length > 0 ? `: ${add.map((b) => breakDates(b.start, b.end)).join(", ")}` : ""}.`;
  if (skipped > 0) line += ` ${skipped} already in your days off.`;
  return line;
}

/** The family's zoom views with the shape applied (null: leave them alone). Replaces an earlier Fall and Spring or three terms. */
export function zoomViewsFor(plan: YearPlan, current: ZoomViews): ZoomViews | null {
  const keep = current.custom.filter((v) => !isTermView(v));
  if (plan.halves) {
    return { hidden: current.hidden.filter((h) => h !== "fall" && h !== "spring"), custom: keep, overrides: { ...current.overrides, ...plan.halves } };
  }
  if (plan.terms) {
    const hidden = [...new Set([...current.hidden, "fall" as const, "spring" as const])];
    return { hidden: (["fall", "spring", "month"] as const).filter((h) => hidden.includes(h)), custom: [...keep, ...plan.terms.map((t) => ({ id: newViewId(), ...t }))], ...(current.overrides ? { overrides: current.overrides } : {}) };
  }
  return null;
}

/** The school year a family with none given is offered holidays for: this one, August to June (the school year that holds `today`, or starts next month in July). */
export function currentSchoolYear(today: string): { start: string; end: string } {
  const y = Number(today.slice(0, 4));
  const first = Number(today.slice(5, 7)) >= 7 ? y : y - 1;
  return { start: `${first}-08-01`, end: `${first + 1}-06-30` };
}
