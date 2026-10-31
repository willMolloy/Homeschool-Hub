/**
 * The week's plan table (S1-36), until the timeline lands. S6b-01: the table itself shows only with `debug` (it
 * is the engine's thickness numbers, meaningless to parents); without it each child keeps their name, the
 * "Make an adjustment" entry and any warnings, until S6b-02 replaces them with bars. T-03b: the week comes in as a prop (the page's
 * switcher owns it), each child's table can carry an action (the page's "Make an adjustment"), and everything a
 * parent doesn't need (heading, note, "Plan as of", markers and legend, warning codes, engine footer) shows only
 * with `debug`.
 */
import { useEffect, useMemo, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { addDays, isValidLocalDate, weekdayOf, type LocalDate } from "@hh/engine";
import { useMe } from "../../auth/AuthProvider";
import { useApi } from "../../api/useApi";
import type { Child, PlanResponse, Subject } from "../../api/types";
import { buildDebugTables, type DebugCell, type DefaultSource } from "./debugTable";
import { usePlanRefresh } from "./planRefresh";
import "../roster/roster.css";
import "./plan.css";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export { deviceToday } from "./useShownWeek";

const WARNING_TEXT: Record<string, string> = {
  "invalid-range": "end date is before start date",
  "no-capacity": "no school days to plan into",
  "past-end": "the end date has passed with work left",
  "override-misaligned": "an override didn't start on a week start (moved)",
  "override-duplicate-week": "two overrides for the same week",
  "override-outside-range": "an override is outside the assignment's dates",
  "override-no-capacity": "an override week has no school days",
  "override-clamped": "an override asked for more than was left",
  "push-horizon-exceeded": "pushing the end date ran past the limit",
  "keep-no-free-capacity": "no room left to catch up before the end date",
};

/** Cell markers for weights that came from a default rather than the assignment (S2b-12). */
const MARKERS: Record<DefaultSource, { mark: string; label: string; legend: string }> = {
  default: { mark: "~", label: "built-in weight", legend: "~ uses the built-in weight for its unit" },
  subject: { mark: "s", label: "subject default weight", legend: "s uses the subject's default weight" },
};

function Cell({ cell, debug }: { cell: DebugCell; debug: boolean }) {
  return (
    <td>
      {cell.value}
      {debug && cell.defaults.map((d) => <sup key={d} aria-label={MARKERS[d].label}>{MARKERS[d].mark}</sup>)}
    </td>
  );
}

export interface PlanDebugViewProps {
  /** The shown week's first day (the page's `useShownWeek`). */
  weekStart: LocalDate;
  /** Show the developer extras. Off for parents. */
  debug?: boolean;
  /** Rendered beside each active child's name, e.g. the "Make an adjustment" button. */
  childAction?: (childId: string, childName: string) => ReactNode;
}

export function PlanDebugView({ weekStart, debug = false, childAction }: PlanDebugViewProps) {
  const me = useMe();
  const [params, setParams] = useSearchParams();
  const asOfParam = debug ? params.get("asOf") : null;
  const asOf = asOfParam && isValidLocalDate(asOfParam) ? asOfParam : null;
  const weekEnd = addDays(weekStart, 6);

  const plan = useApi<PlanResponse>(`/api/plan?from=${weekStart}&to=${weekEnd}${asOf ? `&asOf=${asOf}` : ""}`);
  const children = useApi<Child[]>("/api/children");
  const subjects = useApi<Subject[]>("/api/subjects");
  // Something else on the page changed the plan (a check-in, S2b-26): refetch in place.
  const { version } = usePlanRefresh();
  const reloadPlan = plan.reload;
  useEffect(() => {
    if (version > 0) reloadPlan();
  }, [version, reloadPlan]);
  const refreshing = plan.loading && plan.data !== undefined;

  const allDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const tables = useMemo(() => {
    if (!plan.data) return [];
    return buildDebugTables(plan.data.plans, allDates, children.data?.map((c) => c.id), subjects.data?.map((s) => s.id));
  }, [plan.data, allDates, children.data, subjects.data]);
  // School days always; other days only when something is planned on them.
  const dates = allDates.filter((d, i) => me.schoolDays.includes(weekdayOf(d))
    || tables.some((t) => (t.columnTotals[i]?.value ?? 0) > 0));
  const col = (d: LocalDate) => allDates.indexOf(d);

  const childName = (id: string) => children.data?.find((c) => c.id === id)?.name ?? id;
  const subjectName = (id: string) => subjects.data?.find((s) => s.id === id)?.name ?? id;
  // Active children with nothing in the plan still get a line, so nobody silently disappears.
  const activeChildren = (children.data ?? []).filter((c) => !c.archived);
  const unplanned = activeChildren.filter((c) => !tables.some((t) => t.childId === c.id));
  const usedDefaults = (Object.keys(MARKERS) as DefaultSource[])
    .filter((d) => tables.some((t) => t.rows.some((r) => r.cells.some((c) => c.defaults.includes(d)))));

  const go = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    setParams(p, { replace: true });
  };

  return (
    <section className={refreshing ? "plan-debug plan-refreshing" : "plan-debug"} aria-label="Plan for the week"
      aria-busy={refreshing || undefined}>
      {debug && (
        <>
          <h2>Debug view (temporary)</h2>
          <p className="plan-debug-note">Effort (units × weight) per day, straight from <code>/api/plan</code>. This is a check of the numbers, not the final timeline.</p>
          <label className="plan-debug-asof">
            Plan as of{" "}
            <input type="date" value={asOf ?? ""} onChange={(e) => go({ asOf: e.target.value || null })} />
            <span className="plan-debug-note">{asOf ? "" : ` today (${plan.data?.asOf ?? "…"})`}</span>
          </label>
        </>
      )}

      {plan.error ? (
        <div role="alert" className="plan-debug-error">
          Couldn't load the plan. <button type="button" className="btn btn-secondary" onClick={plan.reload}>Retry</button>
        </div>
      ) : plan.loading && !plan.data ? (
        <p aria-busy="true">Loading plan…</p>
      ) : tables.length === 0 ? (
        <>
          <p>Nothing planned this week.</p>
          {childAction && activeChildren.map((c) => (
            <div key={c.id} className="plan-debug-child">
              <ChildHead name={c.name} action={childAction(c.id, c.name)} tableShown={false} />
            </div>
          ))}
        </>
      ) : (
        <>
          {tables.map((t) => (
            <div key={t.childId} className="plan-debug-child">
              {childAction && <ChildHead name={childName(t.childId)} action={childAction(t.childId, childName(t.childId))} tableShown={debug} />}
              {debug && <div className="plan-debug-scroll">
                <table className="plan-debug-table">
                  <caption className={childAction ? "plan-sr-only" : undefined}>{childName(t.childId)}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Subject</th>
                      {dates.map((d) => (
                        <th scope="col" key={d}><abbr title={d}>{WEEKDAY[weekdayOf(d)]}</abbr><span className="plan-debug-date">{d.slice(5)}</span></th>
                      ))}
                      <th scope="col">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((r) => (
                      <tr key={r.subjectId}>
                        <th scope="row">{subjectName(r.subjectId)}</th>
                        {dates.map((d) => {
                          return <Cell key={d} cell={r.cells[col(d)]!} debug={debug} />;
                        })}
                        <td className="plan-debug-total">{r.total}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row">Total</th>
                      {dates.map((d) => <td key={d}>{t.columnTotals[col(d)]!.value}</td>)}
                      <td className="plan-debug-total">{t.total}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>}
              {t.warnings.length > 0 ? (
                <ul className="plan-debug-warnings" aria-label={`Warnings for ${childName(t.childId)}`}>
                  {t.warnings.map((w, i) => (
                    <li key={i}>{subjectName(w.subjectId)}: {WARNING_TEXT[w.warning] ?? w.warning}{debug && <> <code>{w.warning}</code></>}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
          {unplanned.map((c) => (
            <div key={c.id} className="plan-debug-child">
              {childAction && <ChildHead name={c.name} action={childAction(c.id, c.name)} tableShown={debug} />}
              <p className="plan-debug-unplanned">{c.name}: nothing planned this week.</p>
            </div>
          ))}
          {debug && usedDefaults.length > 0 ? (
            <ul className="plan-debug-note plan-debug-legend" aria-label="Markers">
              {usedDefaults.map((d) => <li key={d}>{MARKERS[d].legend}</li>)}
            </ul>
          ) : null}
          {debug && <p className="plan-debug-note">Engine {plan.data?.engineVersion}, as of {plan.data?.asOf}. Effort is units × weight, rounded to 1 decimal; totals add the rounded cells.</p>}
        </>
      )}
    </section>
  );
}

/** A student's name with their action beside it (T-03b). With the table shown the name is visual only (its caption names it). */
function ChildHead({ name, action, tableShown = true }: { name: string; action: ReactNode; tableShown?: boolean }) {
  return (
    <div className="plan-child-head">
      <span className="plan-child-name" aria-hidden={tableShown || undefined}>{name}</span>
      {action}
    </div>
  );
}
