/**
 * S9-08: the big numbers for the tracked fields only, then hours by subject in the subjects' colours. Exactly what the parent
 * typed, added up: no estimates, nothing from the plan.
 */
import type { CSSProperties } from "react";
import type { LogFields, RecordTotals, Subject } from "../../api/types";
import { subjectSlots } from "../timeline/model";
import { formatMinutes } from "./entryText";
import "./records.css";

/** S9b-01: with All children (and more than one child) the days are the days any child did school, and the label says so. */
export function bigNumbers(t: RecordTotals, f: LogFields, anyChild = false): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  if (f.schoolDays) out.push({ label: anyChild ? "days any child did school" : "school days", value: String(t.schoolDays) });
  if (f.subjectHours || f.totalHours) out.push({ label: "hours", value: formatMinutes(t.totalMinutes) });
  if (f.coreSplit) { out.push({ label: "core hours", value: formatMinutes(t.coreMinutes) }); out.push({ label: "non-core hours", value: formatMinutes(t.nonCoreMinutes) }); }
  if (f.homeAway) { out.push({ label: "hours at home", value: formatMinutes(t.homeMinutes) }); out.push({ label: "hours away", value: formatMinutes(t.awayMinutes) }); }
  if (f.books) out.push({ label: t.books.length === 1 ? "book" : "books", value: String(t.books.length) });
  return out;
}

export function Totals({ totals, fields, subjects, anyChild = false }: { totals: RecordTotals; fields: LogFields; subjects: readonly Subject[]; anyChild?: boolean }) {
  const slot = subjectSlots(subjects);
  const most = Math.max(1, ...totals.bySubject.map((s) => s.minutes));
  return (
    <div className="totals">
      <div className="big-numbers" role="group" aria-label="Totals">
        {bigNumbers(totals, fields, anyChild).map((n) => (
          <div key={n.label} className="big-number"><strong>{n.value}</strong><span>{n.label}</span></div>
        ))}
      </div>
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
