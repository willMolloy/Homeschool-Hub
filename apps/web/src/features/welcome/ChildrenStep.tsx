/**
 * S11-02, step 2: the children, the only step that can't be skipped. A name and "Add another" (each child gets the next free
 * colour); a name left in the box is added on Continue. Children are saved as they are added, so closing the tab keeps them,
 * and they are the same ones Set up > Children lists. S18-04 (E4): each child can be renamed or removed here (removing archives, as
 * Set up > Children does), and adding a name that is already there asks "Add another child named Clara?" first.
 */
import { useRef, useState, type FormEvent } from "react";
import { apiPatch, apiPost } from "../../api/client";
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
  /** The name that is already there and was typed again: asked about once, then added if the parent says so. */
  const [twin, setTwin] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; text: string } | null>(null);
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

  /** Add the typed name as a child. Resolves how many children there are after it, or null when it could not be added (or is waiting on "Add another child named ...?"). */
  async function add(confirmed = false): Promise<number | null> {
    const t = name.trim();
    if (!t) return have.length;
    if (!confirmed && have.some((c) => same(c.name, t))) {
      setTwin(t);
      return null;
    }
    setTwin(null);
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

  async function change(id: string, patch: { name?: string; archived?: boolean }) {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiPatch<Child>(`/api/children/${id}`, patch);
      children.setData((prev) => (prev ?? []).map((c) => (c.id === id ? updated : c)));
      setRenaming(null);
    } catch (err) {
      setError(saveError(err));
    } finally {
      setSaving(false);
    }
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
        {have.map((c) => renaming?.id === c.id ? (
          <li key={c.id} className="welcome-rename">
            <ColorDot color={c.color} />
            <input className="welcome-list-name" type="text" aria-label={`New name for ${c.name}`} value={renaming.text} maxLength={80} autoComplete="off" autoFocus
              onChange={(e) => setRenaming({ id: c.id, text: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (renaming.text.trim()) void change(c.id, { name: renaming.text.trim() }); } if (e.key === "Escape") setRenaming(null); }} />
            <Button type="button" variant="secondary" disabled={busy || saving || !renaming.text.trim()} onClick={() => void change(c.id, { name: renaming.text.trim() })}>Save</Button>
            <Button type="button" variant="quiet" disabled={saving} onClick={() => setRenaming(null)}>Cancel</Button>
          </li>
        ) : (
          <li key={c.id}>
            <ColorDot color={c.color} /><span className="welcome-list-name">{c.name}</span>
            <Button type="button" variant="quiet" disabled={busy || saving} aria-label={`Rename ${c.name}`} onClick={() => setRenaming({ id: c.id, text: c.name })}>Rename</Button>
            <Button type="button" variant="quiet" disabled={busy || saving} aria-label={`Remove ${c.name}`} onClick={() => void change(c.id, { archived: true })}>Remove</Button>
          </li>
        ))}
      </ul>
      <Field ref={input} label={have.length === 0 ? "Child's name" : "Another child's name"} type="text" value={name} maxLength={80} autoComplete="off" error={error}
        onChange={(e) => { setName(e.target.value); setError(null); setTwin(null); }} />
      {twin ? (
        <div className="welcome-twin" role="group" aria-label="Same name">
          <p>Add another child named {twin}?</p>
          <div className="btn-row">
            <Button type="button" variant="secondary" disabled={busy || saving} onClick={() => void add(true).then((n) => { if (n) input.current?.focus(); })}>Yes, add {twin}</Button>
            <Button type="button" variant="quiet" onClick={() => { setTwin(null); setName(""); input.current?.focus(); }}>No</Button>
          </div>
        </div>
      ) : null}
      <div className="btn-row">
        <Button type="button" variant="secondary" disabled={busy || saving || !name.trim()} onClick={() => void another()}>Add another</Button>
        <Button type="submit" disabled={busy || saving}>Continue</Button>
      </div>
    </form>
  );
}
