/**
 * S8-05/06, S9-02: a finished week on Schedule's Week view: its bars as they were planned. A bar opens Update status for
 * that week, which saves on its own (no board, no round checks, no "Save check-in"): the one way a parent corrects the
 * plan's pace after the fact.
 */
import { useState } from "react";
import { useWeekCheckIn } from "../checkin/useLastWeekCheckIn";
import { compactText } from "../checkin/amount";
import { itemKey, rowOutcome } from "../checkin/absorb";
import { useLateEnd } from "../plan/useLateEnd";
import { useWeekPlans } from "../plan/useWeekPlans";
import { SubjectGlyph } from "../subjects/SubjectIcon";
import { WeekBar, WeekBars } from "../week/WeekBar";
import { ALL } from "../week/useChildChoice";
import { WeekDays } from "../week/WeekDays";
import type { WeekLayout } from "../week/useWeekLayout";
import type { WeekLookups } from "../week/useWeekLookups";
import type { CheckInItem } from "../../api/types";
import { BarDetailSheet } from "../view/BarDetail";
import { UpdateStatusSheet } from "./UpdateStatusSheet";
import { statusBody } from "./saveStatus";
import "../week/week.css";

export function PastWeek({ weekStart, choice, look, readOnly = false, layout = "bars" }: { weekStart: string; choice: string | null; look: WeekLookups; readOnly?: boolean; layout?: WeekLayout }) {
  const state = useWeekCheckIn(weekStart);
  const plans = useWeekPlans(weekStart);
  const [open, setOpen] = useState<CheckInItem | null>(null);
  const late = useLateEnd(open?.assignmentId ?? "", open?.childId ?? null);
  const [viewing, setViewing] = useState<string | null>(null); // S15-03: a viewer's bar opens a read-only detail, never Update status
  if (state.loadError) return <p className="checkin-error" role="alert">{state.loadError}</p>;
  if (!state.data || !look.ready || (layout === "days" && !plans)) return <p aria-busy="true">Loading…</p>;
  const week = state.data;
  const kids = choice === ALL ? look.activeChildren : look.activeChildren.filter((c) => c.id === choice);
  const positionOf = (i: CheckInItem) => i.actual ?? i.plannedTo;
  return (
    <div className="board">
      {layout === "days" ? (
        <WeekDays weekStart={weekStart} kids={kids} look={look} markers={choice === ALL && kids.length > 1}
          onOpen={(l) => {
            // A finished week's line opens what its bar opens: Update status for that assignment (a viewer: the read-only detail).
            const item = week.items.find((i) => i.assignmentId === l.assignmentId && i.childId === l.childId);
            if (readOnly) setViewing(l.assignmentId);
            else if (item) setOpen(item);
          }} />
      ) : kids.map((k) => {
        const mine = week.items.filter((i) => i.childId === k.id);
        return (
          <section key={k.id} aria-label={`${k.name}'s week`}>
            <h3 className="week-section">{k.name}&apos;s week</h3>
            {mine.length === 0 ? <p className="week-empty">Nothing was planned.</p> : (
              <WeekBars label={`${k.name}'s bars`}>
                {mine.map((i) => {
                  const key = itemKey(i);
                  const bar = { key, assignmentId: i.assignmentId, childId: i.childId, childName: i.childName, subjectId: look.subjectOf(i.assignmentId), title: i.title, unitType: i.unitType, from: i.plannedFrom, to: i.plannedTo, total: i.totalUnits };
                  return (
                    <WeekBar key={key} bar={bar} slot={look.slotOfAssignment(i.assignmentId)} icon={<SubjectGlyph subject={look.subjectFor(i.assignmentId)} />} onOpen={() => (readOnly ? setViewing(i.assignmentId) : setOpen(i))}
                      state={rowOutcome(i, positionOf(i)) === "asPlanned" ? undefined : compactText(i, positionOf(i))} />
                  );
                })}
              </WeekBars>
            )}
          </section>
        );
      })}
      {readOnly ? <BarDetailSheet assignment={look.assignments.find((a) => a.id === viewing) ?? null} subjects={look.subjects} children={look.children} onClose={() => setViewing(null)} /> : null}
      {open && !readOnly ? (
        <UpdateStatusSheet key={itemKey(open)} item={open} position={positionOf(open)} mode={open.mode} plan={plans?.find((p) => p.assignmentId === open.assignmentId && p.childId === open.childId)}
          late={late} afterDay={week.weekEnd} whenText="that week" busy={state.busy} error={state.error ?? Object.values(state.itemErrors)[0] ?? null} onClose={() => setOpen(null)}
          onSave={(position, mode, endDate) => { void state.save(statusBody(week, open, position, mode, endDate)).then((res) => { if (res) setOpen(null); }); }} />
      ) : null}
    </div>
  );
}
