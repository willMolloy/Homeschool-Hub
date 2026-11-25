/** S5-05: "Use a template" on the Days off screen. */
import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { BlockedRange } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import { MAGGIE, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

const START = "2026-08-17";
const END = "2027-05-28";

async function open(rows: BlockedRange[] = []) {
  withRoster();
  fakeApi.on("GET /api/assignments", 200, []);
  fakeApi.on("GET /api/blocked-ranges", 200, rows);
  fakeApi.on("POST /api/blocked-ranges", (body) => [201, { ...(body as object), id: rowId(60 + fakeApi.calls.filter((c) => c.method === "POST" && c.path === "/api/blocked-ranges").length) }]);
  const user = userEvent.setup();
  renderAt("/schedule/days-off");
  await screen.findByRole("heading", { name: "Days off" });
  await screen.findByText(rows.length ? rows[0]!.label ?? "" : "No days off yet.");
  await user.click(screen.getByRole("button", { name: "Use a template" }));
  const form = screen.getByRole("form", { name: "Use a template" });
  return { user, form };
}
const date = (label: string, value: string, scope: HTMLElement) => fireEvent.change(within(scope).getByLabelText(label), { target: { value } });
const fillYear = (form: HTMLElement) => {
  date("First day of the year", START, form);
  date("Last day of the year", END, form);
};
const shape = (user: ReturnType<typeof userEvent.setup>, form: HTMLElement, name: string) => user.selectOptions(within(form).getByLabelText("Year shape"), name);
const lines = (form: HTMLElement) => within(form).queryAllByRole("listitem").map((li) => li.querySelector("span")?.textContent ?? li.textContent);

describe("Use a template (S5-05)", () => {
  it("opens next to Add, with the built-in shapes, Custom and every holiday ticked", async () => {
    const { form } = await open();
    const options = within(within(form).getByLabelText("Year shape")).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["36 weeks", "Sabbath schedule (6 on, 1 off)", "Three terms (12 on, 2 off)", "Custom"]);
    for (const box of within(form).getAllByRole("checkbox")) expect(box).toBeChecked();
    expect(within(form).getAllByRole("checkbox")).toHaveLength(7);
    expect(within(form).queryByText(/breaks? to add/)).toBeNull(); // nothing until the dates are in
  });

  it("36 weeks: the holidays in the year, with dates", async () => {
    const { form } = await open();
    fillYear(form);
    expect(within(form).getByText("6 breaks to add")).toBeInTheDocument();
    expect(lines(form)).toEqual([
      "Labor Day: Sep 7", "Thanksgiving: Nov 26–27", "Winter break: Dec 24 – Jan 1",
      "Martin Luther King Jr. Day: Jan 18", "Presidents' Day: Feb 15", "Good Friday: Mar 26",
    ]);
  });

  it("Sabbath: a break every 7th week plus the holidays", async () => {
    const { user, form } = await open();
    fillYear(form);
    await shape(user, form, "Sabbath schedule (6 on, 1 off)");
    expect(within(form).getByText("11 breaks to add")).toBeInTheDocument();
    expect(lines(form)).toContain("Break: Sep 28 – Oct 4");
    expect(lines(form)).toContain("Break: Nov 16–22");
    expect(lines(form).filter((l) => l!.startsWith("Break"))).toHaveLength(5);
  });

  it("Three terms: two weeks off, and a holiday inside a break is not listed twice", async () => {
    const { user, form } = await open();
    fillYear(form);
    await shape(user, form, "Three terms (12 on, 2 off)");
    expect(lines(form).filter((l) => l!.startsWith("Break"))).toEqual(["Break: Nov 9–22", "Break: Feb 15–28", "Break: May 24–28"]);
    expect(lines(form).some((l) => l!.startsWith("Presidents"))).toBe(false); // Feb 15 is inside the February break
    expect(within(form).getByText("8 breaks to add")).toBeInTheDocument();
  });

  it("Custom 4 on / 1 off", async () => {
    const { user, form } = await open();
    fillYear(form);
    await shape(user, form, "Custom");
    await user.clear(within(form).getByLabelText("Weeks on"));
    await user.type(within(form).getByLabelText("Weeks on"), "4");
    expect(lines(form).filter((l) => l!.startsWith("Break"))).toEqual([
      "Break: Sep 14–20", "Break: Oct 19–25", "Break: Nov 23–29", "Break: Dec 28 – Jan 3", "Break: Feb 1–7", "Break: Mar 8–14", "Break: Apr 12–18", "Break: May 17–23",
    ]);
    expect(within(form).getByText("13 breaks to add")).toBeInTheDocument();
  });

  it("unticking a holiday removes it", async () => {
    const { user, form } = await open();
    fillYear(form);
    await user.click(within(form).getByRole("checkbox", { name: "Labor Day" }));
    expect(within(form).getByText("5 breaks to add")).toBeInTheDocument();
    expect(lines(form).some((l) => l!.startsWith("Labor Day"))).toBe(false);
  });

  it("a break that overlaps a family-wide day off is left out and noted; a day off for one child doesn't count", async () => {
    const week: BlockedRange = { id: rowId(11), label: "Thanksgiving week", kind: "holiday", startDate: "2026-11-23", endDate: "2026-11-27", childIds: [] };
    const sick: BlockedRange = { id: rowId(12), label: "Sick day", kind: "sick", startDate: "2026-09-07", endDate: "2026-09-07", childIds: [MAGGIE.id] };
    const { form } = await open([week, sick]);
    fillYear(form);
    expect(within(form).getByText("5 breaks to add")).toBeInTheDocument();
    expect(lines(form).some((l) => l!.startsWith("Thanksgiving"))).toBe(false);
    expect(lines(form)).toContain("Labor Day: Sep 7");
    expect(within(form).getByText("1 already in your days off")).toBeInTheDocument();
  });

  it("Add saves one break, leaves the panel open, and a second Add is its own save", async () => {
    const { user, form } = await open();
    fillYear(form);
    await shape(user, form, "Sabbath schedule (6 on, 1 off)");
    const row = (text: string) => within(form).getAllByRole("listitem").find((li) => li.querySelector("span")?.textContent?.startsWith(text));
    await user.click(within(row("Break: Sep 28")!).getByRole("button", { name: "Add" }));
    expect(writes()).toEqual([{
      method: "POST", path: "/api/blocked-ranges",
      body: { label: "Break", kind: "vacation", startDate: "2026-09-28", endDate: "2026-10-04", childIds: [] },
    }]);
    expect(screen.getByRole("form", { name: "Use a template" })).toBeInTheDocument();
    await user.click(within(row("Labor Day")!).getByRole("button", { name: "Add" }));
    expect(writes()).toHaveLength(2);
    expect(writes()[1]!.path).toBe("/api/blocked-ranges");
    await user.click(within(form).getByRole("button", { name: "Done" }));
    expect(within(screen.getByRole("list", { name: "Days off" })).getAllByRole("listitem")).toHaveLength(2);
  });

  it("invalid dates block Add: blank, and an end before the start; so do custom weeks outside 1-20", async () => {
    const { user, form } = await open();
    await user.click(within(form).getByRole("button", { name: "Done" }));
    expect(within(form).getByText("Pick a start and an end date.")).toBeInTheDocument();
    date("First day of the year", END, form);
    date("Last day of the year", START, form);
    await user.click(within(form).getByRole("button", { name: "Done" }));
    expect(within(form).getByText("The end date must be on or after the start date.")).toBeInTheDocument();
    fillYear(form);
    await shape(user, form, "Custom");
    fireEvent.change(within(form).getByLabelText("Weeks off"), { target: { value: "21" } });
    await user.click(within(form).getByRole("button", { name: "Done" }));
    expect(within(form).getByText("Weeks on and off are whole numbers from 1 to 20.")).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });

  it("a failed request shows the error and keeps the panel open", async () => {
    const { user, form } = await open();
    fakeApi.on("POST /api/blocked-ranges", 400, { error: "invalid_request", message: "That break could not be saved." });
    fillYear(form);
    await user.click(within(form).getAllByRole("button", { name: "Add" })[0]!);
    expect(await within(form).findByRole("alert")).toHaveTextContent("That break could not be saved.");
    expect(screen.getByRole("form", { name: "Use a template" })).toBeInTheDocument();
  });

  it("Cancel closes the panel without a request", async () => {
    const { user, form } = await open();
    await user.click(within(form).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("form", { name: "Use a template" })).toBeNull();
    expect(writes()).toEqual([]);
  });

  it("S7-07: with every break already a day off it says so, Add breaks is off and nothing is sent", async () => {
    const holidays: BlockedRange[] = [
      ["Labor Day", "2026-09-07", "2026-09-07"], ["Thanksgiving", "2026-11-26", "2026-11-27"], ["Winter break", "2026-12-24", "2027-01-01"],
      ["Martin Luther King Jr. Day", "2027-01-18", "2027-01-18"], ["Presidents' Day", "2027-02-15", "2027-02-15"], ["Good Friday", "2027-03-26", "2027-03-26"],
    ].map(([label, startDate, endDate], i) => ({ id: rowId(30 + i), label: label!, kind: "holiday", startDate: startDate!, endDate: endDate!, childIds: [] }));
    const { form } = await open(holidays);
    fillYear(form);
    expect(within(form).getByText("Nothing new to add: these breaks are already in your days off.")).toBeInTheDocument();
    expect(within(form).queryByText(/breaks? to add/)).toBeNull();
    expect(within(form).queryByRole("button", { name: "Add" })).toBeNull();
    expect(writes()).toEqual([]);
  });

  it("S7-07: a range with no breaks says so", async () => {
    const { user, form } = await open();
    fillYear(form);
    for (const box of within(form).getAllByRole("checkbox")) await user.click(box);
    expect(within(form).getByText("No breaks in this range.")).toBeInTheDocument();
    expect(within(form).queryByRole("button", { name: "Add" })).toBeNull();
    expect(writes()).toEqual([]);
  });
});
