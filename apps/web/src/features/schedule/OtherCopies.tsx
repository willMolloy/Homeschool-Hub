/**
 * S18b-02: from one workbook, the other copies of that book, and a way to open the same kind of update on one of them
 * (this week's amount, Update status, or the finish question). Opening one does not change the others.
 */
import type { Assignment } from "../../api/types";
import { Button } from "../../ui/components";
import { joinNames } from "../completion/waiting";
import { daysPhrase, otherCopies, resolvedWeekdays } from "./bookCopies";
import "./copy-others.css";

export type CopyKind = "amount" | "status" | "finish";

export interface CopyRow {
  id: string;
  title: string;
  /** "Wren · Tue–Fri", or the days alone when the copy has no named child. */
  label: string;
  childIds: string[];
  children: { id: string; name: string }[];
  /** "Wren", "Elias and Clara", or "they". */
  childNames: string;
}

export function copyRows(
  assignment: { id: string; subjectId: string; title: string },
  list: readonly Assignment[],
  nameOf: (id: string) => string,
  daysOf: (a: Assignment) => number[],
): CopyRow[] {
  return otherCopies(list, assignment).map((a) => {
    const children = (a.childIds ?? []).map((id) => ({ id, name: nameOf(id) })).filter((c) => c.name);
    const childNames = children.length ? joinNames(children.map((c) => c.name)) : "they";
    const days = daysPhrase(daysOf(a));
    return {
      id: a.id,
      title: a.title,
      label: children.length ? `${childNames} · ${days}` : days,
      childIds: children.map((c) => c.id),
      children,
      childNames,
    };
  });
}

/** The days a workbook shows: its own, else the subject's, else the family's. */
export const daysOfAssignment = (
  a: Assignment, subjectDays: readonly number[] | null | undefined, schoolDays: readonly number[],
): number[] => resolvedWeekdays(a, subjectDays, schoolDays);

export function OtherCopies({ rows, kinds, busy = false, onAmount, onStatus, onFinish }: {
  rows: readonly CopyRow[];
  kinds: readonly CopyKind[];
  busy?: boolean;
  onAmount?: (row: CopyRow, childId: string) => void;
  onStatus?: (row: CopyRow) => void;
  onFinish?: (row: CopyRow) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="copy-others" aria-label="Other copies">
      <h3>Other copies</h3>
      <p className="hint">Separate workbooks. Updating one leaves the others where they are.</p>
      <ul>
        {rows.map((row) => (
          <li key={row.id}>
            <p>{row.label}</p>
            <div className="btn-row">
              {kinds.includes("amount") ? row.childIds.map((id) => {
                const name = row.children.find((c) => c.id === id)?.name ?? "this child";
                return (
                  <Button key={id} variant="secondary" disabled={busy} onClick={() => onAmount?.(row, id)}>
                    {row.childIds.length > 1 ? `This week's amount for ${name}` : "This week's amount"}
                  </Button>
                );
              }) : null}
              {kinds.includes("status") ? (
                <Button variant="secondary" disabled={busy} aria-label={`Update status for ${row.label}`} onClick={() => onStatus?.(row)}>Update status</Button>
              ) : null}
              {kinds.includes("finish") ? (
                <Button variant="secondary" disabled={busy} aria-label={`Did ${row.childNames} finish ${row.title}?`} onClick={() => onFinish?.(row)}>
                  {`Did ${row.childNames} finish?`}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
