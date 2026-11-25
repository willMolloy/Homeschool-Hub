/**
 * S8-06 / S9-02: "Update status" for one bar (from Schedule · Week, or the Year edit bar's More), against the last finished week (or the week being looked at): How did it go? (As planned / Got ahead / Fell behind),
 * "They got to {page}" with a − and +, and, when the plan moved, "What about the end date?" (S18-02): Keep the end date, Move
 * the end to the suggested date, or Pick a date (the shared DateField, with no minimum of today). The suggestion for a late assignment is the briefing's
 * own (`lateEnd`), so the late line and this sheet name the same date. Cancel or Save; Save hands the position, the mode and
 * the end date to the board, which sends the week once. S18b-01: a picked date before today stays allowed, and Save asks
 * "That's before today; this ends the book now. Continue?" and waits. No, Cancel, or leaving it unanswered does not save.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { OverrideMode } from "@hh/engine";
import type { CheckInItem } from "../../api/types";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { UNIT_LABELS } from "../../components/unitLabels";
import { Button, Chip } from "../../ui/components";
import { stepOf } from "../checkin/amount";
import { isValidLocalDate, type LocalDate } from "@hh/engine";
import { DateField } from "../../ui/DateField";
import type { LateEnd } from "../plan/briefingLines";
import { todayOf } from "../completion/waiting";
import { shortDate } from "../schedule/formBits";
import { itemRangeWords } from "../week/weekBars";
import { endChoices, type EndChoices } from "./endDates";
import { isScheduledEnd, scheduledPosition } from "./scheduledEnd";
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
  /** S18-03: the week being updated, so "pages 120-150 last week" says the same chapters and lessons as that week's Days lines. */
  weekStart?: LocalDate;
  /** S18-02: a picked end date must come after this day (the end of the week being updated). */
  afterDay?: LocalDate;
  /** `endDate` is the new end for the assignment, or null to leave it (the default). */
  onSave: (position: number, mode: OverrideMode | null, endDate: LocalDate | null) => void;
  onClose: () => void;
  /** While the save is on its way, and what went wrong (the sheet stays open to try again). */
  busy?: boolean;
  error?: string | null;
  /** S18b-02: the other workbooks of this book, when the screen has them. */
  copies?: ReactNode;
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

const wayOf = (item: CheckInItem, position: number, words: string): Way => {
  if (isScheduledEnd(item, position, words)) return "asPlanned";
  // Compared with the unit the words name, not with the fractional position. 16 is behind "starts 17".
  return position < scheduledPosition(item, words) ? "behind" : "ahead";
};

type EndWay = "keep" | "suggest" | "pick";

export function UpdateStatusSheet({ item, position, mode, plan, late, weekStart, afterDay, whenText, onSave, onClose, busy = false, error = null, copies = null }: UpdateStatusProps) {
  const me = useMe();
  // S20-02 / H1: open on the last unit the same words name (including a chapter the week only starts), or the number she already saved.
  const words = itemRangeWords(item, plan, weekStart);
  const named = scheduledPosition(item, words);
  const opened = item.actual != null ? position : named;
  const [pos, setPosition] = useState(opened);
  /** The number box's own text, so a half-typed number is not rewritten under the finger. */
  const [text, setText] = useState(shown(opened));
  /** The plan often arrives after the sheet opens. Until she edits the number, follow the words. */
  const [touchedNumber, setTouchedNumber] = useState(item.actual != null);
  useEffect(() => {
    if (touchedNumber) return;
    setPosition(named);
    setText(shown(named));
  }, [named, touchedNumber]);
  const setPos = (n: number) => { setTouchedNumber(true); setPosition(n); setText(shown(n)); };
  const [endWay, setEndWay] = useState<EndWay>("keep");
  const [picked, setPicked] = useState<string>("");
  const [pickError, setPickError] = useState<string | null>(null);
  /** S18b-01: a past date stays allowed, and the save waits until the parent confirms it. */
  const [askPast, setAskPast] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  // S18c-02: the question is drawn at the top of the sheet. If the sheet was already scrolled, bring it back into view.
  useEffect(() => {
    if (!askPast) return;
    confirmRef.current?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [askPast]);
  const today = todayOf(me);
  const labelId = useId();
  /** S20-01: minutes have no pile to get through. The week stood, or she picks a new end date. */
  const minutes = item.unitType === "minutes";
  const [wantEnd, setWantEnd] = useState(false);
  const step = stepOf(item.unitType);
  const way = wayOf(item, pos, words);
  const finished = pos >= item.totalUnits - 1e-9;
  const clamp = (n: number) => Math.min(item.totalUnits, Math.max(item.plannedFrom, round2(n)));
  // S20-02: tapping a chip does not change the number. The highlight follows the number she left in the box.
  const pick = (w: Way) => {
    void w;
  };
  const choices: EndChoices | null = plan && way !== "asPlanned" && !finished ? endChoices(plan, item.plannedTo - pos, me.schoolDays) : null;
  // S18-02: behind, a late assignment's suggestion is the late line's date (and its end the line's "Keep" date); otherwise the shortfall estimate.
  const lateNow = way === "behind" && late ? late : null;
  const keepDate = lateNow ? lateNow.end : choices?.keep ?? null;
  const rawSuggest = lateNow?.moveTo ?? choices?.move ?? null;
  const suggested = rawSuggest && rawSuggest !== keepDate ? rawSuggest : null;
  const unit = item.unitType === "minutes" ? UNIT_LABELS.minutes.many : UNIT_LABELS[item.unitType].one;
  const save = (confirmed = false) => {
    if (minutes) {
      if (!wantEnd || endWay !== "pick") return onSave(item.plannedTo, mode, null);
      if (!isValidLocalDate(picked)) { setAskPast(false); return setPickError("Pick the new end date."); }
      if (afterDay && picked <= afterDay) { setAskPast(false); return setPickError(`Pick a date after ${shortDate(afterDay)}.`); }
      if (picked < today && !confirmed) return setAskPast(true);
      return onSave(item.plannedTo, null, picked);
    }
    if (finished) return onSave(pos, null, null);
    // The scheduled end is as planned. Send the plan's own position so a rounded 18 is not stored as behind 18.6.
    if (way === "asPlanned") return onSave(item.plannedTo, mode, null);
    if (endWay === "suggest" && suggested) return onSave(pos, "keepEndDate", suggested);
    if (endWay === "pick") {
      if (!isValidLocalDate(picked)) { setAskPast(false); return setPickError("Pick the new end date."); }
      // A date the sheet already refuses never reaches the confirmation.
      if (afterDay && picked <= afterDay) { setAskPast(false); return setPickError(`Pick a date after ${shortDate(afterDay)}.`); }
      // S18b-01: before today stays allowed. Saving it asks first and waits. Today or later does not ask.
      if (picked < today && !confirmed) return setAskPast(true);
      return onSave(pos, "keepEndDate", picked);
    }
    return onSave(pos, "keepEndDate", null);
  };
  const confirm = (
    <div className="status-confirm-block" ref={confirmRef}>
      <p className="status-confirm" role="alert">That&apos;s before today; this ends the book now. Continue?</p>
      <div className="btn-row status-actions">
        <Button disabled={busy} onClick={() => save(true)}>Continue</Button>
        <Button variant="secondary" disabled={busy} onClick={() => setAskPast(false)}>No</Button>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
  return (
    <ResponsiveSheet open onOpenChange={(o) => !o && onClose()} title={<span className="status-title" title={item.title}>{item.title}</span>}>
      <div className="status-sheet">
        {askPast ? confirm : null}
        <p className="status-sub">{item.childName} · {words} {whenText}</p>
        {minutes ? (
          <>
            <p className="status-sub">This week stood.</p>
            {wantEnd ? (
              <div role="radiogroup" aria-label="What about the end date?" className="status-ends">
                <label className={`status-end${endWay === "keep" ? " is-on" : ""}`}>
                  <input type="radio" name="end-date" checked={endWay === "keep"} onChange={() => { setEndWay("keep"); setAskPast(false); }} />
                  <span>Keep {plan ? shortDate(plan.plannedEnd) : "the end date"}<small>The minutes a day stay the same</small></span>
                </label>
                <label className={`status-end${endWay === "pick" ? " is-on" : ""}`}>
                  <input type="radio" name="end-date" checked={endWay === "pick"} onChange={() => { setEndWay("pick"); setAskPast(false); if (!picked && plan) setPicked(plan.plannedEnd); }} />
                  <span>Pick a date<small>Any day you choose</small></span>
                </label>
                {endWay === "pick" ? (
                  <div className="status-pick">
                    <DateField value={picked} onChange={(v) => { setPicked(v); setPickError(null); setAskPast(false); }} aria-label="New end date" aria-invalid={pickError ? true : undefined} opens="up" />
                    {pickError ? <p className="field-error" role="alert">{pickError}</p> : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={() => { setWantEnd(true); setEndWay("pick"); if (plan && !picked) setPicked(plan.plannedEnd); }}>Change the end date</button>
            )}
          </>
        ) : null}
        {minutes ? null : <h3 className="status-label" id={labelId}>How did it go?</h3>}
        {minutes ? null : (
        <div className="status-ways" role="group" aria-labelledby={labelId}>
          {WAYS.map(({ way: w, label }) => <Chip key={w} selected={way === w} onClick={() => pick(w)}>{label}</Chip>)}
        </div>
        )}
        {minutes ? null : <h3 className="status-label">They got to</h3>}
        {minutes ? null : <div className="status-stepper" role="group" aria-label={`Where ${item.childName} got to on ${item.title}`}>
          <button type="button" className="round-btn" aria-label="One less" disabled={pos <= item.plannedFrom} onClick={() => setPos(clamp(pos - step))}>−</button>
          <div className="status-num">
            <span>{unit}</span>
            <input type="number" inputMode="numeric" aria-label={`${unit} reached`} value={text}
              min={item.plannedFrom} max={item.totalUnits} step={step}
              onChange={(e) => { setTouchedNumber(true); setText(e.target.value); const n = Number(e.target.value); if (Number.isFinite(n) && e.target.value !== "") setPosition(clamp(n)); }}
              onBlur={() => setText(shown(pos))} />
            <span className="status-total">of {item.totalUnits}</span>
          </div>
          <button type="button" className="round-btn" aria-label="One more" disabled={pos >= item.totalUnits} onClick={() => setPos(clamp(pos + step))}>+</button>
        </div>}
        {!minutes && choices ? (
          <>
            <h3 className="status-label" id={`${labelId}-end`}>What about the end date?</h3>
            <div role="radiogroup" aria-labelledby={`${labelId}-end`} className="status-ends">
              <label className={`status-end${endWay === "keep" ? " is-on" : ""}`}>
                <input type="radio" name="end-date" checked={endWay === "keep"} onChange={() => { setEndWay("keep"); setAskPast(false); }} />
                <span>Keep {shortDate(keepDate ?? choices.keep)}<small>The remaining days get a little {way === "behind" ? "heavier" : "lighter"}</small></span>
              </label>
              {suggested ? (
                <label className={`status-end${endWay === "suggest" ? " is-on" : ""}`}>
                  <input type="radio" name="end-date" checked={endWay === "suggest"} onChange={() => { setEndWay("suggest"); setAskPast(false); }} />
                  <span>Move the end to {shortDate(suggested)}<small>About the same pace</small></span>
                </label>
              ) : null}
              <label className={`status-end${endWay === "pick" ? " is-on" : ""}`}>
                <input type="radio" name="end-date" checked={endWay === "pick"} onChange={() => { setEndWay("pick"); setAskPast(false); if (!picked) setPicked(suggested ?? keepDate ?? choices.keep); }} />
                <span>Pick a date<small>Any day you choose</small></span>
              </label>
              {endWay === "pick" ? (
                <div className="status-pick">
                  <DateField value={picked} onChange={(v) => { setPicked(v); setPickError(null); setAskPast(false); }} aria-label="New end date" aria-invalid={pickError ? true : undefined} opens="up" />
                  {pickError ? <p className="field-error" role="alert">{pickError}</p> : null}
                </div>
              ) : null}
            </div>
          </>
        ) : null}
        {copies}
        {error ? <p className="checkin-error" role="alert">{error}</p> : null}
        {askPast ? null : (
          <div className="btn-row status-actions">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button disabled={busy} onClick={() => save()}>Save</Button>
          </div>
        )}
      </div>
    </ResponsiveSheet>
  );
}
