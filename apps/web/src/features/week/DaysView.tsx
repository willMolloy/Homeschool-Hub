/**
 * S16-01/02: Schedule · Week as Days. Every school day of the shown week in one view: stacked on a phone, side by side from 840 px.
 * A line is a subject icon, the title and that day's range (the printed sheet's own, see daysModel.ts); a day off or a break is one
 * quiet line. Under All children the day is grouped under each child's heading, then Together (S16-07). A line opens what a Week bar opens.
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
  /** Under All children (two or more children shown): lines are grouped under child headings and Together. */
  markers: boolean;
  onOpen: (line: DayLine) => void;
}

export function DaysView({ weekStart, plans, kids, look, blocked, markers, onOpen }: DaysViewProps) {
  const me = useMe();
  const kidIds = new Set(kids.map((k) => k.id));
  const shared = new Set(look.assignments.filter((a) => a.childIds.filter((id) => kidIds.has(id)).length >= 2).map((a) => a.id));
  const days = buildDays(kids, plans, weekStart, look, blocked, me.schoolDays, markers, shared);
  const byId = new Map(kids.map((k) => [k.id, k]));
  return (
    <div className="days-grid" style={{ "--days": Math.max(1, days.length) } as CSSProperties}>
      {days.map((d) => (
        <section key={d.date} className="day" aria-label={d.heading}>
          <header className="day-head">
            <h3>{d.heading}</h3>
            <span className="day-load" aria-hidden="true"><i style={{ width: `${Math.round(d.load * 100)}%` }} /></span>
          </header>
          {d.off ? <p className="day-quiet">{d.off}</p> : d.groups.every((g) => g.lines.length === 0 && !g.off) ? <p className="day-quiet">Nothing planned</p> : null}
          {d.groups.map((g) => {
            const kid = g.childId ? byId.get(g.childId) : undefined;
            const rule = kid?.color && /^#[0-9a-f]{3,8}$/i.test(kid.color) ? kid.color : undefined;
            return (
              <div key={g.key} className="day-group" style={rule ? ({ "--kid": rule } as CSSProperties) : undefined}>
                {g.heading ? <h4 className="day-child">{g.heading}</h4> : null}
                {g.lines.length > 0 ? (
                  <ul className="day-lines" aria-label={g.heading ? `${d.heading}, ${g.heading}` : `${d.heading} work`}>
                    {g.lines.map((l) => (
                      <li key={l.key}>
                        <button type="button" className="day-line" style={{ "--cs": `var(--tl-subject-${l.slot}-strong)` } as CSSProperties} data-children={(l.togetherWith ?? [l.childName]).join(",")} onClick={() => onOpen(l)}>
                          <SubjectGlyph subject={look.subjectFor(l.assignmentId)} />
                          <span className="day-title">{l.title}</span>
                          {l.range ? <span className="day-range">{l.range}</span> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {g.off ? <p className="day-quiet">{g.off}</p> : null}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
