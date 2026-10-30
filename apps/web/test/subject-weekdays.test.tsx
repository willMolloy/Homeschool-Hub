/** S4-06: the subject form's "Usual days" chips and the list tag. */
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

type Row = { id: string; name: string; color: string | null; sortOrder: number; archived: boolean; defaultWeight: null; defaultWeekdays: number[] | null };
const MATH: Row = { id: "s1", name: "Math", color: "#2f6fb0", sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null };
const ART: Row = { id: "s2", name: "Art", color: "#b0482f", sortOrder: 1, archived: false, defaultWeight: null, defaultWeekdays: [1, 2, 3, 4] };
const PIANO: Row = { id: "s3", name: "Piano", color: null, sortOrder: 2, archived: false, defaultWeight: null, defaultWeekdays: [1, 3, 5] };

async function setup(rows: Row[] = [MATH, ART, PIANO]) {
  fakeApi.on("GET /api/subjects", 200, rows);
  fakeApi.on("POST /api/subjects", (body) => [201, { id: "s9", sortOrder: 9, archived: false, ...(body as object) }]);
  for (const r of rows) fakeApi.on(`PATCH /api/subjects/${r.id}`, (body) => [200, { ...r, ...(body as object) }]);
  const user = userEvent.setup();
  renderAt("/subjects");
  await screen.findByRole("list", { name: "Subjects" });
  return user;
}

const lastBody = () => fakeApi.calls.at(-1)?.body as Record<string, unknown>;
const chip = (form: HTMLElement, day: string) => within(form).getByRole("checkbox", { name: day });

describe("Subject usual days", () => {
  it("offers the school days only, all selected when there is no default", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Math" }));
    const form = screen.getByRole("form", { name: "Edit Math" });
    const days = within(within(form).getByRole("group", { name: "Usual days" })).getAllByRole("checkbox");
    expect(days.map((d) => d.getAttribute("aria-label"))).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
    expect(days.every((d) => (d as HTMLInputElement).checked)).toBe(true);
  });

  it("setting Mon-Thu saves [1,2,3,4]; selecting every school day again saves null", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Math" }));
    let form = screen.getByRole("form", { name: "Edit Math" });
    await user.click(chip(form, "Friday"));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    await screen.findByRole("button", { name: /Math/ });
    expect(fakeApi.calls.at(-1)).toMatchObject({ method: "PATCH", path: "/api/subjects/s1", body: { defaultWeekdays: [1, 2, 3, 4] } });
    expect(screen.getByRole("button", { name: /Math/ })).toHaveTextContent("Mon–Thu");

    await user.click(screen.getByRole("button", { name: /Math/ }));
    form = screen.getByRole("form", { name: "Edit Math" });
    expect(chip(form, "Friday")).not.toBeChecked();
    await user.click(chip(form, "Friday"));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    await screen.findByRole("button", { name: "Math" });
    expect(lastBody()).toEqual({ defaultWeekdays: null });
    expect(fakeApi.bodyKeyViolations).toEqual([]);
  });

  it("changes an existing default, and adding sends null unless chips were changed", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Piano/ }));
    let form = screen.getByRole("form", { name: "Edit Piano" });
    expect(chip(form, "Wednesday")).toBeChecked();
    expect(chip(form, "Tuesday")).not.toBeChecked();
    await user.click(chip(form, "Tuesday"));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    await screen.findByRole("button", { name: /Piano/ });
    expect(lastBody()).toEqual({ defaultWeekdays: [1, 2, 3, 5] });

    await user.click(screen.getByRole("button", { name: "Add subject" }));
    form = screen.getByRole("form", { name: "Add subject" });
    await user.type(within(form).getByLabelText("Name"), "Latin");
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await screen.findByRole("button", { name: "Latin" });
    expect(lastBody()).toMatchObject({ name: "Latin", defaultWeekdays: null });
  });

  it("the last selected chip can't be deselected", async () => {
    const user = await setup([{ ...MATH, defaultWeekdays: [3] }]);
    await user.click(screen.getByRole("button", { name: /Math/ }));
    const form = screen.getByRole("form", { name: "Edit Math" });
    await user.click(chip(form, "Wednesday"));
    expect(chip(form, "Wednesday")).toBeChecked();
    await user.click(chip(form, "Monday"));
    await user.click(chip(form, "Wednesday"));
    expect(chip(form, "Wednesday")).not.toBeChecked();
    expect(chip(form, "Monday")).toBeChecked();
  });

  it("the list line appears only when a default is set", async () => {
    await setup();
    expect(screen.getByRole("button", { name: /Math/ })).toHaveTextContent(/^Math$/);
    expect(screen.getByRole("button", { name: /Art/ })).toHaveTextContent("Mon–Thu");
    expect(screen.getByRole("button", { name: /Piano/ })).toHaveTextContent("Mon, Wed, Fri");
  });
});
