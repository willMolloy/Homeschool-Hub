/**
 * S7b-02: "Update time estimate" under the edit bar's More. The parent says, in minutes, how long a day of this
 * assignment really takes; Save turns that into a weight per unit at the assignment's own pace (the engine's
 * `weightFromMinutesPerDay`) and PATCHes just that, so the dates and amounts don't move and the choice carries
 * forward (S2b-07/08). It replaces Heavier and Lighter; no weight is ever named.
 */
import { useId, useState, type FormEvent } from "react";
import { isLearnedUnit, minutesPerDayFromWeight, weightFromMinutesPerDay, weightPerUnitOf } from "@hh/engine";
import { ApiError, apiPatch } from "../../api/client";
import type { Assignment, Subject } from "../../api/types";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { optionFor, paceText, PRESET_MINUTES, wholeMinutes } from "../schedule/effort";
import { parsePositive } from "../schedule/formBits";
import "../../ui/forms.css";
import "../schedule/schedule.css";

const MAX_MINUTES_A_DAY = 1440;

interface Props {
  assignment: Assignment | undefined;
  subject: Subject | undefined;
  /** The children on the assignment, by name. */
  childNames: string[];
  /** Units a day at the assignment's own pace (its days, else the subject's, else every school day). */
  pace: number | null;
  onSaved: (saved: Assignment) => void;
  onClose: () => void;
}

export function UpdateEstimateSheet({ assignment, subject, childNames, pace, onSaved, onClose }: Props) {
  return (
    <ResponsiveSheet open={assignment !== undefined} onOpenChange={(o) => { if (!o) onClose(); }} title="Update time estimate">
      {assignment && pace !== null ? (
        <EstimateForm key={assignment.id} assignment={assignment} subject={subject} childNames={childNames} pace={pace} onSaved={onSaved} onCancel={onClose} />
      ) : assignment ? <p className="hint">Add dates and days to this assignment first, then say how long a day takes.</p> : null}
    </ResponsiveSheet>
  );
}

/** "Frank's", "Their": whose next books the answer teaches. */
const whose = (names: string[]) => (names.length === 1 ? `${names[0]}'s` : "Their");

function EstimateForm({ assignment: a, subject, childNames, pace, onSaved, onCancel }: Omit<Props, "assignment" | "pace" | "onClose"> & { assignment: Assignment; pace: number; onCancel: () => void }) {
  const id = useId();
  const weight = weightPerUnitOf(a, subject?.defaultWeight ?? null).weight;
  const current = minutesPerDayFromWeight(weight, pace);
  const nearest = optionFor(current);
  const [choice, setChoice] = useState<number | "custom">(nearest);
  const [custom, setCustom] = useState(String(wholeMinutes(current)));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const minutes = choice === "custom" ? parsePositive(custom, "Minutes", MAX_MINUTES_A_DAY) : choice;
    if (typeof minutes === "string") return setError(minutes);
    setError(null);
    setSaving(true);
    try {
      onSaved(await apiPatch<Assignment>(`/api/assignments/${a.id}`, { weightPerUnit: weightFromMinutesPerDay(minutes, pace) }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <p className="tl-edit-title">{a.title}</p>
      <p className="hint">We estimated about {wholeMinutes(current)} min a day ({paceText(pace, a.unitType).replace(/^About/, "about")}).</p>
      <fieldset className="effort">
        <legend>How long is it actually taking?</legend>
        <div className="effort-options">
          {PRESET_MINUTES.map((m) => (
            <label key={m} className="effort-chip">
              <input type="radio" name={id} checked={choice === m} onChange={() => setChoice(m)} onClick={() => setChoice(m)} />
              <span>{m} min a day</span>
            </label>
          ))}
          <label className="effort-chip">
            <input type="radio" name={id} checked={choice === "custom"} onChange={() => setChoice("custom")} />
            <span>Custom</span>
          </label>
        </div>
        {choice === "custom" ? (
          <label className="effort-custom">
            <span>Minutes a day</span>
            <input type="number" inputMode="decimal" min="0" step="any" value={custom} onChange={(e) => setCustom(e.target.value)} aria-invalid={error ? true : undefined} />
          </label>
        ) : null}
      </fieldset>
      {isLearnedUnit(a.unitType) && subject && childNames.length > 0 ? (
        <p className="hint">{whose(childNames)} next {subject.name} books will start from this too.</p>
      ) : null}
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      <div className="btn-row">
        <button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
