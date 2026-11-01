/** The children, subjects and assignments the week screens need, with the subject colour slot of each assignment. */
import { useMemo } from "react";
import type { Assignment, Child, Subject } from "../../api/types";
import { useApi } from "../../api/useApi";
import { subjectSlots } from "../timeline/model";
import type { Lookups } from "./weekBars";

export interface WeekLookups extends Lookups {
  ready: boolean;
  /** The lists answered (a failed request is not "empty"): used to tell a new family from a broken screen. */
  known: { children: boolean; assignments: boolean };
  activeChildren: Child[];
  slotOfAssignment: (assignmentId: string) => number;
  /** The subject of an assignment, for its icon. */
  subjectFor: (assignmentId: string) => Subject | undefined;
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
      known: { children: Boolean(children.data), assignments: Boolean(assignments.data) },
      ready: !children.loading && !subjects.loading && !assignments.loading,
      children: kids, subjects: subs, assignments: list,
      activeChildren: kids.filter((c) => !c.archived),
      titleOf: (id: string) => byId.get(id)?.title ?? "Assignment",
      subjectOf,
      slotOfAssignment: (id: string) => { const s = subjectOf(id); return s ? slot(s) : 1; },
      subjectFor: (id: string) => subs.find((s) => s.id === subjectOf(id)),
    };
  }, [children.data, subjects.data, assignments.data, children.loading, subjects.loading, assignments.loading]);
}
