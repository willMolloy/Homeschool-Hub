import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Assignment } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, MATH, READING, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

const SAXON: Assignment = {
  id: rowId(1), subjectId: MATH.id, title: "Saxon 5/4", unitType: "lessons", totalUnits: 20, weightPerUnit: null,
  startDate: "2026-11-02", endDate: "2026-11-26", childIds: [FRANK.id], archived: false, weekdays: null,
};
const HEADER = "subject,title,children,unit,total,start,end";
const echo = (body: unknown) => [201, (body as { assignments: object[] }).assignments.map((a, i) => ({ ...a, id: rowId(100 + i), archived: false }))] as [number, unknown];
const posts = () => writes().filter((w) => w.path === "/api/assignments/bulk").map((w) => w.body as { assignments: { title: string }[]; undo?: { label: string; append?: boolean } });

async function open(panel: "Add several" | "Import CSV") {
  withRoster();
  fakeApi.on("GET /api/assignments", 200, [SAXON]);
  const user = userEvent.setup();
  renderAt("/schedule/assignments");
  await screen.findByRole("list", { name: "Assignments" });
  await user.click(screen.getByRole("button", { name: panel }));
  return user;
}
const csv = (n: number) => `${HEADER}\n${Array.from({ length: n }, (_, i) => `Math,Book ${String(i + 1).padStart(2, "0")},Frank,lessons,30,2026-11-02,2026-12-18`).join("\n")}\n`;
const paste = (form: HTMLElement, text: string) => fireEvent.change(within(form).getByLabelText("Or paste it here"), { target: { value: text } });

describe("undo for Add several and CSV import (S14-05)", () => {
  it("Add several sends an undo label, and the undo bar offers it", async () => {
    fakeApi.on("POST /api/assignments/bulk", echo);
    fakeApi.on("GET /api/undo", 200, { label: "Added 2 assignments", createdAt: "2026-10-28T12:00:00Z" });
    const user = await open("Add several");
    const form = screen.getByRole("form", { name: "Add several assignments" });
    await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    fireEvent.change(within(form).getByLabelText("Start"), { target: { value: "2026-11-02" } });
    fireEvent.change(within(form).getByLabelText("End"), { target: { value: "2026-12-18" } });
    await user.type(within(within(form).getByRole("group", { name: "Row 1" })).getByLabelText("Title"), "One");
    await user.type(within(within(form).getByRole("group", { name: "Row 1" })).getByLabelText("Total"), "10");
    await user.type(within(within(form).getByRole("group", { name: "Row 2" })).getByLabelText("Title"), "Two");
    await user.type(within(within(form).getByRole("group", { name: "Row 2" })).getByLabelText("Total"), "20");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]!.undo).toEqual({ label: "Added 2 assignments" });
    const bar = await screen.findByText("Added 2 assignments.");
    expect(bar.closest('[role="status"]')).toContainElement(screen.getByRole("button", { name: "Undo" }));
  });

  it("a one-row Add several says 'Added 1 assignment'", async () => {
    fakeApi.on("POST /api/assignments/bulk", echo);
    const user = await open("Add several");
    const form = screen.getByRole("form", { name: "Add several assignments" });
    await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    fireEvent.change(within(form).getByLabelText("Start"), { target: { value: "2026-11-02" } });
    fireEvent.change(within(form).getByLabelText("End"), { target: { value: "2026-12-18" } });
    await user.type(within(within(form).getByRole("group", { name: "Row 1" })).getByLabelText("Title"), "Solo");
    await user.type(within(within(form).getByRole("group", { name: "Row 1" })).getByLabelText("Total"), "10");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]!.undo).toEqual({ label: "Added 1 assignment" });
  });

  it("a 60-row CSV is two requests (50 and 10) that make one undo entry, 'Imported 60 assignments'", async () => {
    fakeApi.on("POST /api/assignments/bulk", echo);
    fakeApi.on("GET /api/undo", 200, { label: "Imported 60 assignments", createdAt: "2026-10-28T12:00:00Z" });
    const user = await open("Import CSV");
    const form = screen.getByRole("form", { name: "Import assignments from a CSV" });
    paste(form, csv(60));
    expect(await within(form).findByText("60 assignments")).toBeInTheDocument();
    await user.click(within(form).getByRole("button", { name: "Import" }));
    await waitFor(() => expect(posts()).toHaveLength(2));
    expect(posts().map((p) => p.assignments.length)).toEqual([50, 10]);
    expect(posts()[0]!.undo).toEqual({ label: "Imported 50 assignments" });
    expect(posts()[1]!.undo).toEqual({ label: "Imported 60 assignments", append: true });
    expect(posts()[1]!.assignments[0]!.title).toBe("Book 51");
    expect(await screen.findByText("Imported 60 assignments.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("form", { name: "Import assignments from a CSV" })).toBeNull());
  });

  it("a one-row import says 'Imported 1 assignment'", async () => {
    fakeApi.on("POST /api/assignments/bulk", echo);
    const user = await open("Import CSV");
    const form = screen.getByRole("form", { name: "Import assignments from a CSV" });
    paste(form, csv(1));
    await user.click(await within(form).findByRole("button", { name: "Import" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]!.undo).toEqual({ label: "Imported 1 assignment" });
  });

  it("a failing second chunk names the part, says 50 were added and can be undone, keeps the form open and shows the 50", async () => {
    let calls = 0;
    fakeApi.on("POST /api/assignments/bulk", (body) => (++calls === 1 ? echo(body) : [400, { error: "invalid_reference", message: "Assignment 3: childIds: every id must be one of your active children." }]));
    const user = await open("Import CSV");
    const form = screen.getByRole("form", { name: "Import assignments from a CSV" });
    paste(form, csv(60));
    await user.click(await within(form).findByRole("button", { name: "Import" }));
    expect(await within(form).findByRole("alert")).toHaveTextContent("Part 2 of 2 didn't save: Book 53: every id must be one of your active children. 50 assignments were added. Undo removes them.");
    expect(screen.getByRole("form", { name: "Import assignments from a CSV" })).toBeInTheDocument();
  });

  it("a single failing request keeps the plain server message, as before", async () => {
    fakeApi.on("POST /api/assignments/bulk", 400, { error: "invalid_reference", message: "Assignment 2: childIds: every id must be one of your active children." });
    const user = await open("Import CSV");
    const form = screen.getByRole("form", { name: "Import assignments from a CSV" });
    paste(form, csv(3));
    await user.click(await within(form).findByRole("button", { name: "Import" }));
    expect(await within(form).findByRole("alert")).toHaveTextContent(/^Book 02: every id must be one of your active children\.$/);
  });
});
