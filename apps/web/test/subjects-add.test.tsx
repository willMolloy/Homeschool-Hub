import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const MATH = { id: "s1", name: "Math", color: "#2f6fb0", sortOrder: 0, archived: false };

async function openAdd() {
  const user = userEvent.setup();
  renderAt("/subjects");
  await user.click(await screen.findByRole("button", { name: "Add subject" }));
  return user;
}

describe("Add subject", () => {
  it("success appends the new subject and closes the form", async () => {
    fakeApi.on("GET /api/subjects", 200, [MATH]);
    fakeApi.on("POST /api/subjects", (body) => [201, { id: "c9", sortOrder: 1, archived: false, ...(body as object) }]);
    const user = await openAdd();
    const name = screen.getByLabelText("Name");
    expect(name).toHaveFocus();
    await user.type(name, "  Art  {Enter}");
    const list = await screen.findByRole("list", { name: "Subjects" });
    expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Math", "Art"]);
    expect(screen.queryByRole("form", { name: "Add subject" })).toBeNull();
    // Trimmed name; default color = first swatch Math isn't using (Math is blue → brick).
    expect(fakeApi.calls.at(-1)).toMatchObject({ method: "POST", path: "/api/subjects", body: { name: "Art", color: "#b0482f" } });
  });

  it("picking a swatch sends that color", async () => {
    fakeApi.on("GET /api/subjects", 200, []);
    fakeApi.on("POST /api/subjects", (body) => [201, { id: "c9", sortOrder: 0, archived: false, ...(body as object) }]);
    const user = await openAdd();
    await user.type(screen.getByLabelText("Name"), "Art");
    await user.click(screen.getByRole("radio", { name: "Purple" }));
    await user.click(screen.getByRole("button", { name: "Add" }));
    await screen.findByText("Art");
    expect(fakeApi.calls.at(-1)?.body).toEqual({ name: "Art", color: "#7a5cc2" });
  });

  it("empty name is caught before any request", async () => {
    fakeApi.on("GET /api/subjects", 200, []);
    const user = await openAdd();
    await user.type(screen.getByLabelText("Name"), "   {Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent("Name is required.");
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(fakeApi.calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("server validation error is shown under the field and the form stays open", async () => {
    fakeApi.on("GET /api/subjects", 200, []);
    fakeApi.on("POST /api/subjects", 400, { error: "invalid_request", message: "name: Name must be 60 characters or fewer." });
    const user = await openAdd();
    await user.type(screen.getByLabelText("Name"), "Art{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent(/^Name must be 60 characters or fewer\.$/);
    expect(screen.getByRole("form", { name: "Add subject" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
  });

  it("409 shows 'You already have a subject with that name.' under the field", async () => {
    fakeApi.on("GET /api/subjects", 200, [MATH]);
    fakeApi.on("POST /api/subjects", 409, { error: "duplicate_name", message: "You already have a subject with that name." });
    const user = await openAdd();
    await user.type(screen.getByLabelText("Name"), "math{Enter}");
    const err = await screen.findByRole("alert");
    expect(err).toHaveTextContent(/^You already have a subject with that name\.$/);
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-describedby", err.id);
    expect(screen.getByLabelText("Name")).toHaveValue("math");
  });

  it("Save is disabled while saving", async () => {
    fakeApi.on("GET /api/subjects", 200, []);
    let finish!: () => void;
    fakeApi.on("POST /api/subjects", () => new Promise((r) => (finish = () => r([201, { ...MATH, id: "c9", name: "Art" }]))));
    const user = await openAdd();
    await user.type(screen.getByLabelText("Name"), "Art{Enter}");
    expect(await screen.findByRole("button", { name: "Saving…" })).toBeDisabled();
    finish();
    expect(await screen.findByText("Art")).toBeInTheDocument();
  });

  it("Escape closes the form without saving", async () => {
    fakeApi.on("GET /api/subjects", 200, [MATH]);
    const user = await openAdd();
    await user.type(screen.getByLabelText("Name"), "Art");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("form", { name: "Add subject" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add subject" })).toBeInTheDocument();
    expect(fakeApi.calls.some((c) => c.method === "POST")).toBe(false);
  });
});
