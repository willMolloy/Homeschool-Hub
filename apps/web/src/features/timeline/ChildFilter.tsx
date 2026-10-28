/** T-07c: All, then one chip per child. Hidden when there is only one child. */
import type { Child } from "../../api/types";

export interface ChildFilterProps {
  childList: readonly Child[];
  value: string | null;
  onChange: (childId: string | null) => void;
}

export function ChildFilter({ childList, value, onChange }: ChildFilterProps) {
  if (childList.length < 2) return null;
  return (
    <div className="tl-zoom tl-children" role="group" aria-label="Child">
      <button type="button" aria-pressed={value === null} onClick={() => onChange(null)}>All</button>
      {childList.map((c) => (
        <button key={c.id} type="button" aria-pressed={c.id === value} onClick={() => onChange(c.id)}>
          {c.name}
        </button>
      ))}
    </div>
  );
}
