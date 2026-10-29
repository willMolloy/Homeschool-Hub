/** Each check-in row's subject pastel, slots dealt as on the timeline (T-03b; shared since T-09). */
import { useMemo, type CSSProperties } from "react";
import type { Assignment, CheckInItem, Subject } from "../../api/types";
import { useApi } from "../../api/useApi";
import { subjectSlots } from "../timeline/model";

/** Unknown assignments stay untinted. */
export function usePastels() {
  const assignments = useApi<Assignment[]>("/api/assignments");
  const subjects = useApi<Subject[]>("/api/subjects");
  return useMemo(() => {
    const subjectOf = new Map((assignments.data ?? []).map((a) => [a.id, a.subjectId]));
    const slot = subjectSlots(subjects.data ?? []);
    return (item: CheckInItem) => {
      const subjectId = subjectOf.get(item.assignmentId);
      return subjectId ? ({ "--checkin-row-tint": `var(--tl-subject-${slot(subjectId)}-pastel)` } as CSSProperties) : undefined;
    };
  }, [assignments.data, subjects.data]);
}
