/** Children and subjects (archived included, so old rows still show names) for the schedule screens. */
import type { ReactNode } from "react";
import type { Child, Subject, SubjectDefaultWeight } from "../../api/types";
import { useApi } from "../../api/useApi";
import { BackToSchedule } from "./ScheduleHub";

export interface Lookups {
  children: Child[];
  subjects: Subject[];
  childName: (id: string) => string;
  subjectName: (id: string) => string;
  /** The subject's default weight (S2b-31), or null when it has none or is unknown. */
  subjectDefault: (id: string) => SubjectDefaultWeight | null;
  /** S4-07: the subject's default weekdays (S4-03), or null when it has none or is unknown. */
  subjectWeekdays: (id: string) => number[] | null;
  /** S4-07: swap in a subject that was just saved (its default days changed from an assignment form); S6b-08: or add one just created there. */
  subjectSaved?: (saved: Subject) => void;
}

const bySort = <T extends { sortOrder: number }>(a: T, b: T) => a.sortOrder - b.sortOrder;

/** Renders `children(lookups)` once both lists load; a Retry box otherwise. */
export function WithLookups({ title, children }: { title: string; children: (l: Lookups) => ReactNode }) {
  const kids = useApi<Child[]>("/api/children?includeArchived=true");
  const subs = useApi<Subject[]>("/api/subjects?includeArchived=true");
  if (kids.loading || subs.loading) {
    return (
      <section className="schedule">
        <BackToSchedule />
        <h1>{title}</h1>
        <p aria-busy="true">Loading…</p>
      </section>
    );
  }
  if (kids.error || subs.error || !kids.data || !subs.data) {
    const offline = kids.error?.status === 0 || subs.error?.status === 0;
    return (
      <section className="schedule">
        <BackToSchedule />
        <h1>{title}</h1>
        <div className="form-error" role="alert">
          <p>{offline ? "Can't reach the server." : "Couldn't load your children and subjects."}</p>
          <button className="btn btn-secondary" type="button" onClick={() => { kids.reload(); subs.reload(); }}>Retry</button>
        </div>
      </section>
    );
  }
  const saved = (s: Subject) => subs.setData((list) => list && (list.some((x) => x.id === s.id) ? list.map((x) => (x.id === s.id ? s : x)) : [...list, s]));
  return <>{children(makeLookups(kids.data, subs.data, saved))}</>;
}

/** T-10: the lookups from lists already loaded elsewhere (the timeline has them), sorted the same way. */
export function makeLookups(kids: readonly Child[], subs: readonly Subject[], subjectSaved?: (saved: Subject) => void): Lookups {
  const childList = [...kids].sort(bySort);
  const subjectList = [...subs].sort(bySort);
  const cMap = new Map(childList.map((c) => [c.id, c]));
  const sMap = new Map(subjectList.map((s) => [s.id, s]));
  return {
    children: childList,
    subjects: subjectList,
    childName: (id) => cMap.get(id)?.name ?? "Unknown child",
    subjectName: (id) => sMap.get(id)?.name ?? "Unknown subject",
    subjectDefault: (id) => sMap.get(id)?.defaultWeight ?? null,
    subjectWeekdays: (id) => sMap.get(id)?.defaultWeekdays ?? null,
    subjectSaved,
  };
}
