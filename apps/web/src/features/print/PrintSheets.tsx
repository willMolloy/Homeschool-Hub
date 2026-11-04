/**
 * S13-01: "Print sheets" in Schedule · Week's header, and the sheet it opens. Week or Day (Segmented); the week (the one shown) or
 * the day (today, or Monday of the shown week when today isn't in it); which children (All children or any mix, multi-select chips).
 * "Print" goes to the print-only page, which opens the browser's print dialog. Nothing is sent anywhere.
 */
import { useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CaretLeft, CaretRight, Printer } from "@phosphor-icons/react";
import { addDays, weekStartOf, type LocalDate } from "@hh/engine";
import type { Child } from "../../api/types";
import { useMe } from "../../auth/AuthProvider";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { weekSpan } from "../home/homeSummary";
import { DateField } from "../../ui/DateField";
import { Button, Segmented } from "../../ui/components";
import { printUrl, type SheetKind } from "./printUrl";
import "./print.css";

/** The day the Day choice starts on: today when the shown week holds it, else Monday (the first day) of the shown week. */
export function defaultDay(today: LocalDate, weekStart: LocalDate): LocalDate {
  return today >= weekStart && today <= addDays(weekStart, 6) ? today : weekStart;
}

/** The chosen ids, or "all" when All children is on or nothing is picked. */
export type KidChoice = readonly string[] | "all";

export function PrintSheetsButton({ weekStart, kids }: { weekStart: LocalDate; kids: readonly Child[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="round-btn print-sheets-btn" aria-label="Print sheets" title="Print sheets" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <Printer size={22} weight="light" aria-hidden="true" />
      </button>
      <ResponsiveSheet open={open} onOpenChange={setOpen} title="Print sheets">
        <PrintSheetsForm weekStart={weekStart} kids={kids} onClose={() => setOpen(false)} />
      </ResponsiveSheet>
    </>
  );
}

export function PrintSheetsForm({ weekStart, kids, onClose }: { weekStart: LocalDate; kids: readonly Child[]; onClose: () => void }) {
  const me = useMe();
  const navigate = useNavigate();
  const [kind, setKind] = useState<SheetKind>("week");
  const [week, setWeek] = useState<LocalDate>(weekStartOf(weekStart, me.weekStart));
  const [day, setDay] = useState<LocalDate>(defaultDay(me.today, weekStartOf(weekStart, me.weekStart)));
  const [chosen, setChosen] = useState<KidChoice>("all");
  const dayId = useId();
  const picked = chosen === "all" ? kids.map((k) => k.id) : chosen;
  const toggle = (id: string) => {
    // From All children, a tap on a child means "just this one"; after that the chips add and remove.
    if (chosen === "all") { setChosen([id]); return; }
    const now = new Set(picked);
    if (now.has(id)) now.delete(id); else now.add(id);
    const next = kids.map((k) => k.id).filter((k) => now.has(k));
    setChosen(next.length === 0 || next.length === kids.length ? "all" : next);
  };
  const allOn = chosen === "all";
  const go = () => {
    onClose();
    navigate(printUrl({ kind, date: kind === "week" ? week : day, children: chosen }, { print: true }));
  };
  return (
    <div className="print-form">
      <Segmented label="What to print" value={kind} onChange={setKind} options={[{ value: "week", label: "Week" }, { value: "day", label: "Day" }]} />
      {kind === "week" ? (
        <div className="print-when" role="group" aria-label="Week">
          <button type="button" className="round-btn" aria-label="Previous week" onClick={() => setWeek(addDays(week, -7))}><CaretLeft size={20} weight="light" aria-hidden="true" /></button>
          <span className="print-when-text" aria-live="polite">Week of {weekSpan(week).split(" – ")[0]}<small>{weekSpan(week)}</small></span>
          <button type="button" className="round-btn" aria-label="Next week" onClick={() => setWeek(addDays(week, 7))}><CaretRight size={20} weight="light" aria-hidden="true" /></button>
        </div>
      ) : (
        <div className="field">
          <label htmlFor={dayId}>Day</label>
          <DateField id={dayId} value={day} onChange={(v) => v && setDay(v)} />
        </div>
      )}
      {kids.length > 1 ? (
        <div className="field">
          <span className="print-label" id={`${dayId}-who`}>Whose sheets?</span>
          <div className="print-kids" role="group" aria-labelledby={`${dayId}-who`}>
            <button type="button" className="chip" aria-pressed={allOn} onClick={() => setChosen("all")}>All children</button>
            {kids.map((k) => (
              <button key={k.id} type="button" className="chip" aria-pressed={!allOn && picked.includes(k.id)} onClick={() => toggle(k.id)}>{k.name}</button>
            ))}
          </div>
        </div>
      ) : null}
      <p className="print-hint">One page for each child: the work, a box to tick and a line for notes.</p>
      <div className="btn-row">
        <Button onClick={go} disabled={kids.length === 0}>Print</Button>
        <Button variant="quiet" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}
