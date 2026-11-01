/**
 * S8-05: Schedule's Week view. This week's planned work as pastel bars, one per assignment, with a child switch
 * (Frank / Margaret / Both). A current or coming week opens its adjustment from a bar (S6-03); a finished week is the
 * check-in board, so a bar there opens Update status (S8-06). Nothing on the page is a number the family didn't enter.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../../ui/EmptyState";
import { addDays } from "@hh/engine";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import type { ScheduleEvent } from "../../api/types";
import { useApi } from "../../api/useApi";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { Segmented } from "../../ui/components";
import { weekRangeText } from "../checkin/checkinText";
import { Briefing } from "../plan/Briefing";
import { PlanRefreshProvider } from "../plan/planRefresh";
import { useWeekPlansState } from "../plan/useWeekPlans";
import { useDebugFlag, useShownWeek } from "../plan/useShownWeek";
import { PlanDebugView } from "../plan/PlanDebugView";
import { WeekAdjustment } from "../plan/WeekAdjustment";
import { weekSpan } from "../home/homeSummary";
import { PastWeek } from "../track/PastWeek";
import { SubjectGlyph } from "../subjects/SubjectIcon";
import { WeekBar, WeekBars } from "./WeekBar";
import { barsFromPlans, eventLines } from "./weekBars";
import { BOTH, useChildChoice } from "./useChildChoice";
import { useWeekLookups } from "./useWeekLookups";

/** "Frank · This week · Oct 26 – Nov 1", or "Frank · Nov 2 – 8" for a coming week (S6-03). */
export const aheadTitle = (childName: string, weekStart: string, weekEnd: string, current: boolean) =>
  `${childName} · ${current ? "This week · " : ""}${weekRangeText(weekStart, weekEnd)}`;

export function WeekView() {
  return (
    <PlanRefreshProvider>
      <Week />
    </PlanRefreshProvider>
  );
}

function Week() {
  const week = useShownWeek();
  const look = useWeekLookups();
  const [choice, setChoice] = useChildChoice(look.activeChildren);
  const past = week.weekStart < week.currentWeekStart;
  const debug = useDebugFlag();
  const title = week.weekStart === week.currentWeekStart ? "This week"
    : week.weekStart === addDays(week.currentWeekStart, -7) ? "Last week" : week.weekStart < week.currentWeekStart ? "Earlier week" : "Coming week";
  return (
    <div className="week">
      <div className="week-head">
        <h2>{title}</h2>
        <div className="week-step-row" role="group" aria-label="Week">
          <button type="button" className="round-btn" aria-label="Previous week" onClick={() => week.go(addDays(week.weekStart, -7))}><CaretLeft size={20} weight="light" aria-hidden="true" /></button>
          <button type="button" className="round-btn" aria-label="Next week" onClick={() => week.go(addDays(week.weekStart, 7))}><CaretRight size={20} weight="light" aria-hidden="true" /></button>
        </div>
      </div>
      <p className="week-dates" aria-live="polite">{weekSpan(week.weekStart)}</p>
      {look.activeChildren.length > 1 && choice ? (
        <Segmented label="Child" value={choice} onChange={setChoice}
          options={[...look.activeChildren.map((c) => ({ value: c.id, label: c.name })), { value: BOTH, label: "Both" }]} />
      ) : null}
      {!past && <Briefing weekStart={week.weekStart} />}
      {past ? <PastWeek weekStart={week.weekStart} choice={choice} look={look} /> : <PlannedWeek weekStart={week.weekStart} currentWeekStart={week.currentWeekStart} choice={choice} look={look} />}
      {debug ? <PlanDebugView weekStart={week.weekStart} debug={debug} /> : null}
    </div>
  );
}

function PlannedWeek({ weekStart, currentWeekStart, choice, look }: { weekStart: string; currentWeekStart: string; choice: string | null; look: ReturnType<typeof useWeekLookups> }) {
  const { plans, failed, retry } = useWeekPlansState(weekStart);
  const events = useApi<ScheduleEvent[]>("/api/events");
  const [adjusting, setAdjusting] = useState<{ childId: string; childName: string } | null>(null);
  if (failed) {
    return (
      <div className="form-error" role="alert">
        <p>Couldn&apos;t load this week.</p>
        <button className="btn btn-secondary" type="button" onClick={retry}>Retry</button>
      </div>
    );
  }
  if (!look.ready || !plans) return <p aria-busy="true">Loading…</p>;
  // S8-09: a new family is told what to do first, with the one button that does it.
  if (look.known.children && look.activeChildren.length === 0) {
    return <EmptyState text="No children yet." hint="Add the children you teach, then their subjects and books."
      action={<Link className="btn" to="/setup/children">Add your children</Link>} />;
  }
  if (look.known.assignments && !look.assignments.some((a) => !a.archived)) {
    return <EmptyState text="Nothing is planned yet." hint="Add a book or a lesson and your week fills in."
      action={<Link className="btn" to="/setup/assignments">Add your first assignment</Link>} />;
  }
  const bars = barsFromPlans(plans, weekStart, look);
  const kids = choice === BOTH ? look.activeChildren : look.activeChildren.filter((c) => c.id === choice);
  const current = weekStart === currentWeekStart;
  const weekEnd = addDays(weekStart, 6);
  return (
    <>
      {kids.map((k) => {
        const mine = bars.filter((b) => b.childId === k.id);
        const lines = eventLines(events.data ?? [], weekStart, weekEnd, k.id);
        return (
          <section key={k.id} aria-label={`${k.name}'s work`}>
            <h3 className="week-section">{k.name}&apos;s work</h3>
            {mine.length === 0 ? <p className="week-empty">Nothing planned this week.</p> : (
              <WeekBars label={`${k.name}'s bars`}>
                {mine.map((b) => (
                  <WeekBar key={b.key} bar={b} slot={look.slotOfAssignment(b.assignmentId)} icon={<SubjectGlyph subject={look.subjectFor(b.assignmentId)} />}
                    onOpen={() => setAdjusting({ childId: k.id, childName: k.name })} />
                ))}
              </WeekBars>
            )}
            {lines.map((l) => <p className="week-event" key={l.key}>{l.text}</p>)}
          </section>
        );
      })}
      <ResponsiveSheet open={adjusting !== null} onOpenChange={(o) => !o && setAdjusting(null)}
        title={adjusting ? aheadTitle(adjusting.childName, weekStart, weekEnd, current) : ""}>
        {adjusting && <WeekAdjustment childId={adjusting.childId} weekStart={weekStart} weekEnd={weekEnd} current={current} onSaved={() => setAdjusting(null)} />}
      </ResponsiveSheet>
    </>
  );
}
