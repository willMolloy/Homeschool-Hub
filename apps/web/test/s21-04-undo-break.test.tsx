/** S21-04: the undo bar names the break, and Undo puts the year back (the break is gone). */
import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Assignment, BlockedRange } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, MATH, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

const HOBBIT: Assignment = {
  id: rowId(1), subjectId: MATH.id, title: "The Hobbit", unitType: "pages", totalUnits: 100, weightPerUnit: null, minutesPerDay: null,
  startDate: "2026-01-05", endDate: "2026-05-21", childIds: [FRANK.id], archived: false, weekdays: null, endedAs: null, endedOn: null,
};

describe("undo a break with the schedule changes (S21-04)", () => {
  it("the bar names the break, and Undo takes it back off the year", async () => {
    let ranges: BlockedRange[] = [];
    let undo: { label: string } | null = null;
    withRoster();
    fakeApi.on("GET /api/assignments", 200, [HOBBIT]);
    fakeApi.on("GET /api/blocked-ranges", () => [200, ranges]);
    fakeApi.on("GET /api/undo", () => [200, undo]);
    fakeApi.on("POST /api/blocked-ranges", (body) => {
      const row = { id: rowId(19), label: "February", kind: "vacation" as const, startDate: "2026-02-01", endDate: "2026-02-28", childIds: [], ...(body as object) };
      ranges = [row];
      undo = { label: "Added February break" };
      return [201, row];
    });
    fakeApi.on("POST /api/undo", () => {
      ranges = [];
      undo = null;
      return [200, { label: "Added February break" }];
    });
    const user = userEvent.setup();
    renderAt("/setup/days-off");
    await screen.findByText("No days off yet.");
    await user.click(screen.getByRole("button", { name: "Add days off" }));
    const form = screen.getByRole("form", { name: "Add days off" });
    fireEvent.change(within(form).getByLabelText("First day"), { target: { value: "2026-02-01" } });
    fireEvent.change(within(form).getByLabelText("Last day"), { target: { value: "2026-02-28" } });
    await user.type(within(form).getByLabelText("Label"), "February");
    await user.click(within(form).getByRole("button", { name: "Add" }));
    const sheet = await screen.findByRole("dialog", { name: "February break covers planned work" });
    await user.click(within(sheet).getByRole("radio", { name: /Keep the end date/ }));
    await user.click(within(sheet).getByRole("button", { name: "Confirm" }));
    expect(await screen.findByText("Added February break.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(await screen.findByText("No days off yet.")).toBeInTheDocument();
    expect(writes().some((c) => c.method === "POST" && c.path === "/api/undo")).toBe(true);
    expect(screen.queryByText("February")).toBeNull();
  });
});
