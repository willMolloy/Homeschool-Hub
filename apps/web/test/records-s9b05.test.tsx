/** S9b-05: Records after Undo keeps its range and child (N17); a family with no children is sent to add one (N12). */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Child, FamilySettings, LogFields, RecordEntry, Subject } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";
import { withCovered } from "./helpers/recordEntry";

const KIDS: Child[] = [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }, { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false }];
const SUBJECTS: Subject[] = [{ id: "math", name: "Math", color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null, core: true }];
const FIELDS: LogFields = { subjectHours: true, coreSplit: false, totalHours: false, schoolDays: true, homeAway: false, notes: false, books: false };
const e = (over: Partial<RecordEntry>): RecordEntry => withCovered({ id: "e", childId: "c1", startDate: "2026-11-02", endDate: "2026-11-02", countsSchoolDay: true, schoolDays: 1, subjectMinutes: { math: 60 }, totalMinutes: null, homeMinutes: null, awayMinutes: null, notes: null, books: [], ...over });

function stub(children: Child[] = KIDS) {
  const family: FamilySettings = { name: "F", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false, zoomViews: { hidden: [], custom: [] }, logSetup: { template: "custom", fields: FIELDS } };
  fakeApi.on("GET /api/family", 200, family);
  fakeApi.on("GET /api/subjects", 200, SUBJECTS);
  fakeApi.on("GET /api/children", 200, children);
  fakeApi.on("GET /api/assignments", 200, [{ id: "a1", subjectId: "math", title: "Math 5", startDate: "2026-08-31", endDate: "2027-05-28", childIds: ["c1"], archived: false }]);
  fakeApi.on("GET /api/log-entries", 200, [e({ id: "1" }), e({ id: "2", childId: "c2" }), e({ id: "3", startDate: "2027-02-01", endDate: "2027-02-01" })]);
  fakeApi.on("GET /api/records/totals", 200, { from: null, to: null, childId: null, entries: 1, schoolDays: 1, totalMinutes: 60, coreMinutes: 60, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0, books: [], bySubject: [] });
}
const pressed = (group: string) => within(screen.getByRole("group", { name: group })).getAllByRole("button").filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.textContent);

describe("S9b-05 (N17): Undo keeps the range and the child", () => {
  it("Fall and Frank, delete an entry, Undo: still Fall and Frank (from the address, not only this device's memory)", async () => {
    stub();
    const user = userEvent.setup();
    renderAt("/records");
    await user.click(await screen.findByRole("button", { name: "Fall" }));
    await user.click(screen.getByRole("button", { name: "Frank" }));
    expect(pressed("Range")).toEqual(["Fall"]);
    fakeApi.on("DELETE /api/log-entries/1", 204, undefined);
    fakeApi.on("GET /api/undo", 200, { label: "Deleted a log entry", createdAt: "2026-10-28T15:00:00.000Z" });
    fakeApi.on("POST /api/undo", 200, { label: "Deleted a log entry" });
    await user.click(screen.getByRole("button", { name: /^Delete Frank/ }));
    const undo = await screen.findByRole("button", { name: "Undo" });
    window.localStorage.clear(); // the child must come back from the address alone
    const before = fakeApi.calls.filter((c) => c.method === "GET" && c.path === "/api/family").length;
    await user.click(undo);
    await waitFor(() => expect(fakeApi.calls.filter((c) => c.method === "GET" && c.path === "/api/family").length).toBeGreaterThan(before)); // the page reloaded
    await screen.findByRole("group", { name: "Range" });
    expect(pressed("Range")).toEqual(["Fall"]);
    expect(screen.getByRole("button", { name: "Frank" })).toHaveAttribute("aria-pressed", "true");
  });

  it("custom dates are kept too", async () => {
    stub();
    const user = userEvent.setup();
    renderAt("/records?range=dates&from=2026-11-01&to=2026-11-30&child=c2");
    await screen.findByRole("group", { name: "Range" });
    expect(pressed("Range")).toEqual(["Custom dates"]);
    expect(screen.getByLabelText("From")).toHaveValue("Nov 1, 2026");
    expect(screen.getByLabelText("To")).toHaveValue("Nov 30, 2026");
    expect(screen.getByRole("button", { name: "Margaret" })).toHaveAttribute("aria-pressed", "true");
    void user;
  });
});

describe("S9b-05 (N12): no children yet", () => {
  it("says to add a child first, with a link to Children, and offers no Log button", async () => {
    stub([]);
    renderAt("/records");
    expect(await screen.findByText(/Add a child first/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add a child" })).toHaveAttribute("href", "/setup/children");
    expect(screen.queryByRole("button", { name: "Log" })).toBeNull();
  });
});
