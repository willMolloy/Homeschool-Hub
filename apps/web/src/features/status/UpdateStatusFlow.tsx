/**
 * S9-02: Update status from one bar, on Schedule · Week (inside the week adjustment) and on the Year edit bar (More). It
 * works against the last finished week, where a check-in can be written: "They got to p. 138", and keep the end date or move it.
 * With more than one child on the assignment (All children) it first asks whose progress. Saving is the only thing in the
 * app that writes a check-in. Nothing here is a number the parent did not enter.
 */
import { useState } from "react";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { Button } from "../../ui/components";
import { useWeekCheckIn } from "../checkin/useLastWeekCheckIn";
import { useLateEnd } from "../plan/useLateEnd";
import { useWeekPlans } from "../plan/useWeekPlans";
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
}

export function UpdateStatusFlow({ assignmentId, childId, title, onClose, onSaved }: UpdateStatusFlowProps) {
  const state = useWeekCheckIn();
  const plans = useWeekPlans(state.data?.weekStart, true);
  const [picked, setPicked] = useState<string | null>(childId);
  const week = state.data;
  const rows = week ? [...week.items, ...week.addable].filter((i) => i.assignmentId === assignmentId) : [];
  const item = rows.find((i) => i.childId === picked) ?? null;
  const late = useLateEnd(assignmentId, item?.childId ?? picked);

  if (item && week) {
    return (
      <UpdateStatusSheet key={item.childId} item={item} position={item.actual ?? item.plannedTo} mode={item.mode}
        plan={plans?.find((p) => p.assignmentId === item.assignmentId && p.childId === item.childId)} late={late} weekStart={week.weekStart} afterDay={week.weekEnd} whenText="last week"
        busy={state.busy} error={state.error ?? Object.values(state.itemErrors)[0] ?? null} onClose={onClose}
        onSave={(position, mode, endDate) => { void state.save(statusBody(week, item, position, mode, endDate)).then((res) => { if (res) { onSaved?.(); onClose(); } }); }} />
    );
  }
  return (
    <ResponsiveSheet open onOpenChange={(o) => !o && onClose()} title={title}>
      <div className="status-sheet">
        {state.loadError ? <p className="checkin-error" role="alert">{state.loadError}</p>
          : !week ? <p aria-busy="true">Loading…</p>
          : rows.length === 0 ? <p className="checkin-note">There is nothing to update yet: {title} wasn&apos;t planned in the last finished week.</p>
          : (
            <>
              <h3 className="status-label">Whose progress?</h3>
              <div className="status-ways" role="group" aria-label="Whose progress?">
                {rows.map((r) => <Button key={r.childId} variant="secondary" onClick={() => setPicked(r.childId)}>{r.childName}</Button>)}
              </div>
            </>
          )}
        <div className="btn-row status-actions"><Button variant="secondary" onClick={onClose}>Close</Button></div>
      </div>
    </ResponsiveSheet>
  );
}
