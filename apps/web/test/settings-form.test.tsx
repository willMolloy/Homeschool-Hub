import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { FamilySettings } from "../src/api/types";
import { timeZoneOptions, WEEK_START_LOCKED_HINT } from "../src/features/schedule/FamilySettingsPage";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const SETTINGS: FamilySettings = { name: "Demo family", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false };

async function open(settings: FamilySettings = SETTINGS) {
  fakeApi.on("GET /api/family", 200, settings);
  const user = userEvent.setup();
  renderAt("/schedule/settings");
  await screen.findByRole("form", { name: "Family settings" });
  return user;
}
const patches = () => fakeApi.calls.filter((c) => c.method === "PATCH");

describe("Family settings form", () => {
  describe("week start lock (S2c-01)", () => {
    const MSG = "weekStart: the week start can't change after weeks have been checked in.";

    it("locked: the week start choices are disabled with a hint", async () => {
      await open({ ...SETTINGS, weekStartLocked: true });
      expect(screen.getByRole("radio", { name: "Sunday" })).toBeDisabled();
      expect(screen.getByRole("radio", { name: "Monday" })).toBeDisabled();
      expect(screen.getByText(WEEK_START_LOCKED_HINT)).toBeInTheDocument();
      expect(screen.getByRole("group", { name: "Week starts on" })).toHaveAccessibleDescription(WEEK_START_LOCKED_HINT);
      // Other fields still edit.
      expect(screen.getByRole("checkbox", { name: "Friday" })).toBeEnabled();
    });

    it("unlocked: no hint", async () => {
      await open();
      expect(screen.getByRole("radio", { name: "Sunday" })).toBeEnabled();
      expect(screen.queryByText(WEEK_START_LOCKED_HINT)).not.toBeInTheDocument();
    });

    it("a 409 (weeks checked in meanwhile) shows the message under Week starts on and locks the choices", async () => {
      fakeApi.on("PATCH /api/family", 409, { error: "week_start_locked", message: MSG });
      const user = await open();
      await user.click(screen.getByRole("radio", { name: "Sunday" }));
      await user.click(screen.getByRole("button", { name: "Save" }));
      const group = screen.getByRole("group", { name: "Week starts on" });
      expect(await within(group).findByRole("alert")).toHaveTextContent("the week start can't change after weeks have been checked in.");
      expect(within(group).getByRole("radio", { name: "Monday" })).toBeChecked();
      expect(within(group).getByRole("radio", { name: "Monday" })).toBeDisabled();
      expect(screen.getByText(WEEK_START_LOCKED_HINT)).toBeInTheDocument();
      expect(screen.queryByText("Saved.")).not.toBeInTheDocument();
    });
  });

  it("loads current values", async () => {
    await open({ ...SETTINGS, weekStart: "sun", schoolDays: [1, 3], timeZone: "Europe/London" });
    expect(screen.getByLabelText("Family name")).toHaveValue("Demo family");
    expect(screen.getByRole("radio", { name: "Sunday" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Monday" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Tuesday" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Wednesday" })).toBeChecked();
    expect(screen.getByLabelText("Time zone")).toHaveValue("Europe/London");
  });

  it("submits only changed fields, then shows Saved", async () => {
    fakeApi.on("PATCH /api/family", (body) => [200, { ...SETTINGS, ...(body as object) }]);
    const user = await open();
    await user.click(screen.getByRole("checkbox", { name: "Friday" }));
    await user.click(screen.getByRole("radio", { name: "Sunday" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(patches()).toEqual([{ method: "PATCH", path: "/api/family", body: { weekStart: "sun", schoolDays: [1, 2, 3, 4] } }]);
    // /api/me is re-asked after the save (the plan view's columns and week start come from it).
    const order = fakeApi.calls.map((c) => `${c.method} ${c.path}`);
    expect(order.lastIndexOf("GET /api/me")).toBeGreaterThan(order.indexOf("PATCH /api/family"));
  });

  it("time zone change sends only timeZone", async () => {
    fakeApi.on("PATCH /api/family", (body) => [200, { ...SETTINGS, ...(body as object) }]);
    const user = await open();
    await screen.findByRole("option", { name: "America/New York" });
    await user.selectOptions(screen.getByLabelText("Time zone"), "America/New_York");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Saved.");
    expect(patches()[0]!.body).toEqual({ timeZone: "America/New_York" });
  });

  it("nothing changed → no request", async () => {
    const user = await open();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Nothing to save.")).toBeInTheDocument();
    expect(patches()).toEqual([]);
  });

  it("no school days → error, no request", async () => {
    const user = await open({ ...SETTINGS, schoolDays: [1] });
    await user.click(screen.getByRole("checkbox", { name: "Monday" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Pick at least one school day.")).toBeInTheDocument();
    expect(patches()).toEqual([]);
  });

  it("blank name → error, no request", async () => {
    const user = await open();
    await user.clear(screen.getByLabelText("Family name"));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    expect(screen.getByLabelText("Family name")).toHaveAttribute("aria-invalid", "true");
    expect(patches()).toEqual([]);
  });

  it("server 400 → message shown", async () => {
    fakeApi.on("PATCH /api/family", 400, { error: "invalid_body", message: "timeZone: Unknown time zone." });
    const user = await open();
    await screen.findByRole("option", { name: "Asia/Kolkata" });
    await user.selectOptions(screen.getByLabelText("Time zone"), "Asia/Kolkata");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unknown time zone.");
  });

  it("header name updates after save", async () => {
    let me = { ...DEMO_ME };
    fakeApi.on("GET /api/me", () => [200, me]);
    fakeApi.on("PATCH /api/family", (body) => {
      me = { ...me, ...(body as object) };
      return [200, { ...SETTINGS, ...(body as object) }];
    });
    const user = await open();
    const header = screen.getByRole("banner");
    expect(within(header).getByText("Demo family")).toBeInTheDocument();
    const name = screen.getByLabelText("Family name");
    await user.clear(name);
    await user.type(name, "  The Smiths ");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Saved.");
    expect(within(header).getByText("The Smiths")).toBeInTheDocument();
    expect(patches()[0]!.body).toEqual({ name: "The Smiths" });
  });

  it("load failure → Retry", async () => {
    fakeApi.on("GET /api/family", 500, { error: "internal" });
    renderAt("/schedule/settings");
    expect(await screen.findByText("Couldn't load your settings.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  // S2a-17: the picker shows the server's list (GET /api/timezones), never the browser's (tester T2-3).
  it("timeZoneOptions: the server's zones, with an unlisted current zone first", () => {
    expect(timeZoneOptions("Etc/GMT-14", ["America/Chicago", "UTC"])).toEqual(["Etc/GMT-14", "America/Chicago", "UTC"]);
    expect(timeZoneOptions("UTC", ["America/Chicago", "UTC"])).toEqual(["America/Chicago", "UTC"]);
    expect(timeZoneOptions("America/Chicago", undefined)).toEqual(["America/Chicago"]);
  });

  it("the picker lists exactly the server's zones, not the browser's", async () => {
    fakeApi.on("GET /api/timezones", 200, { zones: ["America/Chicago", "Asia/Kolkata", "UTC"] });
    await open();
    const select = screen.getByLabelText("Time zone");
    await waitFor(() => expect(within(select).getAllByRole("option")).toHaveLength(3));
    expect(within(select).getAllByRole("option").map((o) => (o as HTMLOptionElement).value)).toEqual(["America/Chicago", "Asia/Kolkata", "UTC"]);
    expect(within(select).queryByRole("option", { name: "America/Coyhaique" })).toBeNull();
    expect(screen.queryByText(/Couldn't load the time-zone list/)).toBeNull();
  });

  it("picking a server zone sends it", async () => {
    fakeApi.on("GET /api/timezones", 200, { zones: ["America/Chicago", "Asia/Kolkata", "UTC"] });
    fakeApi.on("PATCH /api/family", (body) => [200, { ...SETTINGS, ...(body as object) }]);
    const user = await open();
    const select = screen.getByLabelText("Time zone");
    await waitFor(() => expect(within(select).getAllByRole("option")).toHaveLength(3));
    await user.selectOptions(select, "Asia/Kolkata");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Saved.");
    expect(patches()[0]!.body).toEqual({ timeZone: "Asia/Kolkata" });
  });

  it("if the list fails, only the stored zone is offered, with a note", async () => {
    fakeApi.on("GET /api/timezones", 500, { error: "internal_error" });
    await open({ ...SETTINGS, timeZone: "Europe/London" });
    expect(await screen.findByText(/Couldn't load the time-zone list/)).toBeInTheDocument();
    const options = within(screen.getByLabelText("Time zone")).getAllByRole("option");
    expect(options.map((o) => (o as HTMLOptionElement).value)).toEqual(["Europe/London"]);
  });
});
