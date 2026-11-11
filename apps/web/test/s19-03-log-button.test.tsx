/** S19-03: Log is an action beside Export, not a tab that is already selected. */
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import type { LogFields, LogSetup, RecordEntry, RecordTotals, Subject } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import { withCovered } from "./helpers/recordEntry";
import { renderAt } from "./render";

const KIDS = [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }];
const SUBJECTS = [{ id: "math", name: "Math", color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null }] as Subject[];
const FIELDS: LogFields = { subjectHours: true, coreSplit: false, totalHours: false, schoolDays: true, homeAway: false, notes: false, books: false };
const setup: LogSetup = { template: "custom", fields: FIELDS };
const totals: RecordTotals = { from: null, to: null, childId: null, entries: 1, schoolDays: 1, totalMinutes: 30, coreMinutes: 30, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0, books: [], bySubject: [] };
const entry = (): RecordEntry => withCovered({ id: "e1", childId: "c1", startDate: "2026-11-02", endDate: "2026-11-02", countsSchoolDay: true, schoolDays: 1, subjectMinutes: { math: 30 }, totalMinutes: null, homeMinutes: null, awayMinutes: null, notes: null, books: [] });

function stub(entries: RecordEntry[]) {
  fakeApi.on("GET /api/family", 200, { name: "F", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false, zoomViews: { hidden: [], custom: [] }, logSetup: setup });
  fakeApi.on("GET /api/subjects", 200, SUBJECTS);
  fakeApi.on("GET /api/children", 200, KIDS);
  fakeApi.on("GET /api/assignments", 200, []);
  fakeApi.on("GET /api/log-entries", 200, entries);
  fakeApi.on("GET /api/records/totals", 200, totals);
}

describe("Log is an action (S19-03)", () => {
  beforeEach(() => { localStorage.clear(); document.documentElement.dataset.theme = "light"; });

  it.each(["light", "dark"])("Log is a secondary button, not pressed, and it opens the log sheet (%s)", async (theme) => {
    document.documentElement.dataset.theme = theme;
    stub([entry()]);
    const user = userEvent.setup();
    renderAt("/records");
    const log = await screen.findByRole("button", { name: "Log" });
    expect(log).toHaveClass("btn-secondary");
    expect(log).not.toHaveAttribute("aria-pressed");
    expect(log.className).not.toMatch(/\bchip\b/);
    expect(screen.getByRole("button", { name: "Export" })).toHaveClass("btn-secondary");
    await user.click(log);
    expect(await screen.findByRole("dialog", { name: "Log" })).toBeInTheDocument();
  });
});
