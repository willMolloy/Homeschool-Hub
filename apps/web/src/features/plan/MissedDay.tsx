/**
 * S4-10: "Missed a day?" on This Week. A small sheet to pick a school day of the shown week (up to today) and who
 * missed it (Everyone, or one child), then a day off of kind "missed" is saved and the plan reloads. The engine
 * carries that day's work forward (S4-00).
 */
import { useState } from "react";
import { addDays, weekdayOf, type LocalDate } from "@hh/engine";
import { apiPost } from "../../api/client";
import type { BlockedRange, Child } from "../../api/types";
import { useApi } from "../../api/useApi";
import { useMe } from "../../auth/AuthProvider";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { saveError, WEEKDAYS } from "../schedule/formBits";
import "../schedule/schedule.css";
import { usePlanRefresh } from "./planRefresh";
import "./plan.css";

export const EVERYONE = "everyone";
const SHORT = Object.fromEntries(WEEKDAYS.map((d) => [d.value, d.short]));
const LONG = Object.fromEntries(WEEKDAYS.map((d) => [d.value, d.long]));

/**
 * The days to offer: school days of the week from `weekStart` up to `today` that aren't already fully off for `who`
 * (a day off for the whole family, or one that names that child; for Everyone, also when every child has one).
 */
export function offeredMissedDays(opts: {
  weekStart: LocalDate;
  today: LocalDate;
  schoolDays: readonly number[];
  ranges: readonly BlockedRange[];
  childIds: readonly string[];
  who: string;
}): LocalDate[] {
  const { weekStart, today, schoolDays, ranges, childIds, who } = opts;
  const off = (date: LocalDate, id: string) =>
    ranges.some((r) => r.startDate <= date && date <= r.endDate && (r.childIds.length === 0 || r.childIds.includes(id)));
  const familyOff = (date: LocalDate) => ranges.some((r) => r.startDate <= date && date <= r.endDate && r.childIds.length === 0);
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).filter((d) =>
    d <= today && schoolDays.includes(weekdayOf(d)) &&
    !(who === EVERYONE ? familyOff(d) || childIds.length === 0 || childIds.every((id) => off(d, id)) : off(d, who)));
}

export function MissedDay({ weekStart }: { weekStart: LocalDate }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-secondary missed-day-open" onClick={() => setOpen(true)}>Missed a day?</button>
      <ResponsiveSheet open={open} onOpenChange={setOpen} title="Missed a day?">
        {open && <MissedDayForm weekStart={weekStart} onDone={() => setOpen(false)} />}
      </ResponsiveSheet>
    </>
  );
}

function MissedDayForm({ weekStart, onDone }: { weekStart: LocalDate; onDone: () => void }) {
  const me = useMe();
  const children = useApi<Child[]>("/api/children");
  const ranges = useApi<BlockedRange[]>("/api/blocked-ranges");
  const { invalidate } = usePlanRefresh();
  const [who, setWho] = useState(EVERYONE);
  const [day, setDay] = useState<LocalDate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (children.error || ranges.error) return <p className="form-error" role="alert">Couldn't load your days off.</p>;
  if (!children.data || !ranges.data) return <p aria-busy="true">Loading…</p>;

  const active = children.data.filter((c) => !c.archived);
  const offered = offeredMissedDays({
    weekStart, today: me.today, schoolDays: me.schoolDays, ranges: ranges.data, childIds: active.map((c) => c.id), who,
  });
  const chosen = day !== null && offered.includes(day) ? day : null;

  async function save() {
    if (chosen === null || saving) return;
    setSaving(true);
    setError(null);
    try {
      await apiPost<BlockedRange>("/api/blocked-ranges", {
        label: "Missed day", kind: "missed", startDate: chosen, endDate: chosen, childIds: who === EVERYONE ? [] : [who],
      });
      invalidate();
      onDone();
    } catch (err) {
      setError(saveError(err));
      setSaving(false);
    }
  }

  return (
    <form className="missed-day" aria-label="Missed a day" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {active.length > 1 ? (
        <fieldset className="day-picker">
          <legend>Who</legend>
          <div className="missed-options">
            {[{ id: EVERYONE, name: "Everyone" }, ...active].map((c) => (
              <label key={c.id} className="day-chip missed-chip">
                <input type="radio" name="missed-who" checked={who === c.id} onChange={() => setWho(c.id)} />
                <span>{c.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <fieldset className="day-picker">
        <legend>Day</legend>
        {offered.length === 0 ? <p>No days to mark.</p> : (
          <div className="missed-options">
            {offered.map((d) => (
              <label key={d} className="day-chip missed-chip">
                <input type="radio" name="missed-day" checked={chosen === d} aria-label={`${LONG[weekdayOf(d)]} ${Number(d.slice(8))}`} onChange={() => setDay(d)} />
                <span aria-hidden="true">{SHORT[weekdayOf(d)]} {Number(d.slice(8))}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <div className="btn-row">
        <button className="btn" type="submit" disabled={chosen === null || saving}>{saving ? "Saving…" : "Save"}</button>
        <button className="btn btn-secondary" type="button" onClick={onDone} disabled={saving}>Cancel</button>
      </div>
    </form>
  );
}
