/**
 * S8-09: the getting-started checklist on Home for a new family: Add your children, Add subjects, Add your books and
 * lessons, Set your year's breaks. Each row opens the right screen and ticks itself once the data is there. It goes when
 * all four are done, and can be hidden (kept on this device).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Circle } from "@phosphor-icons/react";
import type { SetupDeferral } from "../../api/types";
import { Button, Card } from "../../ui/components";

export const CHECKLIST_KEY = "hh.checklist.hidden";

export interface ChecklistStep {
  key: string;
  label: string;
  to: string;
  done: boolean;
}

/**
 * S11-03: a step the family put off in the setup flow is a reminder here until it is done: "Set your school year" opens that
 * step on its own (`/welcome?only=year`), and goes when the year is saved.
 */
export function checklistSteps(counts: { children: number; subjects: number; assignments: number; breaks: number }, deferred: readonly SetupDeferral[] = []): ChecklistStep[] {
  return [
    ...(deferred.includes("year") ? [{ key: "year", label: "Set your school year", to: "/welcome?only=year", done: false }] : []),
    { key: "children", label: "Add your children", to: "/setup/children", done: counts.children > 0 },
    { key: "subjects", label: "Add subjects", to: "/setup/subjects", done: counts.subjects > 0 },
    { key: "assignments", label: "Add your books and lessons", to: "/setup/assignments", done: counts.assignments > 0 },
    // S11-04: breaks put off in the setup flow are a reminder that opens that step on its own; otherwise the old row.
    deferred.includes("breaks")
      ? { key: "breaks", label: "Add your breaks", to: "/welcome?only=breaks", done: false }
      : { key: "breaks", label: "Set your year's breaks", to: "/setup/days-off", done: counts.breaks > 0 },
  ];
}

function hidden(): boolean {
  try { return window.localStorage.getItem(CHECKLIST_KEY) === "1"; } catch { return false; }
}

export function Checklist({ steps }: { steps: readonly ChecklistStep[] }) {
  const [gone, setGone] = useState(hidden);
  if (gone || steps.every((s) => s.done)) return null;
  const hide = () => {
    try { window.localStorage.setItem(CHECKLIST_KEY, "1"); } catch { /* hidden until reload */ }
    setGone(true);
  };
  const next = steps.find((s) => !s.done);
  return (
    <Card className="home-card home-checklist" role="region" aria-label="Getting started">
      <h2>Getting started</h2>
      <p className="home-sub">A few steps and your year is planned.</p>
      <ol className="checklist">
        {steps.map((s) => (
          <li key={s.key} className={s.done ? "is-done" : s === next ? "is-next" : undefined}>
            <Link to={s.to} className="checklist-row">
              {s.done ? <CheckCircle size={24} weight="fill" aria-hidden="true" /> : <Circle size={24} weight="light" aria-hidden="true" />}
              <span>{s.label}</span>
              {s.done ? <span className="checklist-done">Done</span> : null}
            </Link>
          </li>
        ))}
      </ol>
      <div className="btn-row"><Button variant="quiet" onClick={hide} aria-label="Hide the getting-started list">Hide</Button></div>
    </Card>
  );
}
