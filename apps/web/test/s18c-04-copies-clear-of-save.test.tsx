// S18c-04: Other copies sits clear of the assignment form's Save.
import { readFileSync } from "node:fs";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Assignment } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, READING, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

const WREN = { ...FRANK, id: rowId(13), name: "Wren", sortOrder: 0 };
const ELIAS = { ...FRANK, id: rowId(11), name: "Elias", sortOrder: 1 };
const LIT = { ...READING, id: rowId(21), name: "Literature", sortOrder: 0 };
const book = (n: number, over: Partial<Assignment>): Assignment => ({
  id: rowId(n), subjectId: LIT.id, title: "The Hobbit (read aloud)", unitType: "pages", totalUnits: 300, weightPerUnit: null,
  startDate: "2026-08-17", endDate: "2026-12-18", childIds: [WREN.id], archived: false, weekdays: [2, 3, 4, 5], ...over,
});

describe("Other copies sits clear of Save (S18c-04)", () => {
  it("the section has a gap under it at the width of a 360 px phone", () => {
    const css = readFileSync("src/features/schedule/copy-others.css", "utf8");
    expect(css).toMatch(/\.copy-others\s*\{[^}]*margin-bottom:\s*28px/);
  });

  it("Save writes the workbook that was opened, not the other copy", async () => {
    const wren = book(1, {});
    const elias = book(2, { childIds: [ELIAS.id], weekdays: [1, 2, 3, 4] });
    withRoster([WREN, ELIAS], [LIT]);
    fakeApi.on("GET /api/assignments", 200, [wren, elias]);
    fakeApi.on(`PATCH /api/assignments/${wren.id}`, (body) => [200, { ...wren, ...(body as object) }]);
    const user = userEvent.setup();
    renderAt("/schedule/assignments");
    await screen.findByRole("list", { name: "Assignments" });
    await user.click(screen.getByRole("button", { name: /Wren/ }));
    const form = screen.getByRole("form", { name: "Edit The Hobbit (read aloud)" });
    const copies = within(form).getByRole("region", { name: "Other copies" });
    const save = within(form).getByRole("button", { name: "Save" });
    expect(save.closest(".copy-others")).toBeNull();
    expect(copies.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const title = within(form).getByLabelText("Title");
    await user.clear(title);
    await user.type(title, "The Hobbit, read aloud");
    await user.click(save);
    await waitFor(() => expect(writes().some((w) => w.method === "PATCH")).toBe(true));
    const patch = writes().find((w) => w.method === "PATCH")!;
    expect(patch.path).toBe(`/api/assignments/${wren.id}`);
    expect(patch.body).toMatchObject({ title: "The Hobbit, read aloud" });
    expect(patch.path).not.toContain(elias.id);
  });
});
