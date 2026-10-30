import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Assignment } from "../src/api/types";
import { copyOfAssignment } from "../src/features/schedule/copyAssignment";
import { makeLookups } from "../src/features/schedule/lookups";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, LATIN, MAGGIE, MATH, OLD_KID, READING, patchMerging, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

const SAXON: Assignment = {
  id: rowId(1), subjectId: MATH.id, title: "Saxon 5/4", unitType: "lessons", totalUnits: 20, weightPerUnit: null,
  startDate: "2026-11-02", endDate: "2026-11-26", childIds: [FRANK.id, MAGGIE.id], archived: false,
};
const NOVEL: Assignment = {
  id: rowId(2), subjectId: READING.id, title: "Charlotte's Web", unitType: "pages", totalUnits: 184, weightPerUnit: 1.4,
  startDate: "2026-10-15", endDate: "2026-12-18", childIds: [MAGGIE.id], archived: false,
};

async function setup(rows = [SAXON, NOVEL]) {
  withRoster();
  fakeApi.on("GET /api/assignments", 200, rows);
  for (const r of rows) fakeApi.on(`PATCH /api/assignments/${r.id}`, patchMerging(r));
  fakeApi.on("POST /api/assignments", (body) => [201, { ...(body as object), id: rowId(9), archived: false }]);
  const user = userEvent.setup();
  renderAt("/schedule/assignments");
  await screen.findByRole("list", { name: "Assignments" });
  return user;
}
const openEdit = async (user: ReturnType<typeof userEvent.setup>, title: string) => {
  await user.click(screen.getByRole("button", { name: new RegExp(title) }));
  return screen.getByRole("form", { name: `Edit ${title}` });
};

describe("Copy an assignment (S3a-01)", () => {
  it("Copy shows while editing, not on the Add form", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Add assignment" }));
    expect(screen.queryByRole("button", { name: "Copy" })).toBeNull();
    await user.click(within(screen.getByRole("form", { name: "Add assignment" })).getByRole("button", { name: "Cancel" }));
    const form = await openEdit(user, "Saxon 5/4");
    expect(within(form).getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("opens the Add form prefilled and saves one POST, no PATCH", async () => {
    const user = await setup();
    await user.click(within(await openEdit(user, "Charlotte's Web")).getByRole("button", { name: "Copy" }));
    expect(screen.queryByRole("form", { name: /^Edit / })).toBeNull();
    const form = screen.getByRole("form", { name: "Add assignment" });
    expect(within(form).getByLabelText("Subject")).toHaveValue(READING.id);
    expect(within(form).getByLabelText("Title")).toHaveValue("Charlotte's Web (copy)");
    expect(within(form).getByRole("checkbox", { name: "Maggie" })).toBeChecked();
    expect(within(form).getByRole("checkbox", { name: "Frank" })).not.toBeChecked();
    expect(within(form).getByLabelText("Start")).toHaveValue("2026-10-15");
    expect(within(form).getByLabelText("End")).toHaveValue("2026-12-18");
    expect(within(form).getByLabelText("Unit")).toHaveValue("pages");
    expect(within(form).getByLabelText("Total")).toHaveValue(184);
    expect(within(form).getByLabelText("Weight per page")).toHaveValue(1.4);
    // Change what differs: the child.
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    await user.click(within(form).getByRole("checkbox", { name: "Maggie" }));
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()).toEqual([{
      method: "POST", path: "/api/assignments",
      body: { subjectId: READING.id, title: "Charlotte's Web (copy)", unitType: "pages", totalUnits: 184, weightPerUnit: 1.4, startDate: "2026-10-15", endDate: "2026-12-18", childIds: [FRANK.id] },
    }]);
    expect(await screen.findByText("Charlotte's Web (copy)")).toBeInTheDocument();
    expect(screen.getByText("Charlotte's Web")).toBeInTheDocument();
  });

  it("a stored null weight stays null and the suggestion doesn't override", async () => {
    const user = await setup();
    await user.click(within(await openEdit(user, "Saxon 5/4")).getByRole("button", { name: "Copy" }));
    const form = screen.getByRole("form", { name: "Add assignment" });
    date("Start", "2026-12-01", form);
    date("End", "2026-12-20", form);
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]!.body).toMatchObject({ title: "Saxon 5/4 (copy)", weightPerUnit: null, startDate: "2026-12-01", endDate: "2026-12-20" });
    expect(fakeApi.calls.some((c) => c.path.startsWith("/api/weights/suggestion"))).toBe(false);
  });

  it("Cancel discards the copy and sends nothing", async () => {
    const user = await setup();
    await user.click(within(await openEdit(user, "Saxon 5/4")).getByRole("button", { name: "Copy" }));
    await user.click(within(screen.getByRole("form", { name: "Add assignment" })).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("form")).toBeNull();
    expect(writes()).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Add assignment" }));
    expect(screen.getByLabelText("Title")).toHaveValue("");
  });

  it("a 120-character title still gives a valid copy title", async () => {
    const long = "x".repeat(120);
    const user = await setup([{ ...SAXON, title: long }]);
    await user.click(within(await openEdit(user, long)).getByRole("button", { name: "Copy" }));
    const form = screen.getByRole("form", { name: "Add assignment" });
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    const title = (writes()[0]!.body as { title: string }).title;
    expect(title.length).toBeLessThanOrEqual(120);
    expect(title.endsWith(" (copy)")).toBe(true);
  });

  it("an archived subject is left unselected, and Add works once one is chosen (S3b-02)", async () => {
    const user = await setup([{ ...SAXON, subjectId: LATIN.id, title: "Latin 1" }]);
    await user.click(within(await openEdit(user, "Latin 1")).getByRole("button", { name: "Copy" }));
    const form = screen.getByRole("form", { name: "Add assignment" });
    expect(within(form).getByLabelText("Subject")).toHaveValue("");
    expect(within(form).queryByRole("option", { name: /archived/ })).toBeNull();
    await user.click(within(form).getByRole("button", { name: "Add" }));
    expect(await within(form).findByText("Pick a subject.")).toBeInTheDocument();
    expect(writes()).toEqual([]);
    await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]!.body).toMatchObject({ subjectId: READING.id, title: "Latin 1 (copy)", childIds: [FRANK.id, MAGGIE.id] });
  });

  it("an archived child is dropped and the active child kept (S3b-02)", async () => {
    const user = await setup([{ ...SAXON, title: "Mixed", childIds: [OLD_KID.id, MAGGIE.id] }]);
    await user.click(within(await openEdit(user, "Mixed")).getByRole("button", { name: "Copy" }));
    const form = screen.getByRole("form", { name: "Add assignment" });
    expect(within(form).getByRole("checkbox", { name: "Maggie" })).toBeChecked();
    expect(within(form).queryByRole("checkbox", { name: /Old Kid/ })).toBeNull();
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]!.body).toMatchObject({ childIds: [MAGGIE.id] });
  });

  it("only archived children leaves none ticked and Add says to pick one (S3b-02)", async () => {
    const user = await setup([{ ...SAXON, title: "Old only", childIds: [OLD_KID.id] }]);
    await user.click(within(await openEdit(user, "Old only")).getByRole("button", { name: "Copy" }));
    const form = screen.getByRole("form", { name: "Add assignment" });
    expect(within(form).queryByRole("checkbox", { name: /Old Kid/ })).toBeNull();
    await user.click(within(form).getByRole("button", { name: "Add" }));
    expect(await within(form).findByText("Pick at least one child.")).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });

  it("copyOfAssignment is pure", () => {
    const a = { ...NOVEL, childIds: [MAGGIE.id] };
    const copy = copyOfAssignment(a, makeLookups([FRANK, MAGGIE], [MATH, READING]));
    copy.childIds.push("z");
    expect(a.childIds).toEqual([MAGGIE.id]);
    expect(copy).not.toHaveProperty("id");
  });
});

function date(label: string, value: string, scope: HTMLElement) {
  fireEvent.change(within(scope).getByLabelText(label), { target: { value } });
}
