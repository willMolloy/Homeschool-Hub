/**
 * S7b-10: the form's pace ("About N pages a day"), the minutes a parent picks and the list's "about N min a day" use
 * the days the plan really has (POST /api/plan/pace), not every weekday in the dates.
 */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { minutesPerDayFromWeight, weightFromMinutesPerDay } from "@hh/engine";
import type { Assignment } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, MAGGIE, READING, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

// The review's case: Nov 2 - Jan 29 has 65 weekdays, but Thanksgiving, Christmas and a Tuesday skip leave 39 days of work.
const REAL_DAYS = 39;
const paces = () => fakeApi.calls.filter((c) => c.path === "/api/plan/pace");
type Draft = { childIds: string[]; weekdays: number[] | null };
/** Answers every draft with `days(draft)` for each child (the smallest wins, as the API does). */
function stubPace(days: (d: Draft) => Record<string, number> = (d) => Object.fromEntries(d.childIds.map((c) => [c, REAL_DAYS]))) {
  fakeApi.on("POST /api/plan/pace", (body) => [200, {
    paces: (body as { drafts: Draft[] }).drafts.map((d) => {
      const per = days(d);
      const perChild = d.childIds.map((childId) => ({ childId, capacityDays: per[childId] ?? REAL_DAYS }));
      return { capacityDays: Math.min(...perChild.map((c) => c.capacityDays)), perChild };
    }),
  }]);
}

async function openAdd(rows: Assignment[] = []) {
  withRoster();
  fakeApi.on("GET /api/assignments", 200, rows);
  fakeApi.on("GET /api/weights/suggestion", 200, { unitType: "pages", weightPerUnit: 2, source: "builtin", children: [] });
  fakeApi.on("POST /api/assignments", (body) => [201, { ...(body as object), id: rowId(9), archived: false }]);
  const user = userEvent.setup();
  renderAt("/schedule/assignments");
  await user.click(await screen.findByRole("button", { name: "Add assignment" }));
  const form = screen.getByRole("form", { name: "Add assignment" });
  await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
  await user.type(within(form).getByLabelText("Title"), "Science");
  await user.selectOptions(within(form).getByLabelText("Unit"), "pages");
  await user.type(within(form).getByLabelText("Total"), "300");
  await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
  fireEvent.change(within(form).getByLabelText("Start"), { target: { value: "2026-11-02" } });
  fireEvent.change(within(form).getByLabelText("End"), { target: { value: "2027-01-29" } });
  return { user, form };
}
const effort = (form: HTMLElement, name: string) => within(within(form).getByRole("group", { name: "About how long will that take?" })).getByRole("radio", { name });

describe("pace over the days the plan really has (S7b-10)", () => {
  it("the form says 7.7 pages a day (300 over 39 days), not 4.6 (65 weekdays)", async () => {
    stubPace();
    const { form } = await openAdd();
    expect(await within(form).findByText("About 7.7 pages a day")).toBeInTheDocument();
    const call = paces().at(-1)!.body as { drafts: Record<string, unknown>[] };
    expect(call.drafts[0]).toMatchObject({ subjectId: READING.id, childIds: [FRANK.id], startDate: "2026-11-02", endDate: "2027-01-29", weekdays: [1, 2, 3, 4, 5] });
  });

  it("picking 30 min a day stores the weight that gives 30 min over those days", async () => {
    stubPace();
    const { user, form } = await openAdd();
    await within(form).findByText("About 7.7 pages a day");
    await user.click(effort(form, "30 min a day"));
    await waitFor(() => expect(within(form).getByRole("button", { name: "Add" })).toBeEnabled());
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    const weight = (writes()[0]!.body as { weightPerUnit: number }).weightPerUnit;
    expect(weight).toBe(weightFromMinutesPerDay(30, 300 / REAL_DAYS));
    expect(Math.round(minutesPerDayFromWeight(weight, 300 / REAL_DAYS))).toBe(30);
    expect(weight).not.toBe(weightFromMinutesPerDay(30, 300 / 65)); // what counting weekdays would have saved
  });

  it("with children whose days differ, it counts the child with the fewest and says so", async () => {
    stubPace(() => ({ [FRANK.id]: 39, [MAGGIE.id]: 52 }));
    const { user, form } = await openAdd();
    await user.click(within(form).getByRole("checkbox", { name: "Maggie" }));
    expect(await within(form).findByText("Frank has the fewest school days here, so this counts Frank's.")).toBeInTheDocument();
    expect(within(form).getByText("About 7.7 pages a day")).toBeInTheDocument();
  });

  it("if the count can't be asked, the weekdays between the dates are used (4.6 a day)", async () => {
    // No route for the pace request: the fake API answers 404.
    const { form } = await openAdd();
    expect(await within(form).findByText("About 4.6 pages a day")).toBeInTheDocument();
  });

  it("the list's card says about 30 min a day when the plan's days say so", async () => {
    const weight = weightFromMinutesPerDay(30, 300 / REAL_DAYS);
    const row: Assignment = { id: rowId(1), subjectId: READING.id, title: "Science", unitType: "pages", totalUnits: 300, weightPerUnit: weight,
      startDate: "2026-11-02", endDate: "2027-01-29", childIds: [FRANK.id], archived: false, weekdays: null };
    stubPace();
    withRoster();
    fakeApi.on("GET /api/assignments", 200, [row]);
    renderAt("/schedule/assignments");
    const list = await screen.findByRole("list", { name: "Assignments" });
    await waitFor(() => expect(within(list).getByText(/300 pages · about 30 min a day/)).toBeInTheDocument());
    // Counting weekdays only would have said about 18 min.
    expect(minutesPerDayFromWeight(weight, 300 / 65)).toBeLessThan(20);
  });

  it("every card in a list is asked in one request", async () => {
    const rows = [1, 2, 3].map((n): Assignment => ({ id: rowId(n), subjectId: READING.id, title: `Book ${n}`, unitType: "pages", totalUnits: 100, weightPerUnit: 2,
      startDate: "2026-11-02", endDate: "2027-01-29", childIds: [FRANK.id], archived: false, weekdays: null }));
    stubPace();
    withRoster();
    fakeApi.on("GET /api/assignments", 200, rows);
    renderAt("/schedule/assignments");
    await screen.findByRole("list", { name: "Assignments" });
    await waitFor(() => expect(paces().length).toBeGreaterThan(0));
    expect(paces()).toHaveLength(1);
    expect((paces()[0]!.body as { drafts: unknown[] }).drafts).toHaveLength(3);
  });
});

describe("a minutes preset is always the parent's choice (S7b-14, F-11)", () => {
  it("tapping '30 min a day' when the learned suggestion already shows as that preset saves exactly 30 minutes' weight", async () => {
    stubPace(() => ({ [FRANK.id]: 60 }));
    withRoster();
    fakeApi.on("GET /api/assignments", 200, []);
    // Frank's learned weight 3.25 is 32.5 min a day at 5 pages a day, which the form shows as the "30" preset.
    fakeApi.on("GET /api/weights/suggestion", 200, { unitType: "pages", weightPerUnit: 3.25, source: "child", children: [{ childId: FRANK.id, name: "Frank", usual: 3.25 }] });
    fakeApi.on("POST /api/assignments", (body) => [201, { ...(body as object), id: rowId(9), archived: false }]);
    const user = userEvent.setup();
    renderAt("/schedule/assignments");
    await user.click(await screen.findByRole("button", { name: "Add assignment" }));
    const form = screen.getByRole("form", { name: "Add assignment" });
    await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
    await user.type(within(form).getByLabelText("Title"), "Math");
    await user.selectOptions(within(form).getByLabelText("Unit"), "pages");
    await user.type(within(form).getByLabelText("Total"), "300");
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    fireEvent.change(within(form).getByLabelText("Start"), { target: { value: "2026-11-02" } });
    fireEvent.change(within(form).getByLabelText("End"), { target: { value: "2027-01-29" } });
    await within(form).findByText("About 5 pages a day");
    await within(form).findByText(/Frank usually does about 33 min a day\./);
    expect(effort(form, "30 min a day")).toBeChecked(); // the suggestion's nearest preset is already showing
    await user.click(effort(form, "30 min a day"));
    await waitFor(() => expect(within(form).getByRole("button", { name: "Add" })).toBeEnabled());
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect((writes()[0]!.body as { weightPerUnit: number }).weightPerUnit).toBe(3);
  });
});

describe("a learned suggestion that is far too big isn't offered (S7b-14, F-11)", () => {
  async function openOneDay(subjectDefaultWeight: number | null) {
    stubPace(() => ({ [FRANK.id]: 1 }));
    withRoster();
    fakeApi.on("GET /api/assignments", 200, []);
    fakeApi.on("GET /api/weights/suggestion", 200, {
      unitType: "pages", weightPerUnit: 3.25, source: "child", builtInDefault: 0.5,
      subjectDefault: subjectDefaultWeight === null ? null : { unitType: "pages", weightPerUnit: subjectDefaultWeight },
      learned: true, children: [{ childId: FRANK.id, name: "Frank", usual: 3.25, choices: 3 }],
    });
    fakeApi.on("POST /api/assignments", (body) => [201, { ...(body as object), id: rowId(9), archived: false }]);
    const user = userEvent.setup();
    renderAt("/schedule/assignments");
    await user.click(await screen.findByRole("button", { name: "Add assignment" }));
    const form = screen.getByRole("form", { name: "Add assignment" });
    await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
    await user.type(within(form).getByLabelText("Title"), "One-day read");
    await user.selectOptions(within(form).getByLabelText("Unit"), "pages");
    await user.type(within(form).getByLabelText("Total"), "300");
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    fireEvent.change(within(form).getByLabelText("Start"), { target: { value: "2026-11-02" } });
    fireEvent.change(within(form).getByLabelText("End"), { target: { value: "2026-11-02" } });
    await within(form).findByText("About 300 pages a day");
    return { user, form };
  }

  it("1,950 min a day is set aside: the built-in stands in, and the weight saved follows the default (null), not 3.25", async () => {
    const { user, form } = await openOneDay(null);
    await waitFor(() => expect(within(form).getByText(/^Usually about \d+ min a day\.$/)).toBeInTheDocument());
    expect(within(form).queryByText(/Frank usually does/)).toBeNull();
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect((writes()[0]!.body as { weightPerUnit: number | null }).weightPerUnit).toBeNull();
  });

  it("with a subject usual for pages, that stands in and says so", async () => {
    const { form } = await openOneDay(1);
    expect(await within(form).findByText(/^Reading usually takes about 2 min a page/)).toBeInTheDocument();
    expect(within(form).queryByText(/Frank usually does/)).toBeNull();
  });
});
