/**
 * S9-05: Home's briefing line. One short line, the most important thing that needs the parent ("Latin will finish about 3
 * weeks late at this pace."), with one action that opens the place to deal with it (Schedule · Week, where the line has its
 * Move and Keep buttons). When nothing needs attention it renders nothing: no "All good" filler, and no space.
 */
import { Link } from "react-router-dom";
import type { LocalDate } from "@hh/engine";
import type { Assignment, Child } from "../../api/types";
import { useApi } from "../../api/useApi";
import { useBriefingGroups } from "./Briefing";
import { topBriefingLine } from "./briefingLines";
import "./plan.css";

export const REVIEW_TO = "/schedule?view=week";

export function HomeBriefing({ weekStart }: { weekStart: LocalDate }) {
  const assignments = useApi<Assignment[]>("/api/assignments");
  const children = useApi<Child[]>("/api/children");
  if (!assignments.data || !children.data) return null;
  return <Line assignments={assignments.data} children={children.data} weekStart={weekStart} />;
}

function Line({ assignments, children, weekStart }: { assignments: Assignment[]; children: Child[]; weekStart: LocalDate }) {
  const { groups } = useBriefingGroups(assignments, children, weekStart);
  const line = groups ? topBriefingLine(groups) : null;
  if (!line) return null;
  return (
    <section className="home-briefing" aria-label="Needs you">
      <span className="home-briefing-dot" aria-hidden="true" />
      <p>{line.text}</p>
      <Link className="home-briefing-action" to={REVIEW_TO}>Review</Link>
    </section>
  );
}
