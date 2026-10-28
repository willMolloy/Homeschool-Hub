/**
 * "Add progress" under a week's planned rows (S2c-06): a disclosure listing the assignment × child pairs that
 * had nothing planned that week, by child, then title. Choosing one hands it to the card, which adds its row.
 * Presentational: the options come in as props.
 */
import { useId, useState } from "react";
import type { CheckInItem } from "../../api/types";
import { itemKey } from "./absorb";

export interface AddProgressProps {
  options: readonly CheckInItem[];
  disabled: boolean;
  onAdd: (item: CheckInItem) => void;
}

/** By child (in the API's child order), then title. */
export function addOrder(options: readonly CheckInItem[]): CheckInItem[] {
  const childOrder = [...new Set(options.map((o) => o.childId))];
  return [...options].sort((a, b) =>
    childOrder.indexOf(a.childId) - childOrder.indexOf(b.childId) || a.title.localeCompare(b.title));
}

export function AddProgress({ options, disabled, onAdd }: AddProgressProps) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  if (options.length === 0) return null;
  return (
    <div className="checkin-add">
      <button type="button" className="btn-link" aria-expanded={open} aria-controls={listId} disabled={disabled}
        onClick={() => setOpen((o) => !o)}>
        Add progress
      </button>
      <ul id={listId} className="checkin-add-list" aria-label="Assignments with nothing planned" hidden={!open}>
        {open && addOrder(options).map((o) => (
          <li key={itemKey(o)}>
            <button type="button" className="btn-link" disabled={disabled} onClick={() => { setOpen(false); onAdd(o); }}>
              {o.childName} — {o.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
