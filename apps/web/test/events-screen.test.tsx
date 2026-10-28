import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ScheduleEvent } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, LATIN, MAGGIE, MATH, patchMerging, READING, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

const COOP: ScheduleEvent = {
  id: rowId(21), name: "Co-op", weekdays: [3], startDate: "2026-09-02", endDate: "2027-05-26", capacityFraction: 0.5,
  defaultRule: "lighter", subjectRules: { [MATH.id]: "normal", [LATIN.id]: "skip" }, childIds: [], archived: false,
};
const PIANO: ScheduleEvent = {
  id: rowId(22), name: "Piano", weekdays: [2, 4], startDate: null, endDate: null, capacityFraction: 0.75,
  defaultRule: "normal", subjectRules: { [READING.id]: "lighter" }, childIds: [MAGGIE.id], archived: false,
};
const SWIM: ScheduleEvent = {
  id: rowId(23), name: "Swim team", weekdays: [1, 5], startDate: null, endDate: "2026-06-01", capacityFraction: 0.5,
  defaultRule: "skip", subjectRules: {}, childIds: [FRANK.id], archived: true,
};

async function setup(rows = [PIANO, COOP]) {
  withRoster();
  fakeApi.on("GET /api/events", 200, rows);
  fakeApi.on("GET /api/events?includeArchived=true", 200, [...rows, SWIM]);
  for (const r of [...rows, SWIM]) fakeApi.on(`PATCH /api/events/${r.id}`, patchMerging(r));
  const user = userEvent.setup();
  renderAt("/schedule/events");
  await screen.findByRole("list", { name: "Events" });
  return user;
}
const cards = () => within(screen.getByRole("list", { name: "Events" })).getAllByRole("listitem");
const date = (label: string, value: string, scope: HTMLElement) => fireEvent.change(within(scope).getByLabelText(label), { target: { value } });

describe("Events screen", () => {
  it("list: by name, with days, who, rules and dates", async () => {
    await setup();
    const [coop, piano] = cards();
    expect(coop).toHaveTextContent("Co-op");
    expect(coop).toHaveTextContent("Wed · Whole family");
    expect(coop).toHaveTextContent("Lighter by default (50%) · Skip: Latin · Normal: Math");
    expect(coop).toHaveTextContent("Sep 2, 2026 – May 26, 2027");
    expect(piano).toHaveTextContent("Tue, Thu · Maggie");
    expect(piano).toHaveTextContent("Normal by default · Lighter (75%): Reading");
    expect(piano).toHaveTextContent("Ongoing");
  });

  it("empty and error states", async () => {
    withRoster();
    fakeApi.on("GET /api/events", 200, []);
    const { unmount } = renderAt("/schedule/events");
    expect(await screen.findByText(/No events yet/)).toBeInTheDocument();
    unmount();
    fakeApi.on("GET /api/events", 500, { error: "internal" });
    renderAt("/schedule/events");
    expect(await screen.findByText("Couldn't load events.")).toBeInTheDocument();
  });

  it("add with rules: only non-default rules sent, % → fraction, blank dates → null", async () => {
    const user = await setup();
    fakeApi.on("POST /api/events", (body) => [201, { ...(body as object), id: rowId(29), archived: false }]);
    await user.click(screen.getByRole("button", { name: "Add event" }));
    const form = screen.getByRole("form", { name: "Add event" });
    // Archived subjects are not offered.
    expect(within(form).queryByLabelText("Latin")).toBeNull();
    expect(within(form).getByLabelText("Math")).toHaveValue("");
    await user.type(within(form).getByLabelText("Name"), "  Field trip day ");
    await user.click(within(form).getByRole("checkbox", { name: "Friday" }));
    await user.click(within(form).getByRole("checkbox", { name: "Monday" }));
    await user.selectOptions(within(form).getByLabelText("Default for subjects"), "lighter");
    await user.selectOptions(within(form).getByLabelText("Math"), "skip");
    await user.clear(within(form).getByLabelText("Left on a lighter day (%)"));
    await user.type(within(form).getByLabelText("Left on a lighter day (%)"), "33.3");
    await user.click(within(form).getByRole("button", { name: "Add" }));
    expect(writes()).toEqual([{
      method: "POST", path: "/api/events",
      body: {
        name: "Field trip day", weekdays: [1, 5], startDate: null, endDate: null, capacityFraction: 0.333,
        defaultRule: "lighter", subjectRules: { [MATH.id]: "skip" }, childIds: [],
      },
    }]);
    expect(await screen.findByText("Field trip day")).toBeInTheDocument();
  });

  it("no weekdays → error, no request", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Add event" }));
    const form = screen.getByRole("form", { name: "Add event" });
    await user.type(within(form).getByLabelText("Name"), "Nothing");
    await user.click(within(form).getByRole("button", { name: "Add" }));
    expect(within(form).getByText("Pick at least one day.")).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });

  it("other client checks: name, dates, capacity, children", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Add event" }));
    const form = screen.getByRole("form", { name: "Add event" });
    await user.click(within(form).getByRole("checkbox", { name: "Monday" }));
    date("Starts (optional)", "2026-11-10", form);
    date("Ends (optional)", "2026-11-09", form);
    await user.clear(within(form).getByLabelText("Left on a lighter day (%)"));
    await user.type(within(form).getByLabelText("Left on a lighter day (%)"), "120");
    await user.click(within(form).getByRole("radio", { name: "Only some children" }));
    await user.click(within(form).getByRole("button", { name: "Add" }));
    for (const msg of ["Name is required.", "The end date must be on or after the start date.", "Enter a number from 0 to 100.", "Pick at least one child, or choose Whole family."]) {
      expect(within(form).getByText(msg)).toBeInTheDocument();
    }
    expect(writes()).toEqual([]);
  });

  it("edit replaces the rules: the whole active set is sent", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Piano/ }));
    const form = screen.getByRole("form", { name: "Edit Piano" });
    expect(within(form).getByLabelText("Reading")).toHaveValue("lighter");
    expect(within(form).getByLabelText("Left on a lighter day (%)")).toHaveValue(75);
    await user.selectOptions(within(form).getByLabelText("Math"), "skip");
    await user.selectOptions(within(form).getByLabelText("Reading"), "");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([{ method: "PATCH", path: `/api/events/${PIANO.id}`, body: { subjectRules: { [MATH.id]: "skip" } } }]);
    expect(await screen.findByText(/Skip: Math/)).toBeInTheDocument();
  });

  it("edit without touching rules leaves archived-subject rules alone", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Co-op/ }));
    const form = screen.getByRole("form", { name: "Edit Co-op" });
    expect(within(form).getByText(/archived subject Latin/)).toBeInTheDocument();
    date("Ends (optional)", "", form);
    await user.click(within(form).getByRole("checkbox", { name: "Friday" }));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([{ method: "PATCH", path: `/api/events/${COOP.id}`, body: { weekdays: [3, 5], endDate: null } }]);
  });

  it("no changes → closes without a request", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Piano/ }));
    await user.click(within(screen.getByRole("form", { name: "Edit Piano" })).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([]);
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("archive (confirmed) removes the card; Show archived lists it and Unarchive works", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Piano/ }));
    await user.click(screen.getByRole("button", { name: "Archive" }));
    const dialog = screen.getByRole("dialog", { name: "Archive Piano?" });
    await user.click(within(dialog).getByRole("button", { name: "Archive" }));
    expect(writes()).toEqual([{ method: "PATCH", path: `/api/events/${PIANO.id}`, body: { archived: true } }]);
    expect(screen.queryByText("Piano")).toBeNull();

    await user.click(screen.getByLabelText("Show archived"));
    const swim = await screen.findByRole("button", { name: /Swim team/ });
    expect(swim).toHaveTextContent("Archived");
    expect(swim).toHaveTextContent("Mon, Fri · Frank");
    expect(swim).toHaveTextContent("Until Jun 1, 2026");
    await user.click(swim);
    await user.click(within(screen.getByRole("form", { name: "Edit Swim team" })).getByRole("button", { name: "Unarchive" }));
    expect(writes().at(-1)).toEqual({ method: "PATCH", path: `/api/events/${SWIM.id}`, body: { archived: false } });
  });

  it("server 400 shown in the form", async () => {
    const user = await setup();
    fakeApi.on(`PATCH /api/events/${PIANO.id}`, 400, { error: "invalid_reference", message: "subjectRules: Unknown or archived subject." });
    await user.click(screen.getByRole("button", { name: /Piano/ }));
    const form = screen.getByRole("form", { name: "Edit Piano" });
    await user.selectOptions(within(form).getByLabelText("Math"), "normal");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(await within(form).findByText("Unknown or archived subject.")).toBeInTheDocument();
  });
});
