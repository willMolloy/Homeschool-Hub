/**
 * T-07d: the demo family's school year, 2026–27 (Mon 2026-08-31 … Fri 2027-05-21). Believable, and varied enough
 * for the timeline to show how the schedule moves:
 * - short reading sprints: Treasure Island in three weeks, The Hobbit straight after, Charlotte's Web in three weeks
 * - overlap in one subject: poems beside The Secret Garden, times tables beside Math 3
 * - chapter-based books (The Hobbit, The Secret Garden) beside page-based ones
 * - lesson-based math across the whole year, for both children
 * - a mid-year start (Margaret's drawing course and Frank's swim lessons in January)
 * - one assignment heavier for three weeks, then lighter (the science fair build, via week overrides)
 * - a holiday (Labor Day), a break week (Thanksgiving), Christmas and spring break
 * - co-op, piano and violin as recurring events
 * - two past weeks checked in: Frank read ahead in The Hobbit, Margaret fell behind in The Secret Garden
 * - Frank (older) carries more than Margaret
 */
import type { Assignment } from "@hh/engine";
import { SEED_CHILDREN, SEED_SUBJECTS, type SeedFamily } from "./seed-data";

const A = (id: string, title: string, subjectId: string, childIds: string[], unitType: Assignment["unitType"],
  totalUnits: number, start: string, end: string, weightPerUnit: number | null = null): Assignment =>
  ({ id, title, subjectId, childIds, unitType, totalUnits, start, end, weightPerUnit });

export const DEMO_FAMILY: SeedFamily = {
  calendar: { weekStart: "mon", schoolDays: [1, 2, 3, 4, 5] },
  subjectWeights: [{ subjectId: "math", unitType: "lessons", weightPerUnit: 20 }],
  children: SEED_CHILDREN,
  subjects: [...SEED_SUBJECTS, { key: "art", name: "Art", color: "#5c8a2f" }],
  assignments: [
    // Frank's reading: back-to-back sprints, pages then chapters.
    A("aesop", "Aesop's Fables", "lit", ["frank"], "pages", 120, "2026-08-31", "2026-09-11"),
    A("ti", "Treasure Island", "lit", ["frank"], "pages", 270, "2026-09-14", "2026-10-02"),
    A("hobbit", "The Hobbit", "lit", ["frank"], "chapters", 19, "2026-10-05", "2026-11-13"),
    A("beauty", "Black Beauty", "lit", ["frank"], "pages", 240, "2026-11-16", "2026-12-18"),
    A("crusoe", "Robinson Crusoe", "lit", ["frank"], "pages", 300, "2027-01-04", "2027-03-12"),
    A("willows", "The Wind in the Willows", "lit", ["frank"], "chapters", 12, "2027-03-22", "2027-05-14"),
    // Margaret's reading: a chapter book with poems alongside, then a three-week sprint.
    A("garden", "The Secret Garden", "lit", ["margaret"], "chapters", 27, "2026-09-08", "2026-11-20"),
    A("poems", "A Child's Garden of Verses", "lit", ["margaret"], "pages", 80, "2026-10-05", "2026-10-30"),
    A("charlotte", "Charlotte's Web", "lit", ["margaret"], "pages", 184, "2026-11-30", "2026-12-18"),
    A("heidi", "Heidi", "lit", ["margaret"], "pages", 280, "2027-01-04", "2027-04-30"),
    // Math: a lesson a day all year; Margaret's times tables overlap her course for a month.
    A("math5", "Math 5", "math", ["frank"], "lessons", 150, "2026-08-31", "2027-05-21"),
    A("math3", "Math 3", "math", ["margaret"], "lessons", 140, "2026-08-31", "2027-05-21", 12),
    A("tables", "Times tables", "math", ["margaret"], "lessons", 16, "2026-10-05", "2026-10-30", 8),
    // History together; science apart, with Frank's fair project heavy for three weeks, then lighter.
    A("hist", "History spine", "hist", ["frank", "margaret"], "lessons", 140, "2026-09-08", "2027-05-14"),
    A("sci5", "Science 5", "sci", ["frank"], "lessons", 120, "2026-09-08", "2027-05-14"),
    A("nature", "Nature study", "sci", ["margaret"], "lessons", 60, "2026-09-08", "2027-05-14", 15),
    A("fair", "Science fair project", "sci", ["frank"], "lessons", 24, "2026-11-02", "2026-12-18", 20),
    // Music all year; art starts mid-year.
    A("piano", "Piano practice", "music", ["frank"], "minutes", 3000, "2026-08-31", "2027-05-21"),
    A("violin", "Violin practice", "music", ["margaret"], "minutes", 2200, "2026-08-31", "2027-05-21"),
    A("drawing", "Drawing basics", "art", ["margaret"], "lessons", 30, "2027-01-11", "2027-04-30", 15),
  ],
  events: [
    { id: "coop", name: "Co-op", childIds: ["frank", "margaret"], weekdays: [2], start: "2026-09-08", end: "2027-04-27", capacityFraction: 0.5,
      subjectRules: { lit: "skip", math: "lighter", hist: "skip", sci: "skip", music: "normal", art: "skip" } },
    { id: "piano", name: "Piano lesson – Frank", childIds: ["frank"], weekdays: [5], capacityFraction: 0.25, subjectRules: { music: "skip", math: "lighter" } },
    { id: "violin", name: "Violin lesson – Margaret", childIds: ["margaret"], weekdays: [4], capacityFraction: 0.25, subjectRules: { music: "skip" } },
    { id: "swim", name: "Swim lessons – Frank", childIds: ["frank"], weekdays: [1], start: "2027-01-11", end: "2027-03-01", capacityFraction: 0.25,
      subjectRules: { sci: "lighter" } },
  ],
  blocked: [
    { id: "labor", label: "Labor Day", kind: "holiday", start: "2026-09-07", end: "2026-09-07" },
    { id: "thanks", label: "Thanksgiving break", kind: "vacation", start: "2026-11-23", end: "2026-11-27" },
    { id: "xmas", label: "Christmas break", kind: "vacation", start: "2026-12-21", end: "2027-01-01" },
    { id: "spring", label: "Spring break", kind: "vacation", start: "2027-03-15", end: "2027-03-19" },
  ],
  // The fair project's build weeks: 6 lessons a week, then the rest spreads thinner to the same end.
  overrides: ["2026-11-02", "2026-11-09", "2026-11-16"].map((weekStart) =>
    ({ assignmentId: "fair", childId: "frank", weekStart, plannedUnits: 6, mode: "keepEndDate" as const })),
  checkIns: [
    // Week of Oct 5: Frank read 6 chapters of The Hobbit, not the planned 3; it now ends a few days early.
    { assignmentId: "hobbit", childId: "frank", weekStart: "2026-10-05", position: 6, mode: "pushEndDate" },
    // Week of Oct 12: Margaret finished chapter 11 of The Secret Garden, not the planned 14; the rest gets thicker.
    { assignmentId: "garden", childId: "margaret", weekStart: "2026-10-12", position: 11, mode: "keepEndDate" },
  ],
  reviews: [
    { weekStart: "2026-10-05", status: "reviewed" },
    { weekStart: "2026-10-12", status: "reviewed" },
  ],
};
