/** Where a child got to on one check-in row (S2b-36): chips, slider range and the label. Pure. */
import type { UnitType } from "@hh/engine";
import { formatUnits, unitNumber } from "../../components/unitLabels";

/** Same tolerance as the API's "as planned" (S2b-24). */
export const ON_PLAN_TOLERANCE = 0.5;

export interface PlannedRange {
  plannedFrom: number;
  plannedTo: number;
  totalUnits: number;
}

export interface Chip {
  label: string;
  position: number;
}

export const NOTHING_PLANNED = "Nothing planned";

/**
 * Done, About half, Didn't start, and Finished it when the total is within two weeks' work.
 * A row with nothing planned (`plannedTo <= plannedFrom`) gets one chip, Nothing planned, since the other three
 * would all set the same position (S2c-05).
 */
export function chipsFor({ plannedFrom, plannedTo, totalUnits }: PlannedRange): Chip[] {
  const week = plannedTo - plannedFrom;
  const chips: Chip[] = week <= 0
    ? [{ label: NOTHING_PLANNED, position: plannedFrom }]
    : [
      { label: "Done", position: plannedTo },
      { label: "About half", position: Math.round((plannedFrom + plannedTo) / 2) },
      { label: "Didn't start", position: plannedFrom },
    ];
  if (totalUnits > plannedTo && totalUnits - plannedTo <= 2 * week) chips.push({ label: "Finished it", position: totalUnits });
  return chips;
}

/** The slider runs from the week's start to max(1.5 × plannedTo, plannedTo + 10), capped at the total. */
export const sliderMax = ({ plannedTo, totalUnits }: PlannedRange) =>
  Math.min(totalUnits, Math.max(plannedTo * 1.5, plannedTo + 10));

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export type ProgressState = "asPlanned" | "onPlan" | "behind" | "ahead";

export function progressState(position: number, plannedTo: number): ProgressState {
  if (position === plannedTo) return "asPlanned";
  const diff = position - plannedTo;
  if (Math.abs(diff) <= ON_PLAN_TOLERANCE) return "onPlan";
  return diff < 0 ? "behind" : "ahead";
}

/** "Got to p. 65 of 80 planned (15 behind)", "… (20 ahead)", "… (on plan)" */
export function progressLabel(unitType: UnitType, position: number, plannedTo: number): string {
  const state = progressState(position, plannedTo);
  const diff = Math.round(Math.abs(position - plannedTo) * 100) / 100;
  const tail = state === "behind" ? `${unitNumber(diff)} behind` : state === "ahead" ? `${unitNumber(diff)} ahead` : "on plan";
  return `Got to ${formatUnits(unitType, position)} of ${unitNumber(plannedTo)} planned (${tail})`;
}

/** The number field's label: "Got to page", "Got to chapter", "Minutes done in total". */
export const fieldLabel = (unitType: UnitType) =>
  unitType === "minutes" ? "Minutes done in total" : `Got to ${unitType === "pages" ? "page" : unitType.slice(0, -1)}`;

/** A row's state in words: "✓ Done as planned", or where the child got to (S2b-36; T-03b's collapsed rows). */
export const DONE_AS_PLANNED = "✓ Done as planned";
export const stateLabel = (unitType: UnitType, position: number, plannedTo: number) =>
  progressState(position, plannedTo) === "asPlanned" ? DONE_AS_PLANNED : progressLabel(unitType, position, plannedTo);
