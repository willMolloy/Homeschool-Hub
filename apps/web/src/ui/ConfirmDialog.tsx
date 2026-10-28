import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Native <dialog> confirm. Mount it to open it; Escape (the dialog's `cancel` event) calls onCancel. */
export function ConfirmDialog({ title, children, confirmLabel, busy, error, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  // Captured during the first render, before autoFocus moves focus into the dialog.
  const [opener] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null));
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    // jsdom (tests) has no showModal; fall back to a non-modal open dialog.
    if (typeof d.showModal === "function") d.showModal();
    else d.setAttribute("open", "");
    const onCancelEvt = (e: Event) => {
      e.preventDefault();
      cancelRef.current();
    };
    d.addEventListener("cancel", onCancelEvt);
    return () => {
      d.removeEventListener("cancel", onCancelEvt);
      if (typeof d.close === "function" && d.open) d.close();
      // Give focus back to whatever opened us (if it's still on the page).
      if (opener?.isConnected) opener.focus();
    };
  }, [opener]);

  return (
    <dialog ref={ref} className="confirm-dialog" aria-labelledby="confirm-title">
      <h2 id="confirm-title">{title}</h2>
      <div className="confirm-body">{children}</div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="btn-row">
        <button className="btn" type="button" onClick={onConfirm} disabled={busy}>{busy ? "Working…" : confirmLabel}</button>
        <button className="btn btn-secondary" type="button" onClick={onCancel} disabled={busy} autoFocus>Cancel</button>
      </div>
    </dialog>
  );
}
