/**
 * S6b-13: effort in the parent's words everywhere. Presets say "a day", the hint says "Usually about N min a day", an
 * assignment can go back to its subject's usual, cards and the subject form speak in minutes, and no parent-facing
 * text of the Assignments or Subjects screens says "weight".
 */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Assignment, Subject } from "../src/api/types";
import { presetChipDetail, subjectUsualHint, usualEffortText } from "../src/components/effortWords";
import { parseCustomMinutes, typicalDayMinutes } from "../src/components/weightPresets";
import { effortCardText } from "../src/features/schedule/weightText";
import { usuallyText } from "../src/features/schedule/WeightHint";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, MATH, READING, patchMerging, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

describe("helpers", () => {
  it("typicalDayMinutes: minutes for the typical day of each unit; null is the built-in", () => {
    expect(typicalDayMinutes("lessons", 22.5)).toBe(45);
    expect(typicalDayMinutes("pages", null)).toBe(40);
    expect(typicalDayMinutes("minutes", 0.75)).toBe(45);
    expect(typicalDayMinutes("chapters", 10)).toBe(20);
  });
  it("parseCustomMinutes: minutes in, the weight they stand for out; bad input is a message", () => {
    expect(parseCustomMinutes("15", "lessons")).toBe(7.5);
    expect(parseCustomMinutes("40", "pages")).toBe(20); // S7-17: minutes one unit takes
    expect(parseCustomMinutes("1", "pages")).toBe(0.5);
    expect(parseCustomMinutes("", "pages")).toBe("Enter the minutes.");
    expect(parseCustomMinutes("x", "pages")).toBe("Minutes must be a number.");
    expect(parseCustomMinutes("0", "pages")).toMatch(/^Minutes must be more than 0/);
    expect(parseCustomMinutes("201", "pages")).toMatch(/at most 200/);
    expect(parseCustomMinutes("0.001", "pages")).toMatch(/too far from usual for a page/);
  });
  it("effortCardText: minutes a day at the pace, nothing without one", () => {
    const a = { unitType: "pages" as const, weightPerUnit: 1.4 };
    expect(effortCardText(a, null, 3.915)).toBe("about 11 min a day");
    expect(effortCardText({ unitType: "lessons", weightPerUnit: null }, null, 1)).toBe("about 30 min a day");
    expect(effortCardText({ unitType: "lessons", weightPerUnit: null }, { unitType: "lessons", weightPerUnit: 20 }, 1)).toBe("about 40 min a day");
    expect(effortCardText(a, null, null)).toBeNull();
  });
  it("S7-17: the usual-effort texts, one helper for every screen", () => {
    expect(usualEffortText("pages", 1)).toBe("about 2 min a page");
    expect(usualEffortText("lessons", 15)).toBe("about 30 min a lesson");
    expect(usualEffortText("pages", 0.75)).toBe("about 1.5 min a page");
    expect(usualEffortText("chapters", null)).toBe("about 20 min a chapter");
    expect(usualEffortText("minutes", null)).toBe("about 1 min a minute");
    expect(presetChipDetail("lessons", 7.5)).toBe("· 15 min a lesson");
    expect(subjectUsualHint("Math", "lessons", 15, 32)).toBe("Math usually takes about 30 min a lesson (about 32 min a day here).");
  });
  it("usuallyText never names a weight", () => {
    const base = { unitType: "pages" as const, weightPerUnit: 1, source: "builtin" as const, builtInDefault: 1, subjectDefault: null, learned: true, children: [] };
    expect(usuallyText(base, 30)).toBe("Usually about 30 min a day.");
    expect(usuallyText({ ...base, source: "subject" }, 30)).toBe("Usually about 30 min a day."); // no subject name given
    expect(usuallyText({ ...base, source: "subject", weightPerUnit: 15, unitType: "lessons" }, 32, "Math")).toBe("Math usually takes about 30 min a lesson (about 32 min a day here).");
    const kid = (name: string, usual: number | null) => ({ childId: name, name, usual, choices: 1 });
    expect(usuallyText({ ...base, source: "child", children: [kid("Maggie", 1.4)] }, 12)).toBe("Maggie usually does about 12 min a day.");
    expect(usuallyText({ ...base, source: "children", children: [kid("Maggie", 1.4), kid("Frank", 2), kid("Ada", null)] }, 12))
      .toBe("Maggie and Frank usually do about 12 min a day. Ada has no history yet.");
  });
});

const MATH_USUAL: Subject = { ...MATH, defaultWeight: { unitType: "lessons", weightPerUnit: 20 } };
const OWN: Assignment = {
  id: rowId(1), subjectId: MATH.id, title: "Saxon 5/4", unitType: "lessons", totalUnits: 20, weightPerUnit: 10,
  startDate: "2026-11-02", endDate: "2026-11-26", childIds: [FRANK.id], archived: false, weekdays: null,
};
const FOLLOWING: Assignment = { ...OWN, id: rowId(2), title: "Following", weightPerUnit: null };

async function openEdit(title: string, subjects: Subject[], rows: Assignment[] = [OWN, FOLLOWING]) {
  withRoster(undefined, subjects);
  fakeApi.on("GET /api/assignments", 200, rows);
  for (const r of rows) fakeApi.on(`PATCH /api/assignments/${r.id}`, patchMerging(r));
  const user = userEvent.setup();
  renderAt("/schedule/assignments");
  await screen.findByRole("list", { name: "Assignments" });
  await user.click(screen.getByRole("button", { name: new RegExp(title) }));
  return { user, form: screen.getByRole("form", { name: `Edit ${title}` }) };
}
const usualButton = (form: HTMLElement) => within(form).queryByRole("button", { name: "Use the subject's usual" });

describe("Use the subject's usual", () => {
  it("is offered for an assignment with its own effort when the subject has a usual; it saves null", async () => {
    const { user, form } = await openEdit("Saxon 5/4", [MATH_USUAL, READING]);
    // 10 a lesson over 19 school days: 20/19 lessons a day is about 21 min a day.
    expect(within(form).getByText("That's about 21 min a day now.")).toBeInTheDocument();
    await user.click(usualButton(form)!);
    expect(within(form).getByText("Math usually takes about 40 min a lesson (about 42 min a day here).")).toBeInTheDocument();
    expect(usualButton(form)).toBeNull();
    expect(within(form).getByRole("radio", { name: "45 min a day" })).toBeChecked();
    await user.click(within(form).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]).toMatchObject({ method: "PATCH", path: `/api/assignments/${OWN.id}`, body: { weightPerUnit: null } });
  });

  it("picking a preset afterwards is the parent's own answer again", async () => {
    const { user, form } = await openEdit("Saxon 5/4", [MATH_USUAL]);
    await user.click(usualButton(form)!);
    await user.click(within(form).getByRole("radio", { name: "30 min a day" }));
    expect(within(form).queryByText(/usual: about/)).toBeNull();
    expect(usualButton(form)).not.toBeNull();
    await user.click(within(form).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect((writes()[0]!.body as { weightPerUnit: number }).weightPerUnit).toBeGreaterThan(0);
  });

  it("is not offered when the subject has no usual, or the assignment follows it already", async () => {
    const a = await openEdit("Saxon 5/4", [MATH, READING]);
    expect(usualButton(a.form)).toBeNull();
  });

  it("is not offered for an assignment that already follows the subject", async () => {
    const { form } = await openEdit("Following", [MATH_USUAL]);
    expect(usualButton(form)).toBeNull();
  });

  it("is not offered when the subject's usual is for another unit", async () => {
    const { form } = await openEdit("Saxon 5/4", [{ ...MATH, defaultWeight: { unitType: "pages", weightPerUnit: 2 } }]);
    expect(usualButton(form)).toBeNull();
  });

  async function openAddWith(suggestionSource: "builtin" | "subject") {
    withRoster([FRANK], [MATH_USUAL]);
    fakeApi.on("GET /api/assignments", 200, []);
    fakeApi.on("GET /api/weights/suggestion", (_b, _p, q) => [200, {
      unitType: "lessons", weightPerUnit: suggestionSource === "subject" ? 20 : 15, source: suggestionSource, builtInDefault: 15,
      subjectDefault: suggestionSource === "subject" ? { unitType: "lessons", weightPerUnit: 20 } : null, learned: false, children: q.get("childIds") ? [] : [],
    }]);
    fakeApi.on("POST /api/assignments", (body) => [201, { ...(body as object), id: rowId(9), archived: false }]);
    const user = userEvent.setup();
    renderAt("/schedule/assignments");
    await user.click(await screen.findByRole("button", { name: "Add assignment" }));
    const form = screen.getByRole("form", { name: "Add assignment" });
    await user.selectOptions(within(form).getByLabelText("Subject"), MATH.id);
    await user.type(within(form).getByLabelText("Title"), "Saxon");
    await user.type(within(form).getByLabelText("Total"), "20");
    fireEvent.change(within(form).getByLabelText("Start"), { target: { value: "2026-11-02" } });
    fireEvent.change(within(form).getByLabelText("End"), { target: { value: "2026-11-26" } });
    await user.click(await within(form).findByRole("radio", { name: "60 min a day" }));
    return { user, form };
  }

  it("an own pick on the Add form can go back to the subject's usual, which is sent as null", async () => {
    const { user, form } = await openAddWith("builtin");
    await user.click(usualButton(form)!);
    expect(within(form).getByText("Math usually takes about 40 min a lesson (about 42 min a day here).")).toBeInTheDocument();
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]!.body).toMatchObject({ subjectId: MATH.id, weightPerUnit: null });
  });

  it("when the suggestion is already the subject's usual, its own 'Use about' covers it: no second button", async () => {
    const { form } = await openAddWith("subject");
    expect(await within(form).findByRole("button", { name: /^Use about \d+ min$/ })).toBeInTheDocument();
    expect(usualButton(form)).toBeNull();
  });
});

describe("no weights on screen", () => {
  it("the Assignments list and forms say minutes a day and never 'weight'", async () => {
    const { user, form } = await openEdit("Saxon 5/4", [MATH_USUAL, READING]);
    expect(form.textContent).not.toMatch(/weight/i);
    await user.click(within(form).getByRole("button", { name: "Cancel" }));
    const list = screen.getByRole("list", { name: "Assignments" });
    expect(list.textContent).toContain("20 lessons · about 21 min a day");
    expect(list.textContent).toContain("20 lessons · about 42 min a day"); // the one following Math's usual
    expect(document.body.textContent).not.toMatch(/weight/i);
    await user.click(screen.getByRole("button", { name: "Add assignment" }));
    const add = screen.getByRole("form", { name: "Add assignment" });
    expect(add.textContent).not.toMatch(/weight/i);
  });

  it("the Subjects list and form say minutes a unit and never 'weight'", async () => {
    withRoster(undefined, [MATH_USUAL, READING]);
    fakeApi.on("PATCH /api/subjects/" + MATH.id, patchMerging(MATH_USUAL));
    const user = userEvent.setup();
    renderAt("/subjects");
    const row = await screen.findByRole("button", { name: /Math/ });
    expect(row).toHaveTextContent("about 40 min a lesson");
    await user.click(row);
    const form = screen.getByRole("form", { name: "Edit Math" });
    expect(within(form).getByRole("radio", { name: "Custom…" })).toBeChecked();
    expect(within(form).getByLabelText("Custom minutes a lesson")).toHaveValue(40);
    // The server's own error text is not the screen's wording, so check the screen itself.
    expect(screen.getByRole("main").textContent ?? document.body.textContent).not.toMatch(/weight/i);
  });
});

describe("S7-17: the same figure on the Subjects list and the subject form", () => {
  it("the list chip and the form's chosen chip and Custom field agree for a lessons default and a pages default", async () => {
    const READING_PAGES: Subject = { ...READING, defaultWeight: { unitType: "pages", weightPerUnit: 0.75 } };
    withRoster(undefined, [MATH_USUAL, READING_PAGES]);
    const user = userEvent.setup();
    renderAt("/subjects");
    const math = await screen.findByRole("button", { name: /Math/ });
    const reading = screen.getByRole("button", { name: /Reading/ });
    expect(math).toHaveTextContent("about 40 min a lesson");
    expect(reading).toHaveTextContent("about 1.5 min a page");
    await user.click(math);
    expect(within(screen.getByRole("form", { name: "Edit Math" })).getByLabelText("Custom minutes a lesson")).toHaveValue(40);
    await user.click(within(screen.getByRole("form", { name: "Edit Math" })).getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: /Reading/ }));
    expect(within(screen.getByRole("form", { name: "Edit Reading" })).getByLabelText("Custom minutes a page")).toHaveValue(1.5);
    expect(document.body.textContent).not.toMatch(/bar width/i);
  });
});
