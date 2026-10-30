/**
 * S4-09: the weekly briefing on This Week. A few plain lines per child, only when something needs attention; with
 * nothing to flag it renders nothing and takes no space. Anything that fails to load also renders nothing.
 * The plan is fetched here for the whole span of the family's assignments (the forecast and the heavy-week check
 * need more than the shown week).
 */
import { useEffect, useMemo, useState } from "react";
import { addDays, toDayNumber, type ChildPlan, type LocalDate, type Weekday } from "@hh/engine";
import { apiGet } from "../../api/client";
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

export interface DateRange {
  from: LocalDate;
  to: LocalDate;
}

/**
 * The ranges to request (S4b-01): from the earliest start to the latest end of the live assignments, widened to the shown
 * week. Over the API's limit the far end is cut, never the start (the forecast needs the check-in history). When the shown
 * week lies beyond the first range a second one ends at the shown week's end; the plans are merged by `mergePlans`.
 */
export function briefingRanges(assignments: readonly Assignment[], weekStart: LocalDate): DateRange[] {
  let from = weekStart;
  const weekEnd = addDays(weekStart, 6);
  let to = weekEnd;
  for (const a of assignments) {
    if (a.archived) continue;
    if (a.startDate < from) from = a.startDate;
    if (a.endDate > to) to = a.endDate;
  }
  if (toDayNumber(to) - toDayNumber(from) + 1 <= MAX_SPAN) return [{ from, to }];
  const first = { from, to: addDays(from, MAX_SPAN - 1) };
  if (weekEnd <= first.to) return [first];
  const secondFrom = addDays(weekEnd, 1 - MAX_SPAN);
  return [first, { from: secondFrom > addDays(first.to, 1) ? secondFrom : addDays(first.to, 1), to: weekEnd }];
}

/** One plan per assignment and child: the first range's plan (it has the history), with the days of the others added. */
export function mergePlans(responses: readonly PlanResponse[]): ChildPlan[] {
  const merged = new Map<string, ChildPlan>();
  for (const r of responses) {
    for (const p of r.plans) {
      const key = `${p.assignmentId}|${p.childId}`;
      const have = merged.get(key);
      if (!have) {
        merged.set(key, p);
        continue;
      }
      const seen = new Set(have.days.map((d) => d.date));
      const days = [...have.days, ...p.days.filter((d) => !seen.has(d.date))].sort((x, y) => (x.date < y.date ? -1 : 1));
      merged.set(key, { ...have, days });
    }
  }
  return [...merged.values()];
}

/** The briefing's plans for `ranges` (one request each, merged); undefined while loading or when any request fails. */
function usePlans(ranges: readonly DateRange[], refreshKey: number): ChildPlan[] | undefined {
  const [plans, setPlans] = useState<ChildPlan[] | undefined>(undefined);
  const key = ranges.map((r) => `/api/plan?from=${r.from}&to=${r.to}`).join(" ");
  useEffect(() => {
    let live = true;
    Promise.all(key.split(" ").map((path) => apiGet<PlanResponse>(path))).then(
      (rs) => live && setPlans(mergePlans(rs)),
      () => live && setPlans(undefined),
    );
    return () => {
      live = false;
    };
  }, [key, refreshKey]);
  return plans;
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
  const ranges = useMemo(() => briefingRanges(assignments, weekStart), [assignments, weekStart]);
  // A check-in or adjustment elsewhere on the page changed the plan: refetch in place.
  const { version } = usePlanRefresh();
  const plans = usePlans(ranges, version);

  const groups = useMemo(() => {
    if (!plans) return [];
    const titles = new Map(assignments.map((a) => [a.id, a.title]));
    return buildBriefing({
      plans,
      children: children.filter((c) => !c.archived).map((c) => ({ id: c.id, name: c.name })),
      titleOf: (id) => titles.get(id) ?? "An assignment",
      weekStart,
      calendar: { weekStart: me.weekStart, schoolDays: me.schoolDays as Weekday[] },
    });
  }, [plans, assignments, children, weekStart, me.weekStart, me.schoolDays]);

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
