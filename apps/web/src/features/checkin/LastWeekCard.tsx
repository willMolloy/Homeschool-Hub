/**
 * "How did last week go?" (S2b-25). Presentational: the week and callbacks come in as props, so it never
 * fetches. Collapsed it is one line with three controls; Adjust lists each assignment × child, grouped by
 * child. Untouched rows count as done; each row's ProgressAdjuster (S2b-36) sets where the child got to,
 * and rows that ended up behind or ahead ask how to absorb it (S2b-26).
 *
 * Edit mode (S2b-27) reopens a finished week: always expanded, prefilled from the stored `actual` and `mode`,
 * and Save sends the whole week (replace), so a row put back to its plan is removed.
 */
import { useId, useState } from "react";
import type { OverrideMode } from "@hh/engine";
import type { CheckInItem, SaveWeekBody, WeekCheckIn } from "../../api/types";
import { AbsorbChoice } from "./AbsorbChoice";
import { DEFAULT_MODE, itemKey, outcomeText, rowOutcome, type Direction } from "./absorb";
import { plannedCountText, plannedRangeText, reviewStatusText, weekRangeText } from "./checkinText";
import { ProgressAdjuster } from "./ProgressAdjuster";
import "./checkin.css";

export type SaveItems = SaveWeekBody["items"];

export type CardMode = "prompt" | "edit";

export interface LastWeekCardProps {
  /** Carries its own weekStart; key the card by it so a different week starts fresh. */
  week: WeekCheckIn;
  /** "prompt" is the home-screen question (default); "edit" corrects a past week (S2b-27). */
  mode?: CardMode;
  busy: boolean;
  /** A failed save's message, shown inline; the card stays. */
  error: string | null;
  /** A 400 about one row, by itemKey, shown on that row. */
  itemErrors?: Readonly<Record<string, string>>;
  /** Prompt mode's "went as planned" and Skip; edit mode doesn't show them. */
  onConfirm?: () => void;
  onSkip?: () => void;
  /** Save the changed rows (S2b-26). Rows left out are done as planned. */
  onSave: (items: SaveItems) => void;
  /** Edit mode: close without saving. */
  onClose?: () => void;
}

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

const DIRECTIONS: readonly Direction[] = ["behind", "ahead"];
const isDirection = (o: string): o is Direction => o === "behind" || o === "ahead";

/**
 * The card's starting answers from what's stored (S2b-27): positions and per-row modes; for each direction a
 * shared answer only when every stored row going that way agrees, otherwise rows keep their own.
 */
export function initialAnswers(items: readonly CheckInItem[]) {
  const positions: Record<string, number> = {};
  const rowModes: Record<string, OverrideMode> = {};
  const applyAll: Record<Direction, boolean> = { behind: true, ahead: true };
  const groupModes: Record<Direction, OverrideMode> = { behind: DEFAULT_MODE, ahead: DEFAULT_MODE };
  for (const d of DIRECTIONS) {
    const going = items.filter((i) => i.actual !== null && rowOutcome(i, i.actual) === d);
    const modes = new Set(going.map((i) => i.mode ?? DEFAULT_MODE));
    applyAll[d] = modes.size <= 1;
    if (modes.size === 1) groupModes[d] = [...modes][0]!;
  }
  for (const i of items) {
    if (i.actual === null) continue;
    positions[itemKey(i)] = i.actual;
    if (i.mode) rowModes[itemKey(i)] = i.mode;
  }
  return { positions, rowModes, applyAll, groupModes };
}

export function LastWeekCard({ week, mode = "prompt", busy, error, itemErrors = {}, onConfirm, onSkip, onSave, onClose }: LastWeekCardProps) {
  const editing = mode === "edit";
  const [start] = useState(() => (editing ? initialAnswers(week.items) : initialAnswers([])));
  const [adjusting, setExpanded] = useState(false);
  const expanded = editing || adjusting;
  /** Positions the parent changed, by itemKey; rows not here are done as planned. */
  const [positions, setPositions] = useState<Record<string, number>>(start.positions);
  const [rowModes, setRowModes] = useState<Record<string, OverrideMode>>(start.rowModes);
  const [applyAll, setApplyAll] = useState<Record<Direction, boolean>>(start.applyAll);
  const [groupModes, setGroupModes] = useState<Record<Direction, OverrideMode>>(start.groupModes);
  const titleId = useId();
  const listId = useId();

  const positionOf = (item: CheckInItem) => positions[itemKey(item)] ?? item.plannedTo;
  const outcomeOf = (item: CheckInItem) => rowOutcome(item, positionOf(item));
  const rowsGoing = (d: Direction) => week.items.filter((i) => outcomeOf(i) === d);
  /** Whether a direction's rows share one answer: "apply to all" ticked and more than one row. */
  const grouped = (d: Direction) => applyAll[d] && rowsGoing(d).length > 1;
  const modeOf = (item: CheckInItem): OverrideMode | null => {
    const o = outcomeOf(item);
    if (!isDirection(o)) return null;
    return grouped(o) ? groupModes[o] : rowModes[itemKey(item)] ?? DEFAULT_MODE;
  };
  const changed = week.items.filter((i) => outcomeOf(i) !== "asPlanned");
  const save = () => onSave(changed.map((i) => ({
    assignmentId: i.assignmentId, childId: i.childId, position: positionOf(i), mode: modeOf(i),
  })));

  const confirm = (
    <button type="button" className="btn" disabled={busy} onClick={() => { setExpanded(false); onConfirm?.(); }}>
      Last week went as planned
    </button>
  );

  const header = editing ? (
    <div className="checkin-line">
      <p className="checkin-question">
        <strong id={titleId}>Week of {weekRangeText(week.weekStart, week.weekEnd)}</strong>{" "}
        <span className="checkin-status">({reviewStatusText(week.status)})</span> {plannedCountText(week.items.length)}
      </p>
      {onClose && <button type="button" className="btn-link" disabled={busy} onClick={onClose}>Close</button>}
    </div>
  ) : (
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
  );

  return (
    <section className={`card checkin-card${editing ? " checkin-edit" : ""}`} aria-labelledby={titleId}>
      {header}
      {error && <p className="checkin-error" role="alert">{error}</p>}
      <div id={listId} hidden={!expanded}>
        {expanded && (
          <>
            {groupByChild(week.items).map((g) => (
              <div key={g.childId} className="checkin-child">
                <h3>{g.childName}</h3>
                <ul className="checkin-rows">
                  {g.items.map((item) => {
                    const key = itemKey(item);
                    const outcome = outcomeOf(item);
                    return (
                      <li key={key} className="checkin-row">
                        <span className="checkin-row-title">
                          {item.title} — {plannedRangeText(item.unitType, item.plannedFrom, item.plannedTo)} planned
                        </span>
                        <ProgressAdjuster plannedFrom={item.plannedFrom} plannedTo={item.plannedTo}
                          totalUnits={item.totalUnits} unitType={item.unitType} position={positionOf(item)}
                          name={`${item.title} for ${item.childName}`}
                          onChange={(n) => setPositions((p) => ({ ...p, [key]: n }))} />
                        {outcome !== "asPlanned" && <p className="checkin-outcome">{outcomeText(item, positionOf(item))}</p>}
                        {isDirection(outcome) && !grouped(outcome) && (
                          <AbsorbChoice direction={outcome} value={modeOf(item) ?? DEFAULT_MODE}
                            about={`${item.title} for ${item.childName}`}
                            onChange={(m) => setRowModes((r) => ({ ...r, [key]: m }))} />
                        )}
                        {itemErrors[key] && <p className="checkin-error" role="alert">{itemErrors[key]}</p>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {DIRECTIONS.filter((d) => rowsGoing(d).length > 1).map((d) => (
              <div key={d} className="checkin-group-choice">
                <label className="checkin-apply-all">
                  <input type="checkbox" checked={applyAll[d]}
                    onChange={(e) => setApplyAll((a) => ({ ...a, [d]: e.target.checked }))} />
                  Apply one choice to all {rowsGoing(d).length} rows {d}
                </label>
                {applyAll[d] && (
                  <AbsorbChoice direction={d} value={groupModes[d]} about={`the ${rowsGoing(d).length} rows ${d}`}
                    onChange={(m) => setGroupModes((g) => ({ ...g, [d]: m }))} />
                )}
              </div>
            ))}
            <div className="btn-row checkin-footer">
              <button type="button" className="btn" disabled={busy || (!editing && changed.length === 0)} onClick={save}>Save</button>
              {!editing && confirm}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
