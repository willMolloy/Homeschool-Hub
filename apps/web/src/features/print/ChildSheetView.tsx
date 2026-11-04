/** S13-02 / S13-03: one child's printed page: name and week or day, a block per subject, a notes area. Black on white; the subject's colour is a thin rule only. */
import type { Child } from "../../api/types";
import { isEmpty, type ChildSheet } from "./sheetModel";
import type { SheetKind } from "./printUrl";

const NOTE_LINES = { week: 6, day: 7 } as const;

export function ChildSheetView({ sheet, kind, heading, dayWord, child }: { sheet: ChildSheet; kind: SheetKind; heading: string; dayWord: string; child: Child }) {
  const rule = child.color && /^#[0-9a-f]{3,8}$/i.test(child.color) ? child.color : undefined;
  return (
    <section className="sheet" aria-label={`${sheet.childName}, ${heading}`}>
      <header className="sheet-head" style={rule ? ({ "--sheet-rule": rule } as React.CSSProperties) : undefined}>
        <h1>{sheet.childName}</h1>
        <p className="sheet-when">{heading}</p>
      </header>
      {sheet.breaks.map((b) => <p key={b} className="sheet-break">{b}</p>)}
      {isEmpty(sheet) ? (
        <p className="sheet-empty">{kind === "week" ? "Nothing planned this week." : `Nothing planned for ${dayWord}`}</p>
      ) : sheet.subjects.map((s) => (
        <section key={s.subjectId ?? "other"} className="sheet-subject" style={{ "--sheet-subject": `var(--tl-subject-${s.slot}-strong)` } as React.CSSProperties}>
          <h2>{s.name}</h2>
          {s.assignments.map((a) => kind === "week" ? (
            <div key={a.assignmentId} className="sheet-assignment">
              <h3>{a.title}</h3>
              <ul>
                {a.rows.map((r) => (
                  <li key={r.date}>
                    <span className="sheet-box" aria-hidden="true" />
                    <span><span className="sheet-day">{r.day}</span>{r.range ? <span className="sheet-range"> · {r.range}</span> : null}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div key={a.assignmentId} className="sheet-assignment sheet-assignment-day">
              <span className="sheet-box" aria-hidden="true" />
              <h3>{a.title}</h3>
              {a.rows[0]?.range ? <span className="sheet-range">· {a.rows[0].range}</span> : null}
            </div>
          ))}
        </section>
      ))}
      <section className="sheet-notes" aria-label={`Notes for ${sheet.childName}`}>
        <h2>Notes</h2>
        {Array.from({ length: NOTE_LINES[kind] }, (_, i) => <div key={i} className="sheet-line" />)}
      </section>
    </section>
  );
}
