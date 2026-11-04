/**
 * S9-04: the shared date field. It reads and writes like "Nov 1, 2026" (never the browser's mm/dd/yyyy box); typing works
 * ("11/1/2026", "Nov 1, 2026" or "2026-11-01"), and the calendar button opens a small month grid below the field.
 * The value is always `YYYY-MM-DD`, or "" for no date. Use it inside a `<label>` or give it an `id` for a `<label htmlFor>`.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { CalendarBlank, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { isValidLocalDate } from "@hh/engine";
import { deviceToday } from "../features/plan/useShownWeek";
import { MONTH_NAMES, formatDate, monthGrid, parseDateInput, shiftMonth } from "../lib/dates";
import "./date-field.css";

export interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  /** Offers "Clear" in the calendar (for an optional date). */
  clearable?: boolean;
  /** Where the calendar opens: below the field (default) or above it, for a field at the bottom of the screen. */
  opens?: "down" | "up";
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  className?: string;
}

/** S9b-05 (N9): below this width the calendar is full width, EDGE px from each side of the screen (date-field.css). */
export const NARROW = 360;
export const EDGE = 4;

const WEEKDAY_HEADS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const shown = (v: string) => (isValidLocalDate(v) ? formatDate(v) : "");

export function DateField({ value, onChange, id, disabled, clearable, opens = "down", className, ...aria }: DateFieldProps) {
  const [draft, setDraft] = useState(shown(value));
  const [open, setOpen] = useState(false);
  const start = isValidLocalDate(value) ? value : deviceToday();
  const [view, setView] = useState({ year: Number(start.slice(0, 4)), month: Number(start.slice(5, 7)) });
  const root = useRef<HTMLSpanElement>(null);
  const calId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [align, setAlign] = useState<"start" | "end">("start");
  /** S9b-05 (N9): under 360 px the calendar spans the screen (4 px a side); this is its left, from the field's left edge. */
  const [shift, setShift] = useState<number | null>(null);

  // The calendar is as wide as a phone allows (up to 21rem) and hangs from the field's left edge, or its right edge when
  // that would pass the screen or the sheet it is in (the End field in a two-column row).
  useLayoutEffect(() => {
    if (!open || !root.current) return;
    const field = root.current.getBoundingClientRect();
    const box = (root.current.closest("[data-sheet]") ?? document.documentElement).getBoundingClientRect();
    const right = Math.min(box.right, window.innerWidth) - 16;
    const width = Math.min(336, window.innerWidth - 32);
    setAlign(field.left + width > right ? "end" : "start");
    setShift(window.innerWidth < NARROW ? EDGE - field.left : null);
    panel.current?.scrollIntoView?.({ block: "nearest" });
  }, [open]);

  // A value changed from outside (a reset, a calendar pick) replaces the text, but never while the typed text already means it.
  useEffect(() => {
    setDraft((d) => (parseDateInput(d) === value || (d.trim() === "" && value === "") ? d : shown(value)));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const type = (text: string, focused: boolean) => {
    // Typed text is kept as typed while the field has focus; pasted or filled-in text is tidied at once.
    const parsed = parseDateInput(text);
    setDraft(parsed && !focused ? formatDate(parsed) : text);
    if (text.trim() === "") onChange("");
    else if (parsed) onChange(parsed);
  };
  /** Leaving the field tidies a good date to "Nov 1, 2026" and puts back the last good one when the text means nothing. */
  const settle = () => setDraft(shown(value));
  const pick = (d: string) => { onChange(d); setDraft(formatDate(d)); setOpen(false); };
  const toggle = () => {
    if (!open) setView({ year: Number(start.slice(0, 4)), month: Number(start.slice(5, 7)) });
    setOpen(!open);
  };
  const keys = (e: KeyboardEvent) => { if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); } };
  const today = deviceToday();

  return (
    <span className={["date-field", className].filter(Boolean).join(" ")} ref={root} onKeyDown={keys}>
      <span className="date-field-box">
        <input id={id} type="text" inputMode="text" autoComplete="off" placeholder="Choose a date" value={draft} disabled={disabled}
          onChange={(e) => type(e.target.value, document.activeElement === e.target)} onBlur={settle} {...aria} />
        <button type="button" className="date-field-open" aria-label="Choose a date" aria-expanded={open} aria-controls={open ? calId : undefined} disabled={disabled} onClick={toggle}>
          <CalendarBlank size={22} weight="light" aria-hidden="true" />
        </button>
      </span>
      {open ? (
        <div id={calId} ref={panel} className={["date-cal", opens === "up" ? "date-cal-up" : "", align === "end" ? "date-cal-end" : ""].filter(Boolean).join(" ")}
          style={shift === null ? undefined : { left: shift, right: "auto" }} role="group" aria-label="Calendar">
          <div className="date-cal-head">
            <button type="button" className="date-cal-nav" aria-label="Previous month" onClick={() => setView(shiftMonth(view.year, view.month, -1))}><CaretLeft size={20} weight="light" aria-hidden="true" /></button>
            <span className="date-cal-title" aria-live="polite">{MONTH_NAMES[view.month - 1]} {view.year}</span>
            <button type="button" className="date-cal-nav" aria-label="Next month" onClick={() => setView(shiftMonth(view.year, view.month, 1))}><CaretRight size={20} weight="light" aria-hidden="true" /></button>
          </div>
          <div className="date-cal-grid">
            {WEEKDAY_HEADS.map((w) => <span key={w} className="date-cal-wd" aria-hidden="true">{w}</span>)}
            {monthGrid(view.year, view.month).flat().map((d, i) => d === null ? <span key={`b${i}`} /> : (
              <button key={d} type="button" className="date-cal-day" aria-label={formatDate(d)} aria-pressed={d === value} data-today={d === today ? "true" : undefined} onClick={() => pick(d)}>
                {Number(d.slice(8, 10))}
              </button>
            ))}
          </div>
          <div className="date-cal-foot">
            <button type="button" className="btn btn-quiet" onClick={() => pick(today)}>Today</button>
            {clearable && value ? <button type="button" className="btn btn-quiet" onClick={() => { onChange(""); setDraft(""); setOpen(false); }}>Clear</button> : null}
          </div>
        </div>
      ) : null}
    </span>
  );
}
