// S8-08: the set-up screens in Soft Paper: list rows end in a chevron and are 56 px; panels are sheets.
import { readFileSync } from "node:fs";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Assignment } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, MATH, rowId, withRoster } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

const SAXON: Assignment = {
  id: rowId(1), subjectId: MATH.id, title: "Saxon 5/4", unitType: "lessons", totalUnits: 20, weightPerUnit: null,
  startDate: "2026-11-02", endDate: "2026-11-26", childIds: [FRANK.id], archived: false, weekdays: null,
};

describe("list rows", () => {
  it("every row of Children, Subjects and Assignments ends in a chevron", async () => {
    withRoster();
    fakeApi.on("GET /api/assignments", 200, [SAXON]);
    for (const [path, list] of [["/setup/children", "Children"], ["/setup/subjects", "Subjects"], ["/setup/assignments", "Assignments"]] as const) {
      const { unmount } = renderAt(path);
      const rows = within(await screen.findByRole("list", { name: list })).getAllByRole("listitem");
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) expect(r.querySelector("svg.row-chevron"), `${list}: ${r.textContent}`).not.toBeNull();
      unmount();
    }
  });

  it("rows are at least 56 px high and cards use the 14 px radius, from the shared tokens", () => {
    const roster = readFileSync("src/features/roster/roster.css", "utf8");
    expect(roster).toMatch(/\.roster-row-btn \{[^}]*min-height: 56px/);
    expect(roster).toMatch(/\.roster-list \{[^}]*border-radius: var\(--tl-radius\)/);
    expect(readFileSync("src/features/schedule/schedule.css", "utf8")).toMatch(/\.schedule-card-btn \{[^}]*border-radius: var\(--tl-radius\)/);
  });
});

describe("panels are sheets", () => {
  it.each(["Add several", "Import CSV", "Copy to a new year", "Copy to another child"])("%s opens in a sheet named for it, and Cancel closes it", async (label) => {
    withRoster();
    fakeApi.on("GET /api/assignments", 200, [SAXON]);
    const user = userEvent.setup();
    renderAt("/setup/assignments");
    await user.click(await screen.findByRole("button", { name: label }));
    const sheet = await screen.findByRole("dialog", { name: label });
    expect(within(sheet).getByRole("form")).toBeInTheDocument();
    await user.click(within(sheet).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: label })).toBeInTheDocument(); // the page behind is as it was
  });

  it("the single Add form stays inline", async () => {
    withRoster();
    fakeApi.on("GET /api/assignments", 200, []);
    const user = userEvent.setup();
    renderAt("/setup/assignments");
    await user.click(await screen.findByRole("button", { name: "Add assignment" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("form", { name: "Add assignment" })).toBeInTheDocument();
  });
});
