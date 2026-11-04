/**
 * S9-03: "Set up your log". Pick a template style (a starting point), then adjust the switches; with core and non-core hours
 * on, mark each subject core or non-core here too. Save sends the family's setup and any subject whose core changed.
 * Changing the setup never deletes logged data; it only decides which fields show.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiPatch } from "../../api/client";
import type { FamilySettings, LogFields, Subject } from "../../api/types";
import { Button, Segmented } from "../../ui/components";
import { FIELD_SWITCHES, HELP_LINE, STATE_LAWS_URL, TEMPLATES, hasAnyField, setupOf, toggleField } from "./logSetup";
import "./records.css";

export interface LogSetupFormProps {
  /** The current switches, or null for a family with no setup yet. */
  initial: LogFields | null;
  subjects: readonly Subject[];
  onSaved: (family: FamilySettings, subjects: Subject[]) => void;
  /** Present when changing an existing setup (a way back). */
  onCancel?: () => void;
}

export function LogSetupForm({ initial, subjects, onSaved, onCancel }: LogSetupFormProps) {
  const [fields, setFields] = useState<LogFields | null>(initial);
  const [core, setCore] = useState<Record<string, boolean>>(() => Object.fromEntries(subjects.map((s) => [s.id, s.core ?? false])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = subjects.filter((s) => !s.archived);
  const picked = fields ? setupOf(fields).template : null;

  async function save() {
    if (!fields || !hasAnyField(fields) || busy) return;
    setBusy(true);
    setError(null);
    try {
      const family = await apiPatch<FamilySettings>("/api/family", { logSetup: setupOf(fields) });
      // Only subjects the parent changed are written, and only when core and non-core hours are tracked.
      const changed = fields.coreSplit ? active.filter((s) => (s.core ?? false) !== core[s.id]) : [];
      const updated = await Promise.all(changed.map((s) => apiPatch<Subject>(`/api/subjects/${s.id}`, { core: core[s.id] })));
      onSaved(family, subjects.map((s) => updated.find((u) => u.id === s.id) ?? s));
    } catch (e) {
      setError(e instanceof ApiError && e.status === 400 ? e.message.replace(/^[a-zA-Z.\d]+: /, "") : "Couldn't save that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="log-setup" aria-label="Log setup" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <fieldset className="log-templates">
        <legend>Start from a style</legend>
        {TEMPLATES.map((t) => (
          <label key={t.id} className={`choice-card${picked === t.id ? " is-on" : ""}`}>
            <input type="radio" name="log-template" checked={picked === t.id} onChange={() => setFields({ ...t.fields })} />
            <span>{t.title}<small>{t.hint}</small></span>
          </label>
        ))}
        <p className="hint">
          {HELP_LINE} <a className="btn-link" href={STATE_LAWS_URL} target="_blank" rel="noreferrer noopener">See your state&apos;s homeschool laws</a>
        </p>
      </fieldset>

      {fields ? (
        <>
          <fieldset className="log-switches">
            <legend>What to track</legend>
            {FIELD_SWITCHES.map((s) => (
              <label key={s.key} className="choice-row">
                <input type="checkbox" role="switch" checked={fields[s.key]} onChange={() => setFields(toggleField(fields, s.key))} />
                <span>{s.label}{s.hint ? <small>{s.hint}</small> : null}</span>
              </label>
            ))}
            {!hasAnyField(fields) ? <p className="field-error" role="alert">Pick at least one thing to track.</p> : null}
          </fieldset>

          {fields.coreSplit ? (
            <fieldset className="log-core">
              <legend>Which subjects are core?</legend>
              {active.length === 0 ? <p className="hint">Add your subjects in <Link to="/setup/subjects">Set up</Link>, then mark each as core or non-core.</p> : active.map((s) => (
                <div key={s.id} className="log-core-row">
                  <span>{s.name}</span>
                  <Segmented label={`${s.name} is`} value={core[s.id] ? "core" : "non"} onChange={(v) => setCore((c) => ({ ...c, [s.id]: v === "core" }))}
                    options={[{ value: "core", label: "Core" }, { value: "non", label: "Non-core" }]} />
                </div>
              ))}
            </fieldset>
          ) : null}
        </>
      ) : null}

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="btn-row">
        <Button type="submit" disabled={!fields || !hasAnyField(fields) || busy}>{busy ? "Saving…" : "Save"}</Button>
        {onCancel ? <Button variant="secondary" onClick={onCancel}>Cancel</Button> : null}
      </div>
    </form>
  );
}
