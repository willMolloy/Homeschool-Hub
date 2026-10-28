/** The prototype's sample family (proto data.ts), converted to @hh/engine types. Weekdays: 0 = Sun. */
import type { Assignment, BlockedPeriod, FamilyCalendar, RecurringEvent } from "../../src";

export const calendar: FamilyCalendar = { weekStart: "mon", schoolDays: [1, 2, 3, 4, 5] };
export const blocked: BlockedPeriod[] = [{ id: "xmas", start: "2026-12-21", end: "2027-01-01", kind: "vacation" }];
export const events: RecurringEvent[] = [
  { id: "coop", name: "Co-op", childIds: ["frank", "margaret"], weekdays: [2], capacityFraction: 0.5, subjectRules: { lit: "skip", math: "lighter", hist: "skip", sci: "skip", music: "normal" } },
  { id: "violin", name: "Violin – Margaret", childIds: ["margaret"], weekdays: [4], capacityFraction: 0.25, subjectRules: { music: "skip" } },
  { id: "piano", name: "Piano – Frank", childIds: ["frank"], weekdays: [5], capacityFraction: 0.25, subjectRules: { music: "skip", math: "lighter" } },
];
const A = (id: string, subjectId: string, childIds: string[], unitType: Assignment["unitType"], totalUnits: number, start: string, end: string, minutesPerUnit?: number): Assignment =>
  ({ id, subjectId, childIds, unitType, totalUnits, start, end, minutesPerUnit: minutesPerUnit ?? null });
export const assignments: Assignment[] = [
  A("aesop", "lit", ["frank"], "pages", 240, "2026-08-31", "2026-10-16"),
  A("ti", "lit", ["frank"], "pages", 270, "2026-10-19", "2026-11-06"),
  A("crusoe", "lit", ["frank"], "pages", 400, "2027-01-04", "2027-03-26"),
  A("garden", "lit", ["margaret"], "pages", 330, "2026-09-08", "2026-11-20"),
  A("poems", "lit", ["margaret"], "pages", 80, "2026-10-05", "2026-10-30"),
  A("heidi", "lit", ["margaret"], "pages", 280, "2027-01-04", "2027-04-30"),
  A("math5", "math", ["frank"], "chapters", 144, "2026-08-31", "2027-05-21", 30),
  A("math3", "math", ["margaret"], "lessons", 150, "2026-08-31", "2027-05-21", 30),
  A("fracs", "math", ["margaret"], "lessons", 16, "2026-10-05", "2026-10-30"),
  A("hist", "hist", ["frank", "margaret"], "lessons", 140, "2026-09-08", "2027-05-14"),
  A("sci", "sci", ["frank", "margaret"], "lessons", 120, "2026-09-08", "2027-05-14"),
  A("fair", "sci", ["frank"], "lessons", 16, "2026-10-05", "2026-10-30"),
  A("piano", "music", ["frank"], "minutes", 1800, "2026-08-31", "2027-05-21"),
  A("violin", "music", ["margaret"], "minutes", 1800, "2026-08-31", "2027-05-21"),
];
