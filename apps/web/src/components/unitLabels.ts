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
