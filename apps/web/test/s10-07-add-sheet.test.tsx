/** S10-07: the Year view's Add assignment sheet uses the app's own controls (subject picker, child chips, date tiles, soft day chips) and saves what the Assignments form saves. */
import { readFileSync } from "node:fs";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import type { Assignment, Subject } from "../src/api/types";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_SUBJECTS, samplePlans } from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

function stub() {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
  fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
  fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, SAMPLE_ASSIGNMENTS);
  fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
  fakeApi.on("GET /api/events", 200, []);
  fakeApi.on("POST /api/assignments", (body) => [201, { ...(body as Assignment), id: "new1", archived: false }]);
}

type User = ReturnType<typeof userEvent.setup>;

async function openSheet(user: User) {
  renderAt("/timeline");
  await screen.findByRole("img", { name: "Year timeline" });
  await user.click(screen.getByRole("button", { name: "Add assignment" }));
  return screen.findByRole("dialog", { name: "Add assignment" });
}

async function pickSubject(user: User, sheet: HTMLElement, name: string) {
  await user.click(within(sheet).getByRole("button", { name: /^Subject/ }));
  await user.click(within(await screen.findByRole("dialog", { name: "Subject" })).getByRole("button", { name }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Subject" })).toBeNull());
}

/** Everything but the subject, the same way in either form. */
async function fillRest(user: User, form: HTMLElement) {
  await user.type(within(form).getByLabelText("Title"), "Ancient Egypt");
  await user.click(within(form).getByLabelText("Margaret"));
  fireEvent.change(within(form).getByLabelText("Start"), { target: { value: "2026-11-02" } });
  fireEvent.change(within(form).getByLabelText("End"), { target: { value: "2026-12-18" } });
  await user.click(within(form).getByLabelText("Wednesday"));
  // S18-04 (E8): the Add sheet opens with no unit chosen; the page form keeps its Lessons dropdown.
  const units = within(form).queryByRole("radiogroup", { name: "Unit" });
  if (units) await user.click(within(units).getByRole("radio", { name: "Lessons" }));
  await user.type(within(form).getByLabelText("Total"), "10");
  await waitFor(() => expect(within(form).getByRole("button", { name: "Add" })).toBeEnabled());
  await user.click(within(form).getByRole("button", { name: "Add" }));
}

const posts = () => fakeApi.calls.filter((c) => c.method === "POST" && c.path === "/api/assignments").map((c) => c.body);

describe("Add assignment from the Year view (S10-07)", () => {
  it("saves exactly what the Assignments form saves for the same answers", async () => {
    stub();
    const user = userEvent.setup();
    renderAt("/schedule/assignments");
    await user.click(await screen.findByRole("button", { name: "Add assignment" }));
    const form = screen.getByRole("form", { name: "Add assignment" });
    await user.selectOptions(within(form).getByLabelText("Subject"), "hist");
    await fillRest(user, form);
    await waitFor(() => expect(posts()).toHaveLength(1));
    cleanup();

    const sheet = await openSheet(user);
    await pickSubject(user, sheet, "History");
    await fillRest(user, sheet);
    await waitFor(() => expect(posts()).toHaveLength(2));
    const [before, now] = posts();
    expect(now).toEqual(before);
    expect(now).toMatchObject({ subjectId: "hist", childIds: ["margaret"], weekdays: [1, 2, 4, 5] });
  });

  it("the subject picker lists each subject with a tick on the current one and New subject… last", async () => {
    stub();
    const user = userEvent.setup();
    const sheet = await openSheet(user);
    expect(sheet.querySelector("select#" + CSS.escape(within(sheet).getByRole("button", { name: /^Subject/ }).id))).toBeNull();
    await pickSubject(user, sheet, "History");
    expect(within(sheet).getByRole("button", { name: "Subject: History" })).toBeInTheDocument();
    await user.click(within(sheet).getByRole("button", { name: /^Subject/ }));
    const picker = await screen.findByRole("dialog", { name: "Subject" });
    const rows = within(picker).getAllByRole("button").filter((b) => b.classList.contains("subject-pick-row"));
    // Same order as the dropdown on the Assignments page.
    expect(rows.slice(0, SAMPLE_SUBJECTS.length).map((b) => b.textContent).sort()).toEqual(SAMPLE_SUBJECTS.map((s) => s.name).sort());
    expect(rows.at(-1)!.textContent).toBe("New subject…");
    expect(rows.filter((b) => b.getAttribute("aria-current") === "true").map((b) => b.textContent)).toEqual(["History"]);
    for (const r of rows.slice(0, SAMPLE_SUBJECTS.length)) expect(r.querySelector(".subject-badge")).not.toBeNull();
  });

  it("New subject… creates the subject when the assignment is saved", async () => {
    stub();
    fakeApi.on("POST /api/subjects", (body) => [201, { ...SAMPLE_SUBJECTS[0]!, ...(body as Partial<Subject>), id: "latin" }]);
    const user = userEvent.setup();
    const sheet = await openSheet(user);
    await pickSubject(user, sheet, "New subject…");
    await user.type(within(sheet).getByLabelText("Subject name"), "Latin");
    await user.click(within(sheet).getByRole("button", { name: "Add subject" }));
    expect(within(sheet).getByRole("button", { name: "Subject: Latin (new)" })).toBeInTheDocument();
    expect(fakeApi.calls.some((c) => c.path === "/api/subjects" && c.method === "POST")).toBe(false); // nothing until Add
    await fillRest(user, sheet);
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(fakeApi.calls.find((c) => c.path === "/api/subjects" && c.method === "POST")!.body).toMatchObject({ name: "Latin" });
    expect(posts()[0]).toMatchObject({ subjectId: "latin" });
  });

  it("children are toggle chips, and the day chips are soft", async () => {
    stub();
    const user = userEvent.setup();
    const sheet = await openSheet(user);
    const frank = within(sheet).getByLabelText("Frank");
    const chip = frank.closest(".kid-chip")!;
    expect(frank).not.toBeChecked();
    await user.click(frank);
    expect(frank).toBeChecked();
    expect(chip).toHaveClass("is-on");
    expect(chip.querySelector(".kid-chip-tick")).not.toBeNull();
    await user.click(frank);
    expect(frank).not.toBeChecked();
    expect(chip).not.toHaveClass("is-on");
    // Dates are tiles holding the shared DateField.
    expect([...sheet.querySelectorAll(".tl-tile .tl-tile-label")].map((t) => t.textContent)).toEqual(["Start", "End"]);
    expect(sheet.querySelectorAll(".tl-tile .date-field")).toHaveLength(2);
    expect(sheet.querySelector(".form-sheet .choice")).toBeNull();
    const css = readFileSync("src/features/schedule/schedule.css", "utf8");
    expect(css).toMatch(/\.form-sheet \.day-chip:has\(input:checked\) \{[^}]*background: var\(--tl-primary-soft\)/);
  });
});
