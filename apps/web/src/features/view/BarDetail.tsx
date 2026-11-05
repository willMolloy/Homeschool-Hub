/**
 * S15-03: what a viewer sees when they open a bar on Schedule (Week or Year): the assignment's title, subject and children, its dates,
 * its amount and its pace line, in a sheet with nothing to press but Close. There is no field, no Copy, More, Update status or
 * completion button here at all. The pace comes from the plan (GET /api/plan, a read), because the draft-pace POST the editor uses is a
 * write-shaped call a viewer cannot make.
 */
import { minutesPerDayFromWeight } from "@hh/engine";
import { Clock } from "@phosphor-icons/react";
import type { Assignment, Child, PlanResponse, Subject } from "../../api/types";
import { useApi } from "../../api/useApi";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { UNIT_LABELS, unitNumber } from "../../components/unitLabels";
import { formatRangeYears } from "../../lib/dates";
import { endedWords } from "../completion/ended";
import { paceLine } from "../schedule/effort";
import "./view.css";

interface Props {
  assignment: Assignment | null;
  subjects: readonly Subject[];
  children: readonly Child[];
  onClose: () => void;
}

export function BarDetailSheet({ assignment, subjects, children, onClose }: Props) {
  return (
    <ResponsiveSheet open={assignment !== null} onOpenChange={(o) => !o && onClose()} title={assignment?.title ?? ""}>
      {assignment ? <Detail key={assignment.id} assignment={assignment} subjects={subjects} children={children} /> : null}
    </ResponsiveSheet>
  );
}

/** "About 20 pages a day · 40 min", from the plan's own pace for this assignment (the busiest child sets it), or null while it is not known. */
export function planPace(plan: PlanResponse | undefined, a: Assignment): string | null {
  const mine = (plan?.plans ?? []).filter((p) => p.assignmentId === a.id && p.baseRate > 0);
  if (mine.length === 0) return null;
  const top = mine.reduce((x, y) => (y.baseRate > x.baseRate ? y : x));
  return paceLine(top.baseRate, a.unitType, minutesPerDayFromWeight(top.weightPerUnit, top.baseRate));
}

function Detail({ assignment: a, subjects, children }: { assignment: Assignment; subjects: readonly Subject[]; children: readonly Child[] }) {
  const plan = useApi<PlanResponse>(`/api/plan?from=${a.startDate}&to=${a.startDate}`);
  const subject = subjects.find((s) => s.id === a.subjectId)?.name;
  const names = a.childIds.map((id) => children.find((c) => c.id === id)?.name).filter((n): n is string => !!n);
  const pace = planPace(plan.data, a);
  const unit = UNIT_LABELS[a.unitType][a.totalUnits === 1 ? "one" : "many"];
  return (
    <div className="view-detail">
      <p className="view-detail-sub">{[subject, names.join(", ")].filter(Boolean).join(" · ")}</p>
      <dl className="view-detail-list">
        <div><dt>Dates</dt><dd>{formatRangeYears(a.startDate, a.endDate)}</dd></div>
        <div><dt>Amount</dt><dd>{unitNumber(a.totalUnits)} {unit}</dd></div>
      </dl>
      {pace ? <p className="view-detail-pace"><Clock size={18} weight="regular" aria-hidden="true" />{pace}</p> : null}
      {a.endedAs && a.endedOn ? <p className="view-detail-ended">{endedWords(a.endedAs, a.endedOn)}</p> : null}
    </div>
  );
}
