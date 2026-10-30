/**
 * T-10: "+ Add assignment" on the timeline. Opens the schedule screen's own AssignmentForm (reused, not rebuilt)
 * in a ResponsiveSheet: a bottom sheet on phones, a panel along the right edge on wider screens.
 */
import type { Assignment } from "../../api/types";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { AssignmentForm } from "../schedule/AssignmentsPage";
import type { Draft } from "../schedule/ScheduleList";
import type { Lookups } from "../schedule/lookups";
import "../../ui/forms.css";
import "../schedule/schedule.css";

export function AddAssignmentButton({ onClick }: { onClick: () => void }) {
  return <button type="button" className="tl-add-btn" onClick={onClick}>+ Add assignment</button>;
}

interface SheetProps {
  open: boolean;
  lookups: Lookups;
  /** S3a-02: prefill from a copied assignment. */
  initial?: Draft<Assignment> | null;
  onSaved: (created: Assignment) => void;
  onClose: () => void;
}

export function AddAssignmentSheet({ open, lookups, initial, onSaved, onClose }: SheetProps) {
  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => { if (!o) onClose(); }} title="Add assignment" wide="side">
      <div className="tl-add-form">
        <AssignmentForm item={null} initial={initial} l={lookups} onSaved={onSaved} onCancel={onClose} extra={null} externalError={null} />
      </div>
    </ResponsiveSheet>
  );
}
