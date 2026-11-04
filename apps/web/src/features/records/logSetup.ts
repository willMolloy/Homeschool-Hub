/**
 * S9-03: the log templates and the words for what a log tracks. Mirrors apps/api/src/http/logSetup.ts.
 * A template is only a starting point: the seven switches are what counts. Never names a state.
 */
import type { LogFields, LogSetup, LogTemplate } from "../../api/types";

export const NO_FIELDS: LogFields = { subjectHours: false, coreSplit: false, totalHours: false, schoolDays: false, homeAway: false, notes: false, books: false };

export interface TemplateInfo { id: Exclude<LogTemplate, "custom">; title: string; hint: string; fields: LogFields }

export const TEMPLATES: readonly TemplateInfo[] = [
  { id: "hoursBySubject", title: "Hours by subject", hint: "Hours for each subject.", fields: { ...NO_FIELDS, subjectHours: true } },
  { id: "coreNonCore", title: "Core and non-core hours", hint: "Hours for each subject, marked core or non-core; totals for both.", fields: { ...NO_FIELDS, subjectHours: true, coreSplit: true } },
  { id: "daysAttended", title: "Days attended", hint: "School days only.", fields: { ...NO_FIELDS, schoolDays: true } },
  { id: "daysAndHours", title: "Days and hours", hint: "School days plus total hours.", fields: { ...NO_FIELDS, schoolDays: true, totalHours: true } },
  { id: "detailed", title: "Detailed log", hint: "Hours by subject, notes and books read.", fields: { ...NO_FIELDS, subjectHours: true, notes: true, books: true } },
];

/** The switches, in the order they are shown, with the parent's words. */
export const FIELD_SWITCHES: readonly { key: keyof LogFields; label: string; hint?: string }[] = [
  { key: "subjectHours", label: "Hours by subject" },
  { key: "coreSplit", label: "Core and non-core hours", hint: "Needs hours by subject." },
  { key: "totalHours", label: "Total hours", hint: "One total instead of hours by subject." },
  { key: "schoolDays", label: "School days" },
  { key: "homeAway", label: "Hours at home and away" },
  { key: "notes", label: "Notes" },
  { key: "books", label: "Books read" },
];

/** Turning one switch, keeping the rules the API holds: core needs subject hours, and total hours replace them. */
export function toggleField(fields: LogFields, key: keyof LogFields): LogFields {
  const next = { ...fields, [key]: !fields[key] };
  if (key === "subjectHours") {
    if (!next.subjectHours) next.coreSplit = false;
    else next.totalHours = false;
  }
  if (key === "coreSplit" && next.coreSplit) {
    next.subjectHours = true;
    next.totalHours = false;
  }
  if (key === "totalHours" && next.totalHours) {
    next.subjectHours = false;
    next.coreSplit = false;
  }
  return next;
}

const same = (a: LogFields, b: LogFields) => (Object.keys(NO_FIELDS) as (keyof LogFields)[]).every((k) => a[k] === b[k]);

/** The template whose switches these are exactly, else "custom". */
export function templateFor(fields: LogFields): LogTemplate {
  return TEMPLATES.find((t) => same(t.fields, fields))?.id ?? "custom";
}

export const hasAnyField = (f: LogFields) => (Object.keys(NO_FIELDS) as (keyof LogFields)[]).some((k) => f[k]);

/** "Hours by subject, school days and notes" in the parent's words. */
export function trackedWords(f: LogFields): string {
  const words = FIELD_SWITCHES.filter((s) => f[s.key] && !(s.key === "subjectHours" && f.coreSplit)).map((s) => s.label.toLowerCase());
  if (words.length === 0) return "";
  const text = words.length === 1 ? words[0]! : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const setupOf = (fields: LogFields): LogSetup => ({ template: templateFor(fields), fields });

/** The state-rules link in the help line (a page of state laws kept by HSLDA). */
export const STATE_LAWS_URL = "https://hslda.org/legal";
export const HELP_LINE = "Not sure which fits? Your state's rules decide what to keep.";
