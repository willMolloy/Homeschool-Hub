/**
 * S16-01/02: Schedule · Week as Days. Every school day of the shown week in one view: stacked on a phone, side by side from 840 px.
 * A line is a subject icon, the title and that day's range (the printed sheet's own, see daysModel.ts); a day off or a break is one
 * quiet line. Under All children a line carries the child's initial in their colour. A line opens what a Week bar opens.
 */
import type { CSSProperties } from "react";
import type { ChildPlan } from "@hh/engine";
import type { BlockedRange, Child } from "../../api/types";
import { useMe } from "../../auth/AuthProvider";
import { SubjectGlyph } from "../subjects/SubjectIcon";
import { buildDays, type DayLine } from "./daysModel";
import type { WeekLookups } from "./useWeekLookups";
import "./week.css";

export interface DaysViewProps {
  weekStart: string;
  plans: readonly ChildPlan[];
  kids: readonly Child[];
  look: WeekLookups;
  blocked: readonly BlockedRange[];
  /** Under All children (two or more children shown): each line gets the child's initial. */
  markers: boolean;
  onOpen: (line: DayLine) => void;
}

/** Black or white, whichever reads on this colour; null when the colour is not a hex. */
export function inkOn(hex: string | null): string | null {
  const m = hex && /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return lum > 0.4 ? "#1d1a16" : "#ffffff";
}

export function DaysView({ weekStart, plans, kids, look, blocked, markers, onOpen }: DaysViewProps) {
  const me = useMe();
  const days = buildDays(kids, plans, weekStart, look, blocked, me.schoolDays, markers);
  const byId = new Map(kids.map((k) => [k.id, k]));
  return (
    <div className="days-grid" style={{ "--days": Math.max(1, days.length) } as CSSProperties}>
      {days.map((d) => (
        <section key={d.date} className="day" aria-label={d.heading}>
          <header className="day-head">
            <h3>{d.heading}</h3>
            <span className="day-load" aria-hidden="true"><i style={{ width: `${Math.round(d.load * 100)}%` }} /></span>
          </header>
          {d.off ? <p className="day-quiet">{d.off}</p> : d.lines.length === 0 && d.notes.length === 0 ? <p className="day-quiet">Nothing planned</p> : null}
          {d.lines.length > 0 ? (
            <ul className="day-lines" aria-label={`${d.heading} work`}>
              {d.lines.map((l) => {
                const kid = byId.get(l.childId);
                const style = { "--cs": `var(--tl-subject-${l.slot}-strong)` } as CSSProperties;
                const dot = markers && kid ? { background: kid.color ?? "var(--tl-muted-foreground)", color: inkOn(kid.color) ?? "var(--tl-background)" } : null;
                return (
                  <li key={l.key}>
                    <button type="button" className="day-line" style={style} onClick={() => onOpen(l)}>
                      <SubjectGlyph subject={look.subjectFor(l.assignmentId)} />
                      <span className="day-title">{l.title}</span>
                      {l.range ? <span className="day-range">{l.range}</span> : null}
                      {dot ? <span className="day-dot" style={dot} aria-hidden="true">{(l.childName.trim()[0] ?? "?").toUpperCase()}</span> : null}
                      {dot ? <span className="sr-only">{l.childName}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {d.notes.map((n) => <p key={n} className="day-quiet">{n}</p>)}
        </section>
      ))}
    </div>
  );
}
