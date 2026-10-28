/** T-04: the timeline's lanes as a list, for screen readers (the picture itself is one labelled image). */
import { dateRange } from "../schedule/formBits";
import type { TimelineModel } from "./model";

export function TimelineLanesList({ model }: { model: TimelineModel }) {
  return (
    <ul className="sr-only">
      {model.lanes.flatMap((s) => s.children.map((c) => (
        <li key={c.key}>
          {s.name}, {c.childName}:{" "}
          {c.assignments.filter((a) => a.first >= 0).map((a, i) => (
            <span key={a.assignmentId}>{i > 0 ? "; " : ""}{a.title}, {dateRange(model.dates[a.first]!, model.dates[a.last]!)}</span>
          ))}
        </li>
      )))}
    </ul>
  );
}
