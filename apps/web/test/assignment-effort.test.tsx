/** S6-09: the assignment form asks "About how long will that take?" and saves a weight per unit. */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Assignment } from "../src/api/types";
import { optionFor, paceText, schoolDaysBetween, unitsPerDay } from "../src/features/schedule/effort";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, MATH, READING, patchMerging, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

const group = (form: HTMLElement) => within(form).getByRole("group", { name: "About how long will that take?" });
const radio = (form: HTMLElement, name: string) => within(group(form)).getByRole("radio", { name });
const date = (form: HTMLElement, label: string, value: string) => fireEvent.change(within(form).getByLabelText(label), { target: { value } });

describe("effort helpers", () => {
  it("counts school days in a range", () => {
    expect(schoolDaysBetween("2026-11-02", "2027-01-22", [1, 2, 3, 4, 5])).toBe(60);
    expect(schoolDaysBetween("2026-11-02", "2026-11-08", [1, 3])).toBe(2);
    expect(schoolDaysBetween("2026-11-08", "2026-11-02", [1])).toBe(0);
    expect(schoolDaysBetween("", "2026-11-02", [1])).toBe(0);
  });
  it("units a day, or null", () => {
    expect(unitsPerDay(300, "2026-11-02", "2027-01-22", [1, 2, 3, 4, 5])).toBe(5);
    expect(unitsPerDay(0, "2026-11-02", "2027-01-22", [1])).toBeNull();
    expect(unitsPerDay(10, "2026-11-07", "2026-11-08", [1, 2])).toBeNull();
  });
  it("the nearest preset within half a step, else custom", () => {
    expect(optionFor(10)).toBe(15);
    expect(optionFor(22)).toBe(15);
    expect(optionFor(23)).toBe(30);
    expect(optionFor(67)).toBe(60);
    expect(optionFor(90)).toBe("custom");
    expect(optionFor(3)).toBe("custom");
  });
  it("the pace line", () => {
    expect(paceText(5, "pages")).toBe("About 5 pages a day");
    expect(paceText(1, "lessons")).toBe("About 1 lesson a day");
    expect(paceText(4.26, "chapters")).toBe("About 4.3 chapters a day");
    expect(paceText(0.526, "lessons")).toBe("About 0.53 lessons a day");
    expect(paceText(12.4, "minutes")).toBe("About 12 minutes a day");
  });
});

describe("the effort question on the Add form", () => {
  async function openAdd() {
    withRoster();
    fakeApi.on("GET /api/assignments", 200, []);
    fakeApi.on("POST /api/assignments", (body) => [201, { ...(body as object), id: rowId(9), archived: false }]);
    const user = userEvent.setup();
    renderAt("/schedule/assignments");
    await user.click(await screen.findByRole("button", { name: "Add assignment" }));
    const form = screen.getByRole("form", { name: "Add assignment" });
    await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
    await user.type(within(form).getByLabelText("Title"), "Atlas");
    await user.selectOptions(within(form).getByLabelText("Unit"), "pages");
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    return { user, form };
  }
  const fill = async (user: ReturnType<typeof userEvent.setup>, form: HTMLElement) => {
    await user.type(within(form).getByLabelText("Total"), "300");
    date(form, "Start", "2026-11-02");
    date(form, "End", "2027-01-22");
  };
  const submit = async (user: ReturnType<typeof userEvent.setup>, form: HTMLElement) => {
    await waitFor(() => expect(within(form).getByRole("button", { name: "Add" })).toBeEnabled());
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    return writes()[0]!.body as Record<string, unknown>;
  };

  it("asks nothing to pick until the total, dates and days give a pace", async () => {
    const { form } = await openAdd();
    expect(within(group(form)).queryAllByRole("radio")).toHaveLength(0);
    expect(within(form).getByText(/Add the total, the dates and the days/)).toBeInTheDocument();
    expect(within(form).queryByLabelText(/^Weight per/)).toBeNull();
  });

  it("shows the pace and the presets; 300 pages over 60 school days at 30 minutes stores weight 3", async () => {
    const { user, form } = await openAdd();
    await fill(user, form);
    expect(within(form).getByText("About 5 pages a day")).toBeInTheDocument();
    expect(within(group(form)).getAllByRole("radio").map((r) => r.closest("label")!.textContent))
      .toEqual(["15 min a day", "30 min a day", "45 min a day", "60 min a day", "Custom"]);
    await user.click(radio(form, "30 min a day"));
    expect((await submit(user, form)).weightPerUnit).toBe(3);
  });

  it("the pace follows the days: dropping Friday makes it 6.3 a day", async () => {
    const { user, form } = await openAdd();
    await fill(user, form);
    await user.click(within(form).getByRole("checkbox", { name: "Friday" }));
    expect(within(form).getByText("About 6.3 pages a day")).toBeInTheDocument();
  });

  it("Custom takes minutes a day: 20 minutes is weight 2", async () => {
    const { user, form } = await openAdd();
    await fill(user, form);
    await user.click(radio(form, "Custom"));
    await user.clear(within(form).getByLabelText("Minutes a day"));
    await user.type(within(form).getByLabelText("Minutes a day"), "20");
    expect(radio(form, "Custom")).toBeChecked();
    expect((await submit(user, form)).weightPerUnit).toBe(2);
  });

  it("untouched, the built-in suggestion preselects the nearest preset, says about N min, and saves null", async () => {
    const { user, form } = await openAdd();
    await fill(user, form);
    // Pages weigh 1 by default: 5 pages a day is 10 minutes, closest to 15.
    expect(await within(form).findByText("Usually about 10 min a day.")).toBeInTheDocument();
    expect(radio(form, "15 min a day")).toBeChecked();
    expect((await submit(user, form)).weightPerUnit).toBeNull();
  });

  it("the form never shows a weight field or a More section", async () => {
    const { form } = await openAdd();
    expect(within(form).queryByText("More")).toBeNull();
    expect(within(form).queryByLabelText(/weight/i)).toBeNull();
  });

  it("no body key other than the usual ones is sent", async () => {
    const { user, form } = await openAdd();
    await fill(user, form);
    await user.click(radio(form, "45 min a day"));
    const body = await submit(user, form);
    expect(Object.keys(body).sort()).toEqual(["childIds", "endDate", "startDate", "subjectId", "title", "totalUnits", "unitType", "weekdays", "weightPerUnit"]);
    expect(body.weightPerUnit).toBe(4.5);
    void FRANK;
  });
});

describe("editing shows the minutes", () => {
  const book = (weightPerUnit: number | null): Assignment => ({
    id: rowId(1), subjectId: MATH.id, title: "Atlas", unitType: "pages", totalUnits: 300, weightPerUnit,
    startDate: "2026-11-02", endDate: "2027-01-22", childIds: [FRANK.id], archived: false, weekdays: null,
  });
  async function openEdit(a: Assignment) {
    withRoster();
    fakeApi.on("GET /api/assignments", 200, [a]);
    fakeApi.on(`PATCH /api/assignments/${a.id}`, patchMerging(a));
    const user = userEvent.setup();
    renderAt("/schedule/assignments");
    await user.click(await screen.findByRole("button", { name: /Atlas/ }));
    return { user, form: screen.getByRole("form", { name: "Edit Atlas" }) };
  }

  it("weight 3 at 5 pages a day is exactly 30 minutes", async () => {
    const { form } = await openEdit(book(3));
    expect(radio(form, "30 min a day")).toBeChecked();
    expect(within(form).getByText("That's about 30 min a day now.")).toBeInTheDocument();
  });

  it("a weight between presets shows the nearest, with its minutes", async () => {
    const { form } = await openEdit(book(1.4));
    expect(radio(form, "15 min a day")).toBeChecked();
    expect(within(form).getByText("That's about 14 min a day now.")).toBeInTheDocument();
  });

  it("a weight far from every preset opens on Custom with its minutes", async () => {
    const { form } = await openEdit(book(9));
    expect(radio(form, "Custom")).toBeChecked();
    expect(within(form).getByLabelText("Minutes a day")).toHaveValue(90);
  });

  it("changing the dates alone keeps the weight; the pick then replaces it", async () => {
    const { user, form } = await openEdit(book(3));
    date(form, "End", "2027-01-29");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([{ method: "PATCH", path: `/api/assignments/${rowId(1)}`, body: { endDate: "2027-01-29" } }]);
  });

  it("picking another preset sends just the new weight", async () => {
    const { user, form } = await openEdit(book(3));
    await user.click(radio(form, "60 min a day"));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([{ method: "PATCH", path: `/api/assignments/${rowId(1)}`, body: { weightPerUnit: 6 } }]);
  });

  it("an unchanged pick of the same minutes sends nothing new when the weight is the same", async () => {
    const { user, form } = await openEdit(book(3));
    await user.click(radio(form, "30 min a day"));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([]);
  });
});
