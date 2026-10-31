/** S5-07: "Save as a template" and reusing a saved template on the Days off screen. */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { BlockedRange, CalendarTemplate } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import { MAGGIE, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { shiftedBreaks, templateBreaksFrom } from "../src/features/schedule/templates";
import { renderAt } from "./render";

const day = (n: number, label: string | null, kind: BlockedRange["kind"], startDate: string, endDate: string, childIds: string[] = []): BlockedRange =>
  ({ id: rowId(n), label, kind, startDate, endDate, childIds });

const YEAR: BlockedRange[] = [
  day(1, "Summer", "vacation", "2026-06-01", "2026-06-30"), // before the year
  day(2, "Labor Day", "holiday", "2026-09-07", "2026-09-07"),
  day(3, "Thanksgiving", "holiday", "2026-11-26", "2026-11-27"),
  day(4, null, "sick", "2026-10-12", "2026-10-12", [MAGGIE.id]), // one child only
  day(5, "Winter break", "vacation", "2026-12-24", "2027-01-01"),
  day(6, null, "other", "2027-02-01", "2027-02-02"), // no label
  day(7, "Next summer", "vacation", "2027-09-01", "2027-09-30"), // after the year
];

const SAVED: CalendarTemplate = {
  id: rowId(80), name: "2026–27",
  breaks: [
    { offsetDays: 0, lengthDays: 1, label: null, kind: "sick" },
    { offsetDays: 42, lengthDays: 7, label: "Break", kind: "vacation" },
    { offsetDays: 101, lengthDays: 2, label: "Thanksgiving", kind: "holiday" },
  ],
};

async function open(label: "Use a template" | "Save as a template", rows: BlockedRange[] = [], templates: CalendarTemplate[] = []) {
  withRoster();
  fakeApi.on("GET /api/blocked-ranges", 200, rows);
  fakeApi.on("GET /api/calendar-templates", 200, templates);
  fakeApi.on("POST /api/blocked-ranges/bulk", (body) => [201, (body as { blockedRanges: object[] }).blockedRanges.map((b, i) => ({ ...b, id: rowId(60 + i) }))]);
  fakeApi.on("POST /api/calendar-templates", (body) => [201, { ...(body as object), id: rowId(81) }]);
  const user = userEvent.setup();
  renderAt("/schedule/days-off");
  await screen.findByRole("heading", { name: "Days off" });
  await screen.findByRole("button", { name: label });
  await user.click(screen.getByRole("button", { name: label }));
  const form = screen.getByRole("form", { name: label });
  return { user, form };
}
const date = (label: string, value: string, scope: HTMLElement) => fireEvent.change(within(scope).getByLabelText(label), { target: { value } });
const lines = (form: HTMLElement) => within(form).queryAllByRole("listitem").map((li) => li.textContent);

describe("Save as a template (S5-07)", () => {
  it("saves the year's family-wide days off as offsets, keeping kind and label, and says how many per-child ones were left out", async () => {
    const { user, form } = await open("Save as a template", YEAR);
    await user.type(within(form).getByLabelText("Template name"), "  Our year ");
    date("First day of the year", "2026-08-17", form);
    expect(within(form).getByText("4 days off will be saved")).toBeInTheDocument();
    expect(within(form).getByText("1 day off for one child is left out")).toBeInTheDocument();
    await user.click(within(form).getByRole("button", { name: "Save template" }));
    expect(writes()).toEqual([{
      method: "POST", path: "/api/calendar-templates",
      body: {
        name: "Our year",
        breaks: [
          { offsetDays: 21, lengthDays: 1, label: "Labor Day", kind: "holiday" },
          { offsetDays: 101, lengthDays: 2, label: "Thanksgiving", kind: "holiday" },
          { offsetDays: 129, lengthDays: 9, label: "Winter break", kind: "vacation" },
          { offsetDays: 168, lengthDays: 2, label: null, kind: "other" },
        ],
      },
    }]);
    expect(await screen.findByText(/Saved “Our year”/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("status")).toBeNull();
    // Saving a template changes no days off.
    expect(within(screen.getByRole("list", { name: "Days off" })).getAllByRole("listitem")).toHaveLength(YEAR.length);
  });

  it("a break longer than 60 days is stored as 60", async () => {
    const { user, form } = await open("Save as a template", [day(1, "Long", "vacation", "2026-09-01", "2026-12-31")]);
    await user.type(within(form).getByLabelText("Template name"), "Long");
    date("First day of the year", "2026-08-17", form);
    await user.click(within(form).getByRole("button", { name: "Save template" }));
    expect((writes()[0]!.body as { breaks: { lengthDays: number }[] }).breaks[0]!.lengthDays).toBe(60);
  });

  it("needs a name, a first day and at least one day off; nothing is sent until then", async () => {
    const { user, form } = await open("Save as a template", YEAR);
    await user.click(within(form).getByRole("button", { name: "Save template" }));
    expect(within(form).getByText("Name the template.")).toBeInTheDocument();
    await user.type(within(form).getByLabelText("Template name"), "Our year");
    await user.click(within(form).getByRole("button", { name: "Save template" }));
    expect(within(form).getByText("Pick the year's first day.")).toBeInTheDocument();
    date("First day of the year", "2030-08-17", form);
    await user.click(within(form).getByRole("button", { name: "Save template" }));
    expect(within(form).getByText("There are no days off for the whole family in that year.")).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });

  it("a server error shows and the panel stays open", async () => {
    const { user, form } = await open("Save as a template", YEAR);
    fakeApi.on("POST /api/calendar-templates", 400, { error: "invalid_request", message: "name: Name is required." });
    await user.type(within(form).getByLabelText("Template name"), "Our year");
    date("First day of the year", "2026-08-17", form);
    await user.click(within(form).getByRole("button", { name: "Save template" }));
    expect(await within(form).findByRole("alert")).toHaveTextContent("Name is required.");
  });
});

describe("Use a saved template (S5-07)", () => {
  const choose = (user: ReturnType<typeof userEvent.setup>, form: HTMLElement) => user.selectOptions(within(form).getByLabelText("Year shape"), "2026–27");

  it("saved templates follow the built-in shapes and ask only for the new year's first day", async () => {
    const { user, form } = await open("Use a template", [], [SAVED]);
    await waitFor(() => expect(within(form).getByRole("option", { name: "2026–27" })).toBeInTheDocument());
    const options = within(within(form).getByLabelText("Year shape")).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["36 weeks", "Sabbath schedule (6 on, 1 off)", "Three terms (12 on, 2 off)", "Custom", "2026–27"]);
    await choose(user, form);
    expect(within(form).getByLabelText("First day of the new year")).toBeInTheDocument();
    expect(within(form).queryByLabelText("Last day of the year")).toBeNull();
    expect(within(form).queryByRole("checkbox")).toBeNull();
  });

  it("previews the breaks shifted by the difference in start dates, and one bulk POST adds them", async () => {
    const { user, form } = await open("Use a template", [], [SAVED]);
    await waitFor(() => expect(within(form).getByRole("option", { name: "2026–27" })).toBeInTheDocument());
    await choose(user, form);
    date("First day of the new year", "2027-08-16", form); // 364 days after 2026-08-17
    expect(within(form).getByText("3 breaks to add")).toBeInTheDocument();
    expect(lines(form)).toEqual(["Sick day: Aug 16", "Break: Sep 27 – Oct 3", "Thanksgiving: Nov 25–26"]);
    await user.click(within(form).getByRole("button", { name: "Add breaks" }));
    expect(writes()).toEqual([{
      method: "POST", path: "/api/blocked-ranges/bulk",
      body: {
        blockedRanges: [
          { label: null, kind: "sick", startDate: "2027-08-16", endDate: "2027-08-16", childIds: [] },
          { label: "Break", kind: "vacation", startDate: "2027-09-27", endDate: "2027-10-03", childIds: [] },
          { label: "Thanksgiving", kind: "holiday", startDate: "2027-11-25", endDate: "2027-11-26", childIds: [] },
        ],
      },
    }]);
    expect(await screen.findByRole("list", { name: "Days off" })).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Days off" })).getAllByRole("listitem")).toHaveLength(3);
  });

  it("the same overlap rule: a break over an existing family-wide day off is left out and noted", async () => {
    const week = day(1, "Fall break", "vacation", "2027-10-01", "2027-10-01");
    const { user, form } = await open("Use a template", [week], [SAVED]);
    await waitFor(() => expect(within(form).getByRole("option", { name: "2026–27" })).toBeInTheDocument());
    await choose(user, form);
    date("First day of the new year", "2027-08-16", form);
    expect(within(form).getByText("2 breaks to add")).toBeInTheDocument();
    expect(within(form).getByText("1 already in your days off")).toBeInTheDocument();
  });

  it("without a date nothing is sent", async () => {
    const { user, form } = await open("Use a template", [], [SAVED]);
    await waitFor(() => expect(within(form).getByRole("option", { name: "2026–27" })).toBeInTheDocument());
    await choose(user, form);
    await user.click(within(form).getByRole("button", { name: "Add breaks" }));
    expect(within(form).getByText("Pick the first day of the new year.")).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });

  it("deleting a saved template removes it from the list, after a confirmation", async () => {
    const { user, form } = await open("Use a template", [], [SAVED]);
    fakeApi.on(`DELETE /api/calendar-templates/${SAVED.id}`, 204);
    await waitFor(() => expect(within(form).getByRole("option", { name: "2026–27" })).toBeInTheDocument());
    await choose(user, form);
    await user.click(within(form).getByRole("button", { name: "Delete this template" }));
    expect(writes()).toEqual([]);
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(within(form).queryByRole("option", { name: "2026–27" })).toBeNull());
    expect(writes()).toEqual([{ method: "DELETE", path: `/api/calendar-templates/${SAVED.id}`, body: undefined }]);
    expect(within(form).getByLabelText("Year shape")).toHaveValue("36-weeks");
  });
});

describe("save then apply (S5-07)", () => {
  it("2026-27 applied from 2027-08-16 gives the same breaks, each 364 days later", () => {
    const { breaks } = templateBreaksFrom(YEAR, "2026-08-17");
    const shifted = shiftedBreaks(breaks, "2027-08-16");
    const family = YEAR.filter((r) => r.childIds.length === 0 && r.startDate >= "2026-08-17" && r.startDate <= "2027-08-17");
    expect(shifted.map((b) => [b.label, b.kind])).toEqual(family.map((r) => [r.label, r.kind]));
    expect(shifted.map((b) => [b.start, b.end])).toEqual([
      ["2027-09-06", "2027-09-06"], ["2027-11-25", "2027-11-26"], ["2027-12-23", "2027-12-31"], ["2028-01-31", "2028-02-01"],
    ]);
  });
});
