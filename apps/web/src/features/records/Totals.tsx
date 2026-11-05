/**
 * S9-08: the big numbers for the tracked fields only, then hours by subject in the subjects' colours. Exactly what the parent
 * typed, added up: no estimates, nothing from the plan.
 */
import { useState, type CSSProperties } from "react";
import type { LogFields, RecordTotals, Subject } from "../../api/types";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { formatShort } from "../../lib/dates";
import type { FinishedBook } from "./booksFinished";
import { subjectSlots } from "../timeline/model";
import { formatMinutes } from "./entryText";
import "./records.css";

/** S9b-05 (N7): what a tile shows when nothing was typed for it in the range: a dash, never a "0 m" that looks entered. */
export const NOTHING = "—";

export interface BigNumber { label: string; value: string; /** All children: each child's own days, one line each. */ parts?: { name: string; value: string }[] }
export interface TotalsExtras {
  /** All children with several children: each child's own school days (S16-05). Omitted for one child. */
  perChild?: { name: string; days: number }[];
}

/**
 * S9b-05 (N7): hours with nothing typed show a dash; the total's caption is "in total" ("13 h 30 m in total", not "hours hours").
 * S16-05, S16-09 (N3): the school-days card is one child's own count, or under All children each child's own ("Frank 42 · Margaret 40"): never a
 * union, and no "any child" wording. Books are no longer a number here: "Books finished" (from completions) is its own card and the
 * typed titles are a list below.
 */
export function bigNumbers(t: RecordTotals, f: LogFields, extras: TotalsExtras = {}): BigNumber[] {
  const out: BigNumber[] = [];
  const hours = (m: number) => (m > 0 ? formatMinutes(m) : NOTHING);
  if (f.schoolDays) {
    const per = extras.perChild;
    if (per && per.length > 1) out.push({ label: "school days", value: per.map((c) => `${c.name} ${c.days > 0 ? c.days : NOTHING}`).join(" · "), parts: per.map((c) => ({ name: c.name, value: c.days > 0 ? String(c.days) : NOTHING })) });
    else out.push({ label: "school days", value: t.schoolDays > 0 ? String(t.schoolDays) : NOTHING }); // S16-09 (N3): never a zero
  }
  if (f.subjectHours || f.totalHours) out.push({ label: "in total", value: hours(t.totalMinutes) });
  if (f.coreSplit) { out.push({ label: "core hours", value: hours(t.coreMinutes) }); out.push({ label: "non-core hours", value: hours(t.nonCoreMinutes) }); }
  if (f.homeAway) { out.push({ label: "hours at home", value: hours(t.homeMinutes) }); out.push({ label: "hours away", value: hours(t.awayMinutes) }); }
  return out;
}

export function Totals({ totals, fields, subjects, perChild, finished = [] }: { totals: RecordTotals; fields: LogFields; subjects: readonly Subject[]; perChild?: TotalsExtras["perChild"]; finished?: readonly FinishedBook[] }) {
  const slot = subjectSlots(subjects);
  const [listing, setListing] = useState(false);
  const most = Math.max(1, ...totals.bySubject.map((s) => s.minutes));
  return (
    <div className="totals">
      <div className="big-numbers" role="group" aria-label="Totals">
        {bigNumbers(totals, fields, { perChild }).map((n) => (
          <div key={n.label} className="big-number">
            {n.parts ? <strong className="per-child">{n.parts.map((p) => <span key={p.name}>{p.name} {p.value}</span>)}</strong> : <strong>{n.value}</strong>}
            <span>{n.label}</span>
          </div>
        ))}
        {/* S16-05: only what the parent marked finished; hidden when books are not tracked or none finished (never a zero). */}
        {fields.books && finished.length > 0 ? (
          <button type="button" className="big-number big-number-button" onClick={() => setListing(true)} aria-haspopup="dialog">
            <strong>{finished.length}</strong><span>{finished.length === 1 ? "book finished" : "books finished"}</span>
          </button>
        ) : null}
      </div>
      <ResponsiveSheet open={listing} onOpenChange={setListing} title="Books finished">
        <ul className="finished-list" aria-label="Books finished">
          {finished.map((b) => <li key={b.assignmentId}><span>{b.title}</span><span className="finished-on">{formatShort(b.finishedOn)}</span></li>)}
        </ul>
      </ResponsiveSheet>
      {/* S16-05: the titles typed in log entries, as a short list (de-duplicated by the API), not a number. */}
      {fields.books && totals.books.length > 0 ? (
        <section aria-label="Books mentioned in your log">
          <h2>Books mentioned in your log</h2>
          <ul className="mentioned-list">{totals.books.map((b) => <li key={b}>{b}</li>)}</ul>
        </section>
      ) : null}
      {fields.subjectHours && totals.bySubject.length > 0 ? (
        <section aria-label="Hours by subject">
          <h2>Hours by subject</h2>
          <ul className="by-subject">
            {totals.bySubject.map((s) => (
              <li key={s.subjectId} style={{ "--c": `var(--tl-subject-${slot(s.subjectId)})`, "--cs": `var(--tl-subject-${slot(s.subjectId)}-strong)` } as CSSProperties}>
                <span className="by-name">{subjects.find((x) => x.id === s.subjectId)?.name ?? "A subject"}</span>
                <span className="by-bar" aria-hidden="true"><i style={{ width: `${Math.max(4, (s.minutes / most) * 100)}%` }} /></span>
                <span className="by-hours">{formatMinutes(s.minutes)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
