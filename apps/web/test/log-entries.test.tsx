/** S9-07: the log form: nothing prefilled, hours and minutes, several children, the school-day switch, edit and delete. */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { FamilySettings, LogSetup, RecordEntry, Subject } from "../src/api/types";
import { boxesFor, formatMinutes, summaryOf, toMinutes } from "../src/features/records/entryText";
import { NO_FIELDS } from "../src/features/records/logSetup";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const KIDS = [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }, { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false }];
const sub = (id: string, name: string): Subject => ({ id, name, color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null });
const SUBJECTS = [sub("math", "Math"), sub("read", "Reading")];
const DETAILED: LogSetup = { template: "detailed", fields: { ...NO_FIELDS, subjectHours: true, notes: true, books: true, homeAway: true } };
const FAMILY = (logSetup: LogSetup): FamilySettings => ({ name: "F", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false, zoomViews: { hidden: [], custom: [] }, logSetup });
const entry = (over: Partial<RecordEntry> = {}): RecordEntry => ({ id: "e1", childId: "c1", startDate: "2026-11-02", endDate: "2026-11-06", countsSchoolDay: true, schoolDays: 5, subjectMinutes: { math: 210, read: 120 }, totalMinutes: null, homeMinutes: null, awayMinutes: null, notes: null, books: [], ...over });
const calls = (m: string) => fakeApi.calls.filter((c) => c.method === m && c.path.startsWith("/api/log-entries"));

function stub(setup: LogSetup, entries: RecordEntry[] = [], kids = KIDS) {
  fakeApi.on("GET /api/family", 200, FAMILY(setup));
  fakeApi.on("GET /api/subjects", 200, SUBJECTS);
  fakeApi.on("GET /api/children", 200, kids);
  fakeApi.on("GET /api/log-entries", 200, entries);
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
    expect(summaryOf(entry({ countsSchoolDay: false, schoolDays: 0, subjectMinutes: {}, notes: "Walk", books: ["A"] }), SUBJECTS)).toBe("1 book · Walk");
    expect(summaryOf(entry({ countsSchoolDay: false, subjectMinutes: {} }), SUBJECTS)).toBe("Nothing typed");
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
      childIds: ["c1", "c2"], startDate: "2026-11-02", endDate: "2026-11-06", countsSchoolDay: true,
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

  it("logging never calls the plan, and no log request is a plan change except edit and delete", async () => {
    stub(DETAILED, [entry()]);
    const user = userEvent.setup();
    renderAt("/records");
    await user.click(await screen.findByRole("button", { name: "Log" }));
    expect(fakeApi.calls.some((c) => c.path.startsWith("/api/plan") || c.path.startsWith("/api/assignments") || c.path.startsWith("/api/check-ins"))).toBe(false);
  });
});
