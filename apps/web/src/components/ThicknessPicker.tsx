/**
 * Pick a subject's usual effort (weight per unit) with presets, a custom value and a live preview (S2b-34, D22).
 * Presets are native radios, so arrow keys move between them and the group is announced by its legend.
 * S6b-13: the parent sees minutes, never the weight. S7-17: minutes per unit ("Light · 15 min a lesson", Custom is the
 * minutes one lesson or page takes), worded by `effortWords`.
 */
import { useEffect, useId, useRef, useState } from "react";
import { DEFAULT_WEIGHT_PER_UNIT, type UnitType } from "@hh/engine";
import { thicknessToPx } from "../features/plan/scale";
import {
  PRESETS, REFERENCE_THICKNESS, TYPICAL_DAY, parseCustomMinutes, presetFor, presetWeight, previewCaption, type PresetKey,
} from "./weightPresets";
import { customMinutesText, presetChipDetail, usualEffortText } from "./effortWords";
import { UNIT_LABELS } from "./unitLabels";
import "./thickness-picker.css";

export interface ThicknessPickerProps {
  unitType: UnitType;
  /** null = no weight of its own (the built-in, or whatever the caller falls back to). */
  value: number | null;
  onChange: (value: number | null) => void;
  legend?: string;
  /**
   * S2c-03: false while Custom is open with an empty or invalid entry (the value then still holds the last
   * valid weight, so a caller must not save it); true otherwise. Called on mount and on every change.
   */
  onValidityChange?: (valid: boolean) => void;
}

/** The caption while the Custom entry can't be previewed (S2c-03). */
export const INVALID_CAPTION = "Enter the minutes to see the preview";

export function ThicknessPicker({ unitType, value, onChange, legend = "Usual effort", onValidityChange }: ThicknessPickerProps) {
  const name = useId();
  const customId = useId();
  const errId = useId();
  // Custom stays selected while it's being typed, even when the number happens to equal a preset.
  // It is tied to the unit, so a unit change (the caller resets the value) closes it without an effect.
  const [customFor, setCustomFor] = useState<UnitType | null>(presetFor(unitType, value) === "custom" ? unitType : null);
  const [customText, setCustomText] = useState(value != null ? customMinutesText(unitType, value) : "");
  const [customError, setCustomError] = useState<string | null>(null);
  const selected: PresetKey = customFor === unitType ? "custom" : presetFor(unitType, value);
  const invalid = selected === "custom" && customError !== null;
  // Report on validity changes only; a new callback identity on each render isn't a change.
  const report = useRef(onValidityChange);
  report.current = onValidityChange;
  useEffect(() => report.current?.(!invalid), [invalid]);

  const choose = (key: PresetKey) => {
    setCustomError(null);
    if (key === "custom") {
      const start = value ?? DEFAULT_WEIGHT_PER_UNIT[unitType];
      setCustomFor(unitType);
      setCustomText(customMinutesText(unitType, start));
      if (value !== start) onChange(start);
      return;
    }
    setCustomFor(null);
    const preset = PRESETS.find((p) => p.key === key);
    onChange(preset ? presetWeight(unitType, preset.multiplier) : null);
  };
  const typeCustom = (raw: string) => {
    setCustomText(raw);
    const parsed = parseCustomMinutes(raw, unitType);
    if (typeof parsed === "string") setCustomError(parsed);
    else {
      setCustomError(null);
      onChange(parsed);
    }
  };

  const options: { key: PresetKey; label: string; detail?: string }[] = [
    { key: "none", label: "None" },
    ...PRESETS.map((p) => ({ key: p.key, label: p.label, detail: presetChipDetail(unitType, presetWeight(unitType, p.multiplier)) })),
    { key: "custom", label: "Custom…" },
  ];
  const shown = value ?? DEFAULT_WEIGHT_PER_UNIT[unitType];
  const thickness = TYPICAL_DAY[unitType].units * shown;

  return (
    <fieldset className="thickness-picker">
      <legend>{legend}</legend>
      <div className="thickness-presets">
        {options.map((o) => (
          <label key={o.key} className="thickness-preset">
            <input type="radio" name={name} value={o.key} checked={selected === o.key} onChange={() => choose(o.key)} />
            <span className="thickness-chip">{o.label}{o.detail ? <>{" "}<span className="thickness-detail">{o.detail}</span></> : null}</span>
          </label>
        ))}
      </div>
      {selected === "custom" ? (
        <div className="field thickness-custom">
          <label htmlFor={customId}>Custom minutes a {UNIT_LABELS[unitType].one}</label>
          <input id={customId} type="number" inputMode="decimal" step="any" min="0" max="1440"
            value={customText} onChange={(e) => typeCustom(e.target.value)}
            aria-invalid={customError ? true : undefined} aria-describedby={customError ? errId : undefined} />
          {customError ? <p id={errId} className="field-error" role="alert">{customError}</p> : null}
        </div>
      ) : null}
      <div className="thickness-preview">
        <div className="thickness-bar thickness-reference" data-testid="reference-bar" style={{ height: `${thicknessToPx(REFERENCE_THICKNESS)}px` }}
          role="img" aria-label="20 pages a day at the usual effort" />
        <div className="thickness-bar thickness-chosen" data-testid="preview-bar" style={{ height: `${thicknessToPx(thickness)}px` }}
          role="img" aria-label={`${TYPICAL_DAY[unitType].text} a day, ${usualEffortText(unitType, value)}`} />
      </div>
      <p className="hint thickness-caption">{invalid ? INVALID_CAPTION : previewCaption(unitType, value)}</p>
    </fieldset>
  );
}
