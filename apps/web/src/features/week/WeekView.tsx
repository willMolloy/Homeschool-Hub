/**
 * S8-05: Schedule's Week view. This week's planned work as pastel bars, one per assignment, with a child switch
 * (All children / Frank / Margaret). A current or coming week opens its adjustment from a bar (S6-03), where each row also
 * offers Update status (S9-02); a finished week shows its bars, and a bar there opens Update status (S8-06).
 * Nothing on the page is a number the family didn't enter.
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { EmptyState } from "../../ui/EmptyState";
import { Segmented } from "../../ui/components";
import { addDays } from "@hh/engine";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import type { ScheduleEvent } from "../../api/types";
import { useApi } from "../../api/useApi";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { useMe } from "../../auth/AuthProvider";
import { PrintSheetsButton } from "../print/PrintSheets";
import { BarDetailSheet } from "../view/BarDetail";
import { ChildSwitch } from "./ChildSwitch";
import { weekRangeText } from "../checkin/checkinText";
import { Briefing } from "../plan/Briefing";
import { PlanRefreshProvider } from "../plan/planRefresh";
import { useWeekPlansState } from "../plan/useWeekPlans";
import { useDebugFlag, useShownWeek } from "../plan/useShownWeek";
import { PlanDebugView } from "../plan/PlanDebugView";
import { WeekAdjustment } from "../plan/WeekAdjustment";
import { weekSpan } from "../home/homeSummary";
import { PastWeek } from "../status/PastWeek";
import { UpdateStatusFlow } from "../status/UpdateStatusFlow";
import { SubjectGlyph } from "../subjects/SubjectIcon";
import { WeekBar, WeekBars } from "./WeekBar";
import { barsFromPlans, eventLines } from "./weekBars";
import { ALL, useChildChoice } from "./useChildChoice";
import { WeekDays } from "./WeekDays";
import { useWeekLayout, type WeekLayout } from "./useWeekLayout";
import { useWeekLookups } from "./useWeekLookups";

/** "Frank · This week · Oct 26 – Nov 1", or "Frank · Nov 2 – 8" for a coming week (S6-03). */
export const aheadTitle = (childName: string, weekStart: string, weekEnd: string, current: boolean) =>
  `${childName} · ${current ? "This week · " : ""}${weekRangeText(weekStart, weekEnd)}`;

/** S10-13: `headSlot` is the spot at the end of Schedule's Week | Year row; the week group (‹ range ›) goes there. */
export function WeekView({ headSlot = null, titleSlot = null }: { headSlot?: HTMLElement | null; titleSlot?: HTMLElement | null }) {
  return (
    <PlanRefreshProvider>
      <Week headSlot={headSlot} titleSlot={titleSlot} />
    </PlanRefreshProvider>
  );
}

function Week({ headSlot, titleSlot }: { headSlot: HTMLElement | null; titleSlot: HTMLElement | null }) {
  const week = useShownWeek();
  const look = useWeekLookups();
  const [choice, setChoice] = useChildChoice(look.activeChildren);
  const past = week.weekStart < week.currentWeekStart;
  const debug = useDebugFlag();
  // S15-03: a viewer looks at the same weeks, but nothing on the page is editable: no briefing (its buttons move dates), and a bar opens a read-only detail.
  const readOnly = useMe().role === "viewer";
  const [layout, setLayout] = useWeekLayout();
  const title = week.weekStart === week.currentWeekStart ? "This week"
    : week.weekStart === addDays(week.currentWeekStart, -7) ? "Last week" : week.weekStart < week.currentWeekStart ? "Earlier week" : "Coming week";
  // S10-13: one row with the Week | Year switch: ‹, the range with its word ("This week") as a small muted label, ›.
  // Under 360 px the word is only spoken (it stays in the live region); the heading stays for screen readers.
  const group = (
    <div className="week-step-row" role="group" aria-label="Week">
      <button type="button" className="round-btn" aria-label="Previous week" onClick={() => week.go(addDays(week.weekStart, -7))}><CaretLeft size={20} weight="light" aria-hidden="true" /></button>
      <span className="week-range" aria-live="polite">
        <span className="week-word">{title}<span className="week-sep" aria-hidden="true">{"\u00a0·\u00a0"}</span></span>
        <span className="week-dates">{weekSpan(week.weekStart)}</span>
      </span>
      <button type="button" className="round-btn" aria-label="Next week" onClick={() => week.go(addDays(week.weekStart, 7))}><CaretRight size={20} weight="light" aria-hidden="true" /></button>
    </div>
  );
  return (
    <div className="week">
      <h2 className="sr-only">{title}</h2>
      {headSlot ? createPortal(group, headSlot) : group}
      {/* S13-01: Print sheets sits at the end of the title row (where Year has its "+"). */}
      {titleSlot && look.activeChildren.length > 0 ? createPortal(<PrintSheetsButton weekStart={week.weekStart} kids={look.activeChildren} />, titleSlot) : null}
      {/* S16-02: Bars | Days, remembered on this device. A viewer gets it too (it changes only how the week is drawn). */}
      <div className="week-layout-row">
        <Segmented label="Week layout" value={layout} onChange={setLayout} options={[{ value: "bars", label: "Bars" }, { value: "days", label: "Days" }]} />
      </div>
      <ChildSwitch kids={look.activeChildren} value={choice} onChange={setChoice} />
      {!past && !readOnly && <Briefing weekStart={week.weekStart} childId={choice === ALL ? null : choice} />}
      {past ? <PastWeek weekStart={week.weekStart} choice={choice} look={look} readOnly={readOnly} layout={layout} /> : <PlannedWeek weekStart={week.weekStart} currentWeekStart={week.currentWeekStart} choice={choice} look={look} readOnly={readOnly} layout={layout} />}
      {debug ? <PlanDebugView weekStart={week.weekStart} debug={debug} /> : null}
    </div>
  );
}

function PlannedWeek({ weekStart, currentWeekStart, choice, look, readOnly, layout }: { weekStart: string; currentWeekStart: string; choice: string | null; look: ReturnType<typeof useWeekLookups>; readOnly: boolean; layout: WeekLayout }) {
  const { plans, failed, retry } = useWeekPlansState(weekStart);
  const events = useApi<ScheduleEvent[]>("/api/events");
  const [adjusting, setAdjusting] = useState<{ childId: string; childName: string } | null>(null);
  const [statusFor, setStatusFor] = useState<{ childId: string; assignmentId: string; title: string } | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
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
    return <EmptyState text="No children yet." hint={readOnly ? undefined : "Add the children you teach, then their subjects and books."}
      action={readOnly ? undefined : <Link className="btn" to="/setup/children">Add your children</Link>} />;
  }
  if (look.known.assignments && !look.assignments.some((a) => !a.archived)) {
    return <EmptyState text="Nothing is planned yet." hint={readOnly ? undefined : "Add a book or a lesson and your week fills in."}
      action={readOnly ? undefined : <Link className="btn" to="/setup/assignments">Add your first assignment</Link>} />;
  }
  const bars = barsFromPlans(plans, weekStart, look);
  const kids = choice === ALL ? look.activeChildren : look.activeChildren.filter((c) => c.id === choice);
  const current = weekStart === currentWeekStart;
  const weekEnd = addDays(weekStart, 6);
  return (
    <>
      {layout === "days" ? (
        <WeekDays weekStart={weekStart} kids={kids} look={look} markers={choice === ALL && kids.length > 1}
          onOpen={(l) => (readOnly ? setViewing(l.assignmentId) : setAdjusting({ childId: l.childId, childName: l.childName }))} />
      ) : kids.map((k) => {
        const mine = bars.filter((b) => b.childId === k.id);
        const lines = eventLines(events.data ?? [], weekStart, weekEnd, k.id);
        return (
          <section key={k.id} aria-label={`${k.name}'s work`}>
            <h3 className="week-section">{k.name}&apos;s work</h3>
            {mine.length === 0 ? <p className="week-empty">Nothing planned this week.</p> : (
              <WeekBars label={`${k.name}'s bars`}>
                {mine.map((b) => (
                  <WeekBar key={b.key} bar={b} slot={look.slotOfAssignment(b.assignmentId)} icon={<SubjectGlyph subject={look.subjectFor(b.assignmentId)} />}
                    onOpen={() => (readOnly ? setViewing(b.assignmentId) : setAdjusting({ childId: k.id, childName: k.name }))} />
                ))}
              </WeekBars>
            )}
            {lines.map((l) => <p className="week-event" key={l.key}>{l.text}</p>)}
          </section>
        );
      })}
      {readOnly ? <BarDetailSheet assignment={look.assignments.find((a) => a.id === viewing) ?? null} subjects={look.subjects} children={look.children} onClose={() => setViewing(null)} /> : null}
      {readOnly ? null : <ResponsiveSheet open={adjusting !== null} onOpenChange={(o) => !o && setAdjusting(null)}
        title={adjusting ? aheadTitle(adjusting.childName, weekStart, weekEnd, current) : ""}>
        {adjusting && <WeekAdjustment childId={adjusting.childId} weekStart={weekStart} weekEnd={weekEnd} current={current} onSaved={() => setAdjusting(null)}
          onUpdateStatus={(t) => { setStatusFor({ childId: adjusting.childId, ...t }); setAdjusting(null); }} />}
      </ResponsiveSheet>}
      {statusFor && <UpdateStatusFlow assignmentId={statusFor.assignmentId} childId={statusFor.childId} title={statusFor.title} onClose={() => setStatusFor(null)} />}
    </>
  );
}
