import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const FRANK = { id: "c1", name: "Frank", color: "#2f6fb0", sortOrder: 0, archived: false };

async function openAdd() {
  const user = userEvent.setup();
  renderAt("/kids");
  await user.click(await screen.findByRole("button", { name: "Add child" }));
  return user;
}

describe("Add child", () => {
  it("success appends the new child and closes the form", async () => {
    fakeApi.on("GET /api/children", 200, [FRANK]);
    fakeApi.on("POST /api/children", (body) => [201, { id: "c9", sortOrder: 1, archived: false, ...(body as object) }]);
    const user = await openAdd();
    const name = screen.getByLabelText("Name");
    expect(name).toHaveFocus();
    await user.type(name, "  Ada  {Enter}");
    const list = await screen.findByRole("list", { name: "Kids" });
    expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Frank", "Ada"]);
    expect(screen.queryByRole("form", { name: "Add child" })).toBeNull();
    // Trimmed name; default color = first swatch Frank isn't using (Frank is blue → brick).
    expect(fakeApi.calls.at(-1)).toMatchObject({ method: "POST", path: "/api/children", body: { name: "Ada", color: "#b0482f" } });
  });

  it("picking a swatch sends that color", async () => {
    fakeApi.on("GET /api/children", 200, []);
    fakeApi.on("POST /api/children", (body) => [201, { id: "c9", sortOrder: 0, archived: false, ...(body as object) }]);
    const user = await openAdd();
    await user.type(screen.getByLabelText("Name"), "Ada");
    await user.click(screen.getByRole("radio", { name: "Purple" }));
    await user.click(screen.getByRole("button", { name: "Add" }));
    await screen.findByText("Ada");
    expect(fakeApi.calls.at(-1)?.body).toEqual({ name: "Ada", color: "#7a5cc2" });
  });

  it("empty name is caught before any request", async () => {
    fakeApi.on("GET /api/children", 200, []);
    const user = await openAdd();
    await user.type(screen.getByLabelText("Name"), "   {Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent("Name is required.");
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(fakeApi.calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("server validation error is shown under the field and the form stays open", async () => {
    fakeApi.on("GET /api/children", 200, []);
    fakeApi.on("POST /api/children", 400, { error: "invalid_request", message: "name: Name must be 60 characters or fewer." });
    const user = await openAdd();
    await user.type(screen.getByLabelText("Name"), "Ada{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent(/^Name must be 60 characters or fewer\.$/);
    expect(screen.getByRole("form", { name: "Add child" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
  });

  it("Save is disabled while saving", async () => {
    fakeApi.on("GET /api/children", 200, []);
    let finish!: () => void;
    fakeApi.on("POST /api/children", () => new Promise((r) => (finish = () => r([201, { ...FRANK, id: "c9", name: "Ada" }]))));
    const user = await openAdd();
    await user.type(screen.getByLabelText("Name"), "Ada{Enter}");
    expect(await screen.findByRole("button", { name: "Saving…" })).toBeDisabled();
    finish();
    expect(await screen.findByText("Ada")).toBeInTheDocument();
  });

  it("Escape closes the form without saving", async () => {
    fakeApi.on("GET /api/children", 200, [FRANK]);
    const user = await openAdd();
    await user.type(screen.getByLabelText("Name"), "Ada");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("form", { name: "Add child" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add child" })).toBeInTheDocument();
    expect(fakeApi.calls.some((c) => c.method === "POST")).toBe(false);
  });
});
