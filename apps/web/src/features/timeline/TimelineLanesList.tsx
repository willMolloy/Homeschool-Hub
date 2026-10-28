/**
 * T-04/T-07: the timeline's lanes as a list, for screen readers (the picture itself is one labelled image).
 * Each assignment is a button that selects it (the keyboard path to the edit bar); the list shows while
 * focus is inside it.
 */
import { dateRange } from "../schedule/formBits";
import type { TimelineModel } from "./model";

export interface TimelineLanesListProps {
  model: TimelineModel;
  onSelect?: (assignmentId: string) => void;
}

export function TimelineLanesList({ model, onSelect }: TimelineLanesListProps) {
  return (
    <ul className="sr-only tl-lanes-list">
      {model.lanes.flatMap((s) => s.children.map((c) => (
        <li key={c.key}>
          {s.name}, {c.childName}:{" "}
          {c.assignments.filter((a) => a.first >= 0).map((a, i) => (
            <span key={a.assignmentId}>
              {i > 0 ? "; " : ""}
              <button type="button" className="tl-lane-pick" onClick={() => onSelect?.(a.assignmentId)}>
                {a.title}, {dateRange(model.dates[a.first]!, model.dates[a.last]!)}
              </button>
            </span>
          ))}
        </li>
      )))}
    </ul>
  );
}
