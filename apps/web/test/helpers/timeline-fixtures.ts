/** The engine's sample family (prototype data), planned and converted to API shapes for the timeline tests. */
import { planAll, type BlockedKind, type ChildPlan } from "@hh/engine";
import * as S from "../../../../packages/engine/test/fixtures/sample-family";
import type { Assignment, BlockedRange, Child, ScheduleEvent, Subject } from "../../src/api/types";
import type { TimelineInput } from "../../src/features/timeline/model";

const TITLES: Record<string, string> = {
  aesop: "Aesop's Fables", ti: "Treasure Island", crusoe: "Robinson Crusoe", garden: "The Secret Garden", poems: "Poems",
  heidi: "Heidi", math5: "Math 5", math3: "Math 3", fracs: "Fractions unit", hist: "History", sci: "Science",
  fair: "Science fair", piano: "Piano practice", violin: "Violin practice",
};

export const SAMPLE_SUBJECTS: Subject[] = ["lit", "math", "hist", "sci", "music"].map((id, i) => ({
  id, name: { lit: "Literature", math: "Math", hist: "History", sci: "Science", music: "Music" }[id]!, color: null, sortOrder: i, archived: false, defaultWeight: null, defaultWeekdays: null,
}));
export const SAMPLE_CHILDREN: Child[] = [
  { id: "frank", name: "Frank", color: null, sortOrder: 0, archived: false },
  { id: "margaret", name: "Margaret", color: null, sortOrder: 1, archived: false },
];
export const SAMPLE_ASSIGNMENTS: Assignment[] = S.assignments.map((a) => ({
  id: a.id, subjectId: a.subjectId, title: TITLES[a.id] ?? a.id, unitType: a.unitType, totalUnits: a.totalUnits,
  weightPerUnit: a.weightPerUnit ?? null, startDate: a.start, endDate: a.end, childIds: [...a.childIds], archived: false, weekdays: null,
}));
export const SAMPLE_BLOCKED: BlockedRange[] = S.blocked.map((b) => ({
  id: b.id, label: "Christmas", kind: (b.kind ?? "vacation") as BlockedKind, startDate: b.start, endDate: b.end, childIds: [...(b.childIds ?? [])],
}));
export const SAMPLE_EVENTS: ScheduleEvent[] = S.events.map((e) => ({
  id: e.id, name: e.name ?? e.id, weekdays: [...e.weekdays], startDate: e.start ?? null, endDate: e.end ?? null,
  capacityFraction: e.capacityFraction, defaultRule: e.defaultRule ?? "normal", subjectRules: { ...e.subjectRules }, childIds: [...e.childIds], archived: false,
}));

export const SAMPLE_TODAY = "2026-10-14";
export const samplePlans = (): ChildPlan[] =>
  planAll(S.assignments, { calendar: S.calendar, events: S.events, blocked: S.blocked, subjectWeights: S.subjectWeights, asOf: SAMPLE_TODAY });

/** The 2026–27 school year as a timeline input (Mon 2026-08-31 … Sun 2027-05-23). */
export const sampleInput = (over: Partial<TimelineInput> = {}): TimelineInput => ({
  from: "2026-08-31", to: "2027-05-23", today: SAMPLE_TODAY, weekStart: "mon", schoolDays: [1, 2, 3, 4, 5],
  plans: samplePlans(), assignments: SAMPLE_ASSIGNMENTS, children: SAMPLE_CHILDREN, subjects: SAMPLE_SUBJECTS,
  blocked: SAMPLE_BLOCKED, events: SAMPLE_EVENTS, ...over,
});
