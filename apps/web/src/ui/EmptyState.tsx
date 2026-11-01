/** S8-09: an empty screen says one friendly thing and offers the one button that fixes it. */
import type { ReactNode } from "react";
import "../features/home/home.css";

export function EmptyState({ text, hint, action }: { text: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <p>{text}</p>
      {hint ? <p className="hint">{hint}</p> : null}
      {action}
    </div>
  );
}
