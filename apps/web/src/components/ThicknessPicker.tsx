/**
 * Pick a bar width (weight per unit) with presets, a custom value and a live preview (S2b-34, D22).
 * Presets are native radios, so arrow keys move between them and the group is announced by its legend.
 */
import { useId, useState } from "react";
import { DEFAULT_WEIGHT_PER_UNIT, MAX_WEIGHT_PER_UNIT, MIN_WEIGHT_PER_UNIT, type UnitType } from "@hh/engine";
import { thicknessToPx } from "../features/plan/scale";
import {
  PRESETS, REFERENCE_THICKNESS, TYPICAL_DAY, parseCustomWeight, presetFor, presetWeight, previewCaption, type PresetKey,
} from "./weightPresets";
import "./thickness-picker.css";

export interface ThicknessPickerProps {
  unitType: UnitType;
  /** null = no weight of its own (the built-in, or whatever the caller falls back to). */
  value: number | null;
  onChange: (value: number | null) => void;
  legend?: string;
}

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

export function ThicknessPicker({ unitType, value, onChange, legend = "Bar width" }: ThicknessPickerProps) {
  const name = useId();
  const customId = useId();
  const errId = useId();
  // Custom stays selected while it's being typed, even when the number happens to equal a preset.
  // It is tied to the unit, so a unit change (the caller resets the value) closes it without an effect.
  const [customFor, setCustomFor] = useState<UnitType | null>(presetFor(unitType, value) === "custom" ? unitType : null);
  const [customText, setCustomText] = useState(value != null ? String(value) : "");
  const [customError, setCustomError] = useState<string | null>(null);
  const selected: PresetKey = customFor === unitType ? "custom" : presetFor(unitType, value);

  const choose = (key: PresetKey) => {
    setCustomError(null);
    if (key === "custom") {
      const start = value ?? DEFAULT_WEIGHT_PER_UNIT[unitType];
      setCustomFor(unitType);
      setCustomText(String(start));
      if (value !== start) onChange(start);
      return;
    }
    setCustomFor(null);
    const preset = PRESETS.find((p) => p.key === key);
    onChange(preset ? presetWeight(unitType, preset.multiplier) : null);
  };
  const typeCustom = (raw: string) => {
    setCustomText(raw);
    const parsed = parseCustomWeight(raw);
    if (typeof parsed === "string") setCustomError(parsed);
    else {
      setCustomError(null);
      onChange(parsed);
    }
  };

  const options: { key: PresetKey; label: string; detail?: string }[] = [
    { key: "none", label: "None" },
    ...PRESETS.map((p) => ({ key: p.key, label: p.label, detail: fmt(presetWeight(unitType, p.multiplier)) })),
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
          <label htmlFor={customId}>Custom weight</label>
          <input id={customId} type="number" inputMode="decimal" step="0.01" min={MIN_WEIGHT_PER_UNIT} max={MAX_WEIGHT_PER_UNIT}
            value={customText} onChange={(e) => typeCustom(e.target.value)}
            aria-invalid={customError ? true : undefined} aria-describedby={customError ? errId : undefined} />
          {customError ? <p id={errId} className="field-error" role="alert">{customError}</p> : null}
        </div>
      ) : null}
      <div className="thickness-preview">
        <div className="thickness-bar thickness-reference" data-testid="reference-bar" style={{ height: `${thicknessToPx(REFERENCE_THICKNESS)}px` }}
          role="img" aria-label={`20 pages at normal weight: thickness ${fmt(REFERENCE_THICKNESS)}`} />
        <div className="thickness-bar thickness-chosen" data-testid="preview-bar" style={{ height: `${thicknessToPx(thickness)}px` }}
          role="img" aria-label={`${TYPICAL_DAY[unitType].text} a day: thickness ${fmt(thickness)}`} />
      </div>
      <p className="hint thickness-caption">{previewCaption(unitType, value)}</p>
    </fieldset>
  );
}
