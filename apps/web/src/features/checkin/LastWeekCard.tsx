/**
 * "How did last week go?" (S2b-25). Presentational: the week and callbacks come in as props, so it never
 * fetches. Collapsed it is one line with three controls; Adjust lists each assignment × child, grouped by
 * child. Untouched rows count as done; each row's ProgressAdjuster (S2b-36) sets where the child got to.
 */
import { useId, useState } from "react";
import type { CheckInItem, WeekCheckIn } from "../../api/types";
import { plannedCountText, plannedRangeText } from "./checkinText";
import { ProgressAdjuster } from "./ProgressAdjuster";
import "./checkin.css";

export interface LastWeekCardProps {
  week: WeekCheckIn;
  busy: boolean;
  /** A failed save's message, shown inline; the card stays. */
  error: string | null;
  onConfirm: () => void;
  onSkip: () => void;
}

export const itemKey = (i: Pick<CheckInItem, "assignmentId" | "childId">) => `${i.assignmentId}/${i.childId}`;

/** Items grouped by child, in the API's order (child, then subject, then title). */
export function groupByChild(items: readonly CheckInItem[]): { childId: string; childName: string; items: CheckInItem[] }[] {
  const groups: { childId: string; childName: string; items: CheckInItem[] }[] = [];
  for (const item of items) {
    const g = groups.find((x) => x.childId === item.childId);
    if (g) g.items.push(item);
    else groups.push({ childId: item.childId, childName: item.childName, items: [item] });
  }
  return groups;
}

export function LastWeekCard({ week, busy, error, onConfirm, onSkip }: LastWeekCardProps) {
  const [expanded, setExpanded] = useState(false);
  /** Positions the parent changed, by itemKey; rows not here are done as planned. */
  const [positions, setPositions] = useState<Record<string, number>>({});
  const titleId = useId();
  const listId = useId();
  const confirm = (
    <button type="button" className="btn" disabled={busy} onClick={() => { setExpanded(false); onConfirm(); }}>
      Last week went as planned
    </button>
  );

  return (
    <section className="card checkin-card" aria-labelledby={titleId}>
      <div className="checkin-line">
        <p className="checkin-question">
          <strong id={titleId}>How did last week go?</strong> {plannedCountText(week.items.length)}
        </p>
        <div className="btn-row checkin-actions">
          {confirm}
          <button type="button" className="btn btn-secondary" aria-expanded={expanded} aria-controls={listId}
            disabled={busy} onClick={() => setExpanded((e) => !e)}>
            Adjust
          </button>
          <button type="button" className="btn-link checkin-skip" title="Skipping counts as done" disabled={busy} onClick={onSkip}>
            Skip
          </button>
        </div>
      </div>
      {error && <p className="checkin-error" role="alert">{error}</p>}
      <div id={listId} hidden={!expanded}>
        {expanded && (
          <>
            {groupByChild(week.items).map((g) => (
              <div key={g.childId} className="checkin-child">
                <h3>{g.childName}</h3>
                <ul className="checkin-rows">
                  {g.items.map((item) => (
                    <li key={itemKey(item)} className="checkin-row">
                      <span className="checkin-row-title">
                        {item.title} — {plannedRangeText(item.unitType, item.plannedFrom, item.plannedTo)} planned
                      </span>
                      <ProgressAdjuster plannedFrom={item.plannedFrom} plannedTo={item.plannedTo}
                        totalUnits={item.totalUnits} unitType={item.unitType}
                        position={positions[itemKey(item)] ?? item.plannedTo}
                        name={`${item.title} for ${item.childName}`}
                        onChange={(n) => setPositions((p) => ({ ...p, [itemKey(item)]: n }))} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="btn-row checkin-footer">
              <button type="button" className="btn" disabled>Save</button>
              {confirm}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
