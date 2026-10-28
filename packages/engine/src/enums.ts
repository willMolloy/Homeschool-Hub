/**
 * The closed value lists, written once (RF-08). The engine types, the API's zod
 * enums, the web's labels and options all derive from these; the SQL CHECK
 * constraints repeat them and db/test/enums.test.ts fails if the two drift.
 * Order is display order in the web forms.
 */
const list = <const T extends readonly string[]>(...values: T): T => Object.freeze(values);

export const WEEK_STARTS = list("mon", "sun");
export const UNIT_TYPES = list("pages", "chapters", "lessons", "minutes");
/** What a recurring event does to a subject on its day. */
export const SUBJECT_RULES = list("skip", "lighter", "normal");
export const OVERRIDE_MODES = list("keepEndDate", "pushEndDate");
export const BLOCKED_KINDS = list("vacation", "holiday", "sick", "other");

export type WeekStart = (typeof WEEK_STARTS)[number];
export type UnitType = (typeof UNIT_TYPES)[number];
export type SubjectRule = (typeof SUBJECT_RULES)[number];
export type OverrideMode = (typeof OVERRIDE_MODES)[number];
export type BlockedKind = (typeof BLOCKED_KINDS)[number];

/** "a, b or c" for validation messages. */
export function humanList(values: readonly string[]): string {
  return values.length < 2 ? values.join("") : `${values.slice(0, -1).join(", ")} or ${values[values.length - 1]}`;
}
