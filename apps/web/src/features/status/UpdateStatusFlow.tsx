/**
 * S9-02: Update status from one bar, on Schedule · Week (inside the week adjustment) and on the Year edit bar (More). It
 * works against the last finished week, where a check-in can be written: "They got to p. 138", and keep the end date or move it.
 * With more than one child on the assignment (All children) it first asks whose progress. Saving is the only thing in the
 * app that writes a check-in. Nothing here is a number the parent did not enter.
 */
import { useEffect, useState } from "react";
import type { Assignment } from "../../api/types";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { Button } from "../../ui/components";
import { useWeekCheckIn } from "../checkin/useLastWeekCheckIn";
import { useLateEnd } from "../plan/useLateEnd";
import { useWeekPlans } from "../plan/useWeekPlans";
import { copyRows, OtherCopies } from "../schedule/OtherCopies";
import { UpdateStatusSheet } from "./UpdateStatusSheet";
import { statusBody } from "./saveStatus";
import "../checkin/checkin.css";
import "./status.css";

export interface UpdateStatusFlowProps {
  assignmentId: string;
  /** The child, or null (All children) to ask when the assignment has several. */
  childId: string | null;
  title: string;
  onClose: () => void;
  /** After a successful save (a screen that holds its own copy of the plan reloads it). */
  onSaved?: () => void;
  /** S18b-02: the family's assignments, so this sheet can open Update status on another workbook of the same book. */
  siblings?: { assignments: readonly Assignment[]; nameOf: (id: string) => string; daysOf: (a: Assignment) => number[] } | null;
}

export function UpdateStatusFlow({ assignmentId, childId, title, onClose, onSaved, siblings = null }: UpdateStatusFlowProps) {
  const state = useWeekCheckIn();
  const [currentId, setCurrentId] = useState(assignmentId);
  const [picked, setPicked] = useState<string | null>(childId);
  useEffect(() => { setCurrentId(assignmentId); setPicked(childId); }, [assignmentId, childId]);
  const plans = useWeekPlans(state.data?.weekStart, true);
  const current = siblings?.assignments.find((a) => a.id === currentId);
  const titleNow = current?.title ?? title;
  const week = state.data;
  const rows = week ? [...week.items, ...week.addable].filter((i) => i.assignmentId === currentId) : [];
  const copies = siblings && current ? (
    <OtherCopies rows={copyRows(current, siblings.assignments, siblings.nameOf, siblings.daysOf)} kinds={["status"]}
      onStatus={(row) => {
        const next = siblings.assignments.find((a) => a.id === row.id);
        setPicked(next && next.childIds.length === 1 ? next.childIds[0]! : null);
        setCurrentId(row.id);
      }} />
  ) : null;
  const item = rows.find((i) => i.childId === picked) ?? null;
  const late = useLateEnd(currentId, item?.childId ?? picked);

  if (item && week) {
    return (
      <UpdateStatusSheet key={`${currentId}:${item.childId}`} item={item} position={item.actual ?? item.plannedTo} mode={item.mode}
        plan={plans?.find((p) => p.assignmentId === item.assignmentId && p.childId === item.childId)} late={late} weekStart={week.weekStart} afterDay={week.weekEnd} whenText="last week"
        copies={copies} busy={state.busy} error={state.error ?? Object.values(state.itemErrors)[0] ?? null} onClose={onClose}
        onSave={(position, mode, endDate) => { void state.save(statusBody(week, item, position, mode, endDate)).then((res) => { if (res) { onSaved?.(); onClose(); } }); }} />
    );
  }
  return (
    <ResponsiveSheet open onOpenChange={(o) => !o && onClose()} title={<span className="status-title" title={titleNow}>{titleNow}</span>}>
      <div className="status-sheet">
        {state.loadError ? <p className="checkin-error" role="alert">{state.loadError}</p>
          : !week ? <p aria-busy="true">Loading…</p>
          : rows.length === 0 ? <p className="checkin-note">There is nothing to update yet: {titleNow} wasn&apos;t planned in the last finished week.</p>
          : (
            <>
              <h3 className="status-label">Whose progress?</h3>
              <div className="status-ways" role="group" aria-label="Whose progress?">
                {rows.map((r) => <Button key={r.childId} variant="secondary" onClick={() => setPicked(r.childId)}>{r.childName}</Button>)}
              </div>
            </>
          )}
        {copies}
        <div className="btn-row status-actions"><Button variant="secondary" onClick={onClose}>Close</Button></div>
      </div>
    </ResponsiveSheet>
  );
}
