/**
 * S13-01..03: `/print/week` and `/print/day`. A print-only page outside the app shell (no bar, rail or buttons in print): one page
 * per chosen child, "Back" and "Print" on screen only. The sheets are built from the plan (`sheetModel.ts`); nothing is a number the
 * family didn't enter, and there are no minutes or effort words. `print=1` opens the browser's print dialog once the sheets are drawn.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Printer } from "@phosphor-icons/react";
import { addDays, weekStartOf, type ChildPlan } from "@hh/engine";
import { apiGet } from "../../api/client";
import type { BlockedRange, PlanResponse } from "../../api/types";
import { useMe } from "../../auth/AuthProvider";
import { useApi } from "../../api/useApi";
import { formatDate, formatShort } from "../../lib/dates";
import { useWeekLookups } from "../week/useWeekLookups";
import { ChildSheetView } from "./ChildSheetView";
import { parsePrintParams, type SheetKind } from "./printUrl";
import { buildSheet, dayName } from "./sheetModel";
import { useLightPage } from "./useLightPage";
import "./print.css";

export const PrintWeekPage = () => <PrintPage kind="week" />;
export const PrintDayPage = () => <PrintPage kind="day" />;

function PrintPage({ kind }: { kind: SheetKind }) {
  useLightPage();
  const me = useMe();
  const [params] = useSearchParams();
  const choice = parsePrintParams(kind, params);
  const from = choice ? (kind === "week" ? weekStartOf(choice.date, me.weekStart) : choice.date) : null;
  const to = from ? (kind === "week" ? addDays(from, 6) : from) : null;
  const look = useWeekLookups();
  const blocked = useApi<BlockedRange[]>("/api/blocked-ranges");
  const [plans, setPlans] = useState<ChildPlan[] | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!from || !to) return;
    let live = true;
    setFailed(false);
    apiGet<PlanResponse>(`/api/plan?from=${from}&to=${to}`).then((r) => live && setPlans(r.plans), () => live && setFailed(true));
    return () => { live = false; };
  }, [from, to]);

  const kids = useMemo(() => {
    const active = look.activeChildren;
    if (!choice) return [];
    return choice.children === "all" ? active : active.filter((c) => (choice.children as readonly string[]).includes(c.id));
  }, [look.activeChildren, choice?.children === "all" ? "all" : (choice?.children as readonly string[] | undefined)?.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = look.ready && plans !== undefined && !blocked.loading;
  const backTo = `/schedule?view=week${from ? `&week=${weekStartOf(from, me.weekStart)}` : ""}`;
  const sheets = ready && from && to ? kids.map((k) => buildSheet(k, plans!, from, to, look, blocked.data ?? [], me.schoolDays)) : [];

  const printed = useRef(false);
  useEffect(() => {
    if (!ready || printed.current || params.get("print") !== "1" || kids.length === 0) return;
    printed.current = true;
    const go = () => { try { window.print(); } catch { /* no print dialog here */ } };
    void (document.fonts?.ready ?? Promise.resolve()).then(() => setTimeout(go, 150));
  }, [ready, kids.length, params]);

  const heading = !choice || !from ? "" : kind === "week" ? `Week of ${formatDate(from)}` : `${dayName(from)}, ${formatShort(from)}`;
  return (
    <div className="print-screen" data-kind={kind}>
      <header className="print-bar no-print">
        <Link className="print-back" to={backTo}><span aria-hidden="true">‹</span> Back</Link>
        <button type="button" className="btn print-go" onClick={() => window.print()} disabled={!ready || kids.length === 0}>
          <Printer size={20} weight="light" aria-hidden="true" /> Print
        </button>
      </header>
      <main className="print-main">
      {!choice || !from || !to ? (
        <p className="print-note" role="alert">That sheet needs a {kind === "week" ? "week" : "day"}. Go back to Schedule and choose Print sheets again.</p>
      ) : failed ? (
        <p className="print-note" role="alert">Couldn&apos;t load the plan for the sheets. Go back and try again.</p>
      ) : !ready ? (
        <p className="print-note" aria-busy="true">Getting the sheets ready…</p>
      ) : kids.length === 0 ? (
        <p className="print-note" role="alert">No children to print for.</p>
      ) : (
        <div className="print-sheets" role="group" aria-label={heading}>
          {sheets.map((s) => <ChildSheetView key={s.childId} sheet={s} kind={kind} heading={heading} dayWord={dayName(from)} child={kids.find((k) => k.id === s.childId)!} />)}
        </div>
      )}
      </main>
    </div>
  );
}
