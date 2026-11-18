/**
 * S21-01: the question before a break covers open work. The three choices are visible.
 * Confirm does not save one until that choice's ticket: keep in S21-02, either push in S21-03.
 * Cancel, or closing the sheet, leaves the break and the books as they were.
 */
import { useState } from "react";
import {
  breakUndoName, pickRefusal, resolveEndDates, type BreakOverlap, type OverlapAssignment, type RowChoice,
} from "@hh/engine";
import { formatDate } from "../../lib/dates";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { DateField } from "../../ui/DateField";
import type { ProposedBreak } from "./breakOverlap";
import { toSpan } from "./breakOverlap";

/** Which answers Confirm may save. S21-02 sets "keep". S21-03 sets "all". */
export const OVERLAP_SAVE: "none" | "keep" | "all" = "none";

type Choice = RowChoice | null;

interface Props {
  rows: BreakOverlap[];
  proposed: ProposedBreak[];
  assignments: OverlapAssignment[];
  existing: { start: string; end: string; childIds: readonly string[] }[];
  schoolDays: readonly number[];
  subjectWeekdays: { subjectId: string; weekdays: number[] | null }[];
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (adjustments: { assignmentId: string; endDate: string }[]) => void;
}

function choiceAt(choices: Choice[], index: number, kind: RowChoice["kind"], pushedEnd: string): Choice[] {
  return choices.map((c, i) => {
    if (i !== index) return c;
    if (kind === "pick") return { kind: "pick", date: c?.kind === "pick" ? c.date : pushedEnd };
    return { kind };
  });
}

/** The breaks this book is listed under, so a picked day has to land after all of them. */
function coveringEnds(rows: BreakOverlap[], proposed: ProposedBreak[], assignmentId: string): string[] {
  const indexes = new Set(rows.filter((r) => r.assignmentId === assignmentId).map((r) => r.breakIndex));
  return proposed.filter((_, i) => indexes.has(i)).map((b) => b.end);
}

function rowProblem(row: BreakOverlap, choice: Choice, rows: BreakOverlap[], proposed: ProposedBreak[], assignments: OverlapAssignment[]): string | null {
  if (choice?.kind !== "pick") return null;
  const start = assignments.find((a) => a.id === row.assignmentId)?.start ?? row.dates[0] ?? "";
  const why = pickRefusal(choice.date, coveringEnds(rows, proposed, row.assignmentId), start);
  if (!why) return null;
  const day = why === "before-start" ? start : coveringEnds(rows, proposed, row.assignmentId).sort().at(-1) ?? "";
  return `Pick a day after ${formatDate(day)}.`;
}

function canConfirm(choices: Choice[], rows: BreakOverlap[], proposed: ProposedBreak[], assignments: OverlapAssignment[], ctx: Pick<Props, "existing" | "schoolDays" | "subjectWeekdays">): boolean {
  if (OVERLAP_SAVE === "none") return false;
  if (choices.some((c) => c === null)) return false;
  if (OVERLAP_SAVE === "keep") return choices.every((c) => c?.kind === "keep");
  if (rows.some((row, i) => rowProblem(row, choices[i] ?? null, rows, proposed, assignments))) return false;
  const resolved = resolveEndDates(rows, choices, assignments, proposed.map(toSpan), ctx.existing.map(toSpan), ctx);
  return resolved.conflict === null;
}

export function BreakOverlapSheet({ rows, proposed, assignments, existing, schoolDays, subjectWeekdays, saving, error, onCancel, onConfirm }: Props) {
  const [choices, setChoices] = useState<Choice[]>(() => rows.map(() => null));
  const [last, setLast] = useState<Choice>(null);
  const ctx = { existing, schoolDays, subjectWeekdays };
  const ready = canConfirm(choices, rows, proposed, assignments, ctx);
  const unanswered = choices.some((c) => c === null);
  const conflict = OVERLAP_SAVE === "all" && !unanswered
    ? resolveEndDates(rows, choices, assignments, proposed.map(toSpan), existing.map(toSpan), ctx).conflict
    : null;
  const title = proposed.length === 1
    ? `${breakUndoName(proposed[0]!.label, proposed[0]!.start)} covers planned work`
    : "These breaks cover planned work";

  function pick(index: number, kind: RowChoice["kind"]) {
    const next = choiceAt(choices, index, kind, rows[index]!.pushedEnd);
    setChoices(next);
    setLast(next[index] ?? null);
  }

  function useForTheRest() {
    if (!last) return;
    setChoices((prev) => prev.map((c, i) => {
      if (c) return c;
      if (last.kind === "pick") return { kind: "pick", date: rows[i]!.pushedEnd };
      return { kind: last.kind };
    }));
  }

  function confirm() {
    if (!ready || saving) return;
    const resolved = resolveEndDates(rows, choices, assignments, proposed.map(toSpan), existing.map(toSpan), ctx);
    onConfirm(OVERLAP_SAVE === "all" ? resolved.ends : []);
  }

  return (
    <ResponsiveSheet open title={title} onOpenChange={(open) => { if (!open && !saving) onCancel(); }}>
      <div className="overlap-sheet">
        <p className="overlap-lead">Choose what to do with each book. Nothing changes until you confirm.</p>
        {proposed.map((b, breakIndex) => {
          const mine = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.breakIndex === breakIndex);
          if (mine.length === 0) return null;
          return (
            <section key={breakIndex} aria-label={breakUndoName(b.label, b.start)}>
              {proposed.length > 1 ? <h3 className="overlap-break">{breakUndoName(b.label, b.start)}</h3> : null}
              {mine.map(({ row, index }) => {
                const choice = choices[index];
                const problem = rowProblem(row, choice ?? null, rows, proposed, assignments);
                const group = `overlap-${row.breakIndex}-${row.assignmentId}`;
                return (
                  <fieldset key={group} className="choice-list overlap-book">
                    <legend>{row.title}</legend>
                    <p className="overlap-note">{row.summary[0]!.toUpperCase()}{row.summary.slice(1)}.</p>
                    {row.shared ? <p className="overlap-note">The end date moves for everyone on this book.</p> : null}
                    <label className="choice">
                      <input type="radio" name={group} checked={choice?.kind === "keep"} onChange={() => pick(index, "keep")} />
                      Keep the end date and let the other weeks carry the work
                    </label>
                    <label className="choice">
                      <input type="radio" name={group} checked={choice?.kind === "push"} onChange={() => pick(index, "push")} />
                      <span>Push the end back by the length of the break<span className="overlap-when">Ends {formatDate(row.pushedEnd)}</span></span>
                    </label>
                    <label className="choice">
                      <input type="radio" name={group} checked={choice?.kind === "pick"} onChange={() => pick(index, "pick")} />
                      Push the end to a day I pick
                    </label>
                    {choice?.kind === "pick" ? (
                      <div className="field overlap-pick">
                        <label htmlFor={`${group}-date`}>End date</label>
                        <DateField id={`${group}-date`} value={choice.date} onChange={(date) => {
                          const next = choices.map((c, i) => (i === index ? { kind: "pick" as const, date } : c));
                          setChoices(next);
                          setLast(next[index] ?? null);
                        }} aria-invalid={problem ? true : undefined} />
                        {problem ? <p className="field-error" role="alert">{problem}</p> : null}
                      </div>
                    ) : null}
                  </fieldset>
                );
              })}
            </section>
          );
        })}
        {last && unanswered ? (
          <button className="btn btn-secondary" type="button" onClick={useForTheRest}>Use this for the rest</button>
        ) : null}
        {conflict ? <p className="form-error" role="alert">{conflict}</p> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="btn-row">
          <button className="btn" type="button" disabled={!ready || saving} onClick={confirm}>{saving ? "Saving…" : "Confirm"}</button>
          <button className="btn btn-secondary" type="button" disabled={saving} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </ResponsiveSheet>
  );
}
