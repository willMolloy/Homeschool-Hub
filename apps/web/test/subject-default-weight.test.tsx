/** S2b-35: the subject form's optional usual effort, and its absence from the kids form. */
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

type Row = { id: string; name: string; color: string | null; sortOrder: number; archived: boolean; defaultWeight: unknown };
const MATH: Row = { id: "s1", name: "Math", color: "#2f6fb0", sortOrder: 0, archived: false, defaultWeight: { unitType: "lessons", weightPerUnit: 20 } };
const READING: Row = { id: "s2", name: "Reading", color: "#b0482f", sortOrder: 1, archived: false, defaultWeight: null };

const assignment = (id: string, over: Record<string, unknown>) => ({
  id, childIds: ["k1"], subjectId: "s1", title: id, unitType: "lessons", totalUnits: 10, startDate: "2026-09-01",
  endDate: "2026-12-01", weightPerUnit: null, archived: false, ...over,
});
const ASSIGNMENTS = [
  assignment("a1", {}),
  assignment("a2", {}),
  assignment("a3", {}),
  assignment("own", { weightPerUnit: 12 }), // has its own weight
  assignment("pages", { unitType: "pages" }), // other unit: the default doesn't apply
  assignment("other", { subjectId: "s2" }), // other subject
  assignment("gone", { archived: true }),
];

function patchMerging(...rows: Row[]) {
  return (body: unknown, path: string) => {
    const row = rows.find((r) => path.endsWith(r.id));
    return row ? ([200, { ...row, ...(body as object) }] as [number, unknown]) : ([404, { error: "not_found" }] as [number, unknown]);
  };
}

async function setup(rows: Row[] = [MATH, READING]) {
  fakeApi.on("GET /api/subjects", 200, rows);
  fakeApi.on("GET /api/assignments", 200, ASSIGNMENTS);
  fakeApi.on("POST /api/subjects", (body) => [201, { id: "s9", sortOrder: 2, archived: false, ...(body as object) }]);
  for (const r of rows) fakeApi.on(`PATCH /api/subjects/${r.id}`, patchMerging(r));
  const user = userEvent.setup();
  renderAt("/subjects");
  await screen.findByRole("list", { name: "Subjects" });
  return user;
}

const lastBody = () => fakeApi.calls.at(-1)?.body as Record<string, unknown>;

describe("Subject usual effort", () => {
  it("create with lessons + Heavy sends {lessons, 22.5}; the new row shows its chip", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Add subject" }));
    const form = screen.getByRole("form", { name: "Add subject" });
    await user.type(within(form).getByLabelText("Name"), "Latin");
    await user.click(within(form).getByText("Usual effort (optional)"));
    expect(within(form).getByText(/pages don't tell the story/)).toBeInTheDocument();
    expect(within(form).getByLabelText("Usually measured in")).toHaveValue("lessons");
    await user.click(within(form).getByRole("radio", { name: /^Heavy/ }));
    await user.click(within(form).getByRole("button", { name: "Add" }));
    expect(await screen.findByRole("button", { name: /Latin/ })).toHaveTextContent("about 45 min a lesson");
    expect(lastBody()).toMatchObject({ name: "Latin", defaultWeight: { unitType: "lessons", weightPerUnit: 22.5 } });
    expect(fakeApi.bodyKeyViolations).toEqual([]);
  });

  it("None sends null, and adding doesn't load assignments", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Add subject" }));
    const form = screen.getByRole("form", { name: "Add subject" });
    await user.type(within(form).getByLabelText("Name"), "Art");
    expect(within(form).getByRole("radio", { name: "None" })).toBeChecked();
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await screen.findByRole("button", { name: "Art" });
    expect(lastBody()).toMatchObject({ name: "Art", defaultWeight: null });
    expect(fakeApi.calls.some((c) => c.path === "/api/assignments")).toBe(false);
  });

  it("a unit change resets the picker to None", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Add subject" }));
    const form = screen.getByRole("form", { name: "Add subject" });
    await user.click(within(form).getByText("Usual effort (optional)"));
    await user.click(within(form).getByRole("radio", { name: /^Very heavy/ }));
    expect(within(form).getByRole("radio", { name: /^Very heavy/ })).toBeChecked();
    await user.selectOptions(within(form).getByLabelText("Usually measured in"), "minutes");
    expect(within(form).getByRole("radio", { name: "None" })).toBeChecked();
    // The presets now read in the new unit (minutes: 0.5 built-in → Heavy 0.75 → 1.5 min a minute; S6b-13, S7-17).
    expect(within(form).getByRole("radio", { name: /^Heavy/ }).closest("label")).toHaveTextContent("1.5 min a minute");
  });

  it("the list shows a chip only on subjects with a default", async () => {
    await setup();
    expect(screen.getByRole("button", { name: /Math/ })).toHaveTextContent("about 40 min a lesson");
    expect(screen.getByRole("button", { name: "Reading" }).querySelector(".tag-weight")).toBeNull();
  });

  it("edit shows the stored value open; clearing it sends only defaultWeight: null", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Math/ }));
    const form = screen.getByRole("form", { name: "Edit Math" });
    expect(form.querySelector("details")).toHaveAttribute("open");
    expect(within(form).getByLabelText("Usually measured in")).toHaveValue("lessons");
    // 20 per lesson isn't a preset (15 / 22.5 / 30 / 7.5), so it shows as Custom.
    expect(within(form).getByRole("radio", { name: "Custom…" })).toBeChecked();
    expect(within(form).getByLabelText(/^Custom minutes/)).toHaveValue(40); // S7-17: 20 per lesson is 40 minutes a lesson
    await user.click(within(form).getByRole("radio", { name: "None" }));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    await screen.findByRole("button", { name: "Math" });
    expect(lastBody()).toEqual({ defaultWeight: null });
  });

  describe("an invalid Custom width blocks Save (S2c-03)", () => {
    const writes = () => fakeApi.calls.filter((c) => c.method === "PATCH" || c.method === "POST");
    const openMath = async () => {
      const user = await setup();
      await user.click(screen.getByRole("button", { name: /Math/ }));
      const form = screen.getByRole("form", { name: "Edit Math" });
      return { user, form, custom: within(form).getByLabelText(/^Custom minutes/), save: within(form).getByRole("button", { name: "Save" }) };
    };

    it("cleared Custom: Save is disabled, Enter sends nothing, the error stays", async () => {
      const { user, form, custom, save } = await openMath();
      await user.clear(custom);
      expect(within(form).getByRole("alert")).toHaveTextContent("Enter the minutes.");
      expect(save).toBeDisabled();
      await user.type(within(form).getByLabelText("Name"), "{Enter}");
      expect(writes()).toEqual([]);
      expect(within(form).getByText("Enter the minutes to see the preview")).toBeInTheDocument();
    });

    it("a valid number of minutes again enables Save and sends the weight it stands for (12 minutes for 1 lesson a day is 6)", async () => {
      const { user, custom, save } = await openMath();
      await user.clear(custom);
      await user.type(custom, "0");
      expect(save).toBeDisabled();
      await user.clear(custom);
      await user.type(custom, "12");
      expect(save).toBeEnabled();
      await user.click(save);
      await screen.findByRole("button", { name: /Math/ });
      expect(lastBody()).toEqual({ defaultWeight: { unitType: "lessons", weightPerUnit: 6 } });
    });

    it("choosing a preset after an invalid entry enables Save", async () => {
      const { user, form, custom, save } = await openMath();
      await user.clear(custom);
      await user.click(within(form).getByRole("radio", { name: /^Heavy/ }));
      expect(save).toBeEnabled();
      await user.click(save);
      await screen.findByRole("button", { name: /Math/ });
      expect(lastBody()).toEqual({ defaultWeight: { unitType: "lessons", weightPerUnit: 22.5 } });
    });

    it("a unit change after an invalid entry (picker back to None) enables Save", async () => {
      const { user, form, custom, save } = await openMath();
      await user.clear(custom);
      await user.selectOptions(within(form).getByLabelText("Usually measured in"), "minutes");
      expect(save).toBeEnabled();
    });
  });

  it("an unchanged default isn't sent; a rename sends only the name", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Math/ }));
    const name = within(screen.getByRole("form", { name: "Edit Math" })).getByLabelText("Name");
    await user.clear(name);
    await user.type(name, "Maths{Enter}");
    await screen.findByRole("button", { name: /Maths/ });
    expect(lastBody()).toEqual({ name: "Maths" });
  });

  it("changing the stored default sends the new pair", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Math/ }));
    const form = screen.getByRole("form", { name: "Edit Math" });
    await user.click(within(form).getByRole("radio", { name: /^Light/ }));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("button", { name: /Math/ })).toHaveTextContent("about 15 min a lesson");
    expect(lastBody()).toEqual({ defaultWeight: { unitType: "lessons", weightPerUnit: 7.5 } });
  });

  it("notes how many assignments follow the default, for the chosen unit", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Math/ }));
    const form = screen.getByRole("form", { name: "Edit Math" });
    expect(await within(form).findByText("This changes the bars of 3 assignments that use the subject default.")).toBeInTheDocument();
    await user.selectOptions(within(form).getByLabelText("Usually measured in"), "pages");
    expect(within(form).getByText("This changes the bars of 1 assignment that use the subject default.")).toBeInTheDocument();
    await user.selectOptions(within(form).getByLabelText("Usually measured in"), "chapters");
    expect(within(form).queryByText(/This changes the bars/)).toBeNull();
  });

  it("no note when the assignments list can't be loaded", async () => {
    const user = await setup();
    fakeApi.on("GET /api/assignments", 500, { error: "internal" });
    await user.click(screen.getByRole("button", { name: "Reading" }));
    const form = screen.getByRole("form", { name: "Edit Reading" });
    await within(form).findByLabelText("Usually measured in");
    expect(within(form).queryByText(/This changes the bars/)).toBeNull();
  });

  it("the server's 400 about the default is shown by the default, and the form stays open", async () => {
    const user = await setup();
    fakeApi.on("PATCH /api/subjects/s2", 400, { error: "invalid_request", message: "defaultWeight.weightPerUnit: Too big: expected number to be <=100" });
    await user.click(screen.getByRole("button", { name: "Reading" }));
    const form = screen.getByRole("form", { name: "Edit Reading" });
    await user.click(within(form).getByText("Usual effort (optional)"));
    await user.click(within(form).getByRole("radio", { name: /^Normal/ }));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    const alert = await within(form).findByText("Too big: expected number to be <=100");
    expect(alert).toHaveAttribute("role", "alert");
    expect(within(form).getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByRole("form", { name: "Edit Reading" })).toBeInTheDocument();
  });

  it("other 400s still show under Name", async () => {
    const user = await setup();
    fakeApi.on("PATCH /api/subjects/s2", 409, { error: "conflict", message: "name: A subject with that name already exists." });
    await user.click(screen.getByRole("button", { name: "Reading" }));
    const form = screen.getByRole("form", { name: "Edit Reading" });
    const name = within(form).getByLabelText("Name");
    await user.clear(name);
    await user.type(name, "Math{Enter}");
    expect(await within(form).findByText("A subject with that name already exists.")).toBeInTheDocument();
    expect(name).toHaveAttribute("aria-invalid", "true");
  });
});

describe("Kids form", () => {
  it("has no usual effort section", async () => {
    fakeApi.on("GET /api/children", 200, [{ id: "k1", name: "Ada", color: "#2f6fb0", sortOrder: 0, archived: false }]);
    const user = userEvent.setup();
    renderAt("/kids");
    await screen.findByRole("list", { name: "Kids" });
    await user.click(screen.getByRole("button", { name: "Ada" }));
    const form = screen.getByRole("form", { name: "Edit Ada" });
    expect(within(form).queryByText(/Usual effort/)).toBeNull();
    expect(within(form).queryByRole("radio", { name: "None" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Add child" }));
    expect(within(screen.getByRole("form", { name: "Add child" })).queryByText(/Usual effort/)).toBeNull();
  });
});
