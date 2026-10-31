/** S8-02: the Appearance row: Light / Dark / System, applied at once and remembered on this device. */
import { useState } from "react";
import { readTheme, setTheme, type ThemeChoice } from "../../lib/theme";

const LABELS: readonly { value: ThemeChoice; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function AppearanceChoice() {
  const [choice, setChoice] = useState<ThemeChoice>(() => readTheme());
  return (
    <fieldset className="choice-list appearance">
      <legend>Appearance</legend>
      {LABELS.map(({ value, label }) => (
        <label className="choice" key={value}>
          <input type="radio" name="appearance" checked={choice === value}
            onChange={() => { setChoice(value); setTheme(value); }} />
          {label}
        </label>
      ))}
      <p className="hint">System follows this device's light or dark setting.</p>
    </fieldset>
  );
}
