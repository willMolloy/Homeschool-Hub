/**
 * T-10: "+ Add assignment" on the timeline. Opens the schedule screen's own AssignmentForm (reused, not rebuilt)
 * in a ResponsiveSheet: a bottom sheet on phones, a panel along the right edge on wider screens. S10-07: in its "sheet" look
 * (subject picker, child chips, date tiles, soft day chips).
 */
import { Plus } from "@phosphor-icons/react";
import type { Assignment } from "../../api/types";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { AssignmentForm } from "../schedule/AssignmentsPage";
import type { Draft } from "../schedule/ScheduleList";
import type { Lookups } from "../schedule/lookups";
import "../../ui/forms.css";
import "../schedule/schedule.css";

/** S10-08: a round "+" (named "Add assignment"); wide screens also show the words, as in the desktop mockup. */
export function AddAssignmentButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="tl-add-btn" aria-label="Add assignment" onClick={onClick}>
      <Plus size={20} weight="bold" aria-hidden="true" />
      <span className="tl-add-words" aria-hidden="true">Add assignment</span>
    </button>
  );
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
        <AssignmentForm item={null} initial={initial} l={lookups} onSaved={onSaved} onCancel={onClose} extra={null} externalError={null} look="sheet" />
      </div>
    </ResponsiveSheet>
  );
}
