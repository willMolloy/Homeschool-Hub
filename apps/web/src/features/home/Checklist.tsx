/**
 * S8-09, reworked in S11-05: the reminders on Home for a family that has not finished setting up. A row is there only while
 * its job is open: "Set your school year" and "Add your breaks" while the family has put them off in the setup flow ("I'll set
 * this later", "I'll get back to you on this"; each opens that step on its own), and "Add your children" / "Add subjects" if
 * there are somehow none. There is no row for books and lessons: a new family may want to look around first (Will, 2026-11-05).
 * The list goes when nothing is left, and can be hidden (kept on this device).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Circle } from "@phosphor-icons/react";
import type { SetupDeferral } from "../../api/types";
import { Button, Card } from "../../ui/components";

export const CHECKLIST_KEY = "hh.checklist.hidden";

export interface ChecklistStep {
  key: string;
  label: string;
  to: string;
}

export function checklistSteps(counts: { children: number; subjects: number }, deferred: readonly SetupDeferral[] = []): ChecklistStep[] {
  return [
    ...(deferred.includes("year") ? [{ key: "year", label: "Set your school year", to: "/welcome?only=year" }] : []),
    ...(deferred.includes("breaks") ? [{ key: "breaks", label: "Add your breaks", to: "/welcome?only=breaks" }] : []),
    ...(counts.children === 0 ? [{ key: "children", label: "Add your children", to: "/setup/children" }] : []),
    ...(counts.subjects === 0 ? [{ key: "subjects", label: "Add subjects", to: "/setup/subjects" }] : []),
  ];
}

function hidden(): boolean {
  try { return window.localStorage.getItem(CHECKLIST_KEY) === "1"; } catch { return false; }
}

export function Checklist({ steps }: { steps: readonly ChecklistStep[] }) {
  const [gone, setGone] = useState(hidden);
  if (gone || steps.length === 0) return null;
  const hide = () => {
    try { window.localStorage.setItem(CHECKLIST_KEY, "1"); } catch { /* hidden until reload */ }
    setGone(true);
  };
  return (
    <Card className="home-card home-checklist" role="region" aria-label="Getting started">
      <h2>Getting started</h2>
      <ol className="checklist">
        {steps.map((s, i) => (
          <li key={s.key} className={i === 0 ? "is-next" : undefined}>
            <Link to={s.to} className="checklist-row">
              <Circle size={24} weight="light" aria-hidden="true" />
              <span>{s.label}</span>
            </Link>
          </li>
        ))}
      </ol>
      <div className="btn-row"><Button variant="quiet" onClick={hide} aria-label="Hide the getting-started list">Hide</Button></div>
    </Card>
  );
}
