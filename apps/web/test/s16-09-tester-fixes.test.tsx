/** S16-09: the Sprint 16 tester's fixes (N2 range never cut, N3 no zero, N4 one finished list, N5 print summary). N1 is the smoke scenario. */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent } from "@testing-library/react";
import type { Assignment, Child, FamilySettings, LogFields, RecordEntry, RecordTotals, Subject } from "../src/api/types";
import { NO_FIELDS } from "../src/features/records/logSetup";
import { fakeApi } from "./helpers/fake-api";
import { withCovered } from "./helpers/recordEntry";
import { renderAt } from "./render";

const KIDS: Child[] = [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }, { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false }];
const SUBJECTS = [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null }, { id: "math", name: "Math", color: null, sortOrder: 1, archived: false, defaultWeight: null, defaultWeekdays: null }] as Subject[];
const A = (over: Partial<Assignment>): Assignment => ({ id: "a", subjectId: "lit", title: "Book", unitType: "pages", totalUnits: 200, weightPerUnit: null, startDate: "2026-09-01", endDate: "2026-10-30", childIds: ["c1"], archived: false, weekdays: null, endedAs: "finished", endedOn: "2026-10-30", ...over }) as Assignment;
const ASSIGNMENTS: Assignment[] = [
  A({ id: "ti", title: "Treasure Island", endedOn: "2026-10-02" }),
  A({ id: "hobbit", title: "The Hobbit", unitType: "chapters", endedOn: "2026-11-13" }),
  A({ id: "garden", title: "The Secret Garden", unitType: "chapters", childIds: ["c2"], endedOn: "2026-10-30" }),
  A({ id: "times", title: "Times tables", subjectId: "math", unitType: "lessons", childIds: ["c2"], endedOn: "2026-10-30" }), // not a reading unit
  A({ id: "stopped", title: "Stopped book", endedAs: "stopped" }),
  A({ id: "open", title: "Still reading", endedAs: null, endedOn: null }),
  A({ id: "old", title: "Last year's book", endedOn: "2025-05-01" }),
  A({ id: "year", title: "Math 5", subjectId: "math", unitType: "lessons", startDate: "2026-08-31", endDate: "2027-05-28", endedAs: null, endedOn: null }), // sets the school year
  A({ id: "arch", title: "Archived book", archived: true }),
];
const ALLF: LogFields = { ...NO_FIELDS, schoolDays: true, subjectHours: true, books: true };
const e = (over: Partial<RecordEntry>): RecordEntry => withCovered({ id: "e", childId: "c1", startDate: "2026-11-02", endDate: "2026-11-06", countsSchoolDay: true, schoolDays: 5, subjectMinutes: { lit: 60 }, totalMinutes: null, homeMinutes: null, awayMinutes: null, notes: null, books: [], ...over });
const ENTRIES = [
  e({ id: "1", books: ["Heidi", "treasure island"] }),
  e({ id: "2", startDate: "2026-11-09", endDate: "2026-11-10", schoolDays: 2, books: [" Heidi "] }),
  e({ id: "3", childId: "c2", startDate: "2026-11-02", endDate: "2026-11-04", schoolDays: 3, books: ["Pagoo"] }),
  e({ id: "4", childId: "c2", startDate: "2026-11-03", endDate: "2026-11-03", schoolDays: 1 }), // a day Margaret already has
];
const totals = (q: URLSearchParams): RecordTotals => ({ from: q.get("from"), to: q.get("to"), childId: q.get("childId"), entries: 4, schoolDays: 8, totalMinutes: 60, coreMinutes: 0, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0,
  books: q.get("childId") === "c2" ? ["Pagoo"] : ["Heidi", "treasure island", "Pagoo"], bySubject: [{ subjectId: "lit", minutes: 60 }] });
const family = (fields: LogFields): FamilySettings => ({ name: "F", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false, zoomViews: { hidden: [], custom: [] }, logSetup: { template: "custom", fields } } as FamilySettings);

function stub(fields: LogFields = ALLF, assignments = ASSIGNMENTS) {
  fakeApi.on("GET /api/family", 200, family(fields));
  fakeApi.on("GET /api/subjects", 200, SUBJECTS);
  fakeApi.on("GET /api/children", 200, KIDS);
  fakeApi.on("GET /api/assignments", 200, assignments);
  fakeApi.on("GET /api/log-entries", 200, ENTRIES);
  fakeApi.on("GET /api/records/totals", (_b, _p, q) => [200, totals(q)]);
}
beforeEach(() => { localStorage.clear(); stub(); });


describe("N2: a Days line never cuts its range", () => {
  const css = readFileSync("src/features/week/week.css", "utf8");
  const rule = (sel: string) => new RegExp(`(^|\\n)${sel.replace(/\./g, "\\.")} \\{([^}]*)\\}`).exec(css)![2]!;
  it("the range wraps instead of ending in an ellipsis; the title is the part that truncates", () => {
    const range = rule(".day-range");
    expect(range).not.toMatch(/text-overflow|overflow:\s*hidden|max-width:\s*45%/);
    expect(range).toMatch(/white-space:\s*normal/);
    const title = rule(".day-title");
    expect(title).toMatch(/text-overflow:\s*ellipsis/);
    expect(rule(".day-line")).toMatch(/flex-wrap:\s*wrap/); // a range with no room beside the title drops under it
  });
});

describe("N3: a single child with nothing logged shows a dash for school days", () => {
  it("Records for Margaret with no entries in the range", async () => {
    fakeApi.on("GET /api/records/totals", (_b, _p, q) => [200, { ...totals(q), schoolDays: q.get("childId") === "c2" ? 0 : 8, entries: q.get("childId") === "c2" ? 0 : 4, books: [], bySubject: [] }]);
    const user = userEvent.setup();
    renderAt("/records");
    await screen.findByRole("group", { name: "Totals" });
    await user.click(screen.getByRole("button", { name: "Margaret" }));
    const nums = within(await screen.findByRole("group", { name: "Totals" }));
    await waitFor(() => expect(nums.queryByText("Margaret —")).toBeNull());
    const card = nums.getByText("school days").closest(".big-number")!;
    expect(card.querySelector("strong")!.textContent).toBe("—");
    expect(card.textContent).not.toMatch(/\b0\b/);
  });
});

describe("N5: the print summary", () => {
  async function printed(mode: "Each entry" | "Totals") {
    const user = userEvent.setup();
    window.print = vi.fn();
    renderAt("/records");
    await user.click(await screen.findByRole("button", { name: "Export" }));
    const form = within(await screen.findByRole("dialog"));
    if (mode === "Totals") await user.click(form.getByRole("button", { name: "Totals" }));
    await user.click(form.getByRole("button", { name: "Print summary" }));
    await waitFor(() => expect(window.print).toHaveBeenCalled());
    const pages = [...document.querySelectorAll(".print-summary .print-page")];
    fireEvent(window, new Event("afterprint"));
    return pages.map((p) => ({ name: p.querySelector("h1")!.textContent, text: p.textContent! }));
  }
  it("shows Books finished in the default Each entry mode, as in Totals", async () => {
    const each = await printed("Each entry");
    expect(each[0]!.name).toBe("Frank");
    expect(each[0]!.text).toContain("Books finished");
    expect(each[0]!.text).toContain("Treasure Island; The Hobbit");
    expect(each[1]!.text).toContain("The Secret Garden");
  });
  it("shows it in Totals too", async () => {
    const totalsMode = await printed("Totals");
    expect(totalsMode[0]!.text).toContain("Treasure Island; The Hobbit");
  });
  it("leaves out Books read when a child has no typed books, never 'None'", async () => {
    fakeApi.on("GET /api/log-entries", 200, ENTRIES.map((x) => ({ ...x, books: x.childId === "c2" ? [] : x.books })));
    const pages = await printed("Each entry");
    expect(pages[0]!.text).toContain("Books read");
    expect(pages[1]!.text).not.toMatch(/Books read|None/);
  });
});
