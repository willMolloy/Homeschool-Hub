import { Assignment, RecEvent, SubjectId, Rule } from "./proto-engine";
const all = (r: Rule): Record<SubjectId, Rule> => ({ lit: r, math: r, hist: r, sci: r, music: r });
export const events: RecEvent[] = [
  { id: "coop", name: "Co-op", kids: ["frank", "margaret"], weekday: 1, portion: 0.5, rules: { lit: "skip", math: "lighter", hist: "skip", sci: "skip", music: "normal" } },
  { id: "violin", name: "Violin – Margaret", kids: ["margaret"], weekday: 3, portion: 0.25, rules: { ...all("normal"), music: "skip" } },
  { id: "piano", name: "Piano – Frank", kids: ["frank"], weekday: 4, portion: 0.25, rules: { ...all("normal"), music: "skip", math: "lighter" } },
];
export const assignments: Assignment[] = [
  { id: "aesop", title: "Aesop's Fables", subject: "lit", kids: ["frank"], unit: "pages", total: 240, start: "2026-08-31", end: "2026-10-16" },
  { id: "ti", title: "Treasure Island", subject: "lit", kids: ["frank"], unit: "pages", total: 270, start: "2026-10-19", end: "2026-11-06" },
  { id: "crusoe", title: "Robinson Crusoe", subject: "lit", kids: ["frank"], unit: "pages", total: 400, start: "2027-01-04", end: "2027-03-26" },
  { id: "garden", title: "The Secret Garden", subject: "lit", kids: ["margaret"], unit: "pages", total: 330, start: "2026-09-08", end: "2026-11-20" },
  { id: "poems", title: "Example Poetry Unit", subject: "lit", kids: ["margaret"], unit: "pages", total: 80, start: "2026-10-05", end: "2026-10-30" },
  { id: "heidi", title: "Heidi", subject: "lit", kids: ["margaret"], unit: "pages", total: 280, start: "2027-01-04", end: "2027-04-30" },
  { id: "math5", title: "Example Math 5", subject: "math", kids: ["frank"], unit: "chapters", total: 144, start: "2026-08-31", end: "2027-05-21", mpu: 30 },
  { id: "math3", title: "Example Math 3", subject: "math", kids: ["margaret"], unit: "lessons", total: 150, start: "2026-08-31", end: "2027-05-21", mpu: 30 },
  { id: "fracs", title: "Example Fractions Workbook", subject: "math", kids: ["margaret"], unit: "lessons", total: 16, start: "2026-10-05", end: "2026-10-30" },
  { id: "hist", title: "Example History Spine", subject: "hist", kids: ["frank", "margaret"], unit: "lessons", total: 140, start: "2026-09-08", end: "2027-05-14" },
  { id: "sci", title: "Example Botany", subject: "sci", kids: ["frank", "margaret"], unit: "lessons", total: 120, start: "2026-09-08", end: "2027-05-14" },
  { id: "fair", title: "Example Science Fair Project", subject: "sci", kids: ["frank"], unit: "lessons", total: 16, start: "2026-10-05", end: "2026-10-30" },
  { id: "piano", title: "Piano practice", subject: "music", kids: ["frank"], unit: "minutes", total: 1800, start: "2026-08-31", end: "2027-05-21" },
  { id: "violin", title: "Violin practice", subject: "music", kids: ["margaret"], unit: "minutes", total: 1800, start: "2026-08-31", end: "2027-05-21" },
];
