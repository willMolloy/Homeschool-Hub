/**
 * "Make an adjustment" for a current or coming week (S6-03): that child's assignments with the amount planned this
 * week, a stepper on each, and, once an amount moved, the question of what happens to the end date. Save sends ONE
 * PUT /api/week-overrides/batch with every changed row and every row taken "Back to plan" (S7b-01), so it is one change
 * and one Undo. The default is to keep the end date, as in the check-in. S9-02: each row also offers "Update status"
 * ("got to p. 138, move to {date}") to correct the plan's pace, which opens `UpdateStatusFlow` through `onUpdateStatus`.
 */
import { useState } from "react";
import type { OverrideMode } from "@hh/engine";
import { ApiError, apiPut } from "../../api/client";
import type { Assignment, PlanResponse } from "../../api/types";
import { useApi } from "../../api/useApi";
import { UNIT_LABELS, unitNumber } from "../../components/unitLabels";
import { DEFAULT_MODE } from "../checkin/absorb";
import "../checkin/checkin.css";
import { usePlanRefresh } from "./planRefresh";
import { copyRows, type CopyRow, OtherCopies } from "../schedule/OtherCopies";
import { adjustRows, changesFor, END_DATE_CHOICES, stepAmount, type AdjustRow, type StoredOverride } from "./weekAdjust";

const amountText = (r: AdjustRow, n: number) => `${unitNumber(n)} ${UNIT_LABELS[r.unitType][n === 1 ? "one" : "many"]}`;

export interface WeekAdjustmentProps {
  childId: string;
  weekStart: string;
  weekEnd: string;
  /** S6b-12: the week is the current one ("This week"), else a coming one ("That week"). */
  current: boolean;
  /** Called after a successful save, so the sheet can close. */
  onSaved: () => void;
  /** S9-02: a row's Update status. Without it the rows have no such button. */
  onUpdateStatus?: (target: { assignmentId: string; title: string }) => void;
  /** S18b-02: open this week's amount for a child on another workbook of the same book. */
  onOpenAmount?: (childId: string) => void;
  nameOf?: (id: string) => string;
  daysOf?: (a: Assignment) => number[];
}

export function WeekAdjustment({ childId, weekStart, weekEnd, current, onSaved, onUpdateStatus, onOpenAmount, nameOf, daysOf }: WeekAdjustmentProps) {
  const plan = useApi<PlanResponse>(`/api/plan?from=${weekStart}&to=${weekEnd}`);
  const stored = useApi<{ overrides: StoredOverride[] }>(`/api/week-overrides?weekStart=${weekStart}`);
  const assignments = useApi<Assignment[]>("/api/assignments");
  const { invalidate } = usePlanRefresh();
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [taken, setTaken] = useState<ReadonlySet<string>>(new Set());
  const [mode, setMode] = useState<OverrideMode>(DEFAULT_MODE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (plan.error || stored.error) return <p className="checkin-error" role="alert">Couldn't load this week. Please try again.</p>;
  if (!plan.data || !stored.data) return <p aria-busy="true">Loading…</p>;
  const titleOf = (id: string) => assignments.data?.find((a) => a.id === id)?.title ?? "Assignment";
  const copiesOf = (assignmentId: string): CopyRow[] => {
    if (!onOpenAmount || !nameOf || !daysOf || !assignments.data) return [];
    const a = assignments.data.find((x) => x.id === assignmentId);
    return a ? copyRows(a, assignments.data, nameOf, daysOf) : [];
  };
  const rows = adjustRows(plan.data.plans, childId, weekStart, weekEnd, stored.data.overrides, titleOf);
  if (rows.length === 0) return <p className="checkin-note">Nothing is planned for this child this week.</p>;

  const amountOf = (r: AdjustRow) => amounts[r.assignmentId] ?? r.planned;
  const changes = changesFor(rows, amounts, taken);
  const asksEndDate = changes.some((c) => c.kind === "set");
  const setAmount = (r: AdjustRow, n: number) => {
    setAmounts((a) => ({ ...a, [r.assignmentId]: n }));
    setTaken((t) => new Set([...t].filter((id) => id !== r.assignmentId)));
  };
  const toggleTaken = (r: AdjustRow) => setTaken((t) => {
    const next = new Set(t);
    if (next.has(r.assignmentId)) next.delete(r.assignmentId);
    else next.add(r.assignmentId);
    return next;
  });

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiPut("/api/week-overrides/batch", {
        weekStart,
        set: changes.flatMap((c) => (c.kind === "set" ? [{ assignmentId: c.row.assignmentId, childId, plannedUnits: c.units, mode }] : [])),
        remove: changes.flatMap((c) => (c.kind === "remove" ? [c.overrideId] : [])),
      });
      invalidate();
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 400 ? e.message.replace(/^[a-zA-Z.\d]+: /, "") : "Couldn't save that. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="checkin-sheet week-adjust">
      {error && <p className="checkin-error" role="alert">{error}</p>}
      <ul className="checkin-rows">
        {rows.map((r) => {
          const n = amountOf(r);
          const isTaken = taken.has(r.assignmentId);
          return (
            <li key={r.assignmentId} className="checkin-row week-adjust-row">
              <div className="week-adjust-head">
                <span className="checkin-row-title">{r.title}</span>
                <span className="checkin-row-plan">{isTaken ? "Back to plan" : current ? "This week" : "That week"}</span>
              </div>
              <div className="week-adjust-controls">
                {!isTaken && (
                  <div className="checkin-stepper" role="group" aria-label={`Amount ${current ? "this week" : "that week"} for ${r.title}`}>
                    <button type="button" aria-label="One less" disabled={busy || n <= 0}
                      onClick={() => setAmount(r, stepAmount(r.unitType, n, -1, r.max))}>−</button>
                    <output aria-live="polite">{amountText(r, n)}</output>
                    <button type="button" aria-label="One more" disabled={busy || n >= r.max}
                      onClick={() => setAmount(r, stepAmount(r.unitType, n, 1, r.max))}>+</button>
                  </div>
                )}
                {onUpdateStatus && (
                  <button type="button" className="checkin-undo" disabled={busy} aria-label={`Update status for ${r.title}`}
                    onClick={() => onUpdateStatus({ assignmentId: r.assignmentId, title: r.title })}>
                    Update status
                  </button>
                )}
                {copiesOf(r.assignmentId).length > 0 ? (
                  <OtherCopies rows={copiesOf(r.assignmentId)} kinds={["amount"]} busy={busy} onAmount={(_row, id) => onOpenAmount?.(id)} />
                ) : null}
                {r.overrideId && (
                  <button type="button" className="checkin-undo" disabled={busy} onClick={() => toggleTaken(r)}
                    aria-label={`${isTaken ? "Keep the adjustment for" : "Back to plan for"} ${r.title}`}>
                    {isTaken ? "Keep adjustment" : "Back to plan"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {asksEndDate && (
        <div className="week-adjust-end">
          <div className="checkin-choice week-adjust-choice" role="group" aria-label="What about the end date?">
            {END_DATE_CHOICES.map((c) => (
              <button key={c.mode} type="button" aria-pressed={mode === c.mode} disabled={busy} onClick={() => setMode(c.mode)}>{c.label}</button>
            ))}
          </div>
          <p className="checkin-note">{END_DATE_CHOICES.find((c) => c.mode === mode)!.hint}</p>
        </div>
      )}
      <div className="checkin-footer">
        <button type="button" className="btn" disabled={busy || changes.length === 0} onClick={() => void save()}>Save</button>
      </div>
    </div>
  );
}
