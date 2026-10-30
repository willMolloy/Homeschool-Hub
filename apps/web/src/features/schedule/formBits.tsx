/** Small pieces shared by the schedule forms (S2a-13..16). */
import { useId } from "react";
import type { Child } from "../../api/types";
import { ApiError } from "../../api/client";

/** 0 = Sunday … 6 = Saturday, shown Monday first. */
export const WEEKDAYS: { value: number; short: string; long: string }[] = [
  { value: 1, short: "Mon", long: "Monday" },
  { value: 2, short: "Tue", long: "Tuesday" },
  { value: 3, short: "Wed", long: "Wednesday" },
  { value: 4, short: "Thu", long: "Thursday" },
  { value: 5, short: "Fri", long: "Friday" },
  { value: 6, short: "Sat", long: "Saturday" },
  { value: 0, short: "Sun", long: "Sunday" },
];

/** "Mon, Wed" in Monday-first order. */
export function weekdaySummary(days: number[]): string {
  if (days.length === 7) return "Every day";
  return WEEKDAYS.filter((d) => days.includes(d.value)).map((d) => d.short).join(", ");
}

/** A user-facing message for a failed save. Server 400 messages lose their "field: " prefix. */
export function saveError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return "Can't reach the server.";
    if (err.status === 400 || err.status === 409) return err.message.replace(/^[a-zA-Z.]+: /, "");
    if (err.status === 404) return "That item no longer exists. Reload the page.";
  }
  return "Couldn't save. Please try again.";
}

/**
 * S3b-01: `saveError` for POST /api/assignments/bulk. "Assignment N: field: message" becomes "<label(N)>: message";
 * `label` gets the 1-based position the server counted and returns the name to show, or undefined to leave the prefix.
 */
export function bulkSaveError(err: unknown, label: (n: number) => string | undefined): string {
  return saveError(err).replace(/^Assignment (\d+): (?:[a-zA-Z.]+: )?/, (m, n: string) => {
    const name = label(Number(n));
    return name ? `${name}: ` : m;
  });
}

interface WeekdayPickerProps {
  legend: string;
  value: number[];
  onChange: (days: number[]) => void;
  error?: string | null;
}

/** Seven checkboxes in a fieldset; the error (if any) is announced and linked. */
export function WeekdayPicker({ legend, value, onChange, error }: WeekdayPickerProps) {
  const errId = useId();
  return (
    <fieldset className="day-picker" aria-describedby={error ? errId : undefined} aria-invalid={error ? true : undefined}>
      <legend>{legend}</legend>
      <div className="day-picker-days">
        {WEEKDAYS.map((d) => (
          <label key={d.value} className="day-chip">
            <input
              type="checkbox"
              checked={value.includes(d.value)}
              aria-label={d.long}
              onChange={(e) => onChange(e.target.checked ? [...value, d.value] : value.filter((v) => v !== d.value))}
            />
            <span aria-hidden="true">{d.short}</span>
          </label>
        ))}
      </div>
      {error ? <p id={errId} className="field-error" role="alert">{error}</p> : null}
    </fieldset>
  );
}

export const sameSet = (a: readonly (string | number)[], b: readonly (string | number)[]) =>
  a.length === b.length && [...a].map(String).sort().join() === [...b].map(String).sort().join();

/** "Nov 2, 2026" for a YYYY-MM-DD, without time-zone drift. */
export function shortDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** "Nov 2 – Nov 26, 2026" style range (or one date when equal). */
export function dateRange(start: string, end: string): string {
  return start === end ? shortDate(start) : `${shortDate(start)} – ${shortDate(end)}`;
}

/** Whole days from start to end counting both ends (1 when equal, ≤0 when inverted). */
export function spanDays(start: string, end: string): number {
  const n = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86_400_000;
  return n(end) - n(start) + 1;
}

/** Client copy of the server's date checks; null when fine. */
export function dateRangeError(start: string, end: string, maxDays: number): string | null {
  if (!start || !end) return "Pick a start and an end date.";
  const span = spanDays(start, end);
  if (span < 1) return "The end date must be on or after the start date.";
  if (span > maxDays) return `That range is ${span} days; the most allowed is ${maxDays}.`;
  return null;
}

/** Parses a positive number field with at most two decimals; returns a message on failure. */
export function parsePositive(raw: string, label: string, max: number): number | string {
  const t = raw.trim();
  if (!t) return `${label} is required.`;
  const v = Number(t);
  if (!Number.isFinite(v)) return `${label} must be a number.`;
  if (v <= 0 || v > max) return `${label} must be more than 0 and at most ${max.toLocaleString("en-US")}.`;
  if (Math.abs(v * 100 - Math.round(v * 100)) > 1e-6) return `${label} can have at most 2 decimal places.`;
  return v;
}

interface ChildPickerProps {
  /** All children, archived included; archived ones show only while selected. */
  options: Child[];
  value: string[];
  onChange: (ids: string[]) => void;
  /** When set, a "Whole family / Only some children" choice comes first (events, days off). */
  wholeFamily?: { value: boolean; onChange: (whole: boolean) => void };
  error?: string | null;
  legend?: string;
}

export function ChildPicker({ options, value, onChange, wholeFamily, error, legend = "Children" }: ChildPickerProps) {
  const errId = useId();
  const radio = useId();
  const shown = options.filter((c) => !c.archived || value.includes(c.id));
  const showBoxes = !wholeFamily || !wholeFamily.value;
  return (
    <fieldset className="choice-list" aria-describedby={error ? errId : undefined} aria-invalid={error ? true : undefined}>
      <legend>{legend}</legend>
      {wholeFamily ? (
        <>
          <label className="choice">
            <input type="radio" name={radio} checked={wholeFamily.value} onChange={() => wholeFamily.onChange(true)} />
            Whole family
          </label>
          <label className="choice">
            <input type="radio" name={radio} checked={!wholeFamily.value} onChange={() => wholeFamily.onChange(false)} />
            Only some children
          </label>
        </>
      ) : null}
      {showBoxes ? (
        <div className={wholeFamily ? "choice-indent" : undefined}>
          {shown.length === 0 ? <p className="hint">No children yet. Add them under Kids.</p> : null}
          {shown.map((c) => (
            <label key={c.id} className="choice">
              <input
                type="checkbox"
                checked={value.includes(c.id)}
                onChange={(e) => onChange(e.target.checked ? [...value, c.id] : value.filter((v) => v !== c.id))}
              />
              {c.name}
              {c.archived ? <span className="tag">Archived</span> : null}
            </label>
          ))}
        </div>
      ) : null}
      {error ? <p id={errId} className="field-error" role="alert">{error}</p> : null}
    </fieldset>
  );
}
