/** The children, subjects and assignments the week screens need, with the subject colour slot of each assignment. */
import { useMemo } from "react";
import type { Assignment, Child, Subject } from "../../api/types";
import { useApi } from "../../api/useApi";
import { subjectSlots } from "../timeline/model";
import type { Lookups } from "./weekBars";

export interface WeekLookups extends Lookups {
  ready: boolean;
  activeChildren: Child[];
  slotOfAssignment: (assignmentId: string) => number;
  assignments: readonly Assignment[];
}

export function useWeekLookups(): WeekLookups {
  const children = useApi<Child[]>("/api/children");
  const subjects = useApi<Subject[]>("/api/subjects");
  const assignments = useApi<Assignment[]>("/api/assignments");
  return useMemo(() => {
    const kids = children.data ?? [];
    const subs = subjects.data ?? [];
    const list = assignments.data ?? [];
    const byId = new Map(list.map((a) => [a.id, a]));
    const slot = subjectSlots(subs);
    const subjectOf = (id: string) => byId.get(id)?.subjectId ?? null;
    return {
      ready: !children.loading && !subjects.loading && !assignments.loading,
      children: kids, subjects: subs, assignments: list,
      activeChildren: kids.filter((c) => !c.archived),
      titleOf: (id: string) => byId.get(id)?.title ?? "Assignment",
      subjectOf,
      slotOfAssignment: (id: string) => { const s = subjectOf(id); return s ? slot(s) : 1; },
    };
  }, [children.data, subjects.data, assignments.data, children.loading, subjects.loading, assignments.loading]);
}
