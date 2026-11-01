/**
 * S8-05: Schedule's Week view. This week's planned work as pastel bars, one per assignment, with a child switch
 * (Frank / Margaret / Both). A current or coming week opens its adjustment from a bar (S6-03); a finished week is the
 * check-in board, so a bar there opens Update status (S8-06). Nothing on the page is a number the family didn't enter.
 */
import { useState } from "react";
import { addDays } from "@hh/engine";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import type { ScheduleEvent } from "../../api/types";
import { useApi } from "../../api/useApi";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { Link } from "react-router-dom";
import { Segmented } from "../../ui/components";
import { aheadTitle } from "../checkin/ChildAdjustment";
import { Briefing } from "../plan/Briefing";
import { PlanRefreshProvider } from "../plan/planRefresh";
import { useWeekPlansState } from "../plan/useWeekPlans";
import { useDebugFlag, useShownWeek } from "../plan/useShownWeek";
import { PlanDebugView } from "../plan/PlanDebugView";
import { WeekAdjustment } from "../plan/WeekAdjustment";
import { weekSpan } from "../home/homeSummary";
import { WeekBar, WeekBars } from "./WeekBar";
import { barsFromPlans, eventLines } from "./weekBars";
import { BOTH, useChildChoice } from "./useChildChoice";
import { useWeekLookups } from "./useWeekLookups";

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
      {past ? <p className="week-empty">A finished week is checked in on <Link to="/track">Track work</Link>.</p> : <PlannedWeek weekStart={week.weekStart} currentWeekStart={week.currentWeekStart} choice={choice} look={look} />}
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
                  <WeekBar key={b.key} bar={b} slot={look.slotOfAssignment(b.assignmentId)}
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
