/**
 * S6b-08: the assignment forms' subject dropdown. After the family's own subjects it offers the common ones they don't
 * have yet ("Add a common subject") and "New subject…". Picking a common subject creates it and selects it; New
 * subject… opens a name field with Add. A duplicate name selects the existing subject. Used by the Add / Edit form and
 * Add several.
 * S7-16: while the name field is open the select shows "New subject…", and the form's own Add first creates the typed
 * subject through `resolveRef` (see below), so a typed name is never dropped.
 * S7b-14 (F-12): choosing a common subject, or Add under New subject…, creates nothing yet: the name is kept as the
 * form's pending subject ("Nature Study (new)") and is created when the assignment is saved, so Cancel leaves no
 * orphan subject behind. An existing name just selects that subject.
 */
import { useEffect, useId, useState, type MutableRefObject } from "react";
import { ApiError, apiPost } from "../../api/client";
import type { Subject } from "../../api/types";
import { findSubjectNamed, missingCommonSubjects } from "../roster/commonSubjects";
import { SWATCH_SLOTS, nextUnusedColor } from "../roster/palette";
import { SubjectBadge } from "../subjects/SubjectIcon";
import type { Lookups } from "./lookups";

const NEW_VALUE = "__new__";
const COMMON_PREFIX = "common:";
const PENDING_VALUE = "__pending__";

interface Props {
  id: string;
  value: string;
  onChange: (subjectId: string) => void;
  l: Lookups;
  /** The subjects to list: the active ones (plus the one being edited, even archived). */
  options: readonly Subject[];
  invalidProps?: Record<string, unknown>;
  /**
   * S7-16: the form fills this with a function it calls when it is saved. With text in the open name field it
   * creates that subject (as Add does) and resolves to its id, or to null when that failed (the error is shown; the
   * form must save nothing); with nothing typed it resolves to undefined and the form uses its own subject.
   */
  resolveRef?: MutableRefObject<(() => Promise<string | null | undefined>) | null>;
}

export function SubjectSelect({ id, value, onChange, l, options, invalidProps, resolveRef }: Props) {
  const nameId = useId();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  /** S7b-14: a subject chosen by name that doesn't exist yet; created when the form is saved. */
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const common = missingCommonSubjects(l.subjects);
  const chosen = options.find((s) => s.id === value);

  /**
   * Creates the subject (next free palette colour) and selects it; a duplicate name selects the one that exists.
   * Resolves to the subject's id, or null when nothing was created or selected.
   */
  async function add(raw: string): Promise<string | null> {
    const wanted = raw.trim();
    if (!wanted || busy) return null;
    setBusy(true);
    setError(null);
    try {
      const created = await apiPost<Subject>("/api/subjects", { name: wanted, color: nextUnusedColor(l.subjects.filter((s) => !s.archived).map((s) => s.color)) });
      l.subjectSaved?.(created);
      onChange(created.id);
      setNaming(false);
      setName("");
      setPending(null);
      return created.id;
    } catch (err) {
      const existing = err instanceof ApiError && err.status === 409 ? findSubjectNamed(l.subjects, wanted) : undefined;
      if (existing && !existing.archived) {
        onChange(existing.id);
        setNaming(false);
        setName("");
        setPending(null);
        return existing.id;
      } else if (existing) setError(`${existing.name} is archived. Unarchive it under Subjects.`);
      else setError(err instanceof ApiError && err.status === 0 ? "Can't reach the server." : "Couldn't add that subject. Please try again.");
    } finally {
      setBusy(false);
    }
    return null;
  }

  useEffect(() => {
    if (!resolveRef) return;
    // Saving the form creates the typed name, else the pending one (S7b-14); nothing of either: the form uses its own subject.
    resolveRef.current = async () => (naming && name.trim() ? add(name) : pending ? add(pending) : undefined);
    return () => { resolveRef.current = null; };
  });

  /** S7b-14: keep `raw` as the pending subject without creating it; a name the family already has selects that subject instead. */
  function keep(raw: string) {
    const wanted = raw.trim();
    if (!wanted || busy) return;
    setError(null);
    const existing = findSubjectNamed(l.subjects, wanted);
    if (existing && existing.archived) {
      setError(`${existing.name} is archived. Unarchive it under Subjects.`);
      return;
    }
    setNaming(false);
    setName("");
    if (existing) {
      setPending(null);
      onChange(existing.id);
    } else {
      setPending(wanted);
      onChange("");
    }
  }

  function choose(v: string) {
    setError(null);
    if (v === NEW_VALUE) {
      setPending(null);
      setNaming(true);
    } else if (v === PENDING_VALUE) {
      setNaming(false);
    } else if (v.startsWith(COMMON_PREFIX)) {
      keep(v.slice(COMMON_PREFIX.length));
    } else {
      setNaming(false);
      setPending(null);
      onChange(v);
    }
  }

  return (
    <>
      <div className="subject-select-row">
      {chosen ? <SubjectBadge subject={chosen} slot={SWATCH_SLOTS[chosen.color?.toLowerCase() ?? ""] ?? 1} size={32} /> : null}
      <select id={id} value={naming ? NEW_VALUE : pending ? PENDING_VALUE : value} disabled={busy} onChange={(e) => choose(e.target.value)} {...invalidProps}>
        <option value="">Choose a subject…</option>
        {pending ? <option value={PENDING_VALUE}>{pending} (new)</option> : null}
        {options.map((s) => (
          <option key={s.id} value={s.id}>{s.name}{s.archived ? " (archived)" : ""}</option>
        ))}
        {common.length > 0 ? (
          <optgroup label="Add a common subject">
            {common.map((c) => (
              <option key={c} value={COMMON_PREFIX + c}>{c}</option>
            ))}
          </optgroup>
        ) : null}
        <option value={NEW_VALUE}>New subject…</option>
      </select>
      </div>
      {naming ? (
        <div className="subject-new">
          <label htmlFor={nameId}>Subject name</label>
          <input id={nameId} type="text" value={name} autoComplete="off" maxLength={60} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              // Enter adds the subject; it must not save the assignment form around it.
              if (e.key === "Enter") {
                e.preventDefault();
                keep(name);
              }
            }} />
          <button className="btn btn-secondary" type="button" aria-label="Add subject" disabled={busy || !name.trim()} onClick={() => keep(name)}>Add</button>
        </div>
      ) : null}
      {error ? <p className="field-error" role="alert">{error}</p> : null}
    </>
  );
}
