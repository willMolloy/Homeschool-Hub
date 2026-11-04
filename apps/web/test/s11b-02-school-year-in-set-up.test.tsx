// S11b-02: a School year screen in Set up, the setup flow's step 4 in its own place; the Home reminder's hidden state is the family's.
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import type { BlockedRange } from "../src/api/types";
import { clearSetupLater } from "../src/features/welcome/setupLater";
import { fakeApi } from "./helpers/fake-api";
import { familyPatches, newFamily, type NewFamily } from "./helpers/setup-flow";
import { renderAt } from "./render";

const START = "2026-08-17";
const END = "2027-05-21";
beforeEach(() => { clearSetupLater(); sessionStorage.clear(); localStorage.clear(); });

function bulkAdds(f: NewFamily) {
  fakeApi.on("POST /api/blocked-ranges/bulk", (body) => {
    const rows = (body as { blockedRanges: Omit<BlockedRange, "id">[] }).blockedRanges.map((b, i) => ({ ...b, id: `b${f.blocked.length + i + 1}` }));
    f.blocked.push(...(rows as BlockedRange[]));
    return [201, rows];
  });
}
async function open(f = newFamily({ setupDone: true, setupDeferred: ["year"], checklistHidden: true })) {
  bulkAdds(f);
  const user = userEvent.setup();
  const view = renderAt("/setup/school-year");
  await screen.findByRole("heading", { level: 1, name: "School year" });
  await screen.findByLabelText("First day");
  return { f, user, ...view };
}
const shapeCard = (name: string) => screen.getByRole("radio", { name: new RegExp(`^${name}`) });

describe("the School year screen", () => {
  it("is a row in Set up, with a way back", async () => {
    newFamily({ setupDone: true });
    const user = userEvent.setup();
    const { router } = renderAt("/setup");
    await user.click(await screen.findByRole("link", { name: /School year/ }));
    expect(router.state.location.pathname).toBe("/setup/school-year");
    await screen.findByRole("heading", { level: 1, name: "School year" });
    expect(document.querySelector(".schedule-back a")).toHaveAttribute("href", "/setup");
  });

  it("offers the dates and the four shapes, and no 'I'll set this later'", async () => {
    await open();
    expect(screen.getByLabelText("Last day")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "The shape of the year" })).getAllByRole("radio")).toHaveLength(4);
    expect(screen.queryByRole("radio", { name: /set this later/ })).toBeNull();
    expect(shapeCard("Fall and Spring")).toBeChecked();
  });

  it("a parent who put the year off and hid the reminder sets it here: the same data as step 4, and the deferral is cleared", async () => {
    const { f, user } = await open();
    fireEvent.change(screen.getByLabelText("First day"), { target: { value: START } });
    fireEvent.change(screen.getByLabelText("Last day"), { target: { value: END } });
    await user.click(shapeCard("Three terms"));
    expect(screen.getByText("Adds 3 term views and 2 breaks: Nov 9–22, Feb 15–28.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    const patch = familyPatches().at(-1) as { schoolYear: unknown; zoomViews: { hidden: string[]; custom: { name: string }[] }; setupDeferred: string[]; setupStep?: number };
    expect(patch.schoolYear).toEqual({ start: START, end: END, shape: "three-terms" });
    expect(patch.zoomViews.hidden).toEqual(["fall", "spring"]);
    expect(patch.zoomViews.custom.map((v) => v.name)).toEqual(["Term 1", "Term 2", "Term 3"]);
    expect(patch.setupDeferred).toEqual([]);
    expect(patch.setupStep).toBeUndefined();
    expect(f.blocked).toHaveLength(2);
    expect(f.me.setupDeferred).toEqual([]);
  });

  it("shows the saved year and shape, and saving it again changes nothing", async () => {
    const f = newFamily({ setupDone: true });
    f.schoolYear = { start: START, end: END, shape: "36-weeks" } as NewFamily["schoolYear"];
    const { user } = await open(f);
    await waitFor(() => expect(screen.getByLabelText("First day")).toHaveValue("Aug 17, 2026"));
    expect(shapeCard("36 weeks")).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Saved.");
    expect(fakeApi.calls.some((c) => c.method === "POST")).toBe(false);
    expect(familyPatches().every((p) => !("zoomViews" in (p as object)) && !("schoolYear" in (p as object)))).toBe(true);
  });

  it("Edit term views opens the zoom views sheet", async () => {
    const { user } = await open();
    await user.click(screen.getByRole("button", { name: "Edit term views" }));
    expect(await screen.findByRole("dialog", { name: "Zoom views" })).toBeInTheDocument();
  });

  it("a problem with the dates is said, and nothing is saved", async () => {
    const { user } = await open();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Pick the first and last day of the school year.")).toBeInTheDocument();
    expect(familyPatches()).toEqual([]);
  });
});
