/**
 * S9-07: the log form. Dates, children (one, several or All children), a visible "Count as a school day" switch (on by
 * default), then only the fields the log setup tracks. Nothing is prefilled from the plan or from earlier entries: every box
 * starts empty. When editing, the entry's own values are shown and fields the setup hides are left alone (not sent).
 * Several children are saved as one entry each (the API does that). Logging never touches the schedule.
 * S9b-07: a run of dates that counts shows its days as chips, pre-selected from the school calendar; the ticked days are
 * sent (new runs, or when the parent changed the chips or the dates) and are what counts.
 */
import { useCallback, useState } from "react";
import { ApiError, apiPatch, apiPost } from "../../api/client";
import type { Child, LogFields, RecordEntry, Subject } from "../../api/types";
import { Button, Chip } from "../../ui/components";
import { DateField } from "../../ui/DateField";
import { MAX_DAY_MINUTES } from "./limits";
import { boxesFor, toMinutes } from "./entryText";
import { RunDayChips } from "./RunDayChips";
import { NO_DAYS_TICKED, ticksFrom } from "./runDays";
import "./records.css";

export interface LogEntryFormProps {
  fields: LogFields;
  children: readonly Child[];
  subjects: readonly Subject[];
  /** Editing: this entry (its child is fixed). */
  entry?: RecordEntry;
  onSaved: () => void;
  onCancel: () => void;
}

type Box = { h: string; m: string };
const EMPTY: Box = { h: "", m: "" };

function HoursBoxes({ label, value, onChange }: { label: string; value: Box; onChange: (b: Box) => void }) {
  return (
    <div className="hm-row" role="group" aria-label={label}>
      <span className="hm-label">{label}</span>
      {/* S9b-05 (N9): the boxes and their units are one piece that never wraps, so "m" stays beside its box at 320 px. */}
      <span className="hm-boxes">
        <input type="number" inputMode="numeric" min={0} aria-label={`${label} hours`} placeholder="h" value={value.h} onChange={(e) => onChange({ ...value, h: e.target.value })} />
        <span aria-hidden="true">h</span>
        <input type="number" inputMode="numeric" min={0} max={59} aria-label={`${label} minutes`} placeholder="m" value={value.m} onChange={(e) => onChange({ ...value, m: e.target.value })} />
        <span aria-hidden="true">m</span>
      </span>
    </div>
  );
}

export function LogEntryForm({ fields, children, subjects, entry, onSaved, onCancel }: LogEntryFormProps) {
  const kids = children.filter((c) => !c.archived);
  const active = subjects.filter((s) => !s.archived);
  const [start, setStart] = useState(entry?.startDate ?? "");
  const [end, setEnd] = useState(entry && entry.endDate !== entry.startDate ? entry.endDate : "");
  const [picked, setPicked] = useState<string[]>(entry ? [entry.childId] : kids.length === 1 ? [kids[0]!.id] : []);
  const [counts, setCounts] = useState(entry?.countsSchoolDay ?? true);
  const [subj, setSubj] = useState<Record<string, Box>>(() => Object.fromEntries(active.map((s) => [s.id, boxesFor(entry?.subjectMinutes[s.id])])));
  const [total, setTotal] = useState<Box>(boxesFor(entry?.totalMinutes));
  const [home, setHome] = useState<Box>(boxesFor(entry?.homeMinutes));
  const [away, setAway] = useState<Box>(boxesFor(entry?.awayMinutes));
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [books, setBooks] = useState<string[]>(entry?.books ?? []);
  const [book, setBook] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runDays, setRunDays] = useState<string[] | null>(null);
  // S10-10b (M2): the parent's day ticks, kept here so a change of dates (or the switch going off and on) never drops them
  const [dayTicks, setDayTicks] = useState<Map<string, boolean>>(() => (entry ? ticksFrom(entry.startDate, entry.endDate, entry.days ?? entry.coveredDays) : new Map()));
  const [ticksTouched, setTicksTouched] = useState(false);
  const allPicked = kids.length > 1 && picked.length === kids.length;

  const toggleChild = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const addBook = () => { const t = book.trim(); if (t) { setBooks((b) => [...b, t]); setBook(""); } };

  const last = end || start;
  const isRun = !!start && !!end && end > start;
  const sameDates = !!entry && start === entry.startDate && last === entry.endDate;
  const onTicks = useCallback((t: Map<string, boolean>) => { setDayTicks(t); setTicksTouched(true); }, []);

  async function save() {
    if (busy) return;
    const problems: string[] = [];
    if (picked.length === 0) problems.push("Pick who this is for.");
    if (!start) problems.push("Pick the first day.");
    else if (last < start) problems.push("The last day must be on or after the first day.");
    const body: Record<string, unknown> = { startDate: start, endDate: last, countsSchoolDay: counts };
    if (counts && isRun && runDays && (!entry || !sameDates || ticksTouched)) {
      if (runDays.length === 0) problems.push(NO_DAYS_TICKED);
      body.days = runDays;
    }
    const typed = (b: Box) => { const r = toMinutes(b.h, b.m); if (r.problem) problems.push(r.problem); return r.value; };
    if (fields.subjectHours) {
      const m: Record<string, number> = {};
      for (const s of active) { const v = typed(subj[s.id] ?? EMPTY); if (v !== null) m[s.id] = v; }
      body.subjectMinutes = m;
    }
    if (fields.totalHours) body.totalMinutes = typed(total);
    if (fields.homeAway) { body.homeMinutes = typed(home); body.awayMinutes = typed(away); }
    if (fields.notes) body.notes = notes.trim() === "" ? null : notes.trim();
    // S9b-02: a title typed but not added with Add is saved too, never dropped
    if (fields.books) body.books = book.trim() ? [...books, book.trim()] : books;
    if (start && last >= start) {
      const days = Math.round((Date.parse(last) - Date.parse(start)) / 86_400_000) + 1;
      const sum = Object.values((body.subjectMinutes ?? {}) as Record<string, number>).reduce((a, b) => a + b, 0);
      const most = Math.max(sum, (body.totalMinutes as number | null) ?? 0, (body.homeMinutes as number | null ?? 0) + (body.awayMinutes as number | null ?? 0));
      if (most > MAX_DAY_MINUTES * days) problems.push(`Hours can't be more than 24 a day (${days === 1 ? "24 hours for this day" : `${24 * days} hours for these ${days} days`}).`);
    }
    const typedMinutes = [body.totalMinutes, body.homeMinutes, body.awayMinutes].some((v) => typeof v === "number")
      || Object.keys((body.subjectMinutes ?? {}) as object).length > 0;
    const something = counts || typedMinutes || (typeof body.notes === "string" && body.notes !== "") || ((body.books as string[] | undefined)?.length ?? 0) > 0;
    if (problems.length === 0 && !something) problems.push("Add something to log, or leave \"Count as a school day\" on.");
    if (problems.length > 0) { setError(problems[0]!); return; }
    setBusy(true);
    setError(null);
    try {
      if (entry) await apiPatch(`/api/log-entries/${entry.id}`, body);
      else await apiPost("/api/log-entries", { childIds: picked, ...body });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 400 ? e.message.replace(/^[a-zA-Z.\d]+: /, "") : "Couldn't save that. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form className="log-form schedule-form" aria-label={entry ? "Change log entry" : "Log"} onSubmit={(e) => { e.preventDefault(); void save(); }} noValidate>
      <div className="field-row">
        <div className="field"><label htmlFor="log-first">{end || !entry ? "First day" : "Day"}</label><DateField id="log-first" value={start} onChange={setStart} /></div>
        <div className="field"><label htmlFor="log-last">Last day (optional)</label><DateField id="log-last" value={end} onChange={setEnd} clearable /></div>
      </div>
      {!entry && kids.length > 1 ? (
        <fieldset className="log-kids">
          <legend>For</legend>
          <div className="log-chips">
            <Chip selected={allPicked} onClick={() => setPicked(allPicked ? [] : kids.map((k) => k.id))}>All children</Chip>
            {kids.map((k) => <Chip key={k.id} selected={picked.includes(k.id)} onClick={() => toggleChild(k.id)}>{k.name}</Chip>)}
          </div>
        </fieldset>
      ) : null}
      <label className="choice-row">
        <input type="checkbox" role="switch" checked={counts} onChange={() => setCounts(!counts)} />
        <span>Count as a school day<small>{isRun ? "Tick the days that count." : "Turn off if this wasn't a school day."}</small></span>
      </label>
      {counts && isRun ? (
        <RunDayChips start={start} end={last} childIds={picked} ticks={dayTicks} onTicks={onTicks} onChange={setRunDays} />
      ) : null}
      {fields.subjectHours ? (
        <fieldset className="log-hours"><legend>Hours by subject</legend>
          {active.length === 0 ? <p className="hint">Add subjects in Set up to log hours by subject.</p> : active.map((s) => <HoursBoxes key={s.id} label={s.name} value={subj[s.id] ?? EMPTY} onChange={(b) => setSubj((p) => ({ ...p, [s.id]: b }))} />)}
        </fieldset>
      ) : null}
      {fields.totalHours ? <fieldset className="log-hours"><legend>Hours</legend><HoursBoxes label="Total" value={total} onChange={setTotal} /></fieldset> : null}
      {fields.homeAway ? <fieldset className="log-hours"><legend>Where</legend><HoursBoxes label="At home" value={home} onChange={setHome} /><HoursBoxes label="Away" value={away} onChange={setAway} /></fieldset> : null}
      {fields.notes ? <div className="field"><label htmlFor="log-notes">Notes</label><textarea id="log-notes" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} /></div> : null}
      {fields.books ? (
        <fieldset className="log-books"><legend>Books read</legend>
          {books.length > 0 ? <ul className="log-book-list">{books.map((b, i) => <li key={`${b}-${i}`}>{b}<button type="button" className="btn btn-quiet" aria-label={`Remove ${b}`} onClick={() => setBooks(books.filter((_, j) => j !== i))}>Remove</button></li>)}</ul> : null}
          <div className="log-book-add">
            <input type="text" aria-label="Book title" placeholder="Title" maxLength={200} value={book} onChange={(e) => setBook(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBook(); } }} />
            <Button variant="secondary" onClick={addBook}>Add</Button>
          </div>
        </fieldset>
      ) : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="btn-row"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button><Button variant="secondary" onClick={onCancel}>Cancel</Button></div>
    </form>
  );
}
