/** /schedule/settings (S2a-13): family name, week start, school days and time zone. */
import { useId, useMemo, useState, type FormEvent } from "react";
import { apiPatch } from "../../api/client";
import type { FamilySettings } from "../../api/types";
import { useApi } from "../../api/useApi";
import { useAuth } from "../../auth/AuthProvider";
import "../../ui/forms.css";
import { saveError, WeekdayPicker } from "./formBits";
import { BackToSchedule } from "./ScheduleHub";
import "./schedule.css";

const NAME_MAX = 60;

/** Every zone this browser knows, with the current one first when it isn't in the list (e.g. an alias). */
export function timeZoneOptions(current: string): string[] {
  let zones: string[] = [];
  try {
    zones = Intl.supportedValuesOf("timeZone");
  } catch {
    zones = [];
  }
  return zones.includes(current) ? zones : [current, ...zones];
}

export function FamilySettingsPage() {
  const { data, error, loading, reload, setData } = useApi<FamilySettings>("/api/family");
  return (
    <section className="schedule">
      <BackToSchedule />
      <h1>Family settings</h1>
      {loading ? (
        <p aria-busy="true">Loading…</p>
      ) : error || !data ? (
        <div className="form-error" role="alert">
          <p>{error?.status === 0 ? "Can't reach the server." : "Couldn't load your settings."}</p>
          <button className="btn btn-secondary" type="button" onClick={reload}>Retry</button>
        </div>
      ) : (
        <SettingsForm initial={data} onSaved={(s) => setData(s)} />
      )}
    </section>
  );
}

function SettingsForm({ initial, onSaved }: { initial: FamilySettings; onSaved: (s: FamilySettings) => void }) {
  const { refresh } = useAuth();
  const [name, setName] = useState(initial.name);
  const [weekStart, setWeekStart] = useState(initial.weekStart);
  const [schoolDays, setSchoolDays] = useState<number[]>(initial.schoolDays);
  const [timeZone, setTimeZone] = useState(initial.timeZone);
  const [nameError, setNameError] = useState<string | null>(null);
  const [daysError, setDaysError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const zones = useMemo(() => timeZoneOptions(initial.timeZone), [initial.timeZone]);
  const nameId = useId();
  const nameErrId = useId();
  const tzId = useId();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setStatus(null);
    setFormError(null);
    const trimmed = name.trim();
    const nErr = !trimmed ? "Name is required." : trimmed.length > NAME_MAX ? `Name must be ${NAME_MAX} characters or fewer.` : null;
    const dErr = schoolDays.length === 0 ? "Pick at least one school day." : null;
    setNameError(nErr);
    setDaysError(dErr);
    if (nErr || dErr) return;

    const patch: Partial<FamilySettings> = {};
    if (trimmed !== initial.name) patch.name = trimmed;
    if (weekStart !== initial.weekStart) patch.weekStart = weekStart;
    const days = [...schoolDays].sort((a, b) => a - b);
    if (days.join() !== [...initial.schoolDays].sort((a, b) => a - b).join()) patch.schoolDays = days;
    if (timeZone !== initial.timeZone) patch.timeZone = timeZone;
    if (Object.keys(patch).length === 0) return setStatus("Nothing to save.");

    setSaving(true);
    try {
      const saved = await apiPatch<FamilySettings>("/api/family", patch);
      onSaved(saved);
      setName(saved.name);
      setSchoolDays(saved.schoolDays);
      // The header name and the plan's week start/columns come from /api/me.
      await refresh();
      setStatus("Saved.");
    } catch (err) {
      setFormError(saveError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card schedule-form" aria-label="Family settings" onSubmit={submit} noValidate>
      {formError ? <p className="form-error" role="alert">{formError}</p> : null}
      <div className="field">
        <label htmlFor={nameId}>Family name</label>
        <input
          id={nameId}
          type="text"
          value={name}
          autoComplete="off"
          maxLength={80}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? nameErrId : undefined}
          onChange={(e) => setName(e.target.value)}
        />
        {nameError ? <p id={nameErrId} className="field-error" role="alert">{nameError}</p> : null}
      </div>
      <fieldset className="choice-list">
        <legend>Week starts on</legend>
        <label className="choice">
          <input type="radio" name="weekStart" checked={weekStart === "mon"} onChange={() => setWeekStart("mon")} />
          Monday
        </label>
        <label className="choice">
          <input type="radio" name="weekStart" checked={weekStart === "sun"} onChange={() => setWeekStart("sun")} />
          Sunday
        </label>
      </fieldset>
      <WeekdayPicker legend="School days" value={schoolDays} onChange={setSchoolDays} error={daysError} />
      <div className="field">
        <label htmlFor={tzId}>Time zone</label>
        <select id={tzId} value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
          {zones.map((z) => (
            <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
          ))}
        </select>
        <p className="hint">Decides what "today" is for the plan.</p>
      </div>
      <div className="btn-row">
        <button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </div>
      <p className="form-status" role="status">{status}</p>
    </form>
  );
}
