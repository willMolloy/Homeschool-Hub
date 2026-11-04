/** S12-02: the one rule for "waiting for an answer", the oldest end first, and the question's words. */
import { describe, expect, it } from "vitest";
import type { Assignment, Child } from "../src/api/types";
import { DEMO_FAMILY } from "../../../db/demo-family";
import { isWaiting, joinNames, todayOf, waitingQuestions } from "../src/features/completion/waiting";

const kid = (id: string, name: string, sortOrder: number, archived = false): Child => ({ id, name, color: null, sortOrder, archived });
const KIDS = [kid("c1", "Frank", 0), kid("c2", "Margaret", 1), kid("c3", "Leo", 2), kid("c4", "Old", 3, true)];
const book = (over: Partial<Assignment>): Assignment => ({
  id: "a1", subjectId: "s1", title: "Treasure Island", unitType: "pages", totalUnits: 100, weightPerUnit: null,
  startDate: "2026-10-01", endDate: "2026-10-30", childIds: ["c1"], archived: false, weekdays: null, endedAs: null, endedOn: null, ...over,
});
const TODAY = "2026-11-04";

describe("isWaiting (S12-02)", () => {
  it("waits once the end is before today, not on the end day itself", () => {
    expect(isWaiting(book({ endDate: "2026-11-03" }), TODAY)).toBe(true); // yesterday
    expect(isWaiting(book({ endDate: "2026-11-04" }), TODAY)).toBe(false); // today
    expect(isWaiting(book({ endDate: "2026-11-05" }), TODAY)).toBe(false);
  });
  it("never for an archived assignment", () => {
    expect(isWaiting(book({ archived: true }), TODAY)).toBe(false);
  });
  it("never once the parent has answered, either way", () => {
    expect(isWaiting(book({ endedAs: "finished", endedOn: "2026-10-30" }), TODAY)).toBe(false);
    expect(isWaiting(book({ endedAs: "stopped", endedOn: "2026-10-20" }), TODAY)).toBe(false);
  });
  it("reads an older answer with no ended fields as open", () => {
    const old = book({}) as Partial<Assignment>;
    delete old.endedAs;
    delete old.endedOn;
    expect(isWaiting(old as Assignment, TODAY)).toBe(true);
  });
  it("stops waiting when the end is moved later, and waits again when the new end passes", () => {
    const moved = book({ endDate: "2026-11-20" });
    expect(isWaiting(moved, TODAY)).toBe(false);
    expect(isWaiting(moved, "2026-11-21")).toBe(true);
  });
  it("follows the family's day, not the device's: me.today decides (a family ahead of the device is already past the end)", () => {
    expect(todayOf({ today: "2026-11-04" })).toBe("2026-11-04");
    // 23:30 on Nov 3 in Chicago is already Nov 4 in London; the API's today for the family is the one used.
    expect(isWaiting(book({ endDate: "2026-11-03" }), todayOf({ today: "2026-11-03" }))).toBe(false);
    expect(isWaiting(book({ endDate: "2026-11-03" }), todayOf({ today: "2026-11-04" }))).toBe(true);
  });
  it("falls back to the device's day when me.today is not a date", () => {
    expect(todayOf({ today: "" })).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("joinNames (S12-02)", () => {
  it("joins in plain English", () => {
    expect(joinNames(["Frank"])).toBe("Frank");
    expect(joinNames(["Frank", "Margaret"])).toBe("Frank and Margaret");
    expect(joinNames(["Frank", "Margaret", "Leo"])).toBe("Frank, Margaret and Leo");
    expect(joinNames([])).toBe("");
  });
});

describe("waitingQuestions (S12-02)", () => {
  it("lists the waiting ones, oldest end first, one question each naming every child", () => {
    const list = waitingQuestions([
      book({ id: "b", title: "History spine", endDate: "2026-10-30", childIds: ["c2", "c1"] }),
      book({ id: "a", title: "Treasure Island", endDate: "2026-10-26", childIds: ["c1"] }),
      book({ id: "c", title: "Fractions", endDate: "2026-10-30", childIds: ["c1", "c2", "c3"] }),
      book({ id: "d", title: "Not yet", endDate: "2026-12-01" }),
      book({ id: "e", title: "Dropped", endDate: "2026-10-01", archived: true }),
      book({ id: "f", title: "Answered", endDate: "2026-10-01", endedAs: "finished", endedOn: "2026-10-01" }),
    ], KIDS, TODAY);
    expect(list.map((q) => q.text)).toEqual([
      "Did Frank finish Treasure Island?",
      "Did Frank, Margaret and Leo finish Fractions?", // same end as History spine: by title
      "Did Frank and Margaret finish History spine?", // names in roster order, not the order the assignment lists them
    ]);
  });
  it("leaves an archived child out of the names, and an assignment nobody active is on", () => {
    const list = waitingQuestions([
      book({ id: "a", title: "Latin", childIds: ["c1", "c4"] }),
      book({ id: "b", title: "Ghost", childIds: ["c4"] }),
    ], KIDS, TODAY);
    expect(list.map((q) => q.text)).toEqual(["Did Frank finish Latin?"]);
  });
  it("is empty when nothing is waiting", () => {
    expect(waitingQuestions([book({ endDate: "2026-12-01" })], KIDS, TODAY)).toEqual([]);
    expect(waitingQuestions([], KIDS, TODAY)).toEqual([]);
  });
});

describe("the demo family (S12-02, S12-07)", () => {
  it("has exactly one question on Nov 4, 2026: the poems that ended last week and were never answered", () => {
    const assignments = DEMO_FAMILY.assignments.map((a): Assignment => ({
      id: a.id, subjectId: a.subjectId, title: a.title ?? a.id, unitType: a.unitType, totalUnits: a.totalUnits, weightPerUnit: a.weightPerUnit ?? null,
      startDate: a.start, endDate: a.end, childIds: a.childIds, archived: false, weekdays: null, endedAs: a.endedAs ?? null, endedOn: a.endedOn ?? null,
    }));
    const kids = DEMO_FAMILY.children.map((c, i): Child => ({ id: c.key, name: c.name, color: c.color, sortOrder: i, archived: false }));
    expect(waitingQuestions(assignments, kids, "2026-11-04").map((q) => q.text)).toEqual(["Did Margaret finish A Child's Garden of Verses?"]);
    // The older books were answered; nothing else has ended yet.
    expect(assignments.filter((a) => a.endedAs).map((a) => a.id).sort()).toEqual(["aesop", "tables", "ti"]);
  });
});
