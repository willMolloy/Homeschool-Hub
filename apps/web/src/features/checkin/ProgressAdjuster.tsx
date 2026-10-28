/**
 * One check-in row's "where did they get to?" control (S2b-36). Controlled and pure: the position comes in
 * as a prop and changes go out through onChange; it never fetches or saves.
 */
import { useId, useState, type KeyboardEvent } from "react";
import type { UnitType } from "@hh/engine";
import { unitNumber } from "../../components/unitLabels";
import { chipsFor, clamp, fieldLabel, progressLabel, progressState, sliderMax, type PlannedRange } from "./progress";

export interface ProgressAdjusterProps extends PlannedRange {
  unitType: UnitType;
  position: number;
  /** Names the controls for assistive tech, e.g. "Treasure Island for Frank". */
  name: string;
  onChange: (position: number) => void;
}

export function ProgressAdjuster(props: ProgressAdjusterProps) {
  const { plannedFrom, plannedTo, totalUnits, unitType, position, name, onChange } = props;
  const [draft, setDraft] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const fieldId = useId();
  const errorId = useId();
  const statusId = useId();
  const max = sliderMax(props);
  const min = Math.min(plannedFrom, max);
  const state = progressState(position, plannedTo);
  const label = state === "asPlanned" ? "✓ Done as planned" : progressLabel(unitType, position, plannedTo);

  const set = (n: number) => {
    setDraft(null);
    setFieldError(null);
    onChange(n);
  };
  const onField = (text: string) => {
    setDraft(text);
    const n = Number(text);
    // S2c-02 (D26): the same floor as the slider: where the week started.
    if (text.trim() === "" || !Number.isFinite(n) || n < min - 1e-9 || n > totalUnits) {
      setFieldError(`Enter a number from ${unitNumber(min)} to ${unitNumber(totalUnits)}.`);
      return;
    }
    setFieldError(null);
    onChange(Math.round(n * 100) / 100);
  };
  const onSliderKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    set(clamp(position + step, min, max));
  };
  const pct = (n: number) => `${max > min ? ((clamp(n, min, max) - min) / (max - min)) * 100 : 100}%`;

  return (
    <div className="progress-adjuster" role="group" aria-label={`Progress on ${name}`}>
      <div className="progress-chips btn-row">
        {chipsFor(props).map((c) => (
          <button key={c.label} type="button" className="chip" aria-pressed={position === c.position} onClick={() => set(c.position)}>
            {c.label}
          </button>
        ))}
        {state !== "asPlanned" && (
          <button type="button" className="btn-link" onClick={() => set(plannedTo)}>Reset</button>
        )}
      </div>
      <div className="progress-bar" aria-hidden="true">
        <span className="progress-bar-planned" style={{ width: pct(plannedTo) }} />
        <span className="progress-bar-actual" style={{ width: pct(position) }} />
      </div>
      <input type="range" className="progress-slider" min={min} max={max} step="any" value={clamp(position, min, max)}
        aria-label={`Where ${name} got to`} aria-valuetext={label} aria-describedby={statusId}
        onChange={(e) => set(Number(e.target.value))} onKeyDown={onSliderKey} />
      <div className="progress-field">
        <label htmlFor={fieldId}>{fieldLabel(unitType)}</label>
        <input id={fieldId} type="number" inputMode="decimal" min={min} max={totalUnits} step="any"
          value={draft ?? String(position)} aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? errorId : undefined}
          onChange={(e) => onField(e.target.value)} onBlur={() => { if (!fieldError) setDraft(null); }} />
      </div>
      {fieldError && <p id={errorId} className="progress-error">{fieldError}</p>}
      <p id={statusId} className="progress-label" aria-live="polite">{label}</p>
    </div>
  );
}
