/**
 * S4-09: the weekly briefing on This Week. A few plain lines per child, only when something needs attention; with
 * nothing to flag it renders nothing and takes no space. Anything that fails to load also renders nothing.
 * The plan is fetched here for the whole span of the family's assignments (the forecast and the heavy-week check
 * need more than the shown week).
 */
import { useEffect, useMemo, useState } from "react";
import { addDays, toDayNumber, type LocalDate, type Weekday } from "@hh/engine";
import type { Assignment, Child, PastWeek, PlanResponse } from "../../api/types";
import { useApi } from "../../api/useApi";
import { useMe } from "../../auth/AuthProvider";
import { useLastWeekCheckIn } from "../checkin/useLastWeekCheckIn";
import { buildBriefing, type ChildBriefing } from "./briefingLines";
import { usePlanRefresh } from "./planRefresh";
import "./plan.css";

/** The most days the plan endpoint answers for (apps/api/src/routes/plan.ts). */
const MAX_SPAN = 400;
/** Lines shown per child before "and N more". */
const SHOWN = 3;
export const NUDGE_TEXT = "Last week isn't checked in yet.";

/** From the earliest start to the latest end of the live assignments, widened to the shown week and held to the API's limit. */
export function briefingRange(assignments: readonly Assignment[], weekStart: LocalDate): { from: LocalDate; to: LocalDate } {
  let from = weekStart;
  let to = addDays(weekStart, 6);
  for (const a of assignments) {
    if (a.archived) continue;
    if (a.startDate < from) from = a.startDate;
    if (a.endDate > to) to = a.endDate;
  }
  if (toDayNumber(to) - toDayNumber(from) + 1 > MAX_SPAN) {
    // Keep the latest MAX_SPAN days, but never lose the shown week.
    const latest = addDays(to, 1 - MAX_SPAN);
    from = latest > from ? latest : from;
    if (from > weekStart) from = weekStart;
    const last = addDays(from, MAX_SPAN - 1);
    if (to > last) to = last;
  }
  return { from, to };
}

export function Briefing({ weekStart }: { weekStart: LocalDate }) {
  const assignments = useApi<Assignment[]>("/api/assignments");
  const children = useApi<Child[]>("/api/children");
  const weeks = useApi<{ weeks: PastWeek[] }>("/api/check-ins/weeks");
  const lastWeek = useLastWeekCheckIn();
  const { checkInsVersion } = usePlanRefresh();
  const reloadWeeks = weeks.reload;
  useEffect(() => {
    if (checkInsVersion > 0) reloadWeeks();
  }, [checkInsVersion, reloadWeeks]);
  if (!assignments.data || !children.data) return null;
  // Never shown to a family that has not checked in before.
  const checkedInBefore = (weeks.data?.weeks ?? []).some((w) => w.status === "reviewed" || w.hasCheckIns);
  const nudge = checkedInBefore && lastWeek.week !== null;
  return <BriefingBody assignments={assignments.data} children={children.data} weekStart={weekStart} nudge={nudge} />;
}

interface BodyProps {
  assignments: Assignment[];
  children: Child[];
  weekStart: LocalDate;
  nudge: boolean;
}

function BriefingBody({ assignments, children, weekStart, nudge }: BodyProps) {
  const me = useMe();
  const { from, to } = useMemo(() => briefingRange(assignments, weekStart), [assignments, weekStart]);
  const plan = useApi<PlanResponse>(`/api/plan?from=${from}&to=${to}`);
  // A check-in or adjustment elsewhere on the page changed the plan: refetch in place.
  const { version } = usePlanRefresh();
  const reloadPlan = plan.reload;
  useEffect(() => {
    if (version > 0) reloadPlan();
  }, [version, reloadPlan]);

  const groups = useMemo(() => {
    if (!plan.data) return [];
    const titles = new Map(assignments.map((a) => [a.id, a.title]));
    return buildBriefing({
      plans: plan.data.plans,
      children: children.filter((c) => !c.archived).map((c) => ({ id: c.id, name: c.name })),
      titleOf: (id) => titles.get(id) ?? "An assignment",
      weekStart,
      calendar: { weekStart: me.weekStart, schoolDays: me.schoolDays as Weekday[] },
    });
  }, [plan.data, assignments, children, weekStart, me.weekStart, me.schoolDays]);

  if (groups.length === 0 && !nudge) return null;
  return (
    <section className="briefing" aria-label="Weekly briefing">
      {groups.map((g) => <ChildLines key={g.childId} group={g} />)}
      {nudge ? <p className="briefing-line"><a href="#last-week-checkin">{NUDGE_TEXT}</a></p> : null}
    </section>
  );
}

function ChildLines({ group }: { group: ChildBriefing }) {
  const [open, setOpen] = useState(false);
  const hidden = open ? 0 : Math.max(0, group.lines.length - SHOWN);
  const shown = hidden > 0 ? group.lines.slice(0, SHOWN) : group.lines;
  return (
    <div className="briefing-child">
      <p className="briefing-name">{group.childName}</p>
      <ul className="briefing-lines" aria-label={`Briefing for ${group.childName}`}>
        {shown.map((l) => <li key={l.key}>{l.text}</li>)}
      </ul>
      {hidden > 0 ? <button type="button" className="briefing-more" onClick={() => setOpen(true)}>and {hidden} more</button> : null}
    </div>
  );
}
