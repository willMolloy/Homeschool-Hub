/**
 * S5-05: "Use a template" on Days off: pick a year shape and the year's dates, see the breaks, add them in one step.
 * S5-07: the family's saved templates follow the built-in shapes; one asks only for the new year's first day.
 * S7-07: with nothing to add the panel says why and Add breaks is off.
 */
import { useId, useMemo, useState, type FormEvent } from "react";
import { CALENDAR_SHAPES, HOLIDAY_KEYS, HOLIDAY_LABELS, isValidLocalDate, type HolidayKey } from "@hh/engine";
import { apiDelete, apiPost } from "../../api/client";
import { useApi } from "../../api/useApi";
import { useMe } from "../../auth/AuthProvider";
import type { BlockedKind, BlockedRange, CalendarTemplate } from "../../api/types";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { dateRangeError, saveError } from "./formBits";
import { ALL_HOLIDAYS, breakText, leaveOutExisting, MAX_YEAR_DAYS, plannedBreaks, shiftedBreaks, type PlannedBreak } from "./templates";

/** Custom weeks on and off: whole numbers from 1 to 20. */
export const MAX_CUSTOM_WEEKS = 20;
const CUSTOM = "custom";
const SAVED = "saved:";

/** "6" → 6; anything that isn't a whole number from 1 to 20 → null. */
function weeksOf(raw: string): number | null {
  const n = Number(raw.trim());
  return raw.trim() !== "" && Number.isInteger(n) && n >= 1 && n <= MAX_CUSTOM_WEEKS ? n : null;
}

interface Props {
  existing: BlockedRange[];
  kindLabels: Record<BlockedKind, string>;
  onSaved: (created: BlockedRange[]) => void;
  onCancel: () => void;
}

export function TemplatePanel({ existing, kindLabels, onSaved, onCancel }: Props) {
  const { weekStart } = useMe();
  // A failed load just means no saved templates are offered.
  const templates = useApi<CalendarTemplate[]>("/api/calendar-templates");
  const saved = templates.data ?? [];
  const [shape, setShape] = useState<string>(CALENDAR_SHAPES[0]!.id);
  const [weeksOn, setWeeksOn] = useState("4");
  const [weeksOff, setWeeksOff] = useState("1");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [holidays, setHolidays] = useState<ReadonlySet<HolidayKey>>(ALL_HOLIDAYS);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const ids = { shape: useId(), on: useId(), off: useId(), start: useId(), end: useId() };

  const chosen = shape.startsWith(SAVED) ? saved.find((t) => t.id === shape.slice(SAVED.length)) : undefined;
  const custom = shape === CUSTOM;
  const on = weeksOf(weeksOn);
  const off = weeksOf(weeksOff);
  const builtIn = CALENDAR_SHAPES.find((s) => s.id === shape);
  const datesError = chosen
    ? (isValidLocalDate(start) ? null : "Pick the first day of the new year.")
    : dateRangeError(start, end, MAX_YEAR_DAYS);
  const weeksError = custom && (on === null || off === null) ? `Weeks on and off are whole numbers from 1 to ${MAX_CUSTOM_WEEKS}.` : null;
  const problem = datesError ?? weeksError;

  const { add, skipped } = useMemo((): { add: PlannedBreak[]; skipped: number } => {
    if (datesError || weeksError) return { add: [], skipped: 0 };
    if (chosen) return leaveOutExisting(shiftedBreaks(chosen.breaks, start), existing);
    const pattern = custom ? { weeksOn: on!, weeksOff: off! } : builtIn?.pattern ?? null;
    return leaveOutExisting(plannedBreaks(start, end, pattern, holidays, weekStart), existing);
  }, [datesError, weeksError, chosen, custom, on, off, builtIn, start, end, holidays, weekStart, existing]);

  /** S7-07: the dates are fine but no break would be added (all are already days off, or the range has none). */
  const nothingToAdd = !problem && add.length === 0;

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

  async function remove(t: CalendarTemplate) {
    setSaving(true);
    setDeleteError(null);
    try {
      await apiDelete(`/api/calendar-templates/${t.id}`);
      templates.setData((prev) => (prev ?? []).filter((x) => x.id !== t.id));
      setShape(CALENDAR_SHAPES[0]!.id);
      setDeleting(false);
    } catch (err) {
      setDeleteError(saveError(err));
    } finally {
      setSaving(false);
    }
  }

  const tick = (k: HolidayKey, checked: boolean) => setHolidays((prev) => {
    const next = new Set(prev);
    if (checked) next.add(k);
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
          {saved.length > 0 ? (
            <optgroup label="Your templates">
              {saved.map((t) => <option key={t.id} value={SAVED + t.id}>{t.name}</option>)}
            </optgroup>
          ) : null}
        </select>
      </div>
      {chosen ? (
        <>
          <div className="field">
            <label htmlFor={ids.start}>First day of the new year</label>
            <input id={ids.start} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="btn-row template-delete">
            <button className="btn btn-secondary btn-danger" type="button" onClick={() => { setDeleteError(null); setDeleting(true); }}>
              Delete this template
            </button>
          </div>
        </>
      ) : (
        <>
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
        </>
      )}
      {tried && problem ? <p className="field-error" role="alert">{problem}</p> : null}
      {!problem ? (
        <div className="template-preview" aria-live="polite">
          {nothingToAdd ? (
            <p className="event-preview-title">{skipped > 0 ? "Nothing new to add: these breaks are already in your days off." : "No breaks in this range."}</p>
          ) : (
            <>
              <p className="event-preview-title">{add.length === 1 ? "1 break to add" : `${add.length} breaks to add`}</p>
              <ul>{add.map((b) => <li key={`${b.start}/${b.end}/${b.label}`}>{breakText(b, kindLabels)}</li>)}</ul>
              {skipped > 0 ? <p className="hint">{skipped} already in your days off</p> : null}
            </>
          )}
        </div>
      ) : null}
      <div className="btn-row">
        <button className="btn" type="submit" disabled={saving || nothingToAdd}>{saving ? "Adding…" : "Add breaks"}</button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>Cancel</button>
      </div>
      {deleting && chosen ? (
        <ConfirmDialog
          title={`Delete ${chosen.name}?`}
          confirmLabel="Delete"
          busy={saving}
          error={deleteError}
          onConfirm={() => remove(chosen)}
          onCancel={() => setDeleting(false)}
        >
          <p>Days off already added stay as they are.</p>
        </ConfirmDialog>
      ) : null}
    </form>
  );
}
