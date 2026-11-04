/**
 * S11-02, step 2: the children, the only step that can't be skipped. A name and "Add another" (each child gets the next free
 * colour); a name left in the box is added on Continue. Children are saved as they are added, so closing the tab keeps them,
 * and they are the same ones Set up > Children lists.
 */
import { useRef, useState, type FormEvent } from "react";
import { apiPost } from "../../api/client";
import type { Child } from "../../api/types";
import { useApi } from "../../api/useApi";
import { Button, Field } from "../../ui/components";
import { ColorDot } from "../../ui/ColorDot";
import { nextUnusedColor } from "../roster/palette";
import { saveError } from "../schedule/formBits";
import { StepHeading, useStep } from "./stepContext";

export function ChildrenStep() {
  const { next, busy, fail } = useStep();
  const children = useApi<Child[]>("/api/children");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const have = (children.data ?? []).filter((c) => !c.archived);

  /** Add the typed name as a child. Resolves how many children there are after it, or null when it could not be added. */
  async function add(): Promise<number | null> {
    const t = name.trim();
    if (!t) return have.length;
    setSaving(true);
    setError(null);
    try {
      const created = await apiPost<Child>("/api/children", { name: t, color: nextUnusedColor(have.map((c) => c.color)) });
      children.setData((prev) => [...(prev ?? []), created]);
      setName("");
      return have.length + 1;
    } catch (err) {
      setError(saveError(err));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function another() {
    if (busy || saving) return;
    if (await add()) input.current?.focus();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || saving) return;
    fail(null);
    const count = await add();
    if (count === null) return;
    if (count === 0) {
      setError("Add at least one child to continue.");
      input.current?.focus();
      return;
    }
    await next();
  }

  return (
    <form onSubmit={submit} noValidate>
      <StepHeading>Who are you teaching?</StepHeading>
      {children.error ? <p className="form-error" role="alert">Couldn't load your children. Try again in a moment.</p> : null}
      <ul className="welcome-list" aria-label="Your children" aria-live="polite">
        {have.map((c) => (
          <li key={c.id}><ColorDot color={c.color} /><span>{c.name}</span></li>
        ))}
      </ul>
      <Field ref={input} label={have.length === 0 ? "Child's name" : "Another child's name"} type="text" value={name} maxLength={80} autoComplete="off" error={error}
        onChange={(e) => { setName(e.target.value); setError(null); }} />
      <div className="btn-row">
        <Button type="button" variant="secondary" disabled={busy || saving || !name.trim()} onClick={() => void another()}>Add another</Button>
        <Button type="submit" disabled={busy || saving}>Continue</Button>
      </div>
    </form>
  );
}
