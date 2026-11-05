/**
 * S8-06 / S9-02: "Update status" for one bar (from Schedule · Week, or the Year edit bar's More), against the last finished week (or the week being looked at): How did it go? (As planned / Got ahead / Fell behind),
 * "They got to {page}" with a − and +, and, when the plan moved, "What about the end date?" with the two dates worked
 * out. Cancel or Save; Save hands the position and the choice to the board, which sends the week once.
 */
import { useId, useState } from "react";
import type { OverrideMode } from "@hh/engine";
import type { CheckInItem } from "../../api/types";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { UNIT_LABELS } from "../../components/unitLabels";
import { Button, Chip } from "../../ui/components";
import { DEFAULT_MODE, rowOutcome } from "../checkin/absorb";
import { stepOf } from "../checkin/amount";
import { dayMonth } from "../home/homeSummary";
import { rangeWords } from "../week/weekBars";
import { endChoices, type EndChoices } from "./endDates";
import "../checkin/checkin.css";
import "./status.css";
import { useMe } from "../../auth/AuthProvider";
import type { ChildPlan } from "@hh/engine";

export interface UpdateStatusProps {
  item: CheckInItem;
  /** Where the child got to now (the plan's end of week when nothing was changed). */
  position: number;
  mode: OverrideMode | null;
  plan: ChildPlan | undefined;
  /** "Last week" in "pages 120–150 last week". */
  whenText: string;
  onSave: (position: number, mode: OverrideMode | null) => void;
  onClose: () => void;
  /** While the save is on its way, and what went wrong (the sheet stays open to try again). */
  busy?: boolean;
  error?: string | null;
}

type Way = "asPlanned" | "ahead" | "behind";
const WAYS: readonly { way: Way; label: string }[] = [
  { way: "asPlanned", label: "As planned" },
  { way: "ahead", label: "Got ahead" },
  { way: "behind", label: "Fell behind" },
];
const round2 = (n: number) => Math.round(n * 100) / 100;
/** Whole numbers on screen ("lesson 29", not 29.3); the plan keeps its fractions underneath. */
const shown = (n: number) => String(Math.round(n));

const wayOf = (item: CheckInItem, position: number): Way => {
  const o = rowOutcome(item, position);
  return o === "asPlanned" ? "asPlanned" : o === "behind" ? "behind" : "ahead";
};

export function UpdateStatusSheet({ item, position, mode, plan, whenText, onSave, onClose, busy = false, error = null }: UpdateStatusProps) {
  const me = useMe();
  const [pos, setPosition] = useState(position);
  /** The number box's own text, so a half-typed number is not rewritten under the finger. */
  const [text, setText] = useState(shown(position));
  const setPos = (n: number) => { setPosition(n); setText(shown(n)); };
  const [end, setEnd] = useState<OverrideMode>(mode ?? DEFAULT_MODE);
  const labelId = useId();
  const step = stepOf(item.unitType);
  const way = wayOf(item, pos);
  const finished = pos >= item.totalUnits - 1e-9;
  const clamp = (n: number) => Math.min(item.totalUnits, Math.max(item.plannedFrom, round2(n)));
  const pick = (w: Way) => {
    if (w === "asPlanned") return setPos(item.plannedTo);
    if (w === "ahead") return setPos(clamp(Math.min(item.totalUnits, item.plannedTo + step)));
    setPos(clamp(item.plannedTo - step <= item.plannedFrom ? item.plannedFrom : item.plannedTo - step));
  };
  const choices: EndChoices | null = plan && way !== "asPlanned" && !finished ? endChoices(plan, item.plannedTo - pos, me.schoolDays) : null;
  const unit = item.unitType === "minutes" ? UNIT_LABELS.minutes.many : UNIT_LABELS[item.unitType].one;
  const save = () => onSave(pos, finished ? null : way === "asPlanned" ? mode : end);
  return (
    <ResponsiveSheet open onOpenChange={(o) => !o && onClose()} title={item.title}>
      <div className="status-sheet">
        <p className="status-sub">{item.childName} · {rangeWords(item.unitType, item.plannedFrom, item.plannedTo, item.totalUnits)} {whenText}</p>
        <h3 className="status-label" id={labelId}>How did it go?</h3>
        <div className="status-ways" role="group" aria-labelledby={labelId}>
          {WAYS.map(({ way: w, label }) => <Chip key={w} selected={way === w} onClick={() => pick(w)}>{label}</Chip>)}
        </div>
        <h3 className="status-label">They got to</h3>
        <div className="status-stepper" role="group" aria-label={`Where ${item.childName} got to on ${item.title}`}>
          <button type="button" className="round-btn" aria-label="One less" disabled={pos <= item.plannedFrom} onClick={() => setPos(clamp(pos - step))}>−</button>
          <div className="status-num">
            <span>{unit}</span>
            <input type="number" inputMode="numeric" aria-label={`${unit} reached`} value={text}
              min={item.plannedFrom} max={item.totalUnits} step={step}
              onChange={(e) => { setText(e.target.value); const n = Number(e.target.value); if (Number.isFinite(n) && e.target.value !== "") setPosition(clamp(n)); }}
              onBlur={() => setText(shown(pos))} />
            <span className="status-total">of {item.totalUnits}</span>
          </div>
          <button type="button" className="round-btn" aria-label="One more" disabled={pos >= item.totalUnits} onClick={() => setPos(clamp(pos + step))}>+</button>
        </div>
        {choices ? (
          <>
            <h3 className="status-label" id={`${labelId}-end`}>What about the end date?</h3>
            <div role="radiogroup" aria-labelledby={`${labelId}-end`} className="status-ends">
              <label className={`status-end${end === "keepEndDate" ? " is-on" : ""}`}>
                <input type="radio" name="end-date" checked={end === "keepEndDate"} onChange={() => setEnd("keepEndDate")} />
                <span>Keep {dayMonth(choices.keep)}<small>The remaining days get a little {way === "behind" ? "heavier" : "lighter"}</small></span>
              </label>
              {choices.move ? (
                <label className={`status-end${end === "pushEndDate" ? " is-on" : ""}`}>
                  <input type="radio" name="end-date" checked={end === "pushEndDate"} onChange={() => setEnd("pushEndDate")} />
                  <span>Move to {dayMonth(choices.move)}<small>Keep the same pace</small></span>
                </label>
              ) : null}
            </div>
          </>
        ) : null}
        {error ? <p className="checkin-error" role="alert">{error}</p> : null}
        <div className="btn-row status-actions">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={save}>Save</Button>
        </div>
      </div>
    </ResponsiveSheet>
  );
}
