/** S16-10: the Term in review card, per log template style: exactly the fields the log tracks, in the log's words; nothing from completions; never notes. */
import { describe, expect, it } from "vitest";
import type { Child, RecordTotals, Subject } from "../src/api/types";
import { layoutCard, type CardInput, type Item } from "../src/features/review/cardLayout";
import { TEMPLATES } from "../src/features/records/logSetup";
import { buildTermReview, partCount } from "../src/features/review/termReview";

const KID: Child = { id: "c1", name: "Frank", color: "#2f6fb0", sortOrder: 0, archived: false };
const SUBJECTS = [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false, icon: "book" }, { id: "math", name: "Math", color: null, sortOrder: 1, archived: false, icon: "calculator" }] as Subject[];
const measure: CardInput["measure"] = (t, size) => t.length * size * 0.5;
const totals: RecordTotals = { from: "a", to: "b", childId: "c1", entries: 5, schoolDays: 60, totalMinutes: 3600, coreMinutes: 2400, nonCoreMinutes: 1200, homeMinutes: 3000, awayMinutes: 600,
  books: ["Treasure Island", "Heidi"], bySubject: [{ subjectId: "lit", minutes: 2700 }, { subjectId: "math", minutes: 900 }] };
const card = (title: string) => {
  const fields = TEMPLATES.find((t) => t.title === title)!.fields;
  const review = buildTermReview({ child: KID, range: { start: "2026-08-31", end: "2026-12-31" }, subjects: SUBJECTS, fields, totals });
  const layout = layoutCard({ review, rangeLabel: "Fall", isYear: false, subjects: SUBJECTS, theme: "light", measure });
  return { layout, text: layout.items.flatMap((i: Item) => (i.k === "text" ? [i.text] : [])).join(" | ") };
};
const parts = (text: string) => ({
  days: /\| 60 \|/.test(` | ${text} | `) && /\| (school|school days) \|/.test(` | ${text} | `), subjects: text.includes("TIME BY SUBJECT"), books: text.includes("BOOKS READ"), core: text.includes("core hours"),
  total: text.includes("in total"), home: text.includes("hours at home"), finished: /finished|FINISHED/.test(text), notes: /note/i.test(text),
});

describe("the card for each template style", () => {
  it("Hours by subject: the bars, with the total on them", () => {
    const { text, layout } = card("Hours by subject");
    expect(parts(text)).toMatchObject({ days: false, subjects: true, books: false, core: false, total: false, home: false });
    expect(text).toContain("60 h in all");
    expect([layout.width, layout.height]).toEqual([1080, 1350]);
  });
  it("Core and non-core hours: the two numbers and the bars", () => {
    const { text } = card("Core and non-core hours");
    expect(parts(text)).toMatchObject({ days: false, subjects: true, books: false, core: true, total: false, home: false });
    expect(text).toContain("non-core hours");
  });
  it("Days attended: school days only, as the hero", () => {
    const { text, layout } = card("Days attended");
    expect(parts(text)).toMatchObject({ days: true, subjects: false, books: false, core: false, total: false });
    expect(layout.roomy).toBe(true);
  });
  it("Days and hours: school days and the total, as two tiles", () => {
    const { text, layout } = card("Days and hours");
    expect(parts(text)).toMatchObject({ days: true, total: true, subjects: false, books: false, core: false });
    expect(layout.roomy).toBe(false);
  });
  it("Detailed log: the bars and the books read; notes are tracked but never on the card", () => {
    const { text } = card("Detailed log");
    expect(parts(text)).toMatchObject({ days: false, subjects: true, books: true, core: false, notes: false });
    expect(text).toContain("Treasure Island");
  });
  it("none of them carries anything from completions", () => {
    for (const t of TEMPLATES) expect(parts(card(t.title).text).finished).toBe(false);
  });
  it("nothing logged: no card parts at all (the page says one calm line)", () => {
    const fields = TEMPLATES[4]!.fields;
    const r = buildTermReview({ child: KID, range: { start: "a", end: "b" }, subjects: SUBJECTS, fields, totals: { ...totals, schoolDays: 0, totalMinutes: 0, bySubject: [], books: [], coreMinutes: 0, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0 } });
    expect(partCount(r)).toBe(0);
  });
});
