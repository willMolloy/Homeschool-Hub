/** S15-06: a day's range is in whole chapters, lessons or pages; each unit belongs to one day; display only. */
import { describe, expect, it } from "vitest";
import { rangeWords } from "../src/features/week/weekBars";

/** The days' ranges for a book of `total` units at `perDay`, walking the exact cumulative positions the plan gives. */
function days(unitType: "chapters" | "pages" | "lessons", perDay: number, total: number, n: number): string[] {
  const out: string[] = [];
  let pos = 0;
  for (let i = 0; i < n; i++) {
    const end = Math.min(total, pos + perDay);
    out.push(rangeWords(unitType, pos, end, total));
    pos = end;
  }
  return out;
}
const lastOf = (s: string) => Number(s.match(/\d+/g)!.pop());
const firstOf = (s: string) => Number(s.match(/\d+/g)![0]);

describe("whole-unit day ranges", () => {
  it("1.3 chapters a day: no chapter on two days, ends on the last chapter", () => {
    const r = days("chapters", 1.3, 13, 10);
    expect(r).toEqual(["chapter 1", "chapters 2–3", "chapter 4", "chapter 5", "chapters 6–7", "chapter 8", "chapter 9", "chapter 10", "chapters 11–12", "chapter 13"]);
    for (let i = 1; i < 10; i++) expect(firstOf(r[i]!)).toBe(lastOf(r[i - 1]!) + 1);
    expect(lastOf(r[9]!)).toBe(13);
  });
  it("exactly one a day is one each day", () => {
    expect(days("lessons", 1, 4, 4)).toEqual(["lesson 1", "lesson 2", "lesson 3", "lesson 4"]);
  });
  it("0.4 a day says where in the chapter each day is (S16-08 replaced \"Keep going\")", () => {
    expect(days("chapters", 0.4, 2, 5)).toEqual(["Chapter 1 · start", "Chapter 1 · day 2 of 3", "Chapter 1 · finish", "Chapter 2 · day 2 of 3", "Chapter 2 · finish"]);
  });
  it("3.7 pages a day: ranges never overlap and the last day lands on the total", () => {
    const r = days("pages", 3.7, 37, 10);
    for (let i = 1; i < r.length; i++) expect(firstOf(r[i]!)).toBe(lastOf(r[i - 1]!) + 1);
    expect(lastOf(r[9]!)).toBe(37);
  });
  it("a week's range uses the same rule, so the week and its days agree", () => {
    expect(rangeWords("chapters", 1.3, 6.5, 13)).toBe("chapters 2–7");
    expect(rangeWords("chapters", 6.5, 7.8, 13)).toBe("chapter 8");
  });
  it("minutes are unchanged", () => {
    expect(rangeWords("minutes" as never, 600, 750)).toBe("150 minutes");
  });
});
