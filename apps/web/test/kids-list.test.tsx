import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const FRANK = { id: "c1", name: "Frank", color: "#2f6fb0", sortOrder: 0, archived: false };
const MARGARET = { id: "c2", name: "Margaret", color: "#b0482f", sortOrder: 1, archived: false };
const OLD = { id: "c3", name: "Old Kid", color: null, sortOrder: 2, archived: true };

describe("Kids list", () => {
  it("lists the family's children in API order", async () => {
    fakeApi.on("GET /api/children", 200, [FRANK, MARGARET]);
    renderAt("/kids");
    const list = await screen.findByRole("list", { name: "Kids" });
    expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Frank", "Margaret"]);
  });

  it("shows skeleton rows while loading", async () => {
    let answer!: () => void;
    fakeApi.on("GET /api/children", () => new Promise((r) => (answer = () => r([200, [FRANK]]))));
    renderAt("/kids");
    expect(await screen.findByRole("list", { name: "Loading kids" })).toHaveAttribute("aria-busy", "true");
    answer();
    expect(await screen.findByText("Frank")).toBeInTheDocument();
  });

  it("empty family → 'No children yet.'", async () => {
    fakeApi.on("GET /api/children", 200, []);
    renderAt("/kids");
    expect(await screen.findByText("No children yet.")).toBeInTheDocument();
  });

  it("error → message + Retry, which refetches", async () => {
    fakeApi.on("GET /api/children", 500, { error: "internal_error" });
    renderAt("/kids");
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load kids.");
    fakeApi.on("GET /api/children", 200, [FRANK]);
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Frank")).toBeInTheDocument();
  });

  it("'Show archived' refetches with includeArchived=true and tags archived rows", async () => {
    fakeApi.on("GET /api/children", 200, [FRANK]);
    fakeApi.on("GET /api/children?includeArchived=true", 200, [FRANK, OLD]);
    renderAt("/kids");
    await screen.findByText("Frank");
    expect(screen.queryByText("Old Kid")).toBeNull();
    await userEvent.setup().click(screen.getByLabelText("Show archived"));
    const row = (await screen.findByText("Old Kid")).closest("li")!;
    expect(row).toHaveClass("is-archived");
    expect(within(row).getByText("Archived")).toBeInTheDocument();
    expect(fakeApi.calls.map((c) => c.path)).toContain("/api/children?includeArchived=true");
  });
});
