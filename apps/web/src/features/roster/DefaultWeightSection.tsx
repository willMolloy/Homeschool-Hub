/**
 * The subject form's optional "Usual effort" (S2b-35, D21; S7-17: was "Default bar width"): a unit plus the thickness picker.
 * Changing the unit resets the picker to None, since a weight per lesson isn't a weight per minute.
 */
import { useId, useState, type ReactNode } from "react";
import type { SubjectDefaultWeight, UnitType } from "../../api/types";
import { ThicknessPicker } from "../../components/ThicknessPicker";
import { unitTitle } from "../../components/unitLabels";

/** The order the ticket lists them in: the units where pages don't tell the story come first. */
export const DEFAULT_WEIGHT_UNITS: readonly UnitType[] = ["lessons", "minutes", "pages", "chapters"];

export interface DefaultWeightDraft {
  unitType: UnitType;
  weightPerUnit: number | null;
}

export const draftFrom = (d: SubjectDefaultWeight | null): DefaultWeightDraft =>
  d ? { unitType: d.unitType, weightPerUnit: d.weightPerUnit } : { unitType: DEFAULT_WEIGHT_UNITS[0]!, weightPerUnit: null };

/** What Save sends: the pair, or null when the picker is None. */
export const draftValue = (d: DefaultWeightDraft): SubjectDefaultWeight | null =>
  d.weightPerUnit == null ? null : { unitType: d.unitType, weightPerUnit: d.weightPerUnit };

interface Props {
  value: DefaultWeightDraft;
  onChange: (value: DefaultWeightDraft) => void;
  /** Shown under the picker, e.g. the affected-assignments note. */
  note?: ReactNode;
  /** A server error about the default. */
  error?: string | null;
  /** S2c-03: the picker's Custom entry is (in)valid; the form must not save while it's invalid. */
  onValidityChange?: (valid: boolean) => void;
}

export function DefaultWeightSection({ value, onChange, note, error, onValidityChange }: Props) {
  const unitId = useId();
  // Open on first render when there's a stored default; after that the user's toggle wins.
  const [startOpen] = useState(value.weightPerUnit != null);
  return (
    <details className="default-weight" open={startOpen || undefined}>
      <summary>Usual effort (optional)</summary>
      <p className="hint">
        For subjects where pages don't tell the story, like math lessons or practice minutes. New assignments in this subject start here.
      </p>
      <div className="field">
        <label htmlFor={unitId}>Usually measured in</label>
        <select id={unitId} value={value.unitType} onChange={(e) => onChange({ unitType: e.target.value as UnitType, weightPerUnit: null })}>
          {DEFAULT_WEIGHT_UNITS.map((u) => (
            <option key={u} value={u}>{unitTitle(u)}</option>
          ))}
        </select>
      </div>
      <ThicknessPicker
        unitType={value.unitType}
        value={value.weightPerUnit}
        onChange={(w) => onChange({ ...value, weightPerUnit: w })}
        legend="Usual effort"
        onValidityChange={onValidityChange}
      />
      {note}
      {error ? <p className="field-error" role="alert">{error}</p> : null}
    </details>
  );
}
