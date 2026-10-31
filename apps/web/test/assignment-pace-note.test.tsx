/** S6b-07: a quiet note when an assignment's daily pace looks unrealistic; it never blocks Save. */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PACE_NOTE_THRESHOLD, paceLooksHigh, paceNoteText } from "../src/features/schedule/effort";
import { fakeApi } from "./helpers/fake-api";
import { READING, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

describe("pace note helpers", () => {
  it("the thresholds are pages 60, chapters 5, lessons 5, minutes 240 and the check is strictly above", () => {
    expect(PACE_NOTE_THRESHOLD).toEqual({ pages: 60, chapters: 5, lessons: 5, minutes: 240 });
    for (const [unit, limit] of Object.entries(PACE_NOTE_THRESHOLD) as [keyof typeof PACE_NOTE_THRESHOLD, number][]) {
      expect(paceLooksHigh(limit, unit)).toBe(false);
      expect(paceLooksHigh(limit + 0.5, unit)).toBe(true);
    }
  });
  it("the sentence", () => {
    expect(paceNoteText(300, "pages")).toBe("That's about 300 pages a day. Is that right?");
    expect(paceNoteText(6.5, "chapters")).toBe("That's about 6.5 chapters a day. Is that right?");
  });
});

const NOTE = /Is that right\?$/;

async function openAdd(unit: string) {
  withRoster();
  fakeApi.on("GET /api/assignments", 200, []);
  fakeApi.on("POST /api/assignments", (body) => [201, { ...(body as object), id: rowId(9), archived: false }]);
  const user = userEvent.setup();
  renderAt("/schedule/assignments");
  await user.click(await screen.findByRole("button", { name: "Add assignment" }));
  const form = screen.getByRole("form", { name: "Add assignment" });
  await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
  await user.type(within(form).getByLabelText("Title"), "Atlas");
  await user.selectOptions(within(form).getByLabelText("Unit"), unit);
  await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
  return { user, form };
}
const set = (form: HTMLElement, label: string, value: string) => fireEvent.change(within(form).getByLabelText(label), { target: { value } });

describe("the pace note on the Add form", () => {
  it("300 pages over 1 school day shows the note; over 60 school days it does not", async () => {
    const { user, form } = await openAdd("pages");
    await user.type(within(form).getByLabelText("Total"), "300");
    set(form, "Start", "2026-11-02");
    set(form, "End", "2026-11-02");
    expect(within(form).getByText("That's about 300 pages a day. Is that right?")).toBeInTheDocument();
    set(form, "End", "2027-01-22");
    expect(within(form).queryByText(NOTE)).toBeNull();
  });

  it.each([
    ["pages", "61", "60"],
    ["chapters", "6", "5"],
    ["lessons", "6", "5"],
    ["minutes", "241", "240"],
  ])("%s: shown above the threshold and not at it", async (unit, above, at) => {
    const { user, form } = await openAdd(unit);
    set(form, "Start", "2026-11-02");
    set(form, "End", "2026-11-02");
    const total = within(form).getByLabelText("Total");
    await user.type(total, above);
    expect(within(form).getByText(NOTE)).toBeInTheDocument();
    await user.clear(total);
    await user.type(total, at);
    expect(within(form).queryByText(NOTE)).toBeNull();
  });

  it("no note until the total and dates are filled", async () => {
    const { form } = await openAdd("pages");
    expect(within(form).queryByText(NOTE)).toBeNull();
  });

  it("Save still works with the note showing", async () => {
    const { user, form } = await openAdd("pages");
    await user.type(within(form).getByLabelText("Total"), "300");
    set(form, "Start", "2026-11-02");
    set(form, "End", "2026-11-02");
    expect(within(form).getByText(NOTE)).toBeInTheDocument();
    await waitFor(() => expect(within(form).getByRole("button", { name: "Add" })).toBeEnabled());
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect((writes()[0]!.body as { totalUnits: number }).totalUnits).toBe(300);
  });
});
