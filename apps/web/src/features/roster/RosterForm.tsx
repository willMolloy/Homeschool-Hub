import { useId, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Check } from "@phosphor-icons/react";
import { ApiError } from "../../api/client";
import { PALETTE, PALETTE_NAMES, swatchColor } from "./palette";

export interface RosterValues {
  name: string;
  color: string | null;
}

export interface RosterFormProps {
  /** Accessible name of the form, e.g. "Add child". */
  label: string;
  initial: RosterValues;
  submitLabel: string;
  /** Resolve on success; throw ApiError to show its message. */
  onSave: (values: RosterValues) => Promise<void>;
  onCancel: () => void;
  /** Extra buttons (e.g. Archive) rendered after Save/Cancel. */
  extra?: ReactNode;
  /** An error from an action outside the form (e.g. Unarchive). */
  externalError?: string | null;
  /** Extra fields rendered after Color (e.g. the subject's usual effort). */
  children?: ReactNode;
  /** S2c-03: an extra field is invalid, so Save is disabled and submitting does nothing. */
  blocked?: boolean;
  /** S8-11: told on every keystroke, so a field of the host (the subject icon) can follow the name. */
  onNameChange?: (name: string) => void;
  /** S10-12: who else already uses each swatch (see `usedByNames`), so its name says "Mint, used by Math". */
  usedBy?: Readonly<Record<string, string>>;
}

/** Server messages look like "name: Name is required." — the field is already obvious here. */
function cleanMessage(m: string): string {
  return m.replace(/^[a-zA-Z.]+: /, "");
}

export function RosterForm({ label, initial, submitLabel, onSave, onCancel, extra, externalError, children, blocked = false, onNameChange, usedBy = {} }: RosterFormProps) {
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState<string | null>(initial.color);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nameId = useId();
  const errId = useId();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving || blocked) return;
    const trimmed = name.trim();
    if (!trimmed) return setFieldError("Name is required.");
    if (trimmed.length > 60) return setFieldError("Name must be 60 characters or fewer.");
    setFieldError(null);
    setFormError(null);
    setSaving(true);
    try {
      await onSave({ name: trimmed, color });
    } catch (err) {
      setSaving(false);
      if (err instanceof ApiError && (err.status === 400 || err.status === 409)) setFieldError(cleanMessage(err.message));
      else if (err instanceof ApiError && err.status === 0) setFormError("Can't reach the server.");
      else setFormError("Couldn't save. Please try again.");
      return;
    }
    // On success the parent usually unmounts us; harmless if it doesn't.
    setSaving(false);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <form className="roster-form card" aria-label={label} onSubmit={submit} onKeyDown={onKeyDown} noValidate>
      {formError ?? externalError ? <p className="form-error" role="alert">{formError ?? externalError}</p> : null}
      <div className="field">
        <label htmlFor={nameId}>Name</label>
        <input
          id={nameId}
          type="text"
          value={name}
          autoFocus
          autoComplete="off"
          maxLength={80}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? errId : undefined}
          onChange={(e) => { setName(e.target.value); onNameChange?.(e.target.value); }}
        />
        {fieldError ? <p id={errId} className="field-error" role="alert">{fieldError}</p> : null}
      </div>
      {/* S10-12: twelve small swatches with 44 px targets; the chosen one has a tick, and a colour in use says by whom. */}
      <fieldset className="swatches">
        <legend>Color</legend>
        {PALETTE.map((c) => {
          const name = usedBy[c] ? `${PALETTE_NAMES[c]}, used by ${usedBy[c]}` : PALETTE_NAMES[c];
          const chosen = color?.toLowerCase() === c;
          return (
            <label key={c} className="swatch" title={name}>
              <input type="radio" name="color" value={c} checked={chosen} onChange={() => setColor(c)} aria-label={name} />
              <span className={`swatch-chip${usedBy[c] ? " is-used" : ""}`} style={{ background: swatchColor(c) ?? c }} aria-hidden="true">
                {chosen ? <Check size={14} weight="bold" /> : null}
              </span>
            </label>
          );
        })}
      </fieldset>
      {children}
      <div className="btn-row">
        <button className="btn" type="submit" disabled={saving || blocked}>{saving ? "Saving…" : submitLabel}</button>
        <button className="btn btn-secondary" type="button" onClick={onCancel} disabled={saving}>Cancel</button>
        {extra}
      </div>
    </form>
  );
}
