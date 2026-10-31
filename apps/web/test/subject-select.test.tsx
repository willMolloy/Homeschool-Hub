/** S6b-08: common subjects and "New subject…" in the assignment forms' subject dropdown; chips on the empty Subjects screen. */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { COMMON_SUBJECTS, findSubjectNamed, missingCommonSubjects } from "../src/features/roster/commonSubjects";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, MATH, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

const created = (n: number) => (body: unknown): [number, unknown] => [201, { id: rowId(50 + n), sortOrder: n, archived: false, defaultWeight: null, defaultWeekdays: null, ...(body as object) }];
const date = (form: HTMLElement, label: string, value: string) => fireEvent.change(within(form).getByLabelText(label), { target: { value } });

describe("common subjects list", () => {
  it("is the ticket's list; names already taken (any case, archived too) are left out", () => {
    expect(COMMON_SUBJECTS).toEqual(["Math", "Reading", "Literature", "Writing", "Spelling", "Grammar", "History", "Science", "Geography", "Art", "Music", "Foreign Language", "Bible", "PE"]);
    const left = missingCommonSubjects([{ name: "math" }, { name: " Art " }]);
    expect(left).not.toContain("Math");
    expect(left).not.toContain("Art");
    expect(left).toHaveLength(12);
    expect(findSubjectNamed([{ name: "Math" }], "MATH")).toEqual({ name: "Math" });
  });
});

async function openAdd(subjects = [] as typeof MATH[]) {
  withRoster([FRANK], subjects);
  fakeApi.on("GET /api/assignments", 200, []);
  fakeApi.on("POST /api/assignments", (body) => [201, { ...(body as object), id: rowId(9), archived: false }]);
  const user = userEvent.setup();
  renderAt("/schedule/assignments");
  await user.click(await screen.findByRole("button", { name: "Add assignment" }));
  return { user, form: screen.getByRole("form", { name: "Add assignment" }) };
}
const optionsOf = (select: HTMLElement) => within(select).getAllByRole("option").map((o) => o.textContent);

describe("the subject dropdown on the Add form", () => {
  it("with no subjects it lists the common ones and New subject…, and no 'No subjects yet' hint", async () => {
    const { form } = await openAdd();
    const select = within(form).getByLabelText("Subject");
    expect(optionsOf(select)).toEqual(["Choose a subject…", ...COMMON_SUBJECTS, "New subject…"]);
    expect(within(select).getByRole("group", { name: "Add a common subject" })).toBeInTheDocument();
    expect(within(form).queryByText(/No subjects yet/)).toBeNull();
  });

  it("existing subjects come first and are not offered again", async () => {
    const { form } = await openAdd([MATH]);
    const names = optionsOf(within(form).getByLabelText("Subject"));
    expect(names.slice(0, 2)).toEqual(["Choose a subject…", "Math"]);
    expect(names.filter((n) => n === "Math")).toHaveLength(1);
    expect(names.at(-1)).toBe("New subject…");
  });

  it("choosing Math posts the subject, selects it, and the assignment saves under it", async () => {
    fakeApi.on("POST /api/subjects", created(1));
    const { user, form } = await openAdd();
    await user.selectOptions(within(form).getByLabelText("Subject"), "Math");
    await waitFor(() => expect(within(form).getByLabelText("Subject")).toHaveValue(rowId(51)));
    expect(writes()[0]).toMatchObject({ method: "POST", path: "/api/subjects", body: { name: "Math", color: "#2f6fb0" } });
    // Math is now the family's own subject, no longer a "common" offer.
    expect(optionsOf(within(form).getByLabelText("Subject"))).toContain("Math");
    expect(optionsOf(within(form).getByLabelText("Subject")).filter((n) => n === "Math")).toHaveLength(1);

    await user.type(within(form).getByLabelText("Title"), "Saxon");
    // Frank is the only child, so he is already picked.
    await user.type(within(form).getByLabelText("Total"), "20");
    date(form, "Start", "2026-11-02");
    date(form, "End", "2026-12-18");
    await waitFor(() => expect(within(form).getByRole("button", { name: "Add" })).toBeEnabled());
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(writes()).toHaveLength(2));
    expect(writes()[1]).toMatchObject({ path: "/api/assignments", body: { subjectId: rowId(51), title: "Saxon" } });
  });

  it("the next subject takes the next free palette colour", async () => {
    fakeApi.on("POST /api/subjects", created(1));
    const { user, form } = await openAdd([MATH]);
    await user.selectOptions(within(form).getByLabelText("Subject"), "Reading");
    await waitFor(() => expect(writes()).toHaveLength(1));
    // Math uses blue, so the next one is brick.
    expect(writes()[0]!.body).toEqual({ name: "Reading", color: "#b0482f" });
  });

  it("New subject… shows a name field; Add posts and selects it; Enter does not save the assignment", async () => {
    fakeApi.on("POST /api/subjects", created(1));
    const { user, form } = await openAdd();
    await user.selectOptions(within(form).getByLabelText("Subject"), "New subject…");
    const name = within(form).getByLabelText("Subject name");
    await user.type(name, "Nature Study{Enter}");
    await waitFor(() => expect(within(form).getByLabelText("Subject")).toHaveValue(rowId(51)));
    expect(writes()).toHaveLength(1);
    expect(writes()[0]).toMatchObject({ path: "/api/subjects", body: { name: "Nature Study" } });
    expect(within(form).queryByLabelText("Subject name")).toBeNull();
    expect(within(within(form).getByLabelText("Subject")).getByRole("option", { name: "Nature Study" })).toBeInTheDocument();
  });

  it("New subject… with the Add button, and Add waits for a name", async () => {
    fakeApi.on("POST /api/subjects", created(1));
    const { user, form } = await openAdd();
    await user.selectOptions(within(form).getByLabelText("Subject"), "New subject…");
    const add = within(form).getByRole("button", { name: "Add subject" });
    expect(add).toBeDisabled();
    await user.type(within(form).getByLabelText("Subject name"), "Latin");
    await user.click(add);
    await waitFor(() => expect(within(form).getByLabelText("Subject")).toHaveValue(rowId(51)));
  });

  it("a 409 selects the subject that already exists (any case)", async () => {
    fakeApi.on("POST /api/subjects", 409, { error: "duplicate_name", message: "You already have a subject with that name." });
    const { user, form } = await openAdd([MATH]);
    await user.selectOptions(within(form).getByLabelText("Subject"), "New subject…");
    await user.type(within(form).getByLabelText("Subject name"), "math{Enter}");
    await waitFor(() => expect(within(form).getByLabelText("Subject")).toHaveValue(MATH.id));
    expect(within(form).queryByLabelText("Subject name")).toBeNull();
  });

  it("any other failure says so and keeps the name field", async () => {
    fakeApi.on("POST /api/subjects", 500, { error: "boom", message: "x" });
    const { user, form } = await openAdd();
    await user.selectOptions(within(form).getByLabelText("Subject"), "New subject…");
    await user.type(within(form).getByLabelText("Subject name"), "Latin{Enter}");
    expect(await within(form).findByText("Couldn't add that subject. Please try again.")).toBeInTheDocument();
    expect(within(form).getByLabelText("Subject name")).toHaveValue("Latin");
    expect(within(form).getByLabelText("Subject")).toHaveValue("");
  });
});

describe("Add several", () => {
  it("has the same subject dropdown", async () => {
    withRoster([FRANK], []);
    fakeApi.on("GET /api/assignments", 200, []);
    fakeApi.on("POST /api/subjects", created(1));
    const user = userEvent.setup();
    renderAt("/schedule/assignments");
    await user.click(await screen.findByRole("button", { name: "Add several" }));
    const form = screen.getByRole("form", { name: "Add several assignments" });
    const select = within(form).getByLabelText("Subject");
    expect(optionsOf(select)).toEqual(["Choose a subject…", ...COMMON_SUBJECTS, "New subject…"]);
    await user.selectOptions(select, "Science");
    await waitFor(() => expect(within(form).getByLabelText("Subject")).toHaveValue(rowId(51)));
    expect(writes()[0]).toMatchObject({ path: "/api/subjects", body: { name: "Science" } });
  });
});

describe("Subjects screen, empty state", () => {
  it("offers the common subjects as chips; a tap creates one and the rest stay offered", async () => {
    fakeApi.on("GET /api/subjects", 200, []);
    fakeApi.on("POST /api/subjects", created(1));
    const user = userEvent.setup();
    renderAt("/subjects");
    expect(await screen.findByText("No subjects yet.")).toBeInTheDocument();
    const chips = screen.getByRole("group", { name: "Add common subjects" });
    expect(within(chips).getAllByRole("button").map((b) => b.textContent)).toEqual([...COMMON_SUBJECTS]);
    await user.click(within(chips).getByRole("button", { name: "Math" }));
    const list = await screen.findByRole("list", { name: "Subjects" });
    expect(within(list).getByText("Math")).toBeInTheDocument();
    expect(writes()[0]).toMatchObject({ path: "/api/subjects", body: { name: "Math", color: "#2f6fb0" } });
    const left = screen.getByRole("group", { name: "Add common subjects" });
    expect(within(left).queryByRole("button", { name: "Math" })).toBeNull();
    expect(within(left).getAllByRole("button")).toHaveLength(COMMON_SUBJECTS.length - 1);
  });

  it("is not shown to a family that already has subjects", async () => {
    fakeApi.on("GET /api/subjects", 200, [MATH]);
    renderAt("/subjects");
    await screen.findByRole("list", { name: "Subjects" });
    expect(screen.queryByRole("group", { name: "Add common subjects" })).toBeNull();
  });

  it("kids have no chips", async () => {
    fakeApi.on("GET /api/children", 200, []);
    renderAt("/kids");
    await screen.findByText("No children yet.");
    expect(screen.queryByRole("group", { name: "Add common subjects" })).toBeNull();
  });
});
