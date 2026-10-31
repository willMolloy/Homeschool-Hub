/** S4-10: "Missed a day?" on This Week (MissedDay.tsx). */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import type { BlockedRange } from "../src/api/types";
import { offeredMissedDays } from "../src/features/plan/MissedDay";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

// The fake family's today is Wed 2026-10-28; the shown week is Oct 26 - Nov 1; school days Mon-Fri.
const FRANK = { id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false };
const MARGARET = { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false };
const OLD = { id: "c3", name: "Old Kid", color: null, sortOrder: 2, archived: true };

const range = (startDate: string, childIds: string[], endDate = startDate, kind: BlockedRange["kind"] = "sick"): BlockedRange =>
  ({ id: `r-${startDate}-${childIds.join("")}`, label: null, kind, startDate, endDate, childIds });

function stub(opts: { children?: unknown[]; ranges?: BlockedRange[] } = {}) {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "x", to: "y", plans: [] });
  fakeApi.on("GET /api/children", 200, opts.children ?? [FRANK, MARGARET, OLD]);
  fakeApi.on("GET /api/subjects", 200, []);
  fakeApi.on("GET /api/assignments", 200, []);
  fakeApi.on("GET /api/blocked-ranges", 200, opts.ranges ?? []);
  fakeApi.on("POST /api/blocked-ranges", (body) => [201, { id: "new", ...(body as object) }]);
}
const planGets = () => fakeApi.calls.filter((c) => c.method === "GET" && c.path.startsWith("/api/plan")).length;

async function openSheet(path = "/") {
  const user = userEvent.setup();
  renderAt(path);
  await user.click(await screen.findByRole("button", { name: "Missed a day?" }));
  const sheet = await screen.findByRole("form", { name: "Missed a day" });
  await within(sheet).findByRole("group", { name: "Day" });
  return { user, sheet };
}
const offeredDays = (sheet: HTMLElement) =>
  within(within(sheet).getByRole("group", { name: "Day" })).queryAllByRole("radio").map((r) => r.getAttribute("aria-label"));

describe("offeredMissedDays (pure)", () => {
  const base = { weekStart: "2026-10-26", today: "2026-10-28", schoolDays: [1, 2, 3, 4, 5], childIds: ["c1", "c2"], who: "everyone" };
  it("is the school days up to today, nothing in the future", () => {
    expect(offeredMissedDays({ ...base, ranges: [] })).toEqual(["2026-10-26", "2026-10-27", "2026-10-28"]);
    expect(offeredMissedDays({ ...base, ranges: [], today: "2026-10-25" })).toEqual([]);
    expect(offeredMissedDays({ ...base, ranges: [], today: "2026-11-30" })).toHaveLength(5);
  });
  it("leaves out a day that is fully off for who", () => {
    const ranges = [range("2026-10-26", []), range("2026-10-27", ["c1"]), range("2026-10-28", ["c1"]), range("2026-10-28", ["c2"])];
    expect(offeredMissedDays({ ...base, ranges })).toEqual(["2026-10-27"]); // Mon family-wide, Wed both children
    expect(offeredMissedDays({ ...base, ranges, who: "c1" })).toEqual([]);
    expect(offeredMissedDays({ ...base, ranges, who: "c2" })).toEqual(["2026-10-27"]);
  });
  it("a multi-day range covers each of its days", () => {
    expect(offeredMissedDays({ ...base, ranges: [range("2026-10-26", [], "2026-10-27", "vacation")] })).toEqual(["2026-10-28"]);
  });
});

describe("Missed a day? (S4-10)", () => {
  it("offers only school days up to today in the shown week, with Everyone chosen", async () => {
    stub();
    const { sheet } = await openSheet();
    expect(offeredDays(sheet)).toEqual(["Monday 26", "Tuesday 27", "Wednesday 28"]);
    expect(within(sheet).getByRole("radio", { name: "Everyone" })).toBeChecked();
    expect(within(sheet).getAllByRole("radio", { name: /^(Everyone|Frank|Margaret)$/ })).toHaveLength(3); // archived child not offered
  });

  it("preselects today, so open then Save is enough (S4b-07)", async () => {
    stub();
    const { user, sheet } = await openSheet();
    expect(within(sheet).getByRole("radio", { name: "Wednesday 28" })).toBeChecked();
    expect(within(sheet).getByRole("button", { name: "Save" })).toBeEnabled();
    await user.click(within(sheet).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(fakeApi.calls.some((c) => c.method === "POST")).toBe(true));
    expect(fakeApi.calls.find((c) => c.method === "POST")!.body).toEqual({ label: "Missed day", kind: "missed", startDate: "2026-10-28", endDate: "2026-10-28", childIds: [] });
  });

  it("on a weekend the latest offered day (Friday) is preselected (S4b-07)", async () => {
    stub();
    fakeApi.on("GET /api/me", 200, { ...DEMO_ME, today: "2026-10-31" }); // a Saturday
    const { sheet } = await openSheet();
    expect(offeredDays(sheet)).toHaveLength(5);
    expect(within(sheet).getByRole("radio", { name: "Friday 30" })).toBeChecked();
    expect(within(sheet).getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("when today is already off, the latest offered day is preselected (S4b-07)", async () => {
    stub({ ranges: [range("2026-10-28", [])] });
    const { sheet } = await openSheet();
    expect(within(sheet).getByRole("radio", { name: "Tuesday 27" })).toBeChecked();
  });

  it("an earlier week offers all its school days", async () => {
    stub();
    const past = await openSheet("/?week=2026-10-19");
    expect(offeredDays(past.sheet)).toHaveLength(5);
  });

  it("a future week has nothing to mark", async () => {
    stub();
    const { sheet } = await openSheet("/?week=2026-11-02");
    expect(within(sheet).getByText("No days to mark.")).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("saves a missed day for one child and reloads the plan", async () => {
    stub();
    const { user, sheet } = await openSheet();
    const before = planGets();
    await user.click(within(sheet).getByRole("radio", { name: "Frank" }));
    await user.click(within(sheet).getByRole("radio", { name: "Tuesday 27" }));
    await user.click(within(sheet).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.queryByRole("form", { name: "Missed a day" })).toBeNull());
    const posts = fakeApi.calls.filter((c) => c.method === "POST");
    expect(posts).toEqual([{ method: "POST", path: "/api/blocked-ranges", body: { label: "Missed day", kind: "missed", startDate: "2026-10-27", endDate: "2026-10-27", childIds: ["c1"] } }]);
    await waitFor(() => expect(planGets()).toBeGreaterThan(before));
    expect(fakeApi.bodyKeyViolations).toEqual([]);
  });

  it("saves for everyone with an empty childIds", async () => {
    stub();
    const { user, sheet } = await openSheet();
    await user.click(within(sheet).getByRole("radio", { name: "Monday 26" }));
    await user.click(within(sheet).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(fakeApi.calls.some((c) => c.method === "POST")).toBe(true));
    expect(fakeApi.calls.find((c) => c.method === "POST")!.body).toEqual({ label: "Missed day", kind: "missed", startDate: "2026-10-26", endDate: "2026-10-26", childIds: [] });
  });

  it("doesn't offer a day already off for that child or everyone", async () => {
    stub({ ranges: [range("2026-10-26", []), range("2026-10-27", ["c1"])] });
    const { user, sheet } = await openSheet();
    expect(offeredDays(sheet)).toEqual(["Tuesday 27", "Wednesday 28"]); // Monday is off for the whole family
    await user.click(within(sheet).getByRole("radio", { name: "Frank" }));
    expect(offeredDays(sheet)).toEqual(["Wednesday 28"]);
    await user.click(within(sheet).getByRole("radio", { name: "Margaret" }));
    expect(offeredDays(sheet)).toEqual(["Tuesday 27", "Wednesday 28"]);
  });

  it("drops a chosen day that stops being offered when who changes", async () => {
    stub({ ranges: [range("2026-10-27", ["c1"])] });
    const { user, sheet } = await openSheet();
    await user.click(within(sheet).getByRole("radio", { name: "Tuesday 27" }));
    await user.click(within(sheet).getByRole("radio", { name: "Frank" }));
    // Tuesday is off for Frank, so the preselected latest day (Wednesday) takes over (S4b-07).
    expect(within(sheet).getByRole("radio", { name: "Wednesday 28" })).toBeChecked();
    expect(within(sheet).getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("a single-child family isn't asked who, and saves for everyone", async () => {
    stub({ children: [FRANK] });
    const { user, sheet } = await openSheet();
    expect(within(sheet).queryByRole("group", { name: "Who" })).toBeNull();
    await user.click(within(sheet).getByRole("radio", { name: "Wednesday 28" }));
    await user.click(within(sheet).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(fakeApi.calls.some((c) => c.method === "POST")).toBe(true));
    expect(fakeApi.calls.find((c) => c.method === "POST")!.body).toMatchObject({ childIds: [], startDate: "2026-10-28" });
  });

  it("shows a save error and keeps the sheet open", async () => {
    stub();
    fakeApi.on("POST /api/blocked-ranges", 400, { error: "invalid_request", message: "kind: Not a valid kind." });
    const { user, sheet } = await openSheet();
    await user.click(within(sheet).getByRole("radio", { name: "Monday 26" }));
    await user.click(within(sheet).getByRole("button", { name: "Save" }));
    expect(await within(sheet).findByRole("alert")).toHaveTextContent("Not a valid kind.");
    expect(within(sheet).getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("Cancel closes without saving", async () => {
    stub();
    const { user, sheet } = await openSheet();
    await user.click(within(sheet).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("form", { name: "Missed a day" })).toBeNull());
    expect(fakeApi.calls.some((c) => c.method === "POST")).toBe(false);
  });
});
