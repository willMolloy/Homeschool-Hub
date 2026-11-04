// S11-04: step 5 of the setup flow: breaks, added, put off or skipped.
import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { usHolidays } from "@hh/engine";
import type { BlockedRange } from "../src/api/types";
import { clearSetupLater } from "../src/features/welcome/setupLater";
import { currentSchoolYear } from "../src/features/welcome/yearShapes";
import { fakeApi } from "./helpers/fake-api";
import { familyPatches, newFamily, type NewFamily } from "./helpers/setup-flow";
import { renderAt } from "./render";

beforeEach(() => { clearSetupLater(); sessionStorage.clear(); });

const bulkPosts = () => fakeApi.calls.filter((c) => c.method === "POST" && c.path === "/api/blocked-ranges/bulk").map((c) => (c.body as { blockedRanges: unknown[] }).blockedRanges);
function bulkAdds(f: NewFamily) {
  fakeApi.on("POST /api/blocked-ranges/bulk", (body) => {
    const rows = (body as { blockedRanges: Omit<BlockedRange, "id">[] }).blockedRanges.map((b, i) => ({ ...b, id: `b${f.blocked.length + i + 1}` }));
    f.blocked.push(...(rows as BlockedRange[]));
    return [201, rows];
  });
}
async function atBreaks(f = newFamily({ setupStep: 5 }), year: { start: string; end: string } | null = { start: "2026-08-17", end: "2027-05-21" }) {
  f.schoolYear = year;
  bulkAdds(f);
  const user = userEvent.setup();
  renderAt("/welcome");
  await screen.findByRole("heading", { level: 1, name: "Any breaks this year?" });
  await screen.findByRole("group", { name: "Holidays" });
  return { f, user };
}
const holidayBoxes = () => within(screen.getByRole("group", { name: "Holidays" })).getAllByRole("checkbox") as HTMLInputElement[];

describe("step 5: breaks", () => {
  it("lists the US holidays in the year's range, none ticked, and offers Add a break", async () => {
    await atBreaks();
    expect(holidayBoxes().map((b) => b.closest("label")!.textContent)).toEqual([
      "Labor Day: Sep 7", "Thanksgiving: Nov 26–27", "Winter break: Dec 24 – Jan 1",
      "Martin Luther King Jr. Day: Jan 18", "Presidents' Day: Feb 15", "Good Friday: Mar 26",
    ]);
    expect(holidayBoxes().every((b) => !b.checked)).toBe(true);
    expect(screen.getByRole("button", { name: "Add a break" })).toBeInTheDocument();
  });

  it("a year left for later offers the current school year, August to June", async () => {
    await atBreaks(newFamily({ setupStep: 5, setupDeferred: ["year"] }), null);
    const y = currentSchoolYear("2026-10-28");
    expect(y).toEqual({ start: "2026-08-01", end: "2027-06-30" });
    expect(holidayBoxes()).toHaveLength(usHolidays(y.start, y.end).length);
    expect(currentSchoolYear("2027-03-04")).toEqual({ start: "2026-08-01", end: "2027-06-30" });
    expect(currentSchoolYear("2026-07-20")).toEqual({ start: "2026-08-01", end: "2027-06-30" });
  });

  it("Add breaks saves the ticked holidays and the breaks added, and moves to step 6 with no reminder", async () => {
    const { f, user } = await atBreaks();
    expect(screen.getByRole("button", { name: "Add breaks" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "Thanksgiving: Nov 26–27" }));
    await user.click(screen.getByRole("button", { name: "Add a break" }));
    await user.type(screen.getByLabelText("Name of the break"), "Fall break");
    const own = within(screen.getByRole("group", { name: "Add a break" }));
    fireEvent.change(own.getByLabelText("First day"), { target: { value: "2026-10-12" } });
    fireEvent.change(own.getByLabelText("Last day"), { target: { value: "2026-10-16" } });
    await user.click(own.getByRole("button", { name: "Add" }));
    expect(within(screen.getByRole("list", { name: "Breaks you added" })).getByText("Fall break: Oct 12–16")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add breaks" }));
    await screen.findByText("Step 6 of 6");
    expect(bulkPosts()).toEqual([[
      { label: "Thanksgiving", kind: "holiday", startDate: "2026-11-26", endDate: "2026-11-27", childIds: [] },
      { label: "Fall break", kind: "vacation", startDate: "2026-10-12", endDate: "2026-10-16", childIds: [] },
    ]]);
    expect(familyPatches()).toEqual([{ setupDeferred: [], setupStep: 6 }]);
    expect(f.blocked.map((b) => b.label)).toEqual(["Thanksgiving", "Fall break"]);
  });

  it("a break of one's own needs a name and both days", async () => {
    const { user } = await atBreaks();
    await user.click(screen.getByRole("button", { name: "Add a break" }));
    await user.click(within(screen.getByRole("group", { name: "Add a break" })).getByRole("button", { name: "Add" }));
    expect(await screen.findByText("Give the break a name.")).toBeInTheDocument();
    expect(screen.getByText("Pick the first and last day of the break.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Breaks you added" })).toBeNull();
  });

  it("a break added by mistake can be removed before saving", async () => {
    const { user } = await atBreaks();
    await user.click(screen.getByRole("button", { name: "Add a break" }));
    await user.type(screen.getByLabelText("Name of the break"), "Trip");
    fireEvent.change(screen.getByLabelText("First day"), { target: { value: "2026-10-12" } });
    fireEvent.change(screen.getByLabelText("Last day"), { target: { value: "2026-10-16" } });
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: "Remove Trip" }));
    expect(screen.queryByRole("list", { name: "Breaks you added" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add breaks" })).toBeDisabled();
  });

  it("holidays that are already days off are not added twice", async () => {
    const f = newFamily({ setupStep: 5 });
    f.blocked.push({ id: "b0", label: "Thanksgiving", kind: "holiday", startDate: "2026-11-26", endDate: "2026-11-27", childIds: [] });
    const { user } = await atBreaks(f);
    await user.click(screen.getByRole("checkbox", { name: "Thanksgiving: Nov 26–27" }));
    await user.click(screen.getByRole("checkbox", { name: "Labor Day: Sep 7" }));
    await user.click(screen.getByRole("button", { name: "Add breaks" }));
    await screen.findByText("Step 6 of 6");
    expect(bulkPosts()).toEqual([[{ label: "Labor Day", kind: "holiday", startDate: "2026-09-07", endDate: "2026-09-07", childIds: [] }]]);
  });
});

describe("the other two buttons", () => {
  it("I'll get back to you on this: saves no breaks, goes on, and leaves a reminder on Home", async () => {
    const { user } = await atBreaks();
    await user.click(screen.getByRole("checkbox", { name: "Labor Day: Sep 7" })); // ticked but not saved
    await user.click(screen.getByRole("button", { name: "I'll get back to you on this" }));
    await screen.findByText("Step 6 of 6");
    expect(bulkPosts()).toEqual([]);
    expect(familyPatches()).toEqual([{ setupDeferred: ["breaks"], setupStep: 6 }]);
    await user.click(screen.getByRole("button", { name: "Finish later" }));
    const reminder = await screen.findByRole("link", { name: /Add your breaks/ });
    expect(reminder).toHaveAttribute("href", "/welcome?only=breaks");
  });

  it("Skip: saves nothing, goes on, and leaves no reminder", async () => {
    const { user } = await atBreaks();
    await user.click(screen.getByRole("button", { name: "Skip" }));
    await screen.findByText("Step 6 of 6");
    expect(bulkPosts()).toEqual([]);
    expect(familyPatches()).toEqual([{ setupDeferred: [], setupStep: 6 }]);
    await user.click(screen.getByRole("button", { name: "Finish later" }));
    await screen.findByRole("button", { name: "Family and settings" });
    expect(screen.queryByRole("link", { name: /Add your breaks/ })).toBeNull();
  });

  it("keeps the reminder for the school year while breaks are added or skipped", async () => {
    const { user } = await atBreaks(newFamily({ setupStep: 5, setupDeferred: ["year"] }), null);
    await user.click(screen.getByRole("button", { name: "Skip" }));
    await screen.findByText("Step 6 of 6");
    expect(familyPatches()).toEqual([{ setupDeferred: ["year"], setupStep: 6 }]);
  });

  it("the reminder opens the step on its own, and Add breaks there clears it and goes Home", async () => {
    const f = newFamily({ setupDone: true, setupDeferred: ["breaks"] });
    f.schoolYear = { start: "2026-08-17", end: "2027-05-21" };
    bulkAdds(f);
    const user = userEvent.setup();
    const { router } = renderAt("/");
    await user.click(await screen.findByRole("link", { name: /Add your breaks/ }));
    await screen.findByRole("group", { name: "Holidays" });
    expect(screen.queryByRole("progressbar")).toBeNull();
    await user.click(screen.getByRole("checkbox", { name: "Labor Day: Sep 7" }));
    await user.click(screen.getByRole("button", { name: "Add breaks" }));
    await screen.findByRole("button", { name: "Family and settings" });
    expect(router.state.location.pathname).toBe("/");
    expect(familyPatches()).toEqual([{ setupDeferred: [] }]);
    expect(screen.queryByRole("link", { name: /Add your breaks/ })).toBeNull();
    expect(f.blocked.map((b) => b.label)).toEqual(["Labor Day"]);
  });
});
