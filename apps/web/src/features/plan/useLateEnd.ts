/**
 * S18-02: the late line's answer for one assignment and child, for Update status: the same plans the briefing reads (the whole
 * span of the family's assignments) through the same `lateEnd`, so both name the same end date. `undefined` while loading;
 * `null` when the briefing has no late line for it.
 */
import { useMemo } from "react";
import { weekStartOf, type Weekday } from "@hh/engine";
import type { Assignment } from "../../api/types";
import { useApi } from "../../api/useApi";
import { useMe } from "../../auth/AuthProvider";
import { usePlans, briefingRanges } from "./Briefing";
import { lateEnd, type LateEnd } from "./briefingLines";
import { usePlanRefresh } from "./planRefresh";

export function useLateEnd(assignmentId: string, childId: string | null): LateEnd | null | undefined {
  const me = useMe();
  const assignments = useApi<Assignment[]>("/api/assignments");
  const { version } = usePlanRefresh();
  const ranges = useMemo(() => briefingRanges(assignments.data ?? [], weekStartOf(me.today, me.weekStart)), [assignments.data, me.today, me.weekStart]);
  const plans = usePlans(ranges, version);
  return useMemo(() => {
    if (!plans || !assignments.data) return undefined;
    const plan = plans.find((p) => p.assignmentId === assignmentId && (childId === null || p.childId === childId));
    return plan ? lateEnd(plan, { weekStart: me.weekStart, schoolDays: me.schoolDays as Weekday[] }) : null;
  }, [plans, assignments.data, assignmentId, childId, me.weekStart, me.schoolDays]);
}
