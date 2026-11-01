/**
 * S8-06: a finished week as pastel bars with a round check each. The plan assumes the work was done, so every bar
 * starts checked; unchecking one says "didn't get to it", and tapping a bar's body opens Update status for anything
 * in between (ahead, behind, finished) and the end date. Nothing is sent until Save, which sends the week once (the
 * check-in API replaces the whole week, so every child's rows are held here; the child switch only filters what shows).
 */
import { useMemo, useState } from "react";
import type { ChildPlan, OverrideMode } from "@hh/engine";
import type { CheckInItem, SaveWeekBody, SaveWeekResponse, WeekCheckIn } from "../../api/types";
import { Button } from "../../ui/components";
import { AddProgress } from "../checkin/AddProgress";
import { DEFAULT_MODE, itemKey, rowOutcome, storedAnswers } from "../checkin/absorb";
import { compactText } from "../checkin/amount";
import { SubjectGlyph } from "../subjects/SubjectIcon";
import { WeekBar, WeekBars } from "../week/WeekBar";
import { BOTH } from "../week/useChildChoice";
import type { WeekLookups } from "../week/useWeekLookups";
import { UpdateStatusSheet } from "./UpdateStatusSheet";
import "../week/week.css";
import "./track.css";

export interface CheckInBoardProps {
  week: WeekCheckIn;
  /** The child shown, or Both (every child's bars, grouped). */
  choice: string | null;
  look: WeekLookups;
  plans: readonly ChildPlan[] | undefined;
  busy: boolean;
  error: string | null;
  itemErrors: Readonly<Record<string, string>>;
  save: (body: SaveWeekBody) => Promise<SaveWeekResponse | null>;
  /** "Not quite" on a week not yet answered: Save is offered even before anything changed. */
  alwaysSave?: boolean;
  /** "last week" in "pages 120–150 last week". */
  whenText: string;
}

export function CheckInBoard({ week, choice, look, plans, busy, error, itemErrors, save, alwaysSave = false, whenText }: CheckInBoardProps) {
  const stored = useMemo(() => storedAnswers(week.items), [week.items]);
  const [positions, setPositions] = useState<Record<string, number>>(stored.positions);
  const [modes, setModes] = useState<Record<string, OverrideMode>>(stored.modes);
  const [added, setAdded] = useState<string[]>([]);
  const [open, setOpen] = useState<CheckInItem | null>(null);
  const addedItems = added.flatMap((k) => week.addable.filter((a) => itemKey(a) === k));
  const rows = [...week.items, ...addedItems];
  const positionOf = (i: CheckInItem) => positions[itemKey(i)] ?? i.plannedTo;
  const modeOf = (i: CheckInItem): OverrideMode | null =>
    rowOutcome(i, positionOf(i)) === "finished" ? null : modes[itemKey(i)] ?? stored.modes[itemKey(i)] ?? DEFAULT_MODE;
  const changed = rows.filter((i) => rowOutcome(i, positionOf(i)) !== "asPlanned");
  /** The changed rows as a comparable string: the same week saved again is not a change. */
  const snap = (list: readonly CheckInItem[], pos: (i: CheckInItem) => number, mode: (i: CheckInItem) => OverrideMode | null) =>
    JSON.stringify(list.filter((i) => rowOutcome(i, pos(i)) !== "asPlanned").map((i) => [itemKey(i), pos(i), mode(i)]).sort());
  const initial = useMemo(() => snap(week.items, (i) => stored.positions[itemKey(i)] ?? i.plannedTo,
    (i) => (rowOutcome(i, stored.positions[itemKey(i)] ?? i.plannedTo) === "finished" ? null : stored.modes[itemKey(i)] ?? DEFAULT_MODE)), [week.items, stored]);
  const dirty = snap(rows, positionOf, modeOf) !== initial;
  const planOf = (i: CheckInItem) => plans?.find((p) => p.assignmentId === i.assignmentId && p.childId === i.childId);

  const kids = choice === BOTH ? look.activeChildren : look.activeChildren.filter((c) => c.id === choice);
  const notAdded = week.addable.filter((a) => !added.includes(itemKey(a)) && (choice === BOTH || a.childId === choice));

  const toggle = (i: CheckInItem) => {
    const k = itemKey(i);
    const done = rowOutcome(i, positionOf(i)) !== "behind";
    setPositions((p) => ({ ...p, [k]: done ? i.plannedFrom : i.plannedTo }));
  };
  const send = () => void save({
    status: "reviewed",
    items: changed.map((i) => ({ assignmentId: i.assignmentId, childId: i.childId, position: positionOf(i), mode: modeOf(i) })),
  });

  return (
    <div className="board">
      {kids.map((k) => {
        const mine = rows.filter((i) => i.childId === k.id);
        return (
          <section key={k.id} aria-label={`${k.name}'s ${whenText}`}>
            <h3 className="week-section">{k.name}&apos;s {whenText}</h3>
            {mine.length === 0 ? <p className="week-empty">Nothing was planned.</p> : (
              <WeekBars label={`${k.name}'s bars`}>
                {mine.map((i) => {
                  const key = itemKey(i);
                  const outcome = rowOutcome(i, positionOf(i));
                  const planned = i.plannedTo - i.plannedFrom > 1e-9;
                  const bar = { key, assignmentId: i.assignmentId, childId: i.childId, childName: i.childName, subjectId: look.subjectOf(i.assignmentId), title: i.title, unitType: i.unitType, from: i.plannedFrom, to: i.plannedTo, total: i.totalUnits };
                  return (
                    <WeekBar key={key} bar={bar} slot={look.slotOfAssignment(i.assignmentId)} icon={<SubjectGlyph subject={look.subjectFor(i.assignmentId)} />} onOpen={() => setOpen(i)}
                      state={outcome === "asPlanned" ? undefined : compactText(i, positionOf(i))} error={itemErrors[key]}
                      check={planned ? { checked: outcome !== "behind", onToggle: () => toggle(i), disabled: busy } : undefined} />
                  );
                })}
              </WeekBars>
            )}
          </section>
        );
      })}
      <AddProgress options={notAdded} disabled={busy} onAdd={(i) => setAdded((a) => [...a, itemKey(i)])} />
      {error ? <p className="checkin-error" role="alert">{error}</p> : null}
      {dirty || alwaysSave ? <div className="btn-row board-save"><Button disabled={busy} onClick={send}>Save check-in</Button></div> : null}
      {open ? (
        <UpdateStatusSheet key={itemKey(open)} item={open} position={positionOf(open)} mode={modeOf(open)} plan={planOf(open)} whenText={whenText}
          onClose={() => setOpen(null)}
          onSave={(position, mode) => {
            const k = itemKey(open);
            setPositions((p) => ({ ...p, [k]: position }));
            setModes((m) => (mode ? { ...m, [k]: mode } : (({ [k]: _gone, ...rest }) => rest)(m)));
            setOpen(null);
          }} />
      ) : null}
    </div>
  );
}
