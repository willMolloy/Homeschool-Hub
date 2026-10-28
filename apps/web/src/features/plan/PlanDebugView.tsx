/** Temporary plan debug table (S1-36). The real timeline waits for pilot results. */
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { addDays, isValidLocalDate, weekStartOf, weekdayOf, type LocalDate } from "@hh/engine";
import { useMe } from "../../auth/AuthProvider";
import { useApi } from "../../api/useApi";
import type { Child, PlanResponse, Subject } from "../../api/types";
import { buildDebugTables } from "./debugTable";
import "../roster/roster.css";
import "./plan.css";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The device's local date as YYYY-MM-DD. */
export function deviceToday(now: Date = new Date()): LocalDate {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

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

export function PlanDebugView() {
  const me = useMe();
  const [params, setParams] = useSearchParams();
  const weekParam = params.get("week");
  const asOfParam = params.get("asOf");
  const asOf = asOfParam && isValidLocalDate(asOfParam) ? asOfParam : null;
  const weekStart = weekStartOf(weekParam && isValidLocalDate(weekParam) ? weekParam : deviceToday(), me.weekStart);
  const weekEnd = addDays(weekStart, 6);

  const plan = useApi<PlanResponse>(`/api/plan?from=${weekStart}&to=${weekEnd}${asOf ? `&asOf=${asOf}` : ""}`);
  const children = useApi<Child[]>("/api/children");
  const subjects = useApi<Subject[]>("/api/subjects");

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
  const anyEstimated = tables.some((t) => t.rows.some((r) => r.cells.some((c) => c.estimated)));

  const go = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    setParams(p, { replace: true });
  };

  return (
    <section className="plan-debug" aria-labelledby="plan-debug-title">
      <h2 id="plan-debug-title">Debug view (temporary)</h2>
      <p className="plan-debug-note">Minutes per day straight from <code>/api/plan</code>. This is a check of the numbers, not the final timeline.</p>
      <div className="plan-debug-bar">
        <button type="button" className="btn btn-secondary" aria-label="Previous week" onClick={() => go({ week: addDays(weekStart, -7) })}>
          <span aria-hidden="true">← Prev</span>
        </button>
        <span className="plan-debug-week" aria-live="polite">Week of {weekStart}</span>
        <button type="button" className="btn btn-secondary" aria-label="Next week" onClick={() => go({ week: addDays(weekStart, 7) })}>
          <span aria-hidden="true">Next →</span>
        </button>
      </div>
      <label className="plan-debug-asof">
        Plan as of{" "}
        <input type="date" value={asOf ?? ""} onChange={(e) => go({ asOf: e.target.value || null })} />
        <span className="plan-debug-note">{asOf ? "" : ` today (${plan.data?.asOf ?? "…"})`}</span>
      </label>

      {plan.error ? (
        <div role="alert" className="plan-debug-error">
          Couldn't load the plan. <button type="button" className="btn btn-secondary" onClick={plan.reload}>Retry</button>
        </div>
      ) : plan.loading && !plan.data ? (
        <p aria-busy="true">Loading plan…</p>
      ) : tables.length === 0 ? (
        <p>Nothing planned this week.</p>
      ) : (
        <>
          {tables.map((t) => (
            <div key={t.childId} className="plan-debug-child">
              <div className="plan-debug-scroll">
                <table className="plan-debug-table">
                  <caption>{childName(t.childId)}</caption>
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
                          const c = r.cells[col(d)]!;
                          return <td key={d}>{c.minutes}{c.estimated ? <sup aria-label="estimated">*</sup> : null}</td>;
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
              </div>
              {t.warnings.length > 0 ? (
                <ul className="plan-debug-warnings" aria-label={`Warnings for ${childName(t.childId)}`}>
                  {t.warnings.map((w, i) => (
                    <li key={i}>{subjectName(w.subjectId)}: {WARNING_TEXT[w.warning] ?? w.warning} <code>{w.warning}</code></li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
          {anyEstimated ? <p className="plan-debug-note">* estimated: default minutes per unit</p> : null}
          <p className="plan-debug-note">Engine {plan.data?.engineVersion}, as of {plan.data?.asOf}. Minutes are rounded; totals add the rounded cells.</p>
        </>
      )}
    </section>
  );
}
