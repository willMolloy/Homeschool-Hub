/** One pastel bar (S8-05): the subject's fill with a thin strong rule on the left, the title, the week's range in the family's units, and, when a check is given, a round check on the right. */
import type { CSSProperties, ReactNode } from "react";
import { Check } from "@phosphor-icons/react";
import { rangeWords, type WeekBarData } from "./weekBars";
import "./week.css";

export interface WeekBarProps {
  bar: WeekBarData;
  slot: number;
  /** Tapping the bar's body (adjust, or Update status). Without it the bar is plain. */
  onOpen?: () => void;
  /** The round check: checked, and what tapping it does. Without it there is no check. */
  check?: { checked: boolean; onToggle: () => void; disabled?: boolean };
  /** A second line under the range, e.g. "2 of 3 ch." */
  state?: string;
  /** Before the title: the subject's icon (S8-11). */
  icon?: ReactNode;
  /** A refusal about this bar, shown under it. */
  error?: string;
}

export function WeekBar({ bar, slot, onOpen, check, state, icon, error }: WeekBarProps) {
  const range = bar.range ?? rangeWords(bar.unitType, bar.from, bar.to, bar.total, true);
  const style = { "--c": `var(--tl-subject-${slot})`, "--cs": `var(--tl-subject-${slot}-strong)` } as CSSProperties;
  const text = (
    <>
      <span className="bar-title">{icon}<span>{bar.title}</span></span>{" "}
      <span className="bar-amount">{range}</span>{" "}
      {state ? <span className="bar-state">{state}</span> : null}
    </>
  );
  return (
    // S8b-07 (N7): the body button has no aria-label: its name is its visible text, so a voice-control user can say what they see (WCAG 2.5.3).
    <li className="bar" style={style}>
      {onOpen ? (
        <button type="button" className="bar-body" onClick={onOpen}>{text}</button>
      ) : (
        <div className="bar-body">{text}</div>
      )}
      {check ? (
        <button type="button" className="bar-check" aria-pressed={check.checked} disabled={check.disabled}
          aria-label={`${bar.title} completed`} onClick={check.onToggle}>
          {check.checked ? <Check size={22} weight="bold" aria-hidden="true" /> : null}
        </button>
      ) : null}
      {error ? <p className="bar-error" role="alert">{error}</p> : null}
    </li>
  );
}

/** A list of bars. */
export function WeekBars({ children, label }: { children: ReactNode; label: string }) {
  return <ul className="bars" aria-label={label}>{children}</ul>;
}
