/** S5-05: "Use a template" on Days off: pick a year shape and the year's dates, see the breaks, add them in one step. */
import { useId, useMemo, useState, type FormEvent } from "react";
import { CALENDAR_SHAPES, HOLIDAY_KEYS, HOLIDAY_LABELS, type HolidayKey } from "@hh/engine";
import { apiPost } from "../../api/client";
import { useMe } from "../../auth/AuthProvider";
import type { BlockedRange } from "../../api/types";
import { dateRangeError, saveError } from "./formBits";
import { ALL_HOLIDAYS, breakText, leaveOutExisting, MAX_YEAR_DAYS, plannedBreaks } from "./templates";

/** Custom weeks on and off: whole numbers from 1 to 20. */
export const MAX_CUSTOM_WEEKS = 20;
const CUSTOM = "custom";

/** "6" → 6; anything that isn't a whole number from 1 to 20 → null. */
function weeksOf(raw: string): number | null {
  const n = Number(raw.trim());
  return raw.trim() !== "" && Number.isInteger(n) && n >= 1 && n <= MAX_CUSTOM_WEEKS ? n : null;
}

interface Props {
  existing: BlockedRange[];
  onSaved: (created: BlockedRange[]) => void;
  onCancel: () => void;
}

export function TemplatePanel({ existing, onSaved, onCancel }: Props) {
  const { weekStart } = useMe();
  const [shape, setShape] = useState<string>(CALENDAR_SHAPES[0]!.id);
  const [weeksOn, setWeeksOn] = useState("4");
  const [weeksOff, setWeeksOff] = useState("1");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [holidays, setHolidays] = useState<ReadonlySet<HolidayKey>>(ALL_HOLIDAYS);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = { shape: useId(), on: useId(), off: useId(), start: useId(), end: useId() };

  const custom = shape === CUSTOM;
  const on = weeksOf(weeksOn);
  const off = weeksOf(weeksOff);
  const builtIn = CALENDAR_SHAPES.find((s) => s.id === shape);
  const datesError = dateRangeError(start, end, MAX_YEAR_DAYS);
  const weeksError = custom && (on === null || off === null) ? `Weeks on and off are whole numbers from 1 to ${MAX_CUSTOM_WEEKS}.` : null;
  const problem = datesError ?? weeksError;

  const { add, skipped } = useMemo(() => {
    if (datesError || weeksError) return { add: [], skipped: 0 };
    const pattern = custom ? { weeksOn: on!, weeksOff: off! } : builtIn?.pattern ?? null;
    return leaveOutExisting(plannedBreaks(start, end, pattern, holidays, weekStart), existing);
  }, [datesError, weeksError, custom, on, off, builtIn, start, end, holidays, weekStart, existing]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setTried(true);
    if (problem || add.length === 0) return;
    setSaving(true);
    try {
      const created = await apiPost<BlockedRange[]>("/api/blocked-ranges/bulk", {
        blockedRanges: add.map((b) => ({ label: b.label, kind: b.kind, startDate: b.start, endDate: b.end, childIds: [] })),
      });
      onSaved(created);
    } catch (err) {
      setError(saveError(err));
    } finally {
      setSaving(false);
    }
  }

  const tick = (k: HolidayKey, on: boolean) => setHolidays((prev) => {
    const next = new Set(prev);
    if (on) next.add(k);
    else next.delete(k);
    return next;
  });

  return (
    <form className="card schedule-form" aria-label="Use a template" onSubmit={submit} noValidate>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="field">
        <label htmlFor={ids.shape}>Year shape</label>
        <select id={ids.shape} value={shape} onChange={(e) => setShape(e.target.value)}>
          {CALENDAR_SHAPES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          <option value={CUSTOM}>Custom</option>
        </select>
      </div>
      {custom ? (
        <div className="field-row">
          <div className="field">
            <label htmlFor={ids.on}>Weeks on</label>
            <input id={ids.on} type="number" inputMode="numeric" min={1} max={MAX_CUSTOM_WEEKS} value={weeksOn} onChange={(e) => setWeeksOn(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor={ids.off}>Weeks off</label>
            <input id={ids.off} type="number" inputMode="numeric" min={1} max={MAX_CUSTOM_WEEKS} value={weeksOff} onChange={(e) => setWeeksOff(e.target.value)} />
          </div>
        </div>
      ) : null}
      <div className="field-row">
        <div className="field">
          <label htmlFor={ids.start}>First day of the year</label>
          <input id={ids.start} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={ids.end}>Last day of the year</label>
          <input id={ids.end} type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <fieldset className="choice-list">
        <legend>Holidays</legend>
        {HOLIDAY_KEYS.map((k) => (
          <label key={k} className="choice">
            <input type="checkbox" checked={holidays.has(k)} onChange={(e) => tick(k, e.target.checked)} />
            {HOLIDAY_LABELS[k]}
          </label>
        ))}
      </fieldset>
      {tried && problem ? <p className="field-error" role="alert">{problem}</p> : null}
      {!problem ? (
        <div className="template-preview" aria-live="polite">
          <p className="event-preview-title">{add.length === 1 ? "1 break to add" : `${add.length} breaks to add`}</p>
          {add.length > 0 ? <ul>{add.map((b) => <li key={`${b.start}/${b.label}`}>{breakText(b)}</li>)}</ul> : null}
          {skipped > 0 ? <p className="hint">{skipped} already in your days off</p> : null}
        </div>
      ) : null}
      <div className="btn-row">
        <button className="btn" type="submit" disabled={saving}>{saving ? "Adding…" : "Add breaks"}</button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
