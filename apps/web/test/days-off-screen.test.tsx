import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { BlockedRange } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, MAGGIE, patchMerging, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

const THANKS: BlockedRange = { id: rowId(11), label: "Thanksgiving", kind: "holiday", startDate: "2026-11-25", endDate: "2026-11-27", childIds: [] };
const DENTIST: BlockedRange = { id: rowId(12), label: null, kind: "sick", startDate: "2026-11-04", endDate: "2026-11-04", childIds: [MAGGIE.id] };

async function setup(rows = [THANKS, DENTIST]) {
  withRoster();
  fakeApi.on("GET /api/blocked-ranges", 200, rows);
  for (const r of rows) {
    fakeApi.on(`PATCH /api/blocked-ranges/${r.id}`, patchMerging(r));
    fakeApi.on(`DELETE /api/blocked-ranges/${r.id}`, 204);
  }
  const user = userEvent.setup();
  renderAt("/schedule/days-off");
  await screen.findByRole("list", { name: "Days off" });
  return user;
}
const cards = () => within(screen.getByRole("list", { name: "Days off" })).getAllByRole("listitem");
const date = (label: string, value: string, scope: HTMLElement) => fireEvent.change(within(scope).getByLabelText(label), { target: { value } });

describe("Days off screen", () => {
  it("list: sorted by start, kind, who and length", async () => {
    await setup();
    const [first, second] = cards();
    expect(first).toHaveTextContent("Sick day");
    expect(first).toHaveTextContent("Maggie");
    expect(first).toHaveTextContent("Nov 4, 2026 (1 day)");
    expect(second).toHaveTextContent("Thanksgiving");
    expect(second).toHaveTextContent("Holiday · Whole family");
    expect(second).toHaveTextContent("Nov 25, 2026 – Nov 27, 2026 (3 days)");
    // No archive for days off.
    expect(screen.queryByLabelText("Show archived")).toBeNull();
  });

  it("an existing missed day is still listed as Missed day and stays editable, but can't be added from the form (S6-04)", async () => {
    const MISSED: BlockedRange = { id: rowId(13), label: null, kind: "missed", startDate: "2026-11-03", endDate: "2026-11-03", childIds: [] };
    const user = await setup([MISSED]);
    expect(cards()[0]).toHaveTextContent("Missed day");
    await user.click(screen.getByRole("button", { name: "Add days off" }));
    const form = screen.getByRole("form", { name: "Add days off" });
    expect(within(within(form).getByLabelText("Kind")).queryByRole("option", { name: "Missed day" })).toBeNull();
  });

  it("empty and error states", async () => {
    withRoster();
    fakeApi.on("GET /api/blocked-ranges", 200, []);
    const { unmount } = renderAt("/schedule/days-off");
    expect(await screen.findByText("No days off yet.")).toBeInTheDocument();
    unmount();
    fakeApi.on("GET /api/blocked-ranges", 500, { error: "internal" });
    renderAt("/schedule/days-off");
    expect(await screen.findByText("Couldn't load days off.")).toBeInTheDocument();
  });

  it("add: whole family → childIds [] and blank label → null", async () => {
    const user = await setup();
    fakeApi.on("POST /api/blocked-ranges", (body) => [201, { ...(body as object), id: rowId(19) }]);
    await user.click(screen.getByRole("button", { name: "Add days off" }));
    const form = screen.getByRole("form", { name: "Add days off" });
    expect(within(form).getByRole("radio", { name: "Whole family" })).toBeChecked();
    expect(within(form).queryByRole("checkbox", { name: "Frank" })).toBeNull();
    date("First day", "2026-12-21", form);
    date("Last day", "2027-01-01", form);
    await user.click(within(form).getByRole("button", { name: "Add" }));
    expect(writes()).toEqual([{
      method: "POST", path: "/api/blocked-ranges",
      body: { label: null, kind: "vacation", startDate: "2026-12-21", endDate: "2027-01-01", childIds: [] },
    }]);
    expect(await screen.findByText("Dec 21, 2026 – Jan 1, 2027 (12 days)")).toBeInTheDocument();
  });

  it("add for some children; none picked → error, no request", async () => {
    const user = await setup();
    fakeApi.on("POST /api/blocked-ranges", (body) => [201, { ...(body as object), id: rowId(19) }]);
    await user.click(screen.getByRole("button", { name: "Add days off" }));
    const form = screen.getByRole("form", { name: "Add days off" });
    await user.selectOptions(within(form).getByLabelText("Kind"), "other");
    await user.type(within(form).getByLabelText("Label (optional)"), "Camp");
    date("First day", "2026-11-09", form);
    date("Last day", "2026-11-13", form);
    await user.click(within(form).getByRole("radio", { name: "Only some children" }));
    await user.click(within(form).getByRole("button", { name: "Add" }));
    expect(within(form).getByText("Pick at least one child, or choose Whole family.")).toBeInTheDocument();
    expect(writes()).toEqual([]);
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    await user.click(within(form).getByRole("button", { name: "Add" }));
    expect(writes()[0]!.body).toEqual({ label: "Camp", kind: "other", startDate: "2026-11-09", endDate: "2026-11-13", childIds: [FRANK.id] });
  });

  it("edit: only changed fields; switching to whole family sends []", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Sick day/ }));
    const form = screen.getByRole("form", { name: "Edit Sick day" });
    expect(within(form).getByRole("radio", { name: "Only some children" })).toBeChecked();
    expect(within(form).getByRole("checkbox", { name: "Maggie" })).toBeChecked();
    date("Last day", "2026-11-05", form);
    await user.click(within(form).getByRole("radio", { name: "Whole family" }));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([{ method: "PATCH", path: `/api/blocked-ranges/${DENTIST.id}`, body: { endDate: "2026-11-05", childIds: [] } }]);
    expect(await screen.findByText("Nov 4, 2026 – Nov 5, 2026 (2 days)")).toBeInTheDocument();
  });

  it("edit: clearing the label sends null", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Thanksgiving/ }));
    const form = screen.getByRole("form", { name: "Edit Thanksgiving" });
    await user.clear(within(form).getByLabelText("Label (optional)"));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([{ method: "PATCH", path: `/api/blocked-ranges/${THANKS.id}`, body: { label: null } }]);
  });

  it("delete asks first: Cancel keeps it, Delete removes it", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Thanksgiving/ }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    let dialog = screen.getByRole("dialog", { name: "Delete Thanksgiving?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(writes()).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    dialog = screen.getByRole("dialog", { name: "Delete Thanksgiving?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(writes()).toEqual([{ method: "DELETE", path: `/api/blocked-ranges/${THANKS.id}`, body: undefined }]);
    expect(screen.queryByText("Thanksgiving")).toBeNull();
    expect(cards()).toHaveLength(1);
  });

  it("delete failure is shown in the dialog", async () => {
    const user = await setup();
    fakeApi.on(`DELETE /api/blocked-ranges/${THANKS.id}`, 404, { error: "not_found", message: "No such day off." });
    await user.click(screen.getByRole("button", { name: /Thanksgiving/ }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", { name: "Delete Thanksgiving?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(await within(dialog).findByText("That item no longer exists. Reload the page.")).toBeInTheDocument();
  });

  it("end before start → error, no request", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Thanksgiving/ }));
    const form = screen.getByRole("form", { name: "Edit Thanksgiving" });
    date("Last day", "2026-11-20", form);
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(within(form).getByText("The end date must be on or after the start date.")).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });

  it("more than 366 days → error, no request", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Thanksgiving/ }));
    const form = screen.getByRole("form", { name: "Edit Thanksgiving" });
    date("Last day", "2027-11-26", form);
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(within(form).getByText("That range is 367 days; the most allowed is 366.")).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });

  it("server 400 shown in the form", async () => {
    const user = await setup();
    fakeApi.on(`PATCH /api/blocked-ranges/${THANKS.id}`, 400, { error: "invalid_body", message: "label: Label can't contain a NUL character." });
    await user.click(screen.getByRole("button", { name: /Thanksgiving/ }));
    const form = screen.getByRole("form", { name: "Edit Thanksgiving" });
    await user.type(within(form).getByLabelText("Label (optional)"), "!");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(await within(form).findByText("Label can't contain a NUL character.")).toBeInTheDocument();
  });
});
