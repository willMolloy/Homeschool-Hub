/** S3a-01: the prefill for a copied assignment, shared by the Assignments screen and the timeline edit bar (pure). */
import type { Assignment, Child, Subject } from "../../api/types";
import { LIMITS } from "./assignmentLimits";
import type { Draft } from "./ScheduleList";

const MAX_TITLE = LIMITS.title;
const SUFFIX = " (copy)";

/**
 * The original's fields with " (copy)" on the title. `weightPerUnit` is kept as stored (null follows the subject default).
 * S3b-02: an archived subject is cleared and archived children are dropped, so the copy can be saved. A lookup list that
 * leaves archived rows out (the timeline's) works too: an id that isn't an active row is treated the same way.
 */
export function copyOfAssignment(a: Assignment, lookups: { subjects: readonly Subject[]; children: readonly Child[] }): Draft<Assignment> {
  const activeSubject = lookups.subjects.some((s) => s.id === a.subjectId && !s.archived);
  const activeChild = (id: string) => lookups.children.some((c) => c.id === id && !c.archived);
  const title = a.title.length + SUFFIX.length <= MAX_TITLE ? a.title : a.title.slice(0, MAX_TITLE - SUFFIX.length).trimEnd();
  return {
    subjectId: activeSubject ? a.subjectId : "",
    title: title + SUFFIX,
    unitType: a.unitType,
    totalUnits: a.totalUnits,
    weightPerUnit: a.weightPerUnit,
    startDate: a.startDate,
    endDate: a.endDate,
    childIds: a.childIds.filter(activeChild),
  };
}
