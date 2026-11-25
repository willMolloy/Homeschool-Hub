// S18c-06: minutes a day are shown as a whole number. The stored amount stays exact.
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Assignment } from "../src/api/types";
import { exactPreset, formatDailyMinutes } from "../src/features/schedule/minutesForm";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, MAGGIE, READING, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

describe("whole minutes on screen (S18c-06)", () => {
  it("rounds a fussy daily amount for display and does not treat it as a preset", () => {
    expect(formatDailyMinutes(66.67)).toBe("67");
    expect(formatDailyMinutes(26.67)).toBe("27");
    expect(formatDailyMinutes(30)).toBe("30");
    expect(formatDailyMinutes(60)).toBe("60");
    expect(exactPreset(66.67)).toBe("custom");
    expect(exactPreset(60)).toBe(60);
    expect(exactPreset(59.6)).toBe("custom");
  });

  it("shows 67, and saving without a change leaves 66.67 stored", async () => {
    const walk: Assignment = {
      id: rowId(8), subjectId: READING.id, title: "Nature walk and notebook", unitType: "minutes", totalUnits: 1200,
      weightPerUnit: 0.5, minutesPerDay: 66.67, weekdays: [2], startDate: "2026-08-18", endDate: "2026-12-15", childIds: [FRANK.id], archived: false,
    };
    withRoster([FRANK, MAGGIE], [READING]);
    fakeApi.on("GET /api/assignments", 200, [walk]);
    const user = userEvent.setup();
    renderAt("/schedule/assignments");
    const card = (await screen.findByText("Nature walk and notebook")).closest("li")!;
    expect(card).toHaveTextContent("67 min a day");
    expect(card).not.toHaveTextContent("66.67");
    await user.click(screen.getByRole("button", { name: /Nature walk and notebook/ }));
    const form = screen.getByRole("form", { name: "Edit Nature walk and notebook" });
    const minutes = within(form).getByRole("group", { name: "Minutes a day" });
    expect(within(minutes).getByRole("radio", { name: "60 min a day" })).not.toBeChecked();
    expect(within(minutes).getByRole("radio", { name: "Custom" })).toBeChecked();
    expect(within(minutes).getByLabelText("Minutes a day")).toHaveValue(67);
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([]);
  });

  it("a book set to 30 shows 30 and stores 30", async () => {
    const piano: Assignment = {
      id: rowId(4), subjectId: READING.id, title: "Piano", unitType: "minutes", totalUnits: 600,
      weightPerUnit: 0.5, minutesPerDay: 30, weekdays: [1, 2, 3, 4, 5], startDate: "2026-09-01", endDate: "2026-12-18", childIds: [FRANK.id], archived: false,
    };
    withRoster([FRANK], [READING]);
    fakeApi.on("GET /api/assignments", 200, [piano]);
    const user = userEvent.setup();
    renderAt("/schedule/assignments");
    expect(await screen.findByText("Piano")).toBeInTheDocument();
    expect(screen.getByText("Piano").closest("li")).toHaveTextContent("30 min a day");
    await user.click(screen.getByRole("button", { name: /Piano/ }));
    const form = screen.getByRole("form", { name: "Edit Piano" });
    expect(within(form).getByRole("radio", { name: "30 min a day" })).toBeChecked();
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([]);
  });
});