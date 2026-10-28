/** Unit names for display, shared by the schedule and subject forms. Pure. */
import type { UnitType } from "@hh/engine";

export const UNIT_LABELS: Readonly<Record<UnitType, { one: string; many: string }>> = {
  lessons: { one: "lesson", many: "lessons" },
  pages: { one: "page", many: "pages" },
  chapters: { one: "chapter", many: "chapters" },
  minutes: { one: "minute", many: "minutes" },
};

/** "lessons" → "Lessons" */
export const unitTitle = (t: UnitType) => UNIT_LABELS[t].many[0]!.toUpperCase() + UNIT_LABELS[t].many.slice(1);

/** 20, lessons → "20 / lesson" */
export const perUnitText = (weight: number, t: UnitType) =>
  `${weight.toLocaleString("en-US", { maximumFractionDigits: 2 })} / ${UNIT_LABELS[t].one}`;

/** 22.5 → "22.5", 80 → "80" */
export const unitNumber = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

/**
 * A position as a parent says it: pages → "p. 65", chapters → "chapter 4", lessons → "lesson 9";
 * minutes are an amount → "650 minutes" (S2b-36).
 */
export function formatUnits(t: UnitType, n: number): string {
  if (t === "pages") return `p. ${unitNumber(n)}`;
  if (t === "minutes") return `${unitNumber(n)} ${n === 1 ? UNIT_LABELS.minutes.one : UNIT_LABELS.minutes.many}`;
  return `${UNIT_LABELS[t].one} ${unitNumber(n)}`;
}

/** An amount of units: "15 pages", "1 chapter", "100 minutes" (S2b-26). */
export const formatAmount = (t: UnitType, n: number) => `${unitNumber(n)} ${n === 1 ? UNIT_LABELS[t].one : UNIT_LABELS[t].many}`;
