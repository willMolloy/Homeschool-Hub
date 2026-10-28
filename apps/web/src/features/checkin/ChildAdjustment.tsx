/**
 * "Make an adjustment" for one student on This Week (T-03b). The button opens a sheet (Drawer on phones,
 * Dialog wider) holding that child's rows of the check-in week, with the last-week card's own controls. The
 * week is the shown one once it's over, otherwise last week: the API only takes finished weeks.
 */
import { useMemo, useState, type CSSProperties } from "react";
import type { Assignment, CheckInItem, PastWeek, Subject } from "../../api/types";
import { useApi } from "../../api/useApi";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { subjectSlots } from "../timeline/model";
import { weekRangeText } from "./checkinText";
import { forChild, withOtherChildren } from "./childWeek";
import { LastWeekCard } from "./LastWeekCard";
import { useWeekCheckIn } from "./useLastWeekCheckIn";

export const LATER_NOTE = "Later check-ins still apply from their weeks on.";

/** Whether a week after `weekStart` has its own check-ins, which keep applying from their weeks on. */
export const laterCheckInsExist = (weeks: readonly PastWeek[], weekStart: string) =>
  weeks.some((w) => w.weekStart > weekStart && w.hasCheckIns);

/** Each row's subject pastel, slots dealt as on the timeline. Unknown assignments stay untinted. */
function usePastels() {
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

function ChildWeekEditor({ childId, weekStart }: { childId: string; weekStart: string }) {
  const { data, loadError, busy, error, itemErrors, thanks, save } = useWeekCheckIn(weekStart);
  const weeks = useApi<{ weeks: PastWeek[] }>("/api/check-ins/weeks");
  const rowStyle = usePastels();
  if (loadError) return <p className="checkin-error" role="alert">{loadError}</p>;
  if (!data) return <p aria-busy="true">Loading…</p>;
  return (
    <>
      {weeks.data && laterCheckInsExist(weeks.data.weeks, weekStart) && <p className="checkin-note">{LATER_NOTE}</p>}
      <LastWeekCard key={`${data.weekStart}/${data.status ?? ""}`} mode="edit" framed={false} rowStyle={rowStyle}
        week={forChild(data, childId)} busy={busy} error={error} itemErrors={itemErrors}
        onSave={(items) => void save({ status: "reviewed", items: withOtherChildren(data, childId, items) })} />
      {thanks && <p className="checkin-thanks" role="status">{thanks}</p>}
    </>
  );
}

export interface ChildAdjustmentProps {
  childId: string;
  childName: string;
  /** The finished week the sheet edits (`useShownWeek().checkInWeekStart`). */
  weekStart: string;
  weekEnd: string;
}

export function ChildAdjustment({ childId, childName, weekStart, weekEnd }: ChildAdjustmentProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-secondary child-adjust" aria-label={`Make an adjustment for ${childName}`}
        onClick={() => setOpen(true)}>
        Make an adjustment
      </button>
      <ResponsiveSheet open={open} onOpenChange={setOpen} title={`${childName} · ${weekRangeText(weekStart, weekEnd)}`}>
        {open && <ChildWeekEditor childId={childId} weekStart={weekStart} />}
      </ResponsiveSheet>
    </>
  );
}
