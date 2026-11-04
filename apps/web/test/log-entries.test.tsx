/** S9-07: the log form: nothing prefilled, hours and minutes, several children, the school-day switch, edit and delete. */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { FamilySettings, LogSetup, RecordEntry, Subject } from "../src/api/types";
import { boxesFor, formatMinutes, summaryOf, toMinutes } from "../src/features/records/entryText";
import { NO_FIELDS } from "../src/features/records/logSetup";
import { fakeApi, runDaysFor } from "./helpers/fake-api";
import { renderAt } from "./render";
import { withCovered } from "./helpers/recordEntry";

const KIDS = [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }, { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false }];
const sub = (id: string, name: string): Subject => ({ id, name, color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null });
const SUBJECTS = [sub("math", "Math"), sub("read", "Reading")];
const DETAILED: LogSetup = { template: "detailed", fields: { ...NO_FIELDS, subjectHours: true, notes: true, books: true, homeAway: true } };
const FAMILY = (logSetup: LogSetup): FamilySettings => ({ name: "F", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false, zoomViews: { hidden: [], custom: [] }, logSetup });
const entry = (over: Partial<RecordEntry> = {}): RecordEntry => withCovered({ id: "e1", childId: "c1", startDate: "2026-11-02", endDate: "2026-11-06", countsSchoolDay: true, schoolDays: 5, subjectMinutes: { math: 210, read: 120 }, totalMinutes: null, homeMinutes: null, awayMinutes: null, notes: null, books: [], ...over });
const calls = (m: string) => fakeApi.calls.filter((c) => c.method === m && c.path.startsWith("/api/log-entries"));

function stub(setup: LogSetup, entries: RecordEntry[] = [], kids = KIDS) {
  fakeApi.on("GET /api/family", 200, FAMILY(setup));
  fakeApi.on("GET /api/subjects", 200, SUBJECTS);
  fakeApi.on("GET /api/children", 200, kids);
  fakeApi.on("GET /api/log-entries", 200, entries);
  fakeApi.on("GET /api/assignments", 200, []);
  fakeApi.on("GET /api/records/totals", 200, { from: null, to: null, childId: null, entries: 0, schoolDays: 0, totalMinutes: 0, coreMinutes: 0, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0, books: [], bySubject: [] });
  fakeApi.on("POST /api/log-entries", 201, []);
  fakeApi.on("PATCH /api/log-entries/e1", 200, entry());
  fakeApi.on("DELETE /api/log-entries/e1", 204);
}
const openLog = async (user: ReturnType<typeof userEvent.setup>) => {
  renderAt("/records");
  await user.click(await screen.findByRole("button", { name: "Log" }));
  return within(await screen.findByRole("form", { name: "Log" }));
};
const type = async (user: ReturnType<typeof userEvent.setup>, el: HTMLElement, v: string) => { await user.clear(el); await user.type(el, v); };

beforeEach(() => stub(DETAILED));

describe("entry words (pure)", () => {
  it("hours and minutes to whole minutes and back", () => {
    expect(toMinutes("3", "30")).toEqual({ value: 210, problem: null });
    expect(toMinutes("", "45").value).toBe(45);
    expect(toMinutes("", "")).toEqual({ value: null, problem: null });
    expect(toMinutes("1", "75").problem).toBe("Minutes are 0 to 59.");
    expect(toMinutes("1.5", "").problem).toBe("Use whole hours and minutes.");
    expect(toMinutes("-1", "").problem).not.toBeNull();
    expect(boxesFor(210)).toEqual({ h: "3", m: "30" });
    expect(boxesFor(null)).toEqual({ h: "", m: "" });
    expect([formatMinutes(210), formatMinutes(120), formatMinutes(45)]).toEqual(["3 h 30 m", "2 h", "45 m"]);
  });
  it("summaries say only what was typed", () => {
    expect(summaryOf(entry(), SUBJECTS)).toBe("5 school days · Math 3 h 30 m, Reading 2 h");
    expect(summaryOf(entry({ countsSchoolDay: false, schoolDays: 0, subjectMinutes: {}, notes: "Walk", books: ["A"] }), SUBJECTS)).toBe("Not counted as a school day · 1 book · Walk");
    // S9b-05 (N16): the switch off is said, even with nothing else typed
    expect(summaryOf(entry({ countsSchoolDay: false, subjectMinutes: {} }), SUBJECTS)).toBe("Not counted as a school day");
  });
});

describe("the log form", () => {
  it("opens with every box empty (nothing from the plan or earlier entries), the switch on, and only the tracked fields", async () => {
    stub(DETAILED, [entry()]);
    const form = await openLog(userEvent.setup());
    expect(form.getByLabelText("First day")).toHaveValue("");
    expect(form.getByLabelText(/Last day/)).toHaveValue("");
    for (const box of form.getAllByRole("spinbutton")) expect(box).toHaveValue(null);
    expect(form.getByLabelText("Notes")).toHaveValue("");
    expect(form.getByLabelText("Book title")).toHaveValue("");
    expect(form.getByRole("switch", { name: /Count as a school day/ })).toBeChecked();
    expect(form.queryAllByRole("button", { pressed: true })).toHaveLength(0); // no child chosen for them
    expect(form.getByText("Hours by subject")).toBeInTheDocument();
    expect(form.getByLabelText("Math hours")).toBeInTheDocument();
    expect(form.queryByText("Hours", { selector: "legend" })).toBeNull(); // no total: not tracked
  });

  it("a days-only setup shows no hours at all", async () => {
    stub({ template: "daysAttended", fields: { ...NO_FIELDS, schoolDays: true } });
    const form = await openLog(userEvent.setup());
    expect(form.queryAllByRole("spinbutton")).toHaveLength(0);
    expect(form.queryByLabelText("Notes")).toBeNull();
  });

  it("Mon-Fri for Frank and Margaret with Math 3 h 30 m and Reading 2 h: one POST naming both children, in minutes", async () => {
    const user = userEvent.setup();
    const form = await openLog(user);
    fireEvent.change(form.getByLabelText("First day"), { target: { value: "2026-11-02" } });
    fireEvent.change(form.getByLabelText(/Last day/), { target: { value: "2026-11-06" } });
    await user.click(form.getByRole("button", { name: "All children" }));
    expect(form.getByRole("button", { name: "Frank" })).toHaveAttribute("aria-pressed", "true");
    await type(user, form.getByLabelText("Math hours"), "3");
    await type(user, form.getByLabelText("Math minutes"), "30");
    await type(user, form.getByLabelText("Reading hours"), "2");
    await user.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls("POST")).toHaveLength(1));
    expect(calls("POST")[0]!.body).toEqual({
      childIds: ["c1", "c2"], startDate: "2026-11-02", endDate: "2026-11-06", countsSchoolDay: true, days: ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"],
      subjectMinutes: { math: 210, read: 120 }, homeMinutes: null, awayMinutes: null, notes: null, books: [],
    });
    await waitFor(() => expect(screen.queryByRole("form", { name: "Log" })).toBeNull());
  });

  it("one child, a notes line, a book and the switch turned off", async () => {
    const user = userEvent.setup();
    const form = await openLog(user);
    fireEvent.change(form.getByLabelText("First day"), { target: { value: "2026-11-07" } });
    await user.click(form.getByRole("button", { name: "Margaret" }));
    await user.click(form.getByRole("switch", { name: /Count as a school day/ }));
    await user.type(form.getByLabelText("Notes"), "Nature walk");
    await user.type(form.getByLabelText("Book title"), "Heidi{Enter}");
    expect(form.getByText("Heidi")).toBeInTheDocument();
    await type(user, form.getByLabelText("At home hours"), "1");
    await user.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls("POST")).toHaveLength(1));
    expect(calls("POST")[0]!.body).toMatchObject({ childIds: ["c2"], startDate: "2026-11-07", endDate: "2026-11-07", countsSchoolDay: false, notes: "Nature walk", books: ["Heidi"], homeMinutes: 60, awayMinutes: null, subjectMinutes: {} });
  });

  it("S9b-02: a book title typed but not added is saved with the entry", async () => {
    const user = userEvent.setup();
    const form = await openLog(user);
    fireEvent.change(form.getByLabelText("First day"), { target: { value: "2026-11-02" } });
    await user.click(form.getByRole("button", { name: "Frank" }));
    await user.type(form.getByLabelText("Book title"), "Heidi{Enter}");
    await user.type(form.getByLabelText("Book title"), "  Charlotte's Web ");
    await user.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls("POST")).toHaveLength(1));
    expect(calls("POST")[0]!.body).toMatchObject({ books: ["Heidi", "Charlotte's Web"] });
  });

  it("S9b-02: a typed title alone is something to log", async () => {
    const user = userEvent.setup();
    const form = await openLog(user);
    fireEvent.change(form.getByLabelText("First day"), { target: { value: "2026-11-02" } });
    await user.click(form.getByRole("button", { name: "Frank" }));
    await user.click(form.getByRole("switch", { name: /Count as a school day/ }));
    await user.type(form.getByLabelText("Book title"), "Heidi");
    await user.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls("POST")).toHaveLength(1));
    expect(calls("POST")[0]!.body).toMatchObject({ countsSchoolDay: false, books: ["Heidi"] });
  });

  it("a family with one child is not asked who", async () => {
    stub(DETAILED, [], KIDS.slice(0, 1));
    const user = userEvent.setup();
    const form = await openLog(user);
    expect(form.queryByText("For")).toBeNull();
    fireEvent.change(form.getByLabelText("First day"), { target: { value: "2026-11-02" } });
    await user.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls("POST")[0]!.body).toMatchObject({ childIds: ["c1"] }));
  });

  it("explains what is missing or wrong and sends nothing (hours 0-24 a day, minutes 0-59, dates in order)", async () => {
    const user = userEvent.setup();
    const form = await openLog(user);
    await user.click(form.getByRole("button", { name: "Save" }));
    expect(await form.findByRole("alert")).toHaveTextContent("Pick who this is for.");
    await user.click(form.getByRole("button", { name: "Frank" }));
    await user.click(form.getByRole("button", { name: "Save" }));
    expect(form.getByRole("alert")).toHaveTextContent("Pick the first day.");
    fireEvent.change(form.getByLabelText("First day"), { target: { value: "2026-11-06" } });
    fireEvent.change(form.getByLabelText(/Last day/), { target: { value: "2026-11-02" } });
    await user.click(form.getByRole("button", { name: "Save" }));
    expect(form.getByRole("alert")).toHaveTextContent("The last day must be on or after the first day.");
    fireEvent.change(form.getByLabelText(/Last day/), { target: { value: "" } });
    await type(user, form.getByLabelText("Math hours"), "25");
    await user.click(form.getByRole("button", { name: "Save" }));
    expect(form.getByRole("alert")).toHaveTextContent("Hours can't be more than 24 a day (24 hours for this day).");
    await type(user, form.getByLabelText("Math hours"), "1");
    await type(user, form.getByLabelText("Math minutes"), "75");
    await user.click(form.getByRole("button", { name: "Save" }));
    expect(form.getByRole("alert")).toHaveTextContent("Minutes are 0 to 59.");
    expect(calls("POST")).toHaveLength(0);
  });

  it("an entry with the switch off and nothing typed is refused", async () => {
    const user = userEvent.setup();
    const form = await openLog(user);
    fireEvent.change(form.getByLabelText("First day"), { target: { value: "2026-11-02" } });
    await user.click(form.getByRole("button", { name: "Frank" }));
    await user.click(form.getByRole("switch", { name: /Count as a school day/ }));
    await user.click(form.getByRole("button", { name: "Save" }));
    expect(form.getByRole("alert")).toHaveTextContent("Add something to log");
    expect(calls("POST")).toHaveLength(0);
  });

  it("shows the API's message and keeps what was typed when Save fails", async () => {
    const user = userEvent.setup();
    const form = await openLog(user);
    fakeApi.on("POST /api/log-entries", 400, { error: "invalid_hours", message: "Hours can't be more than 24 a day (that is 24 hours for this day)." });
    fireEvent.change(form.getByLabelText("First day"), { target: { value: "2026-11-02" } });
    await user.click(form.getByRole("button", { name: "Frank" }));
    await user.click(form.getByRole("button", { name: "Save" }));
    expect(await form.findByRole("alert")).toHaveTextContent("Hours can't be more");
    expect(form.getByLabelText("First day")).toHaveValue("Nov 2, 2026");
  });
});

describe("the entries list", () => {
  it("lists entries with the child, the days and what was typed; an empty log says how to start", async () => {
    stub(DETAILED, [entry()]);
    renderAt("/records");
    const list = await screen.findByRole("list", { name: "Log entries" });
    expect(within(list).getByText("Nov 2 – Nov 6, 2026 · Frank")).toBeInTheDocument();
    expect(within(list).getByText("5 school days · Math 3 h 30 m, Reading 2 h")).toBeInTheDocument();
  });
  it("empty", async () => {
    renderAt("/records");
    expect(await screen.findByText(/Nothing logged yet/)).toBeInTheDocument();
  });

  it("Edit opens the entry with its own values; saving sends only the tracked fields (hidden ones are left alone)", async () => {
    stub({ template: "custom", fields: { ...NO_FIELDS, subjectHours: true } }, [entry({ notes: "kept", books: ["Heidi"] })]);
    const user = userEvent.setup();
    renderAt("/records");
    await user.click(await screen.findByRole("button", { name: /^Edit Frank/ }));
    const form = within(await screen.findByRole("form", { name: "Change log entry" }));
    expect(form.getByLabelText("Math hours")).toHaveValue(3);
    expect(form.getByLabelText("Math minutes")).toHaveValue(30);
    expect(form.queryByRole("button", { name: "Frank" })).toBeNull(); // an entry stays its child's
    await type(user, form.getByLabelText("Math minutes"), "45");
    await user.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls("PATCH")).toHaveLength(1));
    const body = calls("PATCH")[0]!.body as Record<string, unknown>;
    expect(body.subjectMinutes).toEqual({ math: 225, read: 120 });
    expect(Object.keys(body).sort()).toEqual(["countsSchoolDay", "endDate", "startDate", "subjectMinutes"]);
  });

  it("Delete sends a DELETE straight away (the undo bar takes it back) and the list reloads", async () => {
    stub(DETAILED, [entry()]);
    const user = userEvent.setup();
    renderAt("/records");
    await user.click(await screen.findByRole("button", { name: /^Delete Frank/ }));
    await waitFor(() => expect(calls("DELETE")).toHaveLength(1));
    expect(calls("DELETE")[0]!.path).toBe("/api/log-entries/e1");
    await waitFor(() => expect(fakeApi.calls.some((c) => c.method === "GET" && c.path === "/api/undo")).toBe(true)); // the undo bar is asked what to offer
  });

  it("logging never calls the plan or writes the schedule (Records only reads assignments, for the year's dates), and no log request is a plan change except edit and delete", async () => {
    stub(DETAILED, [entry()]);
    const user = userEvent.setup();
    renderAt("/records");
    await user.click(await screen.findByRole("button", { name: "Log" }));
    expect(fakeApi.calls.some((c) => c.path.startsWith("/api/plan") || c.path.startsWith("/api/check-ins") || (c.method !== "GET" && c.path.startsWith("/api/assignments")))).toBe(false);
  });
});

describe("S9b-07: ticking the days of a run", () => {
  const MON_SAT = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"];
  it("a Mon–Sun run with Saturday ticked saves Mon–Sat (6 days); no ticks is refused before saving", async () => {
    const user = userEvent.setup();
    const form = await openLog(user);
    fireEvent.change(form.getByLabelText("First day"), { target: { value: "2026-11-02" } });
    fireEvent.change(form.getByLabelText(/Last day/), { target: { value: "2026-11-08" } });
    await user.click(form.getByRole("button", { name: "Frank" }));
    await waitFor(() => expect(form.getByRole("button", { name: "Mon 2, Monday, November 2" })).toHaveAttribute("aria-pressed", "true"));
    await user.click(form.getByRole("button", { name: "Sat 7, Saturday, November 7" }));
    expect(form.getByText(/Counts Mon–Sat, 6 days/)).toBeInTheDocument();
    await user.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls("POST")).toHaveLength(1));
    expect((calls("POST")[0]!.body as { days: string[] }).days).toEqual(MON_SAT);
  });

  it("S10-10b M1: every chip's accessible name starts with the text it shows (WCAG 2.5.3 Label in Name)", async () => {
    const user = userEvent.setup();
    const form = await openLog(user);
    fireEvent.change(form.getByLabelText("First day"), { target: { value: "2026-11-02" } });
    fireEvent.change(form.getByLabelText(/Last day/), { target: { value: "2026-11-08" } });
    await user.click(form.getByRole("button", { name: "Frank" }));
    const group = within(await form.findByRole("group", { name: "School days in these dates" }));
    await waitFor(() => expect(group.getByRole("button", { name: /^Mon 2,/ })).toHaveAttribute("aria-pressed", "true"));
    const buttons = group.getAllByRole("button");
    expect(buttons).toHaveLength(7);
    for (const b of buttons) {
      const shown = b.textContent!.trim();
      const name = b.getAttribute("aria-label") ?? shown;
      expect(name.toLowerCase().startsWith(shown.toLowerCase())).toBe(true);
    }
    expect(buttons[0]).toHaveAccessibleName("Mon 2, Monday, November 2");
  });

  it("S10-10b L3: with All children, a ticked day that is one child's day off says so", async () => {
    fakeApi.on("GET /api/log-entries/run-days", 200, {
      ...runDaysFor("2026-11-02", "2026-11-08"), partlyOff: [{ date: "2026-11-04", childIds: ["c1"] }],
    });
    const user = userEvent.setup();
    const form = await openLog(user);
    fireEvent.change(form.getByLabelText("First day"), { target: { value: "2026-11-02" } });
    fireEvent.change(form.getByLabelText(/Last day/), { target: { value: "2026-11-08" } });
    await user.click(form.getByRole("button", { name: "All children" }));
    expect(await form.findByText("Wed 4 is Frank's day off; ticked, it counts for Frank too.")).toBeInTheDocument();
    await user.click(form.getByRole("button", { name: /^Wed 4,/ }));
    expect(form.queryByText(/Frank's day off/)).toBeNull();
    // one child: no hint (the endpoint names partly-off days only for several children anyway)
    await user.click(form.getByRole("button", { name: /^Wed 4,/ }));
    await user.click(form.getByRole("button", { name: "Margaret" }));
    await waitFor(() => expect(form.queryByText(/Frank's day off/)).toBeNull());
  });

  it("unticking every day says what to do and sends nothing", async () => {
    const user = userEvent.setup();
    const form = await openLog(user);
    fireEvent.change(form.getByLabelText("First day"), { target: { value: "2026-11-02" } });
    fireEvent.change(form.getByLabelText(/Last day/), { target: { value: "2026-11-03" } });
    await user.click(form.getByRole("button", { name: "Frank" }));
    await waitFor(() => expect(form.getByRole("button", { name: "Tue 3, Tuesday, November 3" })).toHaveAttribute("aria-pressed", "true"));
    await user.click(form.getByRole("button", { name: "Mon 2, Monday, November 2" }));
    await user.click(form.getByRole("button", { name: "Tue 3, Tuesday, November 3" }));
    await user.click(form.getByRole("button", { name: "Save" }));
    expect(await form.findByRole("alert")).toHaveTextContent('Tick at least one day, or turn off "Count as a school day".');
    expect(calls("POST")).toHaveLength(0);
  });

  it("one day and a switched-off run show no day chips", async () => {
    const user = userEvent.setup();
    const form = await openLog(user);
    fireEvent.change(form.getByLabelText("First day"), { target: { value: "2026-11-02" } });
    expect(form.queryByRole("group", { name: /School days/ })).toBeNull();
    fireEvent.change(form.getByLabelText(/Last day/), { target: { value: "2026-11-04" } });
    expect(form.getByRole("group", { name: "School days in these dates" })).toBeInTheDocument();
    await user.click(form.getByRole("switch", { name: /Count as a school day/ }));
    expect(form.queryByRole("group", { name: /School days/ })).toBeNull();
  });

  it("S10-10b M2: editing a run's dates keeps the ticks for dates still in it; only new dates come from the calendar", async () => {
    // Nov 9-15: Mon 9 unticked, Wed 11 (a day off) and Sat 14 ticked by hand
    const TICKED = ["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14"];
    stub(DETAILED, [entry({ startDate: "2026-11-09", endDate: "2026-11-15", days: TICKED, schoolDays: 5 })]);
    const user = userEvent.setup();
    renderAt("/records");
    await user.click(await screen.findByRole("button", { name: /^Edit Frank/ }));
    const form = within(await screen.findByRole("form", { name: "Change log entry" }));
    fireEvent.change(form.getByLabelText(/Last day/), { target: { value: "2026-11-17" } });
    await waitFor(() => expect(form.getByRole("button", { name: /^Tue 17,/ })).toHaveAttribute("aria-pressed", "true"));
    expect(form.getByRole("button", { name: /^Wed 11,/ })).toHaveAttribute("aria-pressed", "true");
    expect(form.getByRole("button", { name: /^Sat 14,/ })).toHaveAttribute("aria-pressed", "true");
    expect(form.getByRole("button", { name: /^Mon 9,/ })).toHaveAttribute("aria-pressed", "false");
    expect(form.getByRole("button", { name: /^Sun 15,/ })).toHaveAttribute("aria-pressed", "false");
    // shorter again, then back: still the parent's ticks
    fireEvent.change(form.getByLabelText(/Last day/), { target: { value: "2026-11-12" } });
    fireEvent.change(form.getByLabelText(/Last day/), { target: { value: "2026-11-17" } });
    await waitFor(() => expect(form.getByRole("button", { name: /^Mon 16,/ })).toHaveAttribute("aria-pressed", "true"));
    expect(form.getByRole("button", { name: /^Wed 11,/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls("PATCH")).toHaveLength(1));
    expect((calls("PATCH")[0]!.body as { days: string[] }).days).toEqual([...TICKED, "2026-11-16", "2026-11-17"]);
  });

  it("S10-10b M2: a new run keeps the parent's ticks when its last day moves", async () => {
    const user = userEvent.setup();
    const form = await openLog(user);
    fireEvent.change(form.getByLabelText("First day"), { target: { value: "2026-11-02" } });
    fireEvent.change(form.getByLabelText(/Last day/), { target: { value: "2026-11-08" } });
    await user.click(form.getByRole("button", { name: "Frank" }));
    await waitFor(() => expect(form.getByRole("button", { name: /^Mon 2,/ })).toHaveAttribute("aria-pressed", "true"));
    await user.click(form.getByRole("button", { name: /^Sat 7,/ }));
    await user.click(form.getByRole("button", { name: /^Wed 4,/ }));
    fireEvent.change(form.getByLabelText(/Last day/), { target: { value: "2026-11-10" } });
    await waitFor(() => expect(form.getByRole("button", { name: /^Tue 10,/ })).toHaveAttribute("aria-pressed", "true"));
    expect(form.getByRole("button", { name: /^Sat 7,/ })).toHaveAttribute("aria-pressed", "true");
    expect(form.getByRole("button", { name: /^Wed 4,/ })).toHaveAttribute("aria-pressed", "false");
    await user.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls("POST")).toHaveLength(1));
    expect((calls("POST")[0]!.body as { days: string[] }).days).toEqual(["2026-11-02", "2026-11-03", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-09", "2026-11-10"]);
  });

  it("editing shows the entry's ticked days; changing a chip sends the new days; the list names them", async () => {
    stub(DETAILED, [entry({ endDate: "2026-11-08", days: MON_SAT, schoolDays: 6 })]);
    const user = userEvent.setup();
    renderAt("/records");
    expect(await screen.findByText(/6 school days, Mon–Sat/)).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /^Edit Frank/ }));
    const form = within(await screen.findByRole("form", { name: "Change log entry" }));
    expect(form.getByRole("button", { name: "Sat 7, Saturday, November 7" })).toHaveAttribute("aria-pressed", "true");
    await user.click(form.getByRole("button", { name: "Wed 4, Wednesday, November 4" }));
    await user.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls("PATCH")).toHaveLength(1));
    expect((calls("PATCH")[0]!.body as { days: string[] }).days).toEqual(MON_SAT.filter((d) => d !== "2026-11-04"));
  });
});
