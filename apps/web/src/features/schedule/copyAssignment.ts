/** S3a-01: the prefill for a copied assignment, shared by the Assignments screen and the timeline edit bar (pure). */
import type { Assignment } from "../../api/types";
import { LIMITS } from "./assignmentLimits";
import type { Draft } from "./ScheduleList";

const MAX_TITLE = LIMITS.title;
const SUFFIX = " (copy)";

/** The original's fields with " (copy)" on the title. `weightPerUnit` is kept as stored (null follows the subject default). */
export function copyOfAssignment(a: Assignment): Draft<Assignment> {
  const title = a.title.length + SUFFIX.length <= MAX_TITLE ? a.title : a.title.slice(0, MAX_TITLE - SUFFIX.length).trimEnd();
  return {
    subjectId: a.subjectId,
    title: title + SUFFIX,
    unitType: a.unitType,
    totalUnits: a.totalUnits,
    weightPerUnit: a.weightPerUnit,
    startDate: a.startDate,
    endDate: a.endDate,
    childIds: [...a.childIds],
  };
}
