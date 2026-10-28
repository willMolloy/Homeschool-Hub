import type { Assignment, UnitType } from "./types";

/** Starting values to tune with real families; shown as "estimated" until the parent sets their own. */
export const DEFAULT_MINUTES_PER_UNIT: Readonly<Record<UnitType, number>> = Object.freeze({
  pages: 2,
  chapters: 30,
  lessons: 20,
  minutes: 1,
});

export function minutesPerUnitOf(a: Pick<Assignment, "unitType" | "minutesPerUnit">): { minutesPerUnit: number; estimated: boolean } {
  if (a.unitType === "minutes") return { minutesPerUnit: 1, estimated: false };
  const v = a.minutesPerUnit;
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return { minutesPerUnit: v, estimated: false };
  return { minutesPerUnit: DEFAULT_MINUTES_PER_UNIT[a.unitType], estimated: true };
}
