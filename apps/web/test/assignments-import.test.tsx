import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Assignment } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, MAGGIE, MATH, READING, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

const SAXON: Assignment = {
  id: rowId(1), subjectId: MATH.id, title: "Saxon 5/4", unitType: "lessons", totalUnits: 20, weightPerUnit: null,
  startDate: "2026-11-02", endDate: "2026-11-26", childIds: [FRANK.id], archived: false,
};
const HEADER = "subject,title,children,unit,total,start,end";
const VALID = `${HEADER}\nMath,Fractions,Frank,lessons,30,2026-11-02,2026-12-18\nReading,"Charlotte's Web, part 1",Frank;Maggie,pages,184,11/2/2026,12/18/2026\n`;

async function setup() {
  withRoster();
  fakeApi.on("GET /api/assignments", 200, [SAXON]);
  const user = userEvent.setup();
  renderAt("/schedule/assignments");
  await screen.findByRole("list", { name: "Assignments" });
  await user.click(screen.getByRole("button", { name: "Import CSV" }));
  return { user, form: screen.getByRole("form", { name: "Import assignments from a CSV" }) };
}
const paste = (form: HTMLElement, text: string) => fireEvent.change(within(form).getByLabelText("Or paste it here"), { target: { value: text } });

describe("Import assignments from a CSV (S3a-06)", () => {
  it("Import is disabled until there is something valid to import", async () => {
    const { form } = await setup();
    expect(within(form).getByRole("button", { name: "Import" })).toBeDisabled();
  });

  it("pasting a valid CSV shows the count and a list; Import sends one bulk POST with the parsed rows", async () => {
    const { user, form } = await setup();
    fakeApi.on("POST /api/assignments/bulk", (body) => [201, (body as { assignments: object[] }).assignments.map((a, i) => ({ ...a, id: rowId(10 + i), archived: false }))]);
    paste(form, VALID);
    expect(await within(form).findByText("2 assignments")).toBeInTheDocument();
    const list = within(form).getByRole("list", { name: "To import" });
    expect(list).toHaveTextContent("Fractions");
    expect(list).toHaveTextContent("Reading · Frank, Maggie · Nov 2, 2026 – Dec 18, 2026");
    await user.click(within(form).getByRole("button", { name: "Import" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    const shared = { weightPerUnit: null, startDate: "2026-11-02", endDate: "2026-12-18" };
    expect(writes()).toEqual([{
      method: "POST", path: "/api/assignments/bulk",
      body: { assignments: [
        { ...shared, subjectId: MATH.id, title: "Fractions", unitType: "lessons", totalUnits: 30, childIds: [FRANK.id] },
        { ...shared, subjectId: READING.id, title: "Charlotte's Web, part 1", unitType: "pages", totalUnits: 184, childIds: [FRANK.id, MAGGIE.id] },
      ] },
    }]);
    expect(await screen.findByText("Fractions")).toBeInTheDocument();
    expect(screen.getByText("Charlotte's Web, part 1")).toBeInTheDocument();
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("a chosen file is read like pasted text", async () => {
    const { user, form } = await setup();
    await user.upload(within(form).getByLabelText("CSV file"), new File([VALID], "term.csv", { type: "text/csv" }));
    expect(await within(form).findByText("2 assignments")).toBeInTheDocument();
    expect(within(form).getByLabelText("Or paste it here")).toHaveValue(VALID);
  });

  it("the file picker is reachable by its label and fills the preview (S3b-07)", async () => {
    const { user, form } = await setup();
    const picker = within(form).getByLabelText("CSV file");
    expect(picker).toHaveAttribute("type", "file");
    await user.upload(picker, new File([VALID], "term.csv", { type: "text/csv" }));
    expect(await within(form).findByText("2 assignments")).toBeInTheDocument();
  });

  it("a file over 1 MB is turned away without being read (S3b-05)", async () => {
    const { user, form } = await setup();
    const read = vi.spyOn(FileReader.prototype, "readAsText");
    await user.upload(within(form).getByLabelText("CSV file"), new File(["x".repeat(1024 * 1024 + 1)], "big.csv", { type: "text/csv" }));
    expect(await within(form).findByText("This file is too large. Import at most 50 assignments at a time.")).toBeInTheDocument();
    expect(read).not.toHaveBeenCalled();
    expect(within(form).getByLabelText("Or paste it here")).toHaveValue("");
    expect(within(form).getByRole("button", { name: "Import" })).toBeDisabled();
    read.mockRestore();
  });

  it("an unknown child lists the error and disables Import", async () => {
    const { form } = await setup();
    paste(form, `${HEADER}\nMath,Fractions,Frank,lessons,30,2026-11-02,2026-12-18\nMath,Decimals,Margret,lessons,30,2026-11-02,2026-12-18\nMath,Bad,Frank,lessons,0,2026-11-02,2026-12-18\n`);
    const errors = await within(form).findByRole("list", { name: "Fix these" });
    expect(within(errors).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Line 3: no child named Margret.",
      "Line 4: total must be more than 0 and at most 100,000.",
    ]);
    expect(within(form).queryByText(/assignments?$/)).toBeNull();
    expect(within(form).getByRole("button", { name: "Import" })).toBeDisabled();
    expect(writes()).toEqual([]);
  });

  it("a header with no rows says so and keeps Import disabled (S3b-04)", async () => {
    const { form } = await setup();
    paste(form, `${HEADER}\n`);
    expect(await within(form).findByText("No assignments found under the header.")).toBeInTheDocument();
    expect(within(form).queryByText(/^0 assignments/)).toBeNull();
    expect(within(form).getByRole("button", { name: "Import" })).toBeDisabled();
  });

  it("a semicolon file says to save it with commas (S3b-04)", async () => {
    const { form } = await setup();
    paste(form, VALID.replace(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g, ";"));
    expect(await within(form).findByText("This file uses semicolons (or tabs) between columns. Save it as CSV with commas.")).toBeInTheDocument();
    expect(within(form).getByRole("button", { name: "Import" })).toBeDisabled();
  });

  it("a server 400 names the row by its title, without the field name (S3b-01)", async () => {
    const { user, form } = await setup();
    fakeApi.on("POST /api/assignments/bulk", 400, { error: "invalid_reference", message: "Assignment 2: childIds: every id must be one of your active children." });
    paste(form, VALID);
    await user.click(await within(form).findByRole("button", { name: "Import" }));
    expect(await within(form).findByText("Charlotte's Web, part 1: every id must be one of your active children.")).toBeInTheDocument();
    expect(within(form).queryByText(/childIds/)).toBeNull();
    expect(within(form).getByText("2 assignments")).toBeInTheDocument();
    expect(within(form).getByRole("button", { name: "Import" })).toBeEnabled();
  });

  it("the template link downloads the header row and an example that imports as is", async () => {
    const { form } = await setup();
    const link = within(form).getByRole("link", { name: "Download template" });
    expect(link).toHaveAttribute("download", "assignments-template.csv");
    const csv = decodeURIComponent(link.getAttribute("href")!.replace("data:text/csv;charset=utf-8,", ""));
    expect(csv.split("\n")[0]).toBe(HEADER);
    paste(form, csv);
    expect(await within(form).findByText("1 assignment")).toBeInTheDocument();
  });

  it("Cancel sends nothing", async () => {
    const { user, form } = await setup();
    paste(form, VALID);
    await user.click(within(form).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("form")).toBeNull();
    expect(writes()).toEqual([]);
    expect(screen.getByRole("button", { name: "Import CSV" })).toBeInTheDocument();
  });
});
