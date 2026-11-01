/**
 * S8-05/06, S9-02: a finished week on Schedule's Week view: its bars as they were planned. A bar opens Update status for
 * that week, which saves on its own (no board, no round checks, no "Save check-in"): the one way a parent corrects the
 * plan's pace after the fact.
 */
import { useState } from "react";
import { useWeekCheckIn } from "../checkin/useLastWeekCheckIn";
import { compactText } from "../checkin/amount";
import { itemKey, rowOutcome } from "../checkin/absorb";
import { useWeekPlans } from "../plan/useWeekPlans";
import { SubjectGlyph } from "../subjects/SubjectIcon";
import { WeekBar, WeekBars } from "../week/WeekBar";
import { ALL } from "../week/useChildChoice";
import type { WeekLookups } from "../week/useWeekLookups";
import type { CheckInItem } from "../../api/types";
import { UpdateStatusSheet } from "./UpdateStatusSheet";
import { statusBody } from "./saveStatus";
import "../week/week.css";

export function PastWeek({ weekStart, choice, look }: { weekStart: string; choice: string | null; look: WeekLookups }) {
  const state = useWeekCheckIn(weekStart);
  const plans = useWeekPlans(weekStart);
  const [open, setOpen] = useState<CheckInItem | null>(null);
  if (state.loadError) return <p className="checkin-error" role="alert">{state.loadError}</p>;
  if (!state.data || !look.ready) return <p aria-busy="true">Loading…</p>;
  const week = state.data;
  const kids = choice === ALL ? look.activeChildren : look.activeChildren.filter((c) => c.id === choice);
  const positionOf = (i: CheckInItem) => i.actual ?? i.plannedTo;
  return (
    <div className="board">
      {kids.map((k) => {
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
                    <WeekBar key={key} bar={bar} slot={look.slotOfAssignment(i.assignmentId)} icon={<SubjectGlyph subject={look.subjectFor(i.assignmentId)} />} onOpen={() => setOpen(i)}
                      state={rowOutcome(i, positionOf(i)) === "asPlanned" ? undefined : compactText(i, positionOf(i))} />
                  );
                })}
              </WeekBars>
            )}
          </section>
        );
      })}
      {open ? (
        <UpdateStatusSheet key={itemKey(open)} item={open} position={positionOf(open)} mode={open.mode} plan={plans?.find((p) => p.assignmentId === open.assignmentId && p.childId === open.childId)}
          whenText="that week" busy={state.busy} error={state.error ?? Object.values(state.itemErrors)[0] ?? null} onClose={() => setOpen(null)}
          onSave={(position, mode) => { void state.save(statusBody(week, open, position, mode)).then((res) => { if (res) setOpen(null); }); }} />
      ) : null}
    </div>
  );
}
