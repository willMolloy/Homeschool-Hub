/** S6-08: "{label}. Undo" at the bottom of the screen. A polite status, so a screen reader hears the change too. */
import { useUndo } from "./UndoProvider";
import "./undo.css";

export function UndoBar() {
  const { label, error, busy, undo } = useUndo();
  if (!label && !error) return null;
  return (
    <div className="undo-bar" role="status">
      <span className="undo-text">{error ?? `${label}.`}</span>
      {label && <button type="button" className="undo-btn" disabled={busy} onClick={() => void undo()}>Undo</button>}
    </div>
  );
}
