/**
 * "How did last week go?" (S2b-25; redesigned in T-09). Presentational: the week and callbacks come in as
 * props, so it never fetches. The default is that everything went as planned: the week, one line, "Looks
 * right" and a quiet Skip, above one calm CheckInRow per planned assignment (a child picker when there is
 * more than one child). Changing a row turns "Looks right" into Save.
 *
 * Edit mode (S2b-27; the per-student sheet) reopens a finished week: rows prefilled from the stored `actual`,
 * and Save sends the whole week (replace), so a row put back to its plan is removed.
 *
 * T-09 drops the per-row "how to absorb it" question: new differences save with DEFAULT_MODE (keep the end
 * date, as before when nobody chose), stored rows keep their stored mode, and a finished row sends none.
 * Engine semantics are unchanged.
 */
import { useId, useState, type CSSProperties } from "react";
import type { OverrideMode } from "@hh/engine";
import type { CheckInItem, SaveWeekBody, WeekCheckIn } from "../../api/types";
import { AddProgress } from "./AddProgress";
import { DEFAULT_MODE, itemKey, rowOutcome } from "./absorb";
import { weekRangeText } from "./checkinText";
import { CheckInRow } from "./CheckInRow";
import "./checkin.css";

export type SaveItems = SaveWeekBody["items"];
export type CardMode = "prompt" | "edit";

export interface LastWeekCardProps {
  /** Carries its own weekStart; key the card by it so a different week starts fresh. */
  week: WeekCheckIn;
  /** "prompt" is the This Week question (default); "edit" corrects a finished week (S2b-27). */
  mode?: CardMode;
  busy: boolean;
  /** A failed save's message, shown inline; the card stays. */
  error: string | null;
  /** A 400 about one row, by itemKey, shown on that row. */
  itemErrors?: Readonly<Record<string, string>>;
  /** Prompt mode's "Looks right" and Skip. */
  onConfirm?: () => void;
  onSkip?: () => void;
  /** Save the changed rows. Rows left out are done as planned. */
  onSave: (items: SaveItems) => void;
  /** False: no card frame or header, for a host (a sheet) with its own title. Default true. */
  framed?: boolean;
  /** Per-row style from the host, e.g. a subject's pastel. */
  rowStyle?: (item: CheckInItem) => CSSProperties | undefined;
}

/** The children with rows, in the API's order (child, then subject, then title). */
export function childrenOf(items: readonly CheckInItem[]): { childId: string; childName: string }[] {
  const seen = new Map<string, string>();
  for (const i of items) if (!seen.has(i.childId)) seen.set(i.childId, i.childName);
  return [...seen].map(([childId, childName]) => ({ childId, childName }));
}

/** Stored positions and modes, by itemKey (S2b-27). */
export function storedAnswers(items: readonly CheckInItem[]) {
  const positions: Record<string, number> = {};
  const modes: Record<string, OverrideMode> = {};
  for (const i of items) {
    if (i.actual === null) continue;
    positions[itemKey(i)] = i.actual;
    if (i.mode) modes[itemKey(i)] = i.mode;
  }
  return { positions, modes };
}

export const AS_PLANNED_LINE = "Everything went as planned.";
export const changesLine = (n: number) => `${n} ${n === 1 ? "change" : "changes"} from the plan.`;

export function LastWeekCard(props: LastWeekCardProps) {
  const { week, mode = "prompt", busy, error, itemErrors = {}, onConfirm, onSkip, onSave, framed = true, rowStyle } = props;
  const editing = mode === "edit";
  const [stored] = useState(() => storedAnswers(editing ? week.items : []));
  /** Positions that differ from the plan, by itemKey; rows not here are done as planned. */
  const [positions, setPositions] = useState<Record<string, number>>(stored.positions);
  /** Rows added with Add progress (S2c-06), by itemKey, in the order added. */
  const [added, setAdded] = useState<string[]>([]);
  const kids = childrenOf([...week.items, ...week.addable]);
  const [picked, setPicked] = useState<string | null>(null);
  const shownChild = kids.some((k) => k.childId === picked) ? picked : kids[0]?.childId ?? null;
  const titleId = useId();

  const addedItems = added.flatMap((k) => week.addable.filter((a) => itemKey(a) === k));
  const rows = [...week.items, ...addedItems];
  const notAdded = week.addable.filter((a) => !added.includes(itemKey(a)));
  const positionOf = (i: CheckInItem) => positions[itemKey(i)] ?? i.plannedTo;
  const setPosition = (key: string, n: number) => setPositions((p) => ({ ...p, [key]: n }));
  const remove = (key: string) => {
    setAdded((a) => a.filter((k) => k !== key));
    setPositions(({ [key]: _gone, ...rest }) => rest);
  };
  const changed = rows.filter((i) => rowOutcome(i, positionOf(i)) !== "asPlanned");
  const modeOf = (i: CheckInItem): OverrideMode | null =>
    rowOutcome(i, positionOf(i)) === "finished" ? null : stored.modes[itemKey(i)] ?? DEFAULT_MODE;
  const save = () => onSave(changed.map((i) => ({
    assignmentId: i.assignmentId, childId: i.childId, position: positionOf(i), mode: modeOf(i),
  })));

  // The prompt shows one child at a time when there are several; the sheet is already one child.
  const visible = framed && kids.length > 1 ? rows.filter((i) => i.childId === shownChild) : rows;
  const addable = framed && kids.length > 1 ? notAdded.filter((i) => i.childId === shownChild) : notAdded;

  const list = (
    <>
      <ul className="checkin-rows">
        {visible.map((item) => {
          const key = itemKey(item);
          const isAdded = added.includes(key);
          return (
            <CheckInRow key={key} item={item} position={positionOf(item)} disabled={busy} error={itemErrors[key]}
              defaultOpen={isAdded} style={rowStyle?.(item)}
              onChange={(n) => setPosition(key, n)} onRemove={isAdded ? () => remove(key) : undefined} />
          );
        })}
      </ul>
      <AddProgress options={addable} disabled={busy} onAdd={(i) => setAdded((a) => [...a, itemKey(i)])} />
    </>
  );

  if (!framed) {
    return (
      <div className="checkin-sheet">
        {error && <p className="checkin-error" role="alert">{error}</p>}
        {list}
        <div className="checkin-footer">
          <button type="button" className="btn" disabled={busy} onClick={save}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <section id="last-week-checkin" className="card checkin-card" aria-label="How did last week go?">
      <h2 id={titleId} className="checkin-title">Last week · {weekRangeText(week.weekStart, week.weekEnd)}</h2>
      {kids.length > 1 && (
        <div className="checkin-kids" role="group" aria-label="Child">
          {kids.map((k) => (
            <button key={k.childId} type="button" aria-pressed={k.childId === shownChild} onClick={() => setPicked(k.childId)}>
              {k.childName}
            </button>
          ))}
        </div>
      )}
      <p className="checkin-summary">{changed.length === 0 ? AS_PLANNED_LINE : changesLine(changed.length)}</p>
      {error && <p className="checkin-error" role="alert">{error}</p>}
      <div className="checkin-footer">
        {changed.length === 0 ? (
          <button type="button" className="btn" disabled={busy} onClick={onConfirm}>Looks right</button>
        ) : (
          <button type="button" className="btn" disabled={busy} onClick={save}>Save</button>
        )}
        <button type="button" className="checkin-skip" disabled={busy} onClick={onSkip}>Skip</button>
      </div>
      {list}
    </section>
  );
}
