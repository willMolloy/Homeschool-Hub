/**
 * "Make an adjustment" for one student on This Week (T-03b). The button opens a sheet (Drawer on phones,
 * Dialog wider) holding that child's rows of the check-in week, in the last-week card's own rows (CheckInRow since T-09). The
 * week is the shown one once it's over, otherwise last week: the API only takes finished weeks.
 */
import { useState } from "react";
import type { PastWeek } from "../../api/types";
import { useApi } from "../../api/useApi";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { weekRangeText } from "./checkinText";
import { forChild, withOtherChildren } from "./childWeek";
import { LastWeekCard } from "./LastWeekCard";
import { usePastels } from "./usePastels";
import { useWeekCheckIn } from "./useLastWeekCheckIn";

export const LATER_NOTE = "Later check-ins still apply from their weeks on.";

/** Whether a week after `weekStart` has its own check-ins, which keep applying from their weeks on. */
export const laterCheckInsExist = (weeks: readonly PastWeek[], weekStart: string) =>
  weeks.some((w) => w.weekStart > weekStart && w.hasCheckIns);

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
  /** Whether that week is last week, so the title says so (T-09). */
  lastWeek?: boolean;
}

/** "Frank · Last week · Oct 19–25", or "Frank · Oct 12–18" for an older week. */
export const sheetTitle = (childName: string, weekStart: string, weekEnd: string, lastWeek: boolean) =>
  `${childName} · ${lastWeek ? "Last week · " : ""}${weekRangeText(weekStart, weekEnd)}`;

export function ChildAdjustment({ childId, childName, weekStart, weekEnd, lastWeek = false }: ChildAdjustmentProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-secondary child-adjust" aria-label={`Make an adjustment for ${childName}`}
        onClick={() => setOpen(true)}>
        Make an adjustment
      </button>
      <ResponsiveSheet open={open} onOpenChange={setOpen} title={sheetTitle(childName, weekStart, weekEnd, lastWeek)}>
        {open && <ChildWeekEditor childId={childId} weekStart={weekStart} />}
      </ResponsiveSheet>
    </>
  );
}
