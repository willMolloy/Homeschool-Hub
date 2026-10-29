/**
 * One check-in row (T-09), shared by last week's card and the per-student sheet. Collapsed it is the
 * assignment, its plan and a quiet check; tapping it opens, inline, As planned / Less / More and, off plan, a
 * − / + stepper for the amount done. Changed rows show the amount ("2 of 3 ch.") and Undo. Presentational.
 */
import { useId, useState, type CSSProperties } from "react";
import type { CheckInItem } from "../../api/types";
import {
  choiceOf, compactText, doneAmount, maxAmount, plannedAmount, positionOfAmount, shortRangeText, startAmount,
  stepDown, stepUp, type Choice,
} from "./amount";

export interface CheckInRowProps {
  item: CheckInItem;
  /** Where the child got to; `item.plannedTo` is as planned. */
  position: number;
  onChange: (position: number) => void;
  /** Rows added with Add progress (S2c-06) are removed rather than undone. */
  onRemove?: () => void;
  disabled: boolean;
  error?: string;
  /** Start open (a row just added, or one with an error). */
  defaultOpen?: boolean;
  style?: CSSProperties;
}

const CHOICE_LABELS: readonly { choice: Choice; label: string }[] = [
  { choice: "asPlanned", label: "As planned" },
  { choice: "less", label: "Less" },
  { choice: "more", label: "More" },
];

export function CheckInRow({ item, position, onChange, onRemove, disabled, error, defaultOpen = false, style }: CheckInRowProps) {
  const [open, setOpen] = useState(defaultOpen);
  const detailId = useId();
  const unplanned = plannedAmount(item) <= 0;
  const choice = choiceOf(item, position);
  const changed = choice !== "asPlanned";
  const done = doneAmount(item, position);
  const name = `${item.title} for ${item.childName}`;
  const pick = (c: Choice) => {
    if (c === "asPlanned") return onChange(item.plannedTo);
    if (c === choice) return;
    const n = startAmount(item, c);
    if (n !== null) onChange(positionOfAmount(item, n));
  };
  const opened = open || Boolean(error);

  return (
    <li className={`checkin-row${changed ? " is-changed" : ""}`} style={style}>
      <div className="checkin-row-head">
        <button type="button" className="checkin-row-toggle" aria-expanded={opened} aria-controls={detailId}
          onClick={() => setOpen((o) => !o)}>
          <span className="checkin-row-title">{item.title}</span>
          <span className="checkin-row-plan">{unplanned ? "Not planned" : shortRangeText(item.unitType, item.plannedFrom, item.plannedTo)}</span>
          <span className="checkin-row-state">
            {changed ? compactText(item, position) : <><span aria-hidden="true">✓</span><span className="checkin-sr-only">As planned</span></>}
          </span>
        </button>
        {onRemove ? (
          <button type="button" className="checkin-undo" disabled={disabled} onClick={onRemove} aria-label={`Remove ${name}`}>Remove</button>
        ) : changed && (
          <button type="button" className="checkin-undo" disabled={disabled} onClick={() => onChange(item.plannedTo)}
            aria-label={`Undo ${name}`}>Undo</button>
        )}
      </div>
      <div id={detailId} className="checkin-row-detail" hidden={!opened}>
        {opened && (
          <>
            {!unplanned && (
              <div className="checkin-choice" role="group" aria-label={`How ${name} went`}>
                {CHOICE_LABELS.map(({ choice: c, label }) => (
                  <button key={c} type="button" aria-pressed={choice === c}
                    disabled={disabled || (c !== "asPlanned" && c !== choice && startAmount(item, c) === null)}
                    onClick={() => pick(c)}>
                    {label}
                  </button>
                ))}
              </div>
            )}
            {(changed || unplanned) && (
              <div className="checkin-stepper" role="group" aria-label={`Amount done on ${name}`}>
                <button type="button" aria-label="One less" disabled={disabled || done <= 0}
                  onClick={() => onChange(positionOfAmount(item, stepDown(item, done)))}>−</button>
                <output aria-live="polite">{compactText(item, position)}</output>
                <button type="button" aria-label="One more" disabled={disabled || done >= maxAmount(item)}
                  onClick={() => onChange(positionOfAmount(item, stepUp(item, done)))}>+</button>
              </div>
            )}
          </>
        )}
      </div>
      {error && <p className="checkin-error" role="alert">{error}</p>}
    </li>
  );
}
