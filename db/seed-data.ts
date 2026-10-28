/**
 * What `seed()` loads: one family's rows, in @hh/engine shapes plus the names and colours the API stores.
 * Two families use it: the sample family (the engine fixture, which the API tests compare numbers with) and the
 * richer demo family the preview and `npm run demo` show (demo-family.ts).
 */
import type {
  Assignment, BlockedPeriod, FamilyCalendar, LocalDate, ProgressCheckIn, RecurringEvent, SubjectWeight, WeekOverride,
} from "@hh/engine";
import * as S from "../packages/engine/test/fixtures/sample-family";

export interface SeedPerson { key: string; name: string; color: string }

export interface SeedFamily {
  calendar: FamilyCalendar;
  subjectWeights: SubjectWeight[];
  children: SeedPerson[];
  subjects: SeedPerson[];
  /** `title` is the stored title (falls back to the id). */
  assignments: Assignment[];
  events: RecurringEvent[];
  /** `label` is what the timeline shows on the break. */
  blocked: (BlockedPeriod & { label: string })[];
  overrides?: WeekOverride[];
  checkIns?: ProgressCheckIn[];
  /** Weeks the parent has checked in on (week_review). */
  reviews?: { weekStart: LocalDate; status: "reviewed" | "skipped" }[];
}

const SAMPLE_TITLES: Record<string, string> = {
  aesop: "Aesop's Fables", ti: "Treasure Island", crusoe: "Robinson Crusoe",
  garden: "The Secret Garden", poems: "A Child's Garden of Verses", heidi: "Heidi",
  math5: "Math 5", math3: "Math 3", fracs: "Fractions unit",
  hist: "History spine", sci: "Science", fair: "Science fair project",
  piano: "Piano practice", violin: "Violin practice",
};

export const SEED_CHILDREN: SeedPerson[] = [
  { key: "frank", name: "Frank", color: "#2f6fb0" },
  { key: "margaret", name: "Margaret", color: "#b0482f" },
];
export const SEED_SUBJECTS: SeedPerson[] = [
  { key: "lit", name: "Literature", color: "#7a5cc2" },
  { key: "math", name: "Math", color: "#2f8f6f" },
  { key: "hist", name: "History", color: "#b08a2f" },
  { key: "sci", name: "Science", color: "#2f8fb0" },
  { key: "music", name: "Music", color: "#c25c8a" },
];

/** The engine's sample family (packages/engine/test/fixtures/sample-family.ts), so API output matches the engine tests. */
export const SAMPLE_FAMILY: SeedFamily = {
  calendar: S.calendar,
  subjectWeights: S.subjectWeights,
  children: SEED_CHILDREN,
  subjects: SEED_SUBJECTS,
  assignments: S.assignments.map((a) => ({ ...a, title: SAMPLE_TITLES[a.id] ?? a.id })),
  events: S.events,
  blocked: S.blocked.map((b) => ({ ...b, label: b.id === "xmas" ? "Christmas break" : b.id })),
};
