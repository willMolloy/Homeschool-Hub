/** Children and subjects (archived included, so old rows still show names) for the schedule screens. */
import type { ReactNode } from "react";
import type { Child, Subject } from "../../api/types";
import { useApi } from "../../api/useApi";
import { BackToSchedule } from "./ScheduleHub";

export interface Lookups {
  children: Child[];
  subjects: Subject[];
  childName: (id: string) => string;
  subjectName: (id: string) => string;
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
  const childList = [...kids.data].sort(bySort);
  const subjectList = [...subs.data].sort(bySort);
  const cMap = new Map(childList.map((c) => [c.id, c]));
  const sMap = new Map(subjectList.map((s) => [s.id, s]));
  return (
    <>
      {children({
        children: childList,
        subjects: subjectList,
        childName: (id) => cMap.get(id)?.name ?? "Unknown child",
        subjectName: (id) => sMap.get(id)?.name ?? "Unknown subject",
      })}
    </>
  );
}
