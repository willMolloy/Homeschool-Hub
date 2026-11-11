/** S13-02 / S13-03: one child's printed page: name and week or day, a block per subject, a notes area. Black on white; the subject's colour is a thin rule only. */
import type { Child } from "../../api/types";
import { isEmpty, type ChildSheet, type WeekLine } from "./sheetModel";
import type { SheetKind } from "./printUrl";

const NOTE_LINES = { week: 6, day: 7 } as const;

/** Subject order is already applied. Keep a subject's lines together under one heading. */
function groupLines(lines: readonly WeekLine[]): { subject: string; lines: WeekLine[] }[] {
  const out: { subject: string; lines: WeekLine[] }[] = [];
  for (const line of lines) {
    const last = out[out.length - 1];
    if (last && last.subject === line.subject) last.lines.push(line);
    else out.push({ subject: line.subject, lines: [line] });
  }
  return out;
}

export function ChildSheetView({ sheet, kind, heading, dayWord, child }: { sheet: ChildSheet; kind: SheetKind; heading: string; dayWord: string; child: Child }) {
  const rule = child.color && /^#[0-9a-f]{3,8}$/i.test(child.color) ? child.color : undefined;
  return (
    <section className="sheet" aria-label={`${sheet.childName}, ${heading}`}>
      <header className="print-sheet-head" style={rule ? ({ "--sheet-rule": rule } as React.CSSProperties) : undefined}>
        <h1>{sheet.childName}</h1>
        <p className="sheet-when">{heading}</p>
      </header>
      {kind === "week" ? null : sheet.breaks.map((b) => <p key={b} className="sheet-break">{b}</p>)}
      {kind === "week" ? (
        sheet.days.map((day) => (
          <section key={day.date} className="sheet-day-block">
            <h2>{day.name}</h2>
            {day.off ? <p className="sheet-break">{day.off}</p> : null}
            {day.lines.length === 0 && !day.off ? <p className="sheet-empty">Nothing planned.</p> : null}
            {groupLines(day.lines).map((g) => (
              <div key={g.subject} className="sheet-day-subject">
                <h3>{g.subject}</h3>
                {g.lines.map((line, i) => (
                  <div key={`${line.title}-${i}`} className="sheet-assignment sheet-assignment-day">
                    <span className="sheet-box" aria-hidden="true" />
                    <h3>{line.title}</h3>
                    {line.range ? <span className="sheet-range">· {line.range}</span> : null}
                  </div>
                ))}
              </div>
            ))}
          </section>
        ))
      ) : isEmpty(sheet) ? (
        <p className="sheet-empty">{`Nothing planned for ${dayWord}`}</p>
      ) : sheet.subjects.map((s) => (
        <section key={s.subjectId ?? "other"} className="sheet-subject" style={{ "--sheet-subject": `var(--tl-subject-${s.slot}-strong)` } as React.CSSProperties}>
          <h2>{s.name}</h2>
          {s.assignments.map((a) => (
            <div key={a.assignmentId} className="sheet-assignment sheet-assignment-day">
              <span className="sheet-box" aria-hidden="true" />
              <h3>{a.title}</h3>
              {a.rows[0]?.range ? <span className="sheet-range">· {a.rows[0].range}</span> : null}
            </div>
          ))}
        </section>
      ))}
      {/* S15-00 (N2): not a landmark (no label), so a sheet with nothing planned has one region, not two with near-identical names. */}
      <div className="sheet-notes">
        <h2>Notes</h2>
        {Array.from({ length: NOTE_LINES[kind] }, (_, i) => <div key={i} className="sheet-line" />)}
      </div>
    </section>
  );
}
