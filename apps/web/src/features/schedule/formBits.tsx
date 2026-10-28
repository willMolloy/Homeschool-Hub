/** Small pieces shared by the schedule forms (S2a-13..16). */
import { useId } from "react";
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
