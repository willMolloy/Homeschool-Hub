import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const MATH = { id: "s1", name: "Math", color: "#2f6fb0", sortOrder: 0, archived: false };
const READING = { id: "s2", name: "Reading", color: "#b0482f", sortOrder: 1, archived: false };
const OLD_LATIN = { id: "s3", name: "Old Latin", color: null, sortOrder: 2, archived: true };

/** PATCH handler that merges the body into the matching fixture, like the real API. */
type Row = { id: string; name: string; color: string | null; sortOrder: number; archived: boolean };
function patchMerging(...rows: Row[]) {
  return (body: unknown, path: string) => {
    const row = rows.find((r) => path.endsWith(r.id));
    return row ? ([200, { ...row, ...(body as object) }] as [number, unknown]) : ([404, { error: "not_found" }] as [number, unknown]);
  };
}

const rowNames = () => within(screen.getByRole("list", { name: "Subjects" })).getAllByRole("listitem").map((li) => li.textContent);

async function setup(rows = [MATH, READING]) {
  fakeApi.on("GET /api/subjects", 200, rows);
  for (const r of [MATH, READING, OLD_LATIN]) fakeApi.on(`PATCH /api/subjects/${r.id}`, patchMerging(r));
  const user = userEvent.setup();
  renderAt("/subjects");
  await screen.findByRole("list", { name: "Subjects" });
  return user;
}

describe("Edit subject", () => {
  it("tapping a row opens a pre-filled form; rename updates the row in place", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Math" }));
    const form = screen.getByRole("form", { name: "Edit Math" });
    const name = within(form).getByLabelText("Name");
    expect(name).toHaveValue("Math");
    expect(within(form).getByRole("radio", { name: "Blue" })).toBeChecked();
    await user.clear(name);
    await user.type(name, "Maths{Enter}");
    expect(await screen.findByRole("button", { name: "Maths" })).toBeInTheDocument();
    expect(rowNames()).toEqual(["Maths", "Reading"]);
    // Only the changed field is sent.
    expect(fakeApi.calls.at(-1)).toMatchObject({ method: "PATCH", path: "/api/subjects/s1", body: { name: "Maths" } });
  });

  it("recolor sends only the color", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Reading" }));
    await user.click(screen.getByRole("radio", { name: "Green" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByRole("button", { name: "Reading" });
    expect(fakeApi.calls.at(-1)?.body).toEqual({ color: "#2f8f6f" });
  });

  it("archive asks for confirmation, then hides the row", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Math" }));
    await user.click(screen.getByRole("button", { name: "Archive" }));
    const dialog = screen.getByRole("dialog", { name: "Archive Math?" });
    expect(dialog).toHaveTextContent("Past work and history stay; it is hidden from planning and lists.");
    expect(fakeApi.calls.some((c) => c.method === "PATCH")).toBe(false);
    await user.click(within(dialog).getByRole("button", { name: "Archive" }));
    await screen.findByRole("button", { name: "Add subject" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(rowNames()).toEqual(["Reading"]);
    expect(fakeApi.calls.at(-1)).toMatchObject({ method: "PATCH", path: "/api/subjects/s1", body: { archived: true } });
  });

  it("cancel in the confirm leaves the subject untouched", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Math" }));
    await user.click(screen.getByRole("button", { name: "Archive" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("form", { name: "Edit Math" })).toBeInTheDocument();
    expect(fakeApi.calls.some((c) => c.method === "PATCH")).toBe(false);
    await user.keyboard("{Escape}");
    expect(rowNames()).toEqual(["Math", "Reading"]);
  });

  it("with 'Show archived' on, archiving keeps the row and tags it; unarchive clears the tag", async () => {
    fakeApi.on("GET /api/subjects?includeArchived=true", 200, [MATH, READING, OLD_LATIN]);
    const user = await setup();
    await user.click(screen.getByLabelText("Show archived"));
    await screen.findByText("Old Latin");
    await user.click(screen.getByRole("button", { name: "Math" }));
    await user.click(screen.getByRole("button", { name: "Archive" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Archive" }));
    expect(await screen.findByRole("button", { name: "Math Archived" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Old Latin Archived" }));
    await user.click(screen.getByRole("button", { name: "Unarchive" }));
    expect(await screen.findByRole("button", { name: "Old Latin" })).toBeInTheDocument();
    expect(fakeApi.calls.at(-1)).toMatchObject({ path: "/api/subjects/s3", body: { archived: false } });
  });

  it("rename onto an existing name → 409 message under the field", async () => {
    const user = await setup();
    fakeApi.on("PATCH /api/subjects/s1", 409, { error: "duplicate_name", message: "You already have a subject with that name." });
    await user.click(screen.getByRole("button", { name: "Math" }));
    const name = screen.getByLabelText("Name");
    await user.clear(name);
    await user.type(name, "reading{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("You already have a subject with that name.");
    expect(screen.getByRole("form", { name: "Edit Math" })).toBeInTheDocument();
  });

  it("unarchive into a name clash → 409 message, row stays archived", async () => {
    fakeApi.on("GET /api/subjects?includeArchived=true", 200, [MATH, READING, OLD_LATIN]);
    const user = await setup();
    fakeApi.on("PATCH /api/subjects/s3", 409, { error: "duplicate_name", message: "You already have a subject with that name." });
    await user.click(screen.getByLabelText("Show archived"));
    await user.click(await screen.findByRole("button", { name: "Old Latin Archived" }));
    await user.click(screen.getByRole("button", { name: "Unarchive" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You already have a subject with that name.");
    expect(screen.getByRole("form", { name: "Edit Old Latin" })).toBeInTheDocument();
  });

  it("an archive failure is shown in the dialog and nothing changes", async () => {
    const user = await setup();
    fakeApi.on("PATCH /api/subjects/s1", 500, { error: "internal_error" });
    await user.click(screen.getByRole("button", { name: "Math" }));
    await user.click(screen.getByRole("button", { name: "Archive" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Archive" }));
    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent("Couldn't save. Please try again.");
  });
});
