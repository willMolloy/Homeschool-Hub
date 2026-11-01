/**
 * S6-08: "{label}. Undo" at the bottom of the screen. A polite status, so a screen reader hears the change too.
 * S7b-14 (F-04): it never covers an open menu or sheet: while one is open the bar steps aside (the offer is kept), and it comes back after.
 */
import { useEffect, useState } from "react";
import { useUndo } from "./UndoProvider";
import "./undo.css";

/** A sheet or dialog, or the edit bar's More menu. */
const OVERLAY = '[role="dialog"], [role="alertdialog"], .tl-more-menu';

function useOverlayOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const check = () => setOpen(document.querySelector(OVERLAY) !== null);
    check();
    const watch = new MutationObserver(check);
    watch.observe(document.body, { childList: true, subtree: true });
    return () => watch.disconnect();
  }, []);
  return open;
}

export function UndoBar() {
  const { label, error, busy, undo } = useUndo();
  const covering = useOverlayOpen();
  if ((!label && !error) || covering) return null;
  return (
    <div className="undo-bar" role="status">
      <span className="undo-text">{error ?? `${label}.`}</span>
      {label && <button type="button" className="undo-btn" disabled={busy} onClick={() => void undo()}>Undo</button>}
    </div>
  );
}
