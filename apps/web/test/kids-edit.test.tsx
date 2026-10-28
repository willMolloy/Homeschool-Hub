import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const FRANK = { id: "c1", name: "Frank", color: "#2f6fb0", sortOrder: 0, archived: false };
const MARGARET = { id: "c2", name: "Margaret", color: "#b0482f", sortOrder: 1, archived: false };
const OLD = { id: "c3", name: "Old Kid", color: null, sortOrder: 2, archived: true };

/** PATCH handler that merges the body into the matching fixture, like the real API. */
type Row = { id: string; name: string; color: string | null; sortOrder: number; archived: boolean };
function patchMerging(...rows: Row[]) {
  return (body: unknown, path: string) => {
    const row = rows.find((r) => path.endsWith(r.id));
    return row ? ([200, { ...row, ...(body as object) }] as [number, unknown]) : ([404, { error: "not_found" }] as [number, unknown]);
  };
}

const rowNames = () => within(screen.getByRole("list", { name: "Kids" })).getAllByRole("listitem").map((li) => li.textContent);

async function setup(rows = [FRANK, MARGARET]) {
  fakeApi.on("GET /api/children", 200, rows);
  for (const r of [FRANK, MARGARET, OLD]) fakeApi.on(`PATCH /api/children/${r.id}`, patchMerging(r));
  const user = userEvent.setup();
  renderAt("/kids");
  await screen.findByRole("list", { name: "Kids" });
  return user;
}

describe("Edit child", () => {
  it("tapping a row opens a pre-filled form; rename updates the row in place", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Frank" }));
    const form = screen.getByRole("form", { name: "Edit Frank" });
    const name = within(form).getByLabelText("Name");
    expect(name).toHaveValue("Frank");
    expect(within(form).getByRole("radio", { name: "Blue" })).toBeChecked();
    await user.clear(name);
    await user.type(name, "Francis{Enter}");
    expect(await screen.findByRole("button", { name: "Francis" })).toBeInTheDocument();
    expect(rowNames()).toEqual(["Francis", "Margaret"]);
    // Only the changed field is sent.
    expect(fakeApi.calls.at(-1)).toMatchObject({ method: "PATCH", path: "/api/children/c1", body: { name: "Francis" } });
  });

  it("recolor sends only the color", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Margaret" }));
    await user.click(screen.getByRole("radio", { name: "Green" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByRole("button", { name: "Margaret" });
    expect(fakeApi.calls.at(-1)?.body).toEqual({ color: "#2f8f6f" });
  });

  it("archive asks for confirmation, then hides the row", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Frank" }));
    await user.click(screen.getByRole("button", { name: "Archive" }));
    const dialog = screen.getByRole("dialog", { name: "Archive Frank?" });
    expect(dialog).toHaveTextContent("Past work and history stay; it is hidden from planning and lists.");
    expect(fakeApi.calls.some((c) => c.method === "PATCH")).toBe(false);
    await user.click(within(dialog).getByRole("button", { name: "Archive" }));
    await screen.findByRole("button", { name: "Add child" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(rowNames()).toEqual(["Margaret"]);
    expect(fakeApi.calls.at(-1)).toMatchObject({ method: "PATCH", path: "/api/children/c1", body: { archived: true } });
  });

  it("cancel in the confirm leaves the child untouched", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Frank" }));
    await user.click(screen.getByRole("button", { name: "Archive" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("form", { name: "Edit Frank" })).toBeInTheDocument();
    expect(fakeApi.calls.some((c) => c.method === "PATCH")).toBe(false);
    await user.keyboard("{Escape}");
    expect(rowNames()).toEqual(["Frank", "Margaret"]);
  });

  it("with 'Show archived' on, archiving keeps the row and tags it; unarchive clears the tag", async () => {
    fakeApi.on("GET /api/children?includeArchived=true", 200, [FRANK, MARGARET, OLD]);
    const user = await setup();
    await user.click(screen.getByLabelText("Show archived"));
    await screen.findByText("Old Kid");
    await user.click(screen.getByRole("button", { name: "Frank" }));
    await user.click(screen.getByRole("button", { name: "Archive" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Archive" }));
    expect(await screen.findByRole("button", { name: "Frank Archived" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Old Kid Archived" }));
    await user.click(screen.getByRole("button", { name: "Unarchive" }));
    expect(await screen.findByRole("button", { name: "Old Kid" })).toBeInTheDocument();
    expect(fakeApi.calls.at(-1)).toMatchObject({ path: "/api/children/c3", body: { archived: false } });
  });

  it("an archive failure is shown in the dialog and nothing changes", async () => {
    const user = await setup();
    fakeApi.on("PATCH /api/children/c1", 500, { error: "internal_error" });
    await user.click(screen.getByRole("button", { name: "Frank" }));
    await user.click(screen.getByRole("button", { name: "Archive" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Archive" }));
    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent("Couldn't save. Please try again.");
  });
});
