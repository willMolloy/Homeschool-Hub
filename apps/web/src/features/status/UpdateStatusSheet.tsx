/**
 * S8-06 / S9-02: "Update status" for one bar (from Schedule · Week, or the Year edit bar's More), against the last finished week (or the week being looked at): How did it go? (As planned / Got ahead / Fell behind),
 * "They got to {page}" with a − and +, and, when the plan moved, "What about the end date?" (S18-02): Keep the end date, Move
 * the end to the suggested date, or Pick a date (the shared DateField). The suggestion for a late assignment is the briefing's
 * own (`lateEnd`), so the late line and this sheet name the same date. Cancel or Save; Save hands the position, the mode and
 * the end date to the board, which sends the week once.
 */
import { useId, useState } from "react";
import type { OverrideMode } from "@hh/engine";
import type { CheckInItem } from "../../api/types";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { UNIT_LABELS } from "../../components/unitLabels";
import { Button, Chip } from "../../ui/components";
import { rowOutcome } from "../checkin/absorb";
import { stepOf } from "../checkin/amount";
import { isValidLocalDate, type LocalDate } from "@hh/engine";
import { DateField } from "../../ui/DateField";
import type { LateEnd } from "../plan/briefingLines";
import { shortDate } from "../schedule/formBits";
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
  /** S18-02: the briefing's late answer for this assignment (null: no late line), undefined while it loads. */
  late?: LateEnd | null;
  /** S18-02: a picked end date must come after this day (the end of the week being updated). */
  afterDay?: LocalDate;
  /** `endDate` is the new end for the assignment, or null to leave it (the default). */
  onSave: (position: number, mode: OverrideMode | null, endDate: LocalDate | null) => void;
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

type EndWay = "keep" | "suggest" | "pick";

export function UpdateStatusSheet({ item, position, mode, plan, late, afterDay, whenText, onSave, onClose, busy = false, error = null }: UpdateStatusProps) {
  const me = useMe();
  const [pos, setPosition] = useState(position);
  /** The number box's own text, so a half-typed number is not rewritten under the finger. */
  const [text, setText] = useState(shown(position));
  const setPos = (n: number) => { setPosition(n); setText(shown(n)); };
  const [endWay, setEndWay] = useState<EndWay>("keep");
  const [picked, setPicked] = useState<string>("");
  const [pickError, setPickError] = useState<string | null>(null);
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
  // S18-02: behind, a late assignment's suggestion is the late line's date (and its end the line's "Keep" date); otherwise the shortfall estimate.
  const lateNow = way === "behind" && late ? late : null;
  const keepDate = lateNow ? lateNow.end : choices?.keep ?? null;
  const rawSuggest = lateNow?.moveTo ?? choices?.move ?? null;
  const suggested = rawSuggest && rawSuggest !== keepDate ? rawSuggest : null;
  const unit = item.unitType === "minutes" ? UNIT_LABELS.minutes.many : UNIT_LABELS[item.unitType].one;
  const save = () => {
    if (finished) return onSave(pos, null, null);
    if (way === "asPlanned") return onSave(pos, mode, null);
    if (endWay === "suggest" && suggested) return onSave(pos, "keepEndDate", suggested);
    if (endWay === "pick") {
      if (!isValidLocalDate(picked)) return setPickError("Pick the new end date.");
      if (afterDay && picked <= afterDay) return setPickError(`Pick a date after ${shortDate(afterDay)}.`);
      return onSave(pos, "keepEndDate", picked);
    }
    return onSave(pos, "keepEndDate", null);
  };
  return (
    <ResponsiveSheet open onOpenChange={(o) => !o && onClose()} title={item.title}>
      <div className="status-sheet">
        <p className="status-sub">{item.childName} · {rangeWords(item.unitType, item.plannedFrom, item.plannedTo, item.totalUnits, true)} {whenText}</p>
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
              <label className={`status-end${endWay === "keep" ? " is-on" : ""}`}>
                <input type="radio" name="end-date" checked={endWay === "keep"} onChange={() => setEndWay("keep")} />
                <span>Keep {shortDate(keepDate ?? choices.keep)}<small>The remaining days get a little {way === "behind" ? "heavier" : "lighter"}</small></span>
              </label>
              {suggested ? (
                <label className={`status-end${endWay === "suggest" ? " is-on" : ""}`}>
                  <input type="radio" name="end-date" checked={endWay === "suggest"} onChange={() => setEndWay("suggest")} />
                  <span>Move the end to {shortDate(suggested)}<small>About the same pace</small></span>
                </label>
              ) : null}
              <label className={`status-end${endWay === "pick" ? " is-on" : ""}`}>
                <input type="radio" name="end-date" checked={endWay === "pick"} onChange={() => { setEndWay("pick"); if (!picked) setPicked(suggested ?? keepDate ?? choices.keep); }} />
                <span>Pick a date<small>Any day you choose</small></span>
              </label>
              {endWay === "pick" ? (
                <div className="status-pick">
                  <DateField value={picked} onChange={(v) => { setPicked(v); setPickError(null); }} aria-label="New end date" aria-invalid={pickError ? true : undefined} opens="up" />
                  {pickError ? <p className="field-error" role="alert">{pickError}</p> : null}
                </div>
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
