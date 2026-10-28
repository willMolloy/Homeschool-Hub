/** "How should the plan absorb this?" for one row or a group going the same way (S2b-26). Controlled. */
import { useId } from "react";
import type { OverrideMode } from "@hh/engine";
import { CHOICES, type Direction } from "./absorb";

export interface AbsorbChoiceProps {
  direction: Direction;
  value: OverrideMode;
  onChange: (mode: OverrideMode) => void;
  /** Who it's about, for the group's name: "Story of the World for Margaret" or "the 2 rows behind". */
  about: string;
}

export function AbsorbChoice({ direction, value, onChange, about }: AbsorbChoiceProps) {
  const name = useId();
  return (
    <fieldset className="absorb-choice">
      <legend>How should the plan absorb this? <span className="checkin-sr-only">({about})</span></legend>
      {CHOICES[direction].map((c) => (
        <label key={c.mode} className="absorb-option">
          <input type="radio" name={name} value={c.mode} checked={value === c.mode} onChange={() => onChange(c.mode)} />
          {c.label}
        </label>
      ))}
    </fieldset>
  );
}
