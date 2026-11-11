/**
 * S9-01, S9-03, S9-07: Records, the second main job. A family with no log setup is asked to set one up first (template styles,
 * never a state). Then: Log (a sheet), Log setup, and the entries list with Edit and Delete (Delete is undone from the undo bar).
 * S9-08: a range (This week, Year, Fall, Spring, the family's own terms, or custom dates), one child or All children, then the
 * totals for the tracked fields, hours by subject, and that range's entries, newest first. The wording sits under it.
 * S9b-05 (N17): the range, custom dates and child live in the address (`?range=&from=&to=&child=`), so Undo (which reloads the
 * page's content) and a refresh keep them. (N12): a family with no children is sent to add one before it can log.
 */
import { useCallback, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, apiDelete } from "../../api/client";
import { useMe } from "../../auth/AuthProvider";
import type { Assignment, Child, FamilySettings, RecordEntry, RecordTotals, Subject } from "../../api/types";
import { useApi } from "../../api/useApi";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { Button, Chip } from "../../ui/components";
import { DateField } from "../../ui/DateField";
import { EmptyState } from "../../ui/EmptyState";
import { ChildSwitch } from "../week/ChildSwitch";
import { ALL, RECORDS_CHILD_KEY, shownChoice, useChildChoice } from "../week/useChildChoice";
import { ExportSheet } from "./ExportSheet";
import { LogEntryForm } from "./LogEntryForm";
import { LogSetupForm } from "./LogSetupForm";
import { dayWords, partWords, summaryOf } from "./entryText";
import { trackedWords } from "./logSetup";
import { rangeOptions } from "./ranges";
import { partInRange, type EntryPart } from "./share";
import { Totals } from "./Totals";
import { booksFinished, schoolDaysOf } from "./booksFinished";
import { RECORDS_WORDING } from "./wording";
import { formatRangeYears } from "../../lib/dates";
import "./records.css";

export function RecordsPage() {
  const family = useApi<FamilySettings>("/api/family");
  const subjects = useApi<Subject[]>("/api/subjects");
  const children = useApi<Child[]>("/api/children");
  const entries = useApi<RecordEntry[]>("/api/log-entries");
  const me = useMe();
  // S15-03: a viewer reads the same records (range, child, totals, entries, Export, Term in review) and can change none of them.
  const readOnly = me.role === "viewer";
  const assignments = useApi<Assignment[]>("/api/assignments");
  const [changing, setChanging] = useState(false);
  const [params, setParams] = useSearchParams();
  const setParam = useCallback((next: Record<string, string | null>) => setParams((p) => {
    const q = new URLSearchParams(p);
    for (const [k, v] of Object.entries(next)) { if (v) q.set(k, v); else q.delete(k); }
    return q;
  }, { replace: true }), [setParams]);
  const rangeKey = params.get("range") ?? "year";
  const setRangeKey = (k: string) => setParam({ range: k === "year" ? null : k });
  const custom = { start: params.get("from") ?? "", end: params.get("to") ?? "" };
  const setCustom = (c: { start: string; end: string }) => setParam({ from: c.start || null, to: c.end || null });
  const [exporting, setExporting] = useState(false);
  const [logging, setLogging] = useState<RecordEntry | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const setup = family.data?.logSetup ?? null;
  const kids = (children.data ?? []).filter((c) => !c.archived);
  // S18-04 (E12): Records remembers its own choice (All children until a child is picked here), not the one Schedule uses.
  const [remembered, remember] = useChildChoice(kids, "all", RECORDS_CHILD_KEY);
  const urlChild = params.get("child");
  const choice = urlChild ? shownChoice(kids, urlChild, "all") : remembered;
  const setChoice = (v: string) => { remember(v); setParam({ child: v }); };
  const options = family.data && assignments.data ? rangeOptions({ views: family.data.zoomViews, assignments: assignments.data, today: me.today, weekStart: me.weekStart }) : [];
  const picked = options.find((o) => o.key === rangeKey) ?? options.find((o) => o.key === "year");
  const range = rangeKey === "dates" ? (custom.start && custom.end && custom.end >= custom.start ? custom : null) : picked ? { start: picked.start, end: picked.end } : null;
  const childId = choice === null || choice === ALL ? null : choice;
  const totalsPath = range ? `/api/records/totals?from=${range.start}&to=${range.end}${childId ? `&childId=${childId}` : ""}` : "/api/records/totals";
  const totals = useApi<RecordTotals>(totalsPath);

  const failed = family.error || subjects.error || children.error || entries.error || totals.error || assignments.error;
  if (failed) {
    return <section className="records-page"><h1>Records</h1><div className="form-error" role="alert"><p>Couldn&apos;t load your records.</p><Button variant="secondary" onClick={() => { family.reload(); subjects.reload(); children.reload(); entries.reload(); totals.reload(); assignments.reload(); }}>Retry</Button></div></section>;
  }
  if (!family.data || !subjects.data || !children.data || !entries.data || !assignments.data || !totals.data) return <section className="records-page"><h1>Records</h1><p aria-busy="true">Loading…</p></section>;

  const saved = (f: FamilySettings, s: Subject[]) => { family.setData(f); subjects.setData(s); setChanging(false); };
  if (readOnly && !setup) {
    return <section className="records-page"><h1>Records</h1><p className="records-lead">Nothing has been set up to track yet.</p><p className="records-wording">{RECORDS_WORDING}</p></section>;
  }
  if (!readOnly && (!setup || changing)) {
    return (
      <section className="records-page">
        <h1>{setup ? "Log setup" : "Set up your log"}</h1>
        {!setup ? <p className="records-lead">Choose what your records track. You can change this any time, and nothing you have logged is lost.</p> : null}
        <LogSetupForm initial={setup?.fields ?? null} subjects={subjects.data} onSaved={saved} onCancel={setup ? () => setChanging(false) : undefined} />
      </section>
    );
  }
  const refresh = () => { entries.reload(); totals.reload(); };
  // S9b-01: every entry with a day in the range, as its part inside the range
  const inRange = range ? entries.data.filter((e) => childId === null || e.childId === childId).map((e) => partInRange(e, range.start, range.end)).filter((e): e is EntryPart => e !== null) : [];
  const nameOf = (id: string) => children.data!.find((c) => c.id === id)?.name ?? "Child";
  const remove = async (e: RecordEntry) => {
    setError(null);
    try { await apiDelete(`/api/log-entries/${e.id}`); refresh(); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Couldn't delete that. Please try again."); }
  };
  return (
    <section className="records-page">
      <h1>Records</h1>
      <p className="records-lead">{readOnly ? "The log tracks" : "Your log tracks"} <strong>{trackedWords(setup!.fields, true)}</strong>.{readOnly ? null : <> <button type="button" className="btn-link" onClick={() => setChanging(true)}>Change log setup</button></>}</p>
      {kids.length === 0 ? (
        <EmptyState text={readOnly ? "No children yet." : "Add a child first: each entry in your log is for a child."} action={readOnly ? undefined : <Link className="btn" to="/setup/children">Add a child</Link>} />
      ) : entries.data.length === 0 ? (
        <EmptyState text="Nothing logged yet." action={readOnly ? undefined : <Button variant="secondary" onClick={() => setLogging("new")}>Log</Button>} />
      ) : (
        <>
          <div className="records-actions">{readOnly ? null : <Button variant="secondary" onClick={() => setLogging("new")}>Log</Button>}<Button variant="secondary" onClick={() => setExporting(true)}>Export</Button>
            <Link className="btn btn-secondary" to={`/records/review?${new URLSearchParams({ ...(rangeKey !== "dates" && rangeKey !== "week" ? { range: rangeKey } : {}), ...(choice ? { child: choice } : {}) }).toString()}`}>Term in review</Link></div>
          <ChildSwitch kids={kids} value={choice} onChange={setChoice} />
          <div className="range-chips" role="group" aria-label="Range">
            {options.map((o) => <Chip key={o.key} selected={rangeKey === o.key || (rangeKey !== "dates" && !options.some((x) => x.key === rangeKey) && o.key === "year")} onClick={() => setRangeKey(o.key)}>{o.label}</Chip>)}
            <Chip selected={rangeKey === "dates"} onClick={() => setRangeKey("dates")}>Custom dates</Chip>
          </div>
          {rangeKey === "dates" ? (
            <div className="field-row range-dates">
              <div className="field"><label htmlFor="range-from">From</label><DateField id="range-from" value={custom.start} onChange={(v) => setCustom({ ...custom, start: v })} /></div>
              <div className="field"><label htmlFor="range-to">To</label><DateField id="range-to" value={custom.end} onChange={(v) => setCustom({ ...custom, end: v })} /></div>
            </div>
          ) : null}
          <p className="range-note">{range ? formatRangeYears(range.start, range.end) : "Pick the first and last day."}</p>
          {range ? (
            <>
              <Totals totals={totals.data} fields={setup!.fields} subjects={subjects.data} finished={booksFinished(assignments.data, range, childId ? [childId] : null)}
                perChild={childId === null && kids.length > 1 ? kids.map((k) => ({ name: k.name, days: schoolDaysOf(entries.data!, k.id, range) })) : undefined} />
              {error ? <p className="form-error" role="alert">{error}</p> : null}
              {inRange.length === 0 ? <p className="records-lead">Nothing logged in these dates.</p> : (
                <ul className="entry-list" aria-label="Log entries">
                  {inRange.map((e) => (
                    <li key={e.id} className="entry-row">
                      <div className="entry-head">{dayWords(e)} · {nameOf(e.childId)}</div>
                      {e.whole ? <p className="entry-part">{partWords(e.whole)}</p> : null}
                      <p className="entry-sum">{summaryOf(e, subjects.data!)}</p>
                      {readOnly ? null : (
                        <div className="entry-actions">
                          <Button variant="quiet" aria-label={`Edit ${nameOf(e.childId)}, ${dayWords(e.whole ?? e)}`} onClick={() => setLogging(e.whole ?? e)}>Edit</Button>
                          <Button variant="quiet" aria-label={`Delete ${nameOf(e.childId)}, ${dayWords(e.whole ?? e)}`} onClick={() => void remove(e.whole ?? e)}>Delete</Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </>
      )}
      <p className="records-wording">{RECORDS_WORDING}</p>
      <ResponsiveSheet open={exporting} onOpenChange={(o) => !o && setExporting(false)} title="Export" wide="side">
        {exporting && range ? (
          <ExportSheet fields={setup!.fields} children={children.data} subjects={subjects.data} entries={entries.data} assignments={assignments.data} start={range.start} end={range.end}
            childIds={childId ? [childId] : kids.map((k) => k.id)} onClose={() => setExporting(false)} />
        ) : null}
      </ResponsiveSheet>
      {readOnly ? null : <ResponsiveSheet open={logging !== null} onOpenChange={(o) => !o && setLogging(null)} title={logging === "new" || logging === null ? "Log" : "Change entry"} wide="side">
        {logging ? (
          <LogEntryForm key={logging === "new" ? "new" : logging.id} entries={entries.data} assignments={assignments.data} fields={setup!.fields} children={children.data} subjects={subjects.data}
            entry={logging === "new" ? undefined : logging} onCancel={() => setLogging(null)} onSaved={() => { setLogging(null); refresh(); }} />
        ) : null}
      </ResponsiveSheet>}
    </section>
  );
}
