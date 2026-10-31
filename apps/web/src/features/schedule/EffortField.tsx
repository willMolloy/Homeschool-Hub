/**
 * S6-09: "About how long will that take?" on the assignment form. The pace ("About 5 pages a day") comes first, then
 * 15, 30, 45 and 60 minutes and Custom. Untouched, the option closest to what the form would save shows chosen,
 * with the number of minutes in the hint; the parent never sees a weight.
 */
import type { ReactNode } from "react";
import type { UnitType, WeightSuggestion } from "../../api/types";
import { optionFor, paceText, PRESET_MINUTES, wholeMinutes, type EffortPick } from "./effort";
import { suggestionText } from "./WeightHint";

interface Props {
  /** A prefix for the ids and the radio group's name. */
  id: string;
  unitType: UnitType;
  /** Units a day; null until the total, dates and days are filled in. */
  pace: number | null;
  /** What the parent picked; null = untouched. */
  pick: EffortPick | null;
  onPick: (p: EffortPick | null) => void;
  /** The minutes a day the saved weight (or, adding, the suggestion) comes to; null when unknown or still loading. */
  baseMinutes: number | null;
  /** The suggestion, while the form follows one (adding, or after a unit change): it is named in the hint. */
  suggestion: WeightSuggestion | null;
  subjectName: string;
  /** The minutes a day the pick comes to; null when it isn't a usable number. */
  chosenMinutes: number | null;
  error?: string;
}

export function EffortField({ id, unitType, pace, pick, onPick, baseMinutes, suggestion, subjectName, chosenMinutes, error }: Props) {
  const legend = "About how long will that take?";
  if (pace === null) {
    return (
      <fieldset className="effort">
        <legend>{legend}</legend>
        <p className="hint">Add the total, the dates and the days, then say about how many minutes a day.</p>
        {error ? <p id={`${id}-err`} className="field-error" role="alert">{error}</p> : null}
      </fieldset>
    );
  }
  const selected: number | "custom" | null = pick
    ? (pick.kind === "preset" ? pick.minutes : "custom")
    : baseMinutes !== null ? optionFor(baseMinutes) : null;
  const customText = pick?.kind === "custom" ? pick.text : selected === "custom" && baseMinutes !== null ? String(wholeMinutes(baseMinutes)) : "";
  const baseNow = baseMinutes === null ? null : wholeMinutes(baseMinutes);
  let hint: ReactNode = null;
  if (baseNow !== null) {
    if (!pick) {
      hint = suggestion
        ? `${suggestionText(suggestion, subjectName)} That's about ${baseNow} min a day.`
        : `That's about ${baseNow} min a day now.`;
    } else if (suggestion && chosenMinutes !== null && wholeMinutes(chosenMinutes) !== baseNow) {
      hint = (
        <>
          The suggestion is about {baseNow} min a day.{" "}
          <button type="button" className="btn-link" onClick={() => onPick(null)}>Use about {baseNow} min</button>
        </>
      );
    }
  }
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset className="effort" aria-describedby={describedBy} aria-invalid={error ? true : undefined}>
      <legend>{legend}</legend>
      <p className="effort-pace">{paceText(pace, unitType)}</p>
      <div className="effort-options">
        {PRESET_MINUTES.map((m) => (
          <label key={m} className="effort-chip">
            {/* onClick too: tapping the option that is already showing chosen is still the parent's answer. */}
            <input type="radio" name={id} checked={selected === m}
              onChange={() => onPick({ kind: "preset", minutes: m })} onClick={() => onPick({ kind: "preset", minutes: m })} />
            <span>{m} minutes</span>
          </label>
        ))}
        <label className="effort-chip">
          <input type="radio" name={id} checked={selected === "custom"} onChange={() => onPick({ kind: "custom", text: customText })} />
          <span>Custom</span>
        </label>
      </div>
      {selected === "custom" ? (
        <label className="effort-custom">
          <span>Minutes a day</span>
          <input type="number" inputMode="decimal" min="0" step="any" value={customText}
            onChange={(e) => onPick({ kind: "custom", text: e.target.value })} aria-invalid={error ? true : undefined} />
        </label>
      ) : null}
      {hint ? <p id={`${id}-hint`} className="hint">{hint}</p> : null}
      {error ? <p id={`${id}-err`} className="field-error" role="alert">{error}</p> : null}
    </fieldset>
  );
}
