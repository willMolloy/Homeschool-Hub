/**
 * S11-04, step 5: the year's breaks. The US holidays in the year, to tick (none are ticked to start with), and "Add a break" for
 * the family's own (a name and dates). Three ways out: Add breaks (saves what is ticked and added), I'll get back to you on this
 * (saves nothing, leaves a reminder on Home) and Skip (saves nothing, no reminder). A year left for later offers the current
 * school year's months, August to June.
 */
import { useId, useMemo, useState } from "react";
import { usHolidays } from "@hh/engine";
import { apiGet, apiPost } from "../../api/client";
import type { BlockedRange, FamilySettings, SetupDeferral } from "../../api/types";
import { useApi } from "../../api/useApi";
import { useMe } from "../../auth/AuthProvider";
import { Button } from "../../ui/components";
import { DateField } from "../../ui/DateField";
import { dateRangeError, saveError } from "../schedule/formBits";
import { breakDates, breakSaveBody, leaveOutExisting, type PlannedBreak } from "../schedule/templates";
import { StepHeading, useStep } from "./stepContext";
import { currentSchoolYear } from "./yearShapes";
import "../schedule/schedule.css";

const LABEL_MAX = 60;
const BREAK_DAYS_MAX = 366;

export function BreaksStep() {
  const family = useApi<FamilySettings>("/api/family");
  if (family.loading) return <><StepHeading>Any breaks this year?</StepHeading><p aria-busy="true">Loading…</p></>;
  return <BreaksForm saved={family.data?.schoolYear ?? null} />;
}

function BreaksForm({ saved }: { saved: { start: string; end: string } | null }) {
  const me = useMe();
  const { next, busy, fail } = useStep();
  const year = saved ?? currentSchoolYear(me.today);
  const holidays = useMemo(() => usHolidays(year.start, year.end), [year.start, year.end]);
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const [own, setOwn] = useState<PlannedBreak[]>([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const chosen = ticked.size + own.length;
  const rest = (d: SetupDeferral | null): SetupDeferral[] => [...me.setupDeferred.filter((x) => x !== "breaks"), ...(d ? [d] : [])];

  async function save() {
    if (busy || saving || chosen === 0) return;
    fail(null);
    setSaving(true);
    try {
      const planned: PlannedBreak[] = [
        ...holidays.filter((h) => ticked.has(h.key)).map((h): PlannedBreak => ({ label: h.label, kind: "holiday", start: h.start, end: h.end })),
        ...own,
      ];
      // A break that is already a day off for the whole family is not added twice.
      const { add } = leaveOutExisting(planned, await apiGet<BlockedRange[]>("/api/blocked-ranges"));
      if (add.length > 0) {
        await apiPost<BlockedRange[]>("/api/blocked-ranges/bulk", { blockedRanges: add.map(breakSaveBody) });
      }
      await next({ setupDeferred: rest(null) });
    } catch (err) {
      fail(saveError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <StepHeading>Any breaks this year?</StepHeading>
      {holidays.length > 0 ? (
        <fieldset className="choice-list welcome-holidays">
          <legend>Holidays</legend>
          {holidays.map((h) => (
            <label key={`${h.key}/${h.start}`} className="choice">
              <input type="checkbox" checked={ticked.has(h.key)} onChange={(e) => setTicked((prev) => { const n = new Set(prev); if (e.target.checked) n.add(h.key); else n.delete(h.key); return n; })} />
              <span>{h.label}: {breakDates(h.start, h.end)}</span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {own.length > 0 ? (
        <ul className="welcome-list" aria-label="Breaks you added">
          {own.map((b, i) => (
            <li key={`${b.start}/${b.end}/${b.label}`}>
              <span className="welcome-list-name">{b.label}: {breakDates(b.start, b.end)}</span>
              <button type="button" className="btn btn-quiet" aria-label={`Remove ${b.label}`} onClick={() => setOwn((l) => l.filter((_, j) => j !== i))}>Remove</button>
            </li>
          ))}
        </ul>
      ) : null}
      {adding ? (
        <OwnBreak onAdd={(b) => { setOwn((l) => [...l, b]); setAdding(false); }} onCancel={() => setAdding(false)} />
      ) : (
        <p className="welcome-more"><Button variant="secondary" onClick={() => setAdding(true)}>Add a break</Button></p>
      )}
      <div className="btn-row welcome-stack">
        <Button disabled={busy || saving || chosen === 0} onClick={() => void save()}>Add breaks</Button>
        <Button variant="secondary" disabled={busy || saving} onClick={() => void next({ setupDeferred: rest("breaks") })}>I'll get back to you on this</Button>
        <Button variant="quiet" disabled={busy || saving} onClick={() => void next({ setupDeferred: rest(null) })}>Skip</Button>
      </div>
    </div>
  );
}

/** A break of the family's own: a name and its first and last day. */
function OwnBreak({ onAdd, onCancel }: { onAdd: (b: PlannedBreak) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [errors, setErrors] = useState<{ name?: string; dates?: string }>({});
  const ids = { name: useId(), start: useId(), end: useId() };

  function add() {
    const t = name.trim();
    const errs: { name?: string; dates?: string } = {};
    if (!t) errs.name = "Give the break a name.";
    else if (t.length > LABEL_MAX) errs.name = `Names can be up to ${LABEL_MAX} characters.`;
    const d = dateRangeError(start, end, BREAK_DAYS_MAX);
    if (d) errs.dates = d === "Pick a start and an end date." ? "Pick the first and last day of the break." : d;
    setErrors(errs);
    if (!errs.name && !errs.dates) onAdd({ label: t, kind: "vacation", start, end });
  }

  return (
    <div className="welcome-own" role="group" aria-label="Add a break">
      <div className="field">
        <label htmlFor={ids.name}>Name of the break</label>
        <input id={ids.name} type="text" value={name} maxLength={80} autoComplete="off" aria-invalid={errors.name ? true : undefined} onChange={(e) => setName(e.target.value)} />
        {errors.name ? <p className="field-error" role="alert">{errors.name}</p> : null}
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor={ids.start}>First day</label>
          <DateField id={ids.start} value={start} onChange={setStart} aria-invalid={errors.dates ? true : undefined} />
        </div>
        <div className="field">
          <label htmlFor={ids.end}>Last day</label>
          <DateField id={ids.end} value={end} onChange={setEnd} aria-invalid={errors.dates ? true : undefined} />
        </div>
      </div>
      {errors.dates ? <p className="field-error" role="alert">{errors.dates}</p> : null}
      <div className="btn-row">
        <Button onClick={add}>Add</Button>
        <Button variant="quiet" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
