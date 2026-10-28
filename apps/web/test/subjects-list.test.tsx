import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const MATH = { id: "s1", name: "Math", color: "#2f6fb0", sortOrder: 0, archived: false };
const READING = { id: "s2", name: "Reading", color: "#b0482f", sortOrder: 1, archived: false };
const OLD_LATIN = { id: "s3", name: "Old Latin", color: null, sortOrder: 2, archived: true };

describe("Subjects list", () => {
  it("lists the family's subjects in API order", async () => {
    fakeApi.on("GET /api/subjects", 200, [MATH, READING]);
    renderAt("/subjects");
    const list = await screen.findByRole("list", { name: "Subjects" });
    expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Math", "Reading"]);
  });

  it("shows skeleton rows while loading", async () => {
    let answer!: () => void;
    fakeApi.on("GET /api/subjects", () => new Promise((r) => (answer = () => r([200, [MATH]]))));
    renderAt("/subjects");
    expect(await screen.findByRole("list", { name: "Loading subjects" })).toHaveAttribute("aria-busy", "true");
    // The skeleton can render before the request reaches the fake API; wait for it.
    await waitFor(() => expect(answer).toBeTypeOf("function"));
    answer();
    expect(await screen.findByText("Math")).toBeInTheDocument();
  });

  it("empty family → 'No subjects yet.'", async () => {
    fakeApi.on("GET /api/subjects", 200, []);
    renderAt("/subjects");
    expect(await screen.findByText("No subjects yet.")).toBeInTheDocument();
  });

  it("error → message + Retry, which refetches", async () => {
    fakeApi.on("GET /api/subjects", 500, { error: "internal_error" });
    renderAt("/subjects");
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load subjects.");
    fakeApi.on("GET /api/subjects", 200, [MATH]);
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Math")).toBeInTheDocument();
  });

  it("'Show archived' refetches with includeArchived=true and tags archived rows", async () => {
    fakeApi.on("GET /api/subjects", 200, [MATH]);
    fakeApi.on("GET /api/subjects?includeArchived=true", 200, [MATH, OLD_LATIN]);
    renderAt("/subjects");
    await screen.findByText("Math");
    expect(screen.queryByText("Old Latin")).toBeNull();
    await userEvent.setup().click(screen.getByLabelText("Show archived"));
    const row = (await screen.findByText("Old Latin")).closest("li")!;
    expect(row).toHaveClass("is-archived");
    expect(within(row).getByText("Archived")).toBeInTheDocument();
    expect(fakeApi.calls.map((c) => c.path)).toContain("/api/subjects?includeArchived=true");
  });
});
