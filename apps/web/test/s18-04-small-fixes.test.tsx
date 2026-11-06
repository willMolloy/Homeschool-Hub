/** S18-04: the small fixes from the second end-to-end run (E4 to E13). Each is pinned here; E8 lives in timeline-add and s10-16. */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { planAll, type Assignment as EngineAssignment, type BlockedPeriod } from "@hh/engine";
import type { Assignment, BlockedRange, Child, FamilySettings, LogFields, RecordEntry, RecordTotals, ScheduleEvent, Subject } from "../src/api/types";
import { endedTitle } from "../src/features/completion/CompletionQuestions";
import { WEEK_START_LOCKED_HINT } from "../src/features/schedule/FamilySettingsPage";
import { identicalEntry } from "../src/features/records/LogEntryForm";
import { NO_FIELDS } from "../src/features/records/logSetup";
import { duplicateNote, repeatsOfEarlier } from "../src/features/schedule/RowChecks";
import { paceWarning } from "../src/features/schedule/effort";
import { makeLookups } from "../src/features/schedule/lookups";
import { buildSheet, type SheetLookups } from "../src/features/print/sheetModel";
import { buildDays, eventLineOn } from "../src/features/week/daysModel";
import { daySpanLabels } from "../src/features/week/weekBars";
import { clearSetupLater } from "../src/features/welcome/setupLater";
import { fakeApi } from "./helpers/fake-api";
import { newFamily } from "./helpers/setup-flow";
import { withCovered } from "./helpers/recordEntry";
import { renderAt } from "./render";

const posts = (path: string) => fakeApi.calls.filter((c) => c.method === "POST" && c.path === path);

describe("E4: setup step 2 can rename and remove a child, and asks about a repeated name", () => {
  beforeEach(() => { clearSetupLater(); sessionStorage.clear(); });
  const atChildren = () => {
    const f = newFamily({ setupStep: 2 });
    fakeApi.on("PATCH /api/children/c1", (body) => {
      const c = f.children.find((x) => x.id === "c1")!;
      Object.assign(c, body as object);
      return [200, { ...c }];
    });
    renderAt("/welcome");
    return f;
  };

  it("each child has Rename and Remove; Rename changes the name, Remove takes the child out of the list (and archives it)", async () => {
    const f = atChildren();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Child's name"), "Mina");
    await user.click(screen.getByRole("button", { name: "Add another" }));
    const list = within(await screen.findByRole("list", { name: "Your children" }));
    await list.findByText("Mina");
    await user.click(list.getByRole("button", { name: "Rename Mina" }));
    const box = await screen.findByLabelText("New name for Mina");
    await user.clear(box);
    await user.type(box, "Mia");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await within(screen.getByRole("list", { name: "Your children" })).findByText("Mia");
    expect(f.children[0]!.name).toBe("Mia");
    await user.click(within(screen.getByRole("list", { name: "Your children" })).getByRole("button", { name: "Remove Mia" }));
    await waitFor(() => expect(within(screen.getByRole("list", { name: "Your children" })).queryByText("Mia")).toBeNull());
    expect(f.children[0]!.archived).toBe(true);
    // 44 px targets are the .btn rule's min-height
    expect(readFileSync("src/ui/forms.css", "utf8")).toMatch(/\.btn \{[^}]*min-height: 44px/);
  });

  it("typing a name that is already there asks 'Add another child named Clara?' once; Yes adds it, No does not", async () => {
    atChildren();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Child's name"), "Clara");
    await user.click(screen.getByRole("button", { name: "Add another" }));
    await within(await screen.findByRole("list", { name: "Your children" })).findByText("Clara");
    const box = screen.getByLabelText("Another child's name");
    await user.type(box, " clara ");
    await user.click(screen.getByRole("button", { name: "Add another" }));
    expect(await screen.findByText("Add another child named clara?")).toBeInTheDocument();
    expect(posts("/api/children")).toHaveLength(1); // nothing sent yet
    await user.click(screen.getByRole("button", { name: "No" }));
    expect(screen.queryByText(/Add another child named/)).toBeNull();
    expect(posts("/api/children")).toHaveLength(1);
    await user.type(screen.getByLabelText("Another child's name"), "Clara");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Add another child named Clara?");
    await user.click(screen.getByRole("button", { name: "Yes, add Clara" }));
    await waitFor(() => expect(posts("/api/children")).toHaveLength(2));
  });
});

describe("E5: the ended title is singular for one", () => {
  it("1 assignment ended, 2 assignments ended", () => {
    expect(endedTitle(1)).toBe("1 assignment ended");
    expect(endedTitle(2)).toBe("2 assignments ended");
    expect(endedTitle(3)).toBe("3 assignments ended");
  });
});

describe("E6: the week-start note says what locks it", () => {
  it("names Update status, not a check-in", () => {
    expect(WEEK_START_LOCKED_HINT).toBe("Can't change once you've used Update status.");
    expect(WEEK_START_LOCKED_HINT).not.toMatch(/check/i);
  });
});

const KIDS: Child[] = [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }, { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false }];
const SUBJECTS = [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null }, { id: "math", name: "Math", color: null, sortOrder: 1, archived: false, defaultWeight: null, defaultWeekdays: null }] as Subject[];
const entry = (over: Partial<RecordEntry> = {}): RecordEntry => withCovered({ id: "e1", childId: "c1", startDate: "2026-11-02", endDate: "2026-11-06", countsSchoolDay: true, schoolDays: 5, subjectMinutes: { math: 210 }, totalMinutes: null, homeMinutes: null, awayMinutes: null, notes: null, books: [], ...over });

describe("E7: a new log entry is undoable, and an identical one asks first", () => {
  it("identicalEntry (pure): same child, dates, switch and typed values; a different child, day or amount is not", () => {
    const body = { startDate: "2026-11-02", endDate: "2026-11-06", countsSchoolDay: true, subjectMinutes: { math: 210 }, notes: null, books: [] };
    expect(identicalEntry([entry()], "c1", body)).toBeDefined();
    expect(identicalEntry([entry()], "c2", body)).toBeUndefined();
    expect(identicalEntry([entry()], "c1", { ...body, endDate: "2026-11-05" })).toBeUndefined();
    expect(identicalEntry([entry()], "c1", { ...body, subjectMinutes: { math: 180 } })).toBeUndefined();
    expect(identicalEntry([entry({ notes: "x" })], "c1", body)).toBeUndefined();
    expect(identicalEntry([entry()], "c1", { ...body, countsSchoolDay: false })).toBeUndefined();
  });

  function stubRecords(entries: RecordEntry[]) {
    const fields: LogFields = { ...NO_FIELDS, schoolDays: true, subjectHours: true };
    fakeApi.on("GET /api/family", 200, { name: "F", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false, zoomViews: { hidden: [], custom: [] }, logSetup: { template: "custom", fields } } as FamilySettings);
    fakeApi.on("GET /api/subjects", 200, SUBJECTS);
    fakeApi.on("GET /api/children", 200, KIDS);
    fakeApi.on("GET /api/assignments", 200, []);
    fakeApi.on("GET /api/log-entries", 200, entries);
    fakeApi.on("GET /api/records/totals", 200, { from: null, to: null, childId: null, entries: 0, schoolDays: 0, totalMinutes: 0, coreMinutes: 0, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0, books: [], bySubject: [] });
    fakeApi.on("POST /api/log-entries", 201, []);
    fakeApi.on("GET /api/undo", 200, { label: "Added Frank's log for Nov 2 to Nov 6", createdAt: "2026-10-28T15:00:00.000Z" });
  }
  async function fill(user: ReturnType<typeof userEvent.setup>) {
    renderAt("/records");
    await user.click(await screen.findByRole("button", { name: "Log" }));
    const form = within(await screen.findByRole("form", { name: "Log" }));
    fireEvent.change(form.getByLabelText("First day"), { target: { value: "2026-11-02" } });
    fireEvent.change(form.getByLabelText(/Last day/), { target: { value: "2026-11-06" } });
    await user.click(form.getByRole("button", { name: "Frank" }));
    await user.type(form.getByLabelText("Math hours"), "3");
    await user.type(form.getByLabelText("Math minutes"), "30");
    return form;
  }

  it("saving shows 'Added Frank's log for Nov 2 to Nov 6. Undo'", async () => {
    stubRecords([]);
    const user = userEvent.setup();
    const form = await fill(user);
    await user.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(posts("/api/log-entries")).toHaveLength(1));
    const bar = await screen.findByRole("status");
    expect(bar).toHaveTextContent("Added Frank's log for Nov 2 to Nov 6.");
    expect(within(bar).getByRole("button", { name: "Undo" })).toBeInTheDocument();
  });

  it("the same entry again asks 'You already logged this. Add it again?'; No sends nothing, Add it again sends it", async () => {
    stubRecords([entry()]);
    const user = userEvent.setup();
    const form = await fill(user);
    await user.click(form.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("You already logged this. Add it again?")).toBeInTheDocument();
    expect(posts("/api/log-entries")).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "No" }));
    expect(screen.queryByText("You already logged this. Add it again?")).toBeNull();
    expect(posts("/api/log-entries")).toHaveLength(0);
    await user.click(form.getByRole("button", { name: "Save" }));
    await user.click(await screen.findByRole("button", { name: "Add it again" }));
    await waitFor(() => expect(posts("/api/log-entries")).toHaveLength(1));
  });

  it("a different amount for the same days is not a duplicate", async () => {
    stubRecords([entry({ subjectMinutes: { math: 60 } })]);
    const user = userEvent.setup();
    const form = await fill(user);
    await user.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(posts("/api/log-entries")).toHaveLength(1));
    expect(screen.queryByText("You already logged this. Add it again?")).toBeNull();
  });
});

describe("E9: Add several and CSV import give the single form's pace warning, and flag repeats", () => {
  it("paceWarning (pure): units first, then more than two hours a day, else nothing", () => {
    expect(paceWarning(300, "pages", 50)).toBe("That's about 300 pages a day. Is that right?");
    expect(paceWarning(3.7, "lessons", 165)).toBe("That's about 165 min a day. Is that right?");
    expect(paceWarning(3.7, "lessons", 60)).toBeNull();
    expect(paceWarning(null, "lessons", null)).toBeNull();
    expect(paceWarning(10, "lessons", 400)).toBe("That's about 10 lessons a day. Is that right?");
  });

  const have = (over: Partial<Assignment>): Assignment => ({ id: "h", subjectId: "math", title: "Math 3", unitType: "lessons", totalUnits: 100, weightPerUnit: null, startDate: "2026-09-01", endDate: "2026-12-18", childIds: ["c1"], archived: false, weekdays: null, ...over }) as Assignment;
  const l = makeLookups(KIDS, SUBJECTS);
  const row = { subjectId: "math", title: " math 3 ", childIds: ["c1"], unitType: "lessons" as const, totalUnits: 110, startDate: "2026-11-09", endDate: "2026-12-18" };
  it("duplicateNote (pure): a title the family has for one of these children, or an earlier row; archived and other children's do not count", () => {
    expect(duplicateNote(l, [have({})], row, 0, (n) => `row ${n}`)).toBe("You already have Math 3 for Frank. It would be added again.");
    expect(duplicateNote(l, [have({ archived: true })], row, 0, (n) => `row ${n}`)).toBeNull();
    expect(duplicateNote(l, [have({ childIds: ["c2"] })], row, 0, (n) => `row ${n}`)).toBeNull();
    expect(duplicateNote(l, [have({ subjectId: "lit" })], row, 0, (n) => `row ${n}`)).toBeNull();
    expect(duplicateNote(l, [], row, 2, (n) => `row ${n}`)).toBe("Same title as row 2. It would be added twice.");
    expect(repeatsOfEarlier([row, { ...row, title: "Reading" }, { ...row, title: "MATH 3" }])).toEqual([0, 0, 1]);
  });

  async function stubSchedule() {
    fakeApi.on("GET /api/children", 200, KIDS);
    fakeApi.on("GET /api/subjects", 200, SUBJECTS);
    fakeApi.on("GET /api/assignments", 200, [have({})]);
    fakeApi.on("GET /api/blocked-ranges", 200, []);
    fakeApi.on("POST /api/plan/pace", (b) => [200, { paces: (b as { drafts: unknown[] }).drafts.map(() => ({ capacityDays: 25, perChild: [{ childId: "c1", capacityDays: 25 }] })) }]);
  }
  it("CSV import: a row of 110 lessons in 25 school days (about 130 min a day) is warned about, and a row the family already has is flagged; Import still works", async () => {
    await stubSchedule();
    fakeApi.on("POST /api/assignments/bulk", 201, [have({ id: "n" })]);
    const user = userEvent.setup();
    renderAt("/schedule/assignments");
    await user.click(await screen.findByRole("button", { name: /Import CSV/ }));
    const form = await screen.findByRole("form", { name: "Import assignments from a CSV" });
    const csv = "subject,title,children,unit,total,start,end\nMath,Math 3,Frank,lessons,110,2026-11-09,2026-12-18\nLiterature,Heidi,Frank,pages,200,2026-11-09,2026-12-18\n";
    fireEvent.change(within(form).getByLabelText("Or paste it here"), { target: { value: csv } });
    const list = within(await within(form).findByRole("list", { name: "To import" }));
    await waitFor(() => expect(list.getByText(/That's about \d+ min a day\. Is that right\?/)).toBeInTheDocument());
    expect(list.getByText("You already have Math 3 for Frank. It would be added again.")).toBeInTheDocument();
    expect(within(form).getByText(/1 of these looks like one you already have/)).toBeInTheDocument();
    const import_ = within(form).getByRole("button", { name: "Import" });
    expect(import_).toBeEnabled();
    await user.click(import_);
    await waitFor(() => expect(posts("/api/assignments/bulk")).toHaveLength(1));
  });

  it("Add several: a row's pace note and a repeated row's note show under the row, and Save is not blocked", async () => {
    await stubSchedule();
    const user = userEvent.setup();
    renderAt("/schedule/assignments");
    await user.click(await screen.findByRole("button", { name: /Add several/ }));
    const form = within(await screen.findByRole("form", { name: "Add several assignments" }));
    await user.selectOptions(form.getByLabelText("Subject"), "math");
    await user.click(form.getByLabelText("Frank"));
    fireEvent.change(form.getByLabelText("Start"), { target: { value: "2026-11-09" } });
    fireEvent.change(form.getByLabelText("End"), { target: { value: "2026-12-18" } });
    const row1 = within(form.getByRole("group", { name: "Row 1" }));
    await user.type(row1.getByLabelText("Title"), "Math 3");
    await user.type(row1.getByLabelText("Total"), "110");
    await waitFor(() => expect(row1.getByText(/That's about \d+ min a day\. Is that right\?/)).toBeInTheDocument());
    expect(row1.getByText("You already have Math 3 for Frank. It would be added again.")).toBeInTheDocument();
    const row2 = within(form.getByRole("group", { name: "Row 2" }));
    await user.type(row2.getByLabelText("Title"), "math 3");
    await user.type(row2.getByLabelText("Total"), "5");
    expect(await row2.findByText(/Same title as row 1/)).toBeInTheDocument();
    expect(form.getByRole("button", { name: "Save" })).toBeEnabled();
  });
});

describe("E10: Days names the day's events; the range words are lower case", () => {
  const ev = (over: Partial<ScheduleEvent>): ScheduleEvent => ({ id: "e", name: "Co-op Friday (fall)", weekdays: [5], startDate: "2026-09-04", endDate: "2026-12-11", capacityFraction: 0.5, defaultRule: null, subjectRules: [], childIds: [], archived: false, ...over }) as ScheduleEvent;
  it("eventLineOn (pure): 'Fri · Co-op Friday (fall)' on a day it meets, inside its dates, for a child shown; nothing otherwise", () => {
    const kids = new Set(["c1"]);
    expect(eventLineOn([ev({})], "2026-11-06", kids)).toBe("Fri · Co-op Friday (fall)");
    expect(eventLineOn([ev({})], "2026-11-05", kids)).toBeNull(); // Thursday
    expect(eventLineOn([ev({})], "2026-12-18", kids)).toBeNull(); // after its end
    expect(eventLineOn([ev({ archived: true })], "2026-11-06", kids)).toBeNull();
    expect(eventLineOn([ev({ childIds: ["c2"] })], "2026-11-06", kids)).toBeNull();
    expect(eventLineOn([ev({ childIds: ["c1"] }), ev({ id: "f", name: "Piano" })], "2026-11-06", kids)).toBe("Fri · Co-op Friday (fall), Piano");
  });
  it("span words are lower case everywhere: 'chapter 17 · start', 'lesson 26 · start', 'chapter 3 · finish'", () => {
    const days = [0.6, 0.4, 0.5].map((units, i) => ({ date: `2026-11-0${2 + i}`, units, position: [15.6, 16, 16.5][i]!, capacity: 1, schoolDay: true, thickness: 1, kind: "planned" as const }));
    const labels = [...daySpanLabels({ days, unitType: "chapters", totalUnits: 40, endedOn: undefined } as never).values()];
    expect(labels).toEqual(["chapter 16 · start", "chapter 16 · finish", "chapter 17 · start"]);
    for (const text of labels) expect(text).toBe(text.toLowerCase());
    const lessons = [...daySpanLabels({ days: [{ ...days[0]!, units: 0.5, position: 25.5 }], unitType: "lessons", totalUnits: 40, endedOn: undefined } as never).values()];
    expect(lessons).toEqual(["lesson 26 · start"]);
  });
});

describe("E11: a child whose assignments run Tuesday to Friday has no Monday lines on Days or the sheet", () => {
  const WREN: Child = { id: "w", name: "Wren", color: null, sortOrder: 0, archived: false };
  const E: EngineAssignment[] = [
    { id: "math", subjectId: "math", childIds: ["w"], unitType: "lessons", totalUnits: 100, start: "2026-09-01", end: "2026-12-18", weekdays: [2, 3, 4, 5] as never },
    { id: "luke", subjectId: "lit", childIds: ["w"], unitType: "chapters", totalUnits: 24, start: "2026-09-01", end: "2026-12-18", weekdays: [2, 3, 4, 5] as never },
  ];
  const plans = planAll(E, { calendar: { weekStart: "mon", schoolDays: [1, 2, 3, 4, 5] as never }, blocked: [] as BlockedPeriod[], asOf: "2026-11-02" });
  const look: SheetLookups = { children: [WREN], subjects: SUBJECTS, titleOf: (id) => id, subjectOf: (id) => (id === "math" ? "math" : "lit"), slotOfAssignment: () => 1 };
  it("Days: Monday Nov 2 has nothing for her, Tuesday has both; the sheet agrees", () => {
    const days = buildDays([WREN], plans, "2026-11-02", look, [] as BlockedRange[], [1, 2, 3, 4, 5], false);
    expect(days[0]!.heading).toBe("Mon, Nov 2");
    expect(days[0]!.lines).toEqual([]);
    expect(days[1]!.lines.map((x) => x.assignmentId).sort()).toEqual(["luke", "math"]);
    const sheet = buildSheet(WREN, plans, "2026-11-02", "2026-11-08", look, [], [1, 2, 3, 4, 5]);
    const monday = sheet.subjects.flatMap((s) => s.assignments).flatMap((a) => a.rows).filter((r) => r.day === "Mon");
    expect(monday).toEqual([]);
  });
});

describe("E12: Records opens on All children, with its own remembered choice", () => {
  const FIELDS: LogFields = { ...NO_FIELDS, schoolDays: true, books: true };
  function stub() {
    fakeApi.on("GET /api/family", 200, { name: "F", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false, zoomViews: { hidden: [], custom: [] }, logSetup: { template: "custom", fields: FIELDS } } as FamilySettings);
    fakeApi.on("GET /api/subjects", 200, SUBJECTS);
    fakeApi.on("GET /api/children", 200, KIDS);
    fakeApi.on("GET /api/assignments", 200, []);
    fakeApi.on("GET /api/log-entries", 200, [entry({ id: "x", childId: "c1" })]);
    fakeApi.on("GET /api/records/totals", (_b, _p, q) => [200, { from: q.get("from"), to: q.get("to"), childId: q.get("childId"), entries: 0, schoolDays: 0, totalMinutes: 0, coreMinutes: 0, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0, books: [], bySubject: [] } satisfies RecordTotals]);
  }
  beforeEach(() => { localStorage.clear(); stub(); });
  const chosen = () => screen.getAllByRole("button", { pressed: true }).map((b) => b.textContent);

  it("the child last picked in Schedule (hh.child) does not decide it", async () => {
    localStorage.setItem("hh.child", "c2");
    renderAt("/records");
    await screen.findByRole("group", { name: "Totals" });
    expect(chosen()).toContain("All children");
    expect(chosen()).not.toContain("Margaret");
  });

  it("picking a child on Records is remembered by Records (hh.records.child) and leaves Schedule's choice alone", async () => {
    localStorage.setItem("hh.child", "c1");
    const user = userEvent.setup();
    const { unmount } = renderAt("/records");
    await screen.findByRole("group", { name: "Totals" });
    await user.click(screen.getByRole("button", { name: "Margaret" }));
    expect(localStorage.getItem("hh.records.child")).toBe("c2");
    expect(localStorage.getItem("hh.child")).toBe("c1");
    unmount();
    renderAt("/records");
    await screen.findByRole("group", { name: "Totals" });
    await waitFor(() => expect(chosen()).toContain("Margaret"));
  });

  it("the print summary says 'Books finished —' for a child with none", async () => {
    window.print = vi.fn();
    const user = userEvent.setup();
    renderAt("/records?range=week");
    await user.click(await screen.findByRole("button", { name: "Export" }));
    const form = within(await screen.findByRole("dialog"));
    await user.click(form.getByRole("button", { name: "Print summary" }));
    await waitFor(() => expect(window.print).toHaveBeenCalled());
    const rows = [...document.querySelectorAll(".print-summary .print-page tr")].filter((r) => r.querySelector("th")!.textContent === "Books finished");
    expect(rows).toHaveLength(2);
    for (const r of rows) expect(r.querySelector("td")!.textContent).toBe("—");
    fireEvent(window, new Event("afterprint"));
  });
});

describe("E13: layout slips at 390 px", () => {
  const css = (f: string) => readFileSync(`src/${f}`, "utf8");
  it("the child chips are each at least as wide as their own text, so 'All children' is never cut", () => {
    expect(css("features/week/week.css")).toMatch(/\.child-switch \.segmented button \{[^}]*flex: 1 1 auto;[^}]*min-width: max-content/);
  });
  it("a long title in the Update status sheet is cut with an ellipsis and the close button stays on the title row", () => {
    expect(css("features/status/status.css")).toMatch(/\.status-title \{[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap/);
    expect(css("components/ui/sheet.css")).toMatch(/\.sheet-title \{[^}]*min-width: 0/);
    expect(readFileSync("src/features/status/UpdateStatusSheet.tsx", "utf8")).toContain('className="status-title"');
  });
  it("the printed sheet's header has its own class, so the sheet's wrapping and rule no longer reach every sheet title", () => {
    expect(css("features/print/print.css")).not.toMatch(/(^|\n)\.sheet-head/);
    expect(css("features/print/print.css")).toMatch(/\.print-sheet-head \{/);
    expect(css("components/ui/sheet.css")).toMatch(/\.sheet-head \{ display: flex; align-items: center;/);
  });
});
