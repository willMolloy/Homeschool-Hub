/**
 * S9-04: the shared date field. It reads and writes like "Nov 1, 2026" (never the browser's mm/dd/yyyy box); typing works
 * ("11/1/2026", "Nov 1, 2026" or "2026-11-01"), and the calendar button opens a small month grid below the field.
 * The value is always `YYYY-MM-DD`, or "" for no date. Use it inside a `<label>` or give it an `id` for a `<label htmlFor>`.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
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
/** S19-01: keep this much of the screen clear around a calendar that has been shifted to fit. */
export const CAL_MARGIN = 8;

export interface Box { left: number; right: number; top: number; bottom: number }

/**
 * S19-01: where the month grid sits so the whole of it, including Today, is on the screen.
 * Shift it sideways until it fits. Open it upward when there is no room below the field.
 * The result is viewport coordinates; the calendar is portaled so a panel cannot clip it.
 */
export function placeCalendar(field: Box, size: { width: number; height: number }, viewport: { width: number; height: number }, preferUp = false): { left: number; top: number; up: boolean } {
  const { width, height } = size;
  let left = viewport.width < NARROW ? EDGE : field.left;
  const maxLeft = Math.max(0, viewport.width - width - (viewport.width < NARROW ? EDGE : CAL_MARGIN));
  if (left > maxLeft) left = maxLeft;
  if (left < (viewport.width < NARROW ? EDGE : 0)) left = viewport.width < NARROW ? EDGE : 0;

  const gap = 6;
  const below = viewport.height - field.bottom - gap;
  const above = field.top - gap;
  const up = preferUp || (below < height && above > below);
  let top = up ? field.top - gap - height : field.bottom + gap;
  const maxTop = Math.max(0, viewport.height - height - CAL_MARGIN);
  if (top < CAL_MARGIN) top = Math.min(CAL_MARGIN, maxTop);
  if (top > maxTop) top = maxTop;
  return { left, top, up };
}

const WEEKDAY_HEADS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const shown = (v: string) => (isValidLocalDate(v) ? formatDate(v) : "");

export function DateField({ value, onChange, id, disabled, clearable, opens = "down", className, ...aria }: DateFieldProps) {
  const [draft, setDraft] = useState(shown(value));
  const [open, setOpen] = useState(false);
  const start = isValidLocalDate(value) ? value : deviceToday();
  const [view, setView] = useState({ year: Number(start.slice(0, 4)), month: Number(start.slice(5, 7)) });
  const root = useRef<HTMLSpanElement>(null);
  const openBtn = useRef<HTMLButtonElement>(null);
  const gaveFocus = useRef(false);
  const calId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<{ left: number; top: number; up: boolean } | null>(null);

  // S19-01: measure the grid, then pin it to the viewport so the right-hand panel and a phone sheet cannot clip a day.
  const position = useCallback(() => {
    if (!root.current || !panel.current) return;
    const field = root.current.getBoundingClientRect();
    if (field.bottom < 0 || field.top > window.innerHeight) {
      setOpen(false);
      return;
    }
    const size = panel.current.getBoundingClientRect();
    setPlaced(placeCalendar(field, { width: size.width, height: size.height }, { width: window.innerWidth, height: window.innerHeight }, opens === "up"));
  }, [opens]);
  useLayoutEffect(() => {
    if (!open) return;
    position();
  }, [open, position, view.year, view.month]);
  // L3: a phone sheet scrolls under the fixed calendar. Follow the field, or close when it has left the screen.
  useEffect(() => {
    if (!open) return;
    document.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
    return () => {
      document.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
    };
  }, [open, position]);
  // L2: the calendar is portaled after the form, so tab would reach it only after every later control.
  // Focus once it is on screen. A hidden grid cannot take focus, and a later scroll must not pull it back.
  useEffect(() => {
    if (!open) {
      gaveFocus.current = false;
      return;
    }
    if (!placed || !panel.current || gaveFocus.current) return;
    const day = panel.current.querySelector<HTMLElement>("[aria-pressed='true']") ?? panel.current.querySelector<HTMLElement>(".date-cal-foot button");
    day?.focus();
    if (panel.current.contains(document.activeElement)) gaveFocus.current = true;
  }, [open, placed, view.year, view.month]);

  // A value changed from outside (a reset, a calendar pick) replaces the text, but never while the typed text already means it.
  useEffect(() => {
    setDraft((d) => (parseDateInput(d) === value || (d.trim() === "" && value === "") ? d : shown(value)));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      const t = e.target as Node;
      if (root.current?.contains(t) || panel.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  useEffect(() => { if (!open) setPlaced(null); }, [open]);

  const type = (text: string, focused: boolean) => {
    // Typed text is kept as typed while the field has focus; pasted or filled-in text is tidied at once.
    const parsed = parseDateInput(text);
    setDraft(parsed && !focused ? formatDate(parsed) : text);
    if (text.trim() === "") onChange("");
    else if (parsed) onChange(parsed);
  };
  /** Leaving the field tidies a good date to "Nov 1, 2026" and puts back the last good one when the text means nothing. */
  const settle = () => setDraft(shown(value));
  const pick = (d: string) => { onChange(d); setDraft(formatDate(d)); setOpen(false); openBtn.current?.focus(); };
  const toggle = () => {
    if (!open) setView({ year: Number(start.slice(0, 4)), month: Number(start.slice(5, 7)) });
    setOpen(!open);
  };
  const keys = (e: KeyboardEvent) => {
    if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); openBtn.current?.focus(); }
  };
  const today = deviceToday();

  return (
    <span className={["date-field", className].filter(Boolean).join(" ")} ref={root} onKeyDown={keys}>
      <span className="date-field-box">
        <input id={id} type="text" inputMode="text" autoComplete="off" placeholder="Choose a date" value={draft} disabled={disabled}
          onChange={(e) => type(e.target.value, document.activeElement === e.target)} onBlur={settle} {...aria} />
        <button ref={openBtn} type="button" className="date-field-open" aria-label="Choose a date" aria-expanded={open} aria-controls={open ? calId : undefined} disabled={disabled} onClick={toggle}>
          <CalendarBlank size={22} weight="light" aria-hidden="true" />
        </button>
      </span>
      {open ? createPortal(
        <div id={calId} ref={panel} data-date-calendar="" className="date-cal date-cal-fixed" role="dialog" aria-modal="false" aria-label="Calendar"
          style={{ left: placed?.left ?? 0, top: placed?.top ?? 0, visibility: placed ? "visible" : "hidden" }}
          data-opens={placed?.up ? "up" : "down"}
          onKeyDown={keys}>
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
        </div>,
        document.body,
      ) : null}
    </span>
  );
}
