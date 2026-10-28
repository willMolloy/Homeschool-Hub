import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { FamilySettings } from "../src/api/types";
import { timeZoneOptions } from "../src/features/schedule/FamilySettingsPage";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const SETTINGS: FamilySettings = { name: "Demo family", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago" };

async function open(settings: FamilySettings = SETTINGS) {
  fakeApi.on("GET /api/family", 200, settings);
  const user = userEvent.setup();
  renderAt("/schedule/settings");
  await screen.findByRole("form", { name: "Family settings" });
  return user;
}
const patches = () => fakeApi.calls.filter((c) => c.method === "PATCH");

describe("Family settings form", () => {
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
    await user.selectOptions(screen.getByLabelText("Time zone"), "America/Denver");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Saved.");
    expect(patches()[0]!.body).toEqual({ timeZone: "America/Denver" });
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
    await user.selectOptions(screen.getByLabelText("Time zone"), "Asia/Tokyo");
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

  it("an unlisted current zone (e.g. an alias) is offered first", () => {
    expect(timeZoneOptions("US/Central")[0]).toBe("US/Central");
    expect(timeZoneOptions("America/Chicago")).not.toContain("US/Central");
    expect(timeZoneOptions("America/Chicago")).toContain("America/Chicago");
  });
});
