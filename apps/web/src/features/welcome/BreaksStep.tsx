/**
 * S11-04, step 5: the year's breaks. US holidays in the year, each added on its own, and "Add a break" for one of the
 * family's own. DeeDee: one break at a time, each with its own save. Continue, I'll get back to you on this, and Skip
 * do not save another break. A year left for later offers the current school year's months, August to June.
 */
import { useId, useMemo, useState } from "react";
import { usHolidays } from "@hh/engine";
import { apiDelete } from "../../api/client";
import type { BlockedRange, FamilySettings, SetupDeferral } from "../../api/types";
import { useApi } from "../../api/useApi";
import { useMe } from "../../auth/AuthProvider";
import { Button } from "../../ui/components";
import { DateField } from "../../ui/DateField";
import { dateRangeError, saveError } from "../schedule/formBits";
import { saveOneBreak } from "../schedule/breakOverlap";
import { useBreakOverlap } from "../schedule/useBreakOverlap";
import { breakDates, breakSaveBody, type PlannedBreak } from "../schedule/templates";
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
  const overlap = useBreakOverlap(me.schoolDays);
  const { next, busy, fail } = useStep();
  const year = saved ?? currentSchoolYear(me.today);
  const holidays = useMemo(() => usHolidays(year.start, year.end), [year.start, year.end]);
  const stored = useApi<BlockedRange[]>("/api/blocked-ranges");
  const [addedKeys, setAddedKeys] = useState<ReadonlySet<string>>(new Set());
  const [own, setOwn] = useState<BlockedRange[]>([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const rest = (d: SetupDeferral | null): SetupDeferral[] => [...me.setupDeferred.filter((x) => x !== "breaks"), ...(d ? [d] : [])];
  const have = [...(stored.data ?? []), ...own];

  function alreadySaved(start: string, end: string, label: string): boolean {
    return have.some((b) => b.startDate === start && b.endDate === end && b.label === label && b.childIds.length === 0);
  }

  async function addBreak(b: PlannedBreak, key: string): Promise<BlockedRange | null> {
    if (busy || saving || addedKeys.has(key) || alreadySaved(b.start, b.end, b.label ?? "")) return null;
    fail(null);
    setSaving(true);
    try {
      const body = breakSaveBody(b);
      const created = await saveOneBreak(overlap.ask, body, have);
      if (!created) return null;
      setAddedKeys((prev) => new Set(prev).add(key));
      setOwn((list) => [...list, created]);
      return created;
    } catch (err) {
      fail(saveError(err));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function removeOwn(id: string) {
    if (saving) return;
    fail(null);
    setSaving(true);
    try {
      await apiDelete(`/api/blocked-ranges/${id}`);
      setOwn((list) => list.filter((b) => b.id !== id));
    } catch (err) {
      fail(saveError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <StepHeading>Any breaks this year?</StepHeading>
      <p className="hint">Add one break at a time. Each one is saved on its own.</p>
      {holidays.length > 0 ? (
        <fieldset className="choice-list welcome-holidays">
          <legend>Holidays</legend>
          <ul className="welcome-list">
            {holidays.map((h) => {
              const key = `${h.key}/${h.start}`;
              const done = addedKeys.has(key) || alreadySaved(h.start, h.end, h.label);
              return (
                <li key={key}>
                  <span className="welcome-list-name">{h.label}: {breakDates(h.start, h.end)}</span>
                  <Button variant="secondary" aria-label={done ? `Added ${h.label}` : `Add ${h.label}`} disabled={busy || saving || done} onClick={() => void addBreak({ label: h.label, kind: "holiday", start: h.start, end: h.end }, key)}>{done ? "Added" : "Add"}</Button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}
      {own.length > 0 ? (
        <ul className="welcome-list" aria-label="Breaks you added">
          {own.filter((b) => !holidays.some((h) => h.start === b.startDate && h.end === b.endDate && h.label === b.label)).map((b) => (
            <li key={b.id}>
              <span className="welcome-list-name">{b.label}: {breakDates(b.startDate, b.endDate)}</span>
              <button type="button" className="btn btn-quiet" aria-label={`Remove ${b.label}`} disabled={saving} onClick={() => void removeOwn(b.id)}>Remove</button>
            </li>
          ))}
        </ul>
      ) : null}
      {adding ? (
        <OwnBreak onAdd={async (b) => { if (await addBreak(b, `own/${b.start}/${b.end}/${b.label}`)) setAdding(false); }} onCancel={() => setAdding(false)} />
      ) : (
        <p className="welcome-more"><Button variant="secondary" disabled={busy || saving} onClick={() => setAdding(true)}>Add a break</Button></p>
      )}
      <div className="btn-row welcome-stack">
        <Button disabled={busy || saving} onClick={() => void next({ setupDeferred: rest(null) })}>Continue</Button>
        <Button variant="secondary" disabled={busy || saving} onClick={() => void next({ setupDeferred: rest("breaks") })}>I'll get back to you on this</Button>
        <Button variant="quiet" disabled={busy || saving} onClick={() => void next({ setupDeferred: rest(null) })}>Skip</Button>
      </div>
      {overlap.sheet}
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
