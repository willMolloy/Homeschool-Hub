/**
 * S7-01: "Copy to a new year", a panel in the Assignments screen's panels slot. It copies the plan only (titles, units,
 * totals, effort, days, shifted dates) and uses the chosen-rows list and the chunked save (copyPlan.ts).
 */
import { useId, useMemo, useState, type FormEvent } from "react";
import { diffDays, isValidLocalDate } from "@hh/engine";
import type { Assignment } from "../../api/types";
import { chunkFailureText, copyCandidates, saveInChunks, shiftedCopy, type CopyBody } from "./copyPlan";
import { dateRange } from "./formBits";
import type { Lookups } from "./lookups";

export interface CopyPanelProps {
  l: Lookups;
  existing: Assignment[];
  onSaved: (created: Assignment[]) => void;
  /** Adds copies to the list without closing the panel (a partly saved copy). */
  onAdded: (created: Assignment[]) => void;
  onCancel: () => void;
}

interface Row { a: Assignment; copy: CopyBody }

const count = (n: number) => `${n} ${n === 1 ? "assignment" : "assignments"}`;

/** The rows grouped by the children they are for (in the roster's order), each with a checkbox and the copy's new dates. */
function CopyList({ rows, unticked, onToggle, l, label }: { rows: Row[]; unticked: ReadonlySet<string>; onToggle: (id: string) => void; l: Lookups; label: string }) {
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = r.a.childIds.filter((id) => l.children.some((c) => c.id === id)).map(l.childName).join(", ");
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return (
    <div role="group" aria-label={label}>
      {[...groups].map(([who, list]) => (
        <fieldset key={who} className="choice-list">
          <legend>{who}</legend>
          {list.map((r) => (
            <label key={r.a.id} className="choice copy-choice">
              <input type="checkbox" checked={!unticked.has(r.a.id)} onChange={() => onToggle(r.a.id)} />
              <span>
                <strong>{r.a.title}</strong>
                <br />
                <span className="hint">{l.subjectName(r.a.subjectId)} · {dateRange(r.copy.startDate, r.copy.endDate)}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}

/** Everything both panels do after the rows are chosen: save in chunks, then close, or stay and say what was created. */
function useCopySave(rows: Row[], p: CopyPanelProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  /** Sources already copied by an earlier part of a failed save; a retry leaves them out. */
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());
  async function save(chosen: Row[]) {
    if (saving || chosen.length === 0) return;
    setSaving(true);
    setMessage(null);
    try {
      const r = await saveInChunks(chosen.map((c) => c.copy));
      if (!r.failure) {
        p.onSaved(r.created);
        return;
      }
      if (r.created.length > 0) {
        p.onAdded(r.created);
        setDone((d) => new Set([...d, ...chosen.slice(0, r.created.length).map((c) => c.a.id)]));
      }
      setMessage(chunkFailureText(r));
    } finally {
      setSaving(false);
    }
  }
  return { saving, message, save, left: rows.filter((r) => !done.has(r.a.id)) };
}

function useTicks() {
  const [unticked, setUnticked] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) => setUnticked((u) => { const n = new Set(u); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return { unticked, toggle, setUnticked };
}

function Buttons({ n, saving, label, onCancel, onToggleAll, allTicked }: { n: number; saving: boolean; label: string; onCancel: () => void; onToggleAll: () => void; allTicked: boolean }) {
  return (
    <>
      <div className="field">
        <button className="btn btn-secondary" type="button" onClick={onToggleAll}>{allTicked ? "Untick all" : "Tick all"}</button>
      </div>
      <div className="btn-row">
        <button className="btn" type="submit" disabled={saving || n === 0}>{saving ? "Copying…" : `${label}${n ? ` (${n})` : ""}`}</button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}

/** S7-01: the old year's first day and the new one's; every copy moves by the difference. */
export function CopyToNewYearPanel(p: CopyPanelProps) {
  const { l, onCancel } = p;
  // Taken when the panel opens, so copies added by a partly saved attempt are never offered as sources.
  const [existing] = useState(p.existing);
  const [oldFirst, setOldFirst] = useState("");
  const [newFirst, setNewFirst] = useState("");
  const ids = { old: useId(), next: useId() };
  const { unticked, toggle, setUnticked } = useTicks();
  const ready = isValidLocalDate(oldFirst) && isValidLocalDate(newFirst);
  const shift = ready ? diffDays(oldFirst, newFirst) : 0;
  const all = useMemo(
    () => (ready ? copyCandidates(existing, l).filter((a) => a.startDate >= oldFirst).sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title)) : []),
    [ready, existing, l, oldFirst],
  );
  const rows: Row[] = all.map((a) => ({ a, copy: shiftedCopy(a, shift, l) }));
  const { saving, message, save, left } = useCopySave(rows, p);
  const shown = left;
  const chosen = shown.filter((r) => !unticked.has(r.a.id));
  const submit = (e: FormEvent) => { e.preventDefault(); void save(chosen); };

  return (
    <form className="card schedule-form" aria-label="Copy to a new year" onSubmit={submit} noValidate>
      {message ? <p className="form-error" role="alert">{message}</p> : null}
      <div className="field-row">
        <div className="field">
          <label htmlFor={ids.old}>This year's first day</label>
          <input id={ids.old} type="date" value={oldFirst} onChange={(e) => setOldFirst(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={ids.next}>Next year's first day</label>
          <input id={ids.next} type="date" value={newFirst} onChange={(e) => setNewFirst(e.target.value)} />
        </div>
      </div>
      {!ready ? (
        <p className="hint">Pick both days to choose what to copy. Only the plan is copied, not progress.</p>
      ) : shown.length === 0 ? (
        <p className="hint">No assignments start on or after that day.</p>
      ) : (
        <>
          <p>{count(chosen.length)} to copy</p>
          <CopyList rows={shown} unticked={unticked} onToggle={toggle} l={l} label="To copy" />
          <Buttons n={chosen.length} saving={saving} label="Copy" onCancel={onCancel} allTicked={unticked.size === 0}
            onToggleAll={() => setUnticked(unticked.size === 0 ? new Set(shown.map((r) => r.a.id)) : new Set())} />
        </>
      )}
      {!ready || shown.length === 0 ? (
        <div className="btn-row">
          <button className="btn btn-secondary" type="button" onClick={onCancel}>Cancel</button>
        </div>
      ) : null}
    </form>
  );
}
