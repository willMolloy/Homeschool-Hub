/**
 * S6b-08: the assignment forms' subject dropdown. After the family's own subjects it offers the common ones they don't
 * have yet ("Add a common subject") and "New subject…". Picking a common subject creates it and selects it; New
 * subject… opens a name field with Add. A duplicate name selects the existing subject. Used by the Add / Edit form and
 * Add several.
 */
import { useId, useState } from "react";
import { ApiError, apiPost } from "../../api/client";
import type { Subject } from "../../api/types";
import { findSubjectNamed, missingCommonSubjects } from "../roster/commonSubjects";
import { nextUnusedColor } from "../roster/palette";
import type { Lookups } from "./lookups";

const NEW_VALUE = "__new__";
const COMMON_PREFIX = "common:";

interface Props {
  id: string;
  value: string;
  onChange: (subjectId: string) => void;
  l: Lookups;
  /** The subjects to list: the active ones (plus the one being edited, even archived). */
  options: readonly Subject[];
  invalidProps?: Record<string, unknown>;
}

export function SubjectSelect({ id, value, onChange, l, options, invalidProps }: Props) {
  const nameId = useId();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const common = missingCommonSubjects(l.subjects);

  /** Creates the subject (next free palette colour) and selects it; a duplicate name selects the one that exists. */
  async function add(raw: string) {
    const wanted = raw.trim();
    if (!wanted || busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await apiPost<Subject>("/api/subjects", { name: wanted, color: nextUnusedColor(l.subjects.filter((s) => !s.archived).map((s) => s.color)) });
      l.subjectSaved?.(created);
      onChange(created.id);
      setNaming(false);
      setName("");
    } catch (err) {
      const existing = err instanceof ApiError && err.status === 409 ? findSubjectNamed(l.subjects, wanted) : undefined;
      if (existing && !existing.archived) {
        onChange(existing.id);
        setNaming(false);
        setName("");
      } else if (existing) setError(`${existing.name} is archived. Unarchive it under Subjects.`);
      else setError(err instanceof ApiError && err.status === 0 ? "Can't reach the server." : "Couldn't add that subject. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function choose(v: string) {
    setError(null);
    if (v === NEW_VALUE) {
      setNaming(true);
    } else if (v.startsWith(COMMON_PREFIX)) {
      setNaming(false);
      void add(v.slice(COMMON_PREFIX.length));
    } else {
      setNaming(false);
      onChange(v);
    }
  }

  return (
    <>
      <select id={id} value={value} disabled={busy} onChange={(e) => choose(e.target.value)} {...invalidProps}>
        <option value="">Choose a subject…</option>
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
      {naming ? (
        <div className="subject-new">
          <label htmlFor={nameId}>Subject name</label>
          <input id={nameId} type="text" value={name} autoComplete="off" maxLength={60} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              // Enter adds the subject; it must not save the assignment form around it.
              if (e.key === "Enter") {
                e.preventDefault();
                void add(name);
              }
            }} />
          <button className="btn btn-secondary" type="button" aria-label="Add subject" disabled={busy || !name.trim()} onClick={() => void add(name)}>Add</button>
        </div>
      ) : null}
      {error ? <p className="field-error" role="alert">{error}</p> : null}
    </>
  );
}
