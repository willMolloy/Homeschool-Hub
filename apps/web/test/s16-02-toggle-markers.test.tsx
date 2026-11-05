/** S16-02: the Bars | Days toggle, its memory, the All children markers, and Days as a viewer (read-only). */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENGINE_VERSION, planAll, type Assignment as EngineAssignment, type BlockedPeriod, type ChildPlan } from "@hh/engine";
import type { Assignment, BlockedRange, Child, Subject } from "../src/api/types";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const KIDS: Child[] = [
  { id: "c1", name: "Frank", color: "#3b6fb0", sortOrder: 0, archived: false },
  { id: "c2", name: "Margaret", color: "#c0603f", sortOrder: 1, archived: false },
];
const SUBJECTS = [
  { id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null },
  { id: "math", name: "Math", color: null, sortOrder: 1, archived: false, defaultWeight: null, defaultWeekdays: null },
  { id: "music", name: "Music", color: null, sortOrder: 2, archived: false, defaultWeight: null, defaultWeekdays: null },
  { id: "hist", name: "History", color: null, sortOrder: 3, archived: false, defaultWeight: null, defaultWeekdays: null },
] as Subject[];
const E: EngineAssignment[] = [
  { id: "ti", subjectId: "lit", childIds: ["c1"], unitType: "pages", totalUnits: 375, start: "2026-09-07", end: "2026-12-18" },
  { id: "piano", subjectId: "music", childIds: ["c1"], unitType: "minutes", totalUnits: 1500, start: "2026-09-07", end: "2026-12-18" },
  { id: "math", subjectId: "math", childIds: ["c1", "c2"], unitType: "lessons", totalUnits: 100, start: "2026-09-07", end: "2026-12-18", weekdays: [1, 3, 5] },
  { id: "hist", subjectId: "hist", childIds: ["c2"], unitType: "chapters", totalUnits: 30, start: "2026-09-07", end: "2026-12-18", weekdays: [1, 2, 3, 4, 5] },
];
const BLOCKED: BlockedPeriod[] = [{ id: "tg", start: "2026-11-26", end: "2026-11-27", kind: "holiday", childIds: [] }];
const BLOCKED_ROWS: BlockedRange[] = [{ id: "tg", label: "Thanksgiving break", kind: "holiday", startDate: "2026-11-26", endDate: "2026-11-27", childIds: [] }];
const CAL = { weekStart: "mon" as const, schoolDays: [1, 2, 3, 4, 5] as never };
let plans: () => ChildPlan[];
const ASSIGNMENTS: Assignment[] = E.map((e) => ({ id: e.id, subjectId: e.subjectId, title: { ti: "Treasure Island", piano: "Piano practice", math: "Math 5", hist: "Story of the World" }[e.id]!,
  unitType: e.unitType, totalUnits: e.totalUnits, weightPerUnit: null, startDate: e.start, endDate: e.end, childIds: e.childIds, archived: false, weekdays: e.weekdays ?? null })) as Assignment[];

function stub(blockedRows: BlockedRange[] = BLOCKED_ROWS) {
  plans = () => planAll(E, { calendar: CAL, blocked: BLOCKED, asOf: "2026-11-04" });
  fakeApi.on("GET /api/children", 200, KIDS);
  fakeApi.on("GET /api/subjects", 200, SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, ASSIGNMENTS);
  fakeApi.on("GET /api/blocked-ranges", 200, blockedRows);
  fakeApi.on("GET /api/events", 200, []);
  fakeApi.on("GET /api/plan", (_b, _p, q) => [200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: q.get("from"), to: q.get("to"), plans: plans() }]);
}
beforeEach(() => { localStorage.clear(); stub(); });

const WEEK = "/schedule?view=week&week=2026-11-02";
const pressed = (name: string) => screen.getByRole("button", { name }).getAttribute("aria-pressed");

describe("the Bars | Days toggle (S16-02)", () => {
  it("Bars is the default; the toggle switches to Days and back", async () => {
    localStorage.setItem("hh.child", "c1");
    const user = userEvent.setup();
    renderAt(WEEK);
    await screen.findByRole("list", { name: "Frank's bars" });
    const group = screen.getByRole("group", { name: "Week layout" });
    expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual(["Bars", "Days"]);
    expect([pressed("Bars"), pressed("Days")]).toEqual(["true", "false"]);
    await user.click(within(group).getByRole("button", { name: "Days" }));
    await screen.findByRole("region", { name: "Mon, Nov 2" });
    expect([pressed("Bars"), pressed("Days")]).toEqual(["false", "true"]);
    expect(screen.queryByRole("list", { name: "Frank's bars" })).toBeNull();
    await user.click(within(group).getByRole("button", { name: "Bars" }));
    await screen.findByRole("list", { name: "Frank's bars" });
    expect(document.querySelectorAll(".day")).toHaveLength(0);
  });

  it("the choice is remembered on the device after a reload, and kept when the week or the child changes", async () => {
    const user = userEvent.setup();
    const first = renderAt(WEEK);
    await user.click(await screen.findByRole("button", { name: "Days" }));
    await screen.findByRole("region", { name: "Mon, Nov 2" });
    expect(localStorage.getItem("hh.week.layout")).toBe("days");
    first.unmount();
    renderAt(WEEK); // a reload: no layout in the address
    await screen.findByRole("region", { name: "Mon, Nov 2" });
    expect(pressed("Days")).toBe("true");
    await user.click(screen.getByRole("button", { name: "Next week" }));
    await screen.findByRole("region", { name: "Mon, Nov 9" });
    await user.click(screen.getByRole("button", { name: "Margaret" }));
    await screen.findByRole("region", { name: "Mon, Nov 9" });
    expect(pressed("Days")).toBe("true");
  });

  it("works when storage is blocked (it just is not remembered)", async () => {
    const user = userEvent.setup();
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    try {
      renderAt(WEEK);
      await user.click(await screen.findByRole("button", { name: "Days" }));
      await screen.findByRole("region", { name: "Mon, Nov 2" });
    } finally { get.mockRestore(); set.mockRestore(); }
  });

  it("the toggle is on a finished week too, with the same days", async () => {
    localStorage.setItem("hh.child", "c1");
    fakeApi.on("GET /api/check-ins/2026-10-19", 200, { weekStart: "2026-10-19", weekEnd: "2026-10-25", checkIn: null, items: [] });
    renderAt("/schedule?view=week&week=2026-10-19&layout=days");
    await screen.findByRole("region", { name: "Mon, Oct 19" });
    expect(pressed("Days")).toBe("true");
    expect(document.querySelectorAll(".day-line").length).toBeGreaterThan(3);
  });
});

describe("the child markers (S16-02)", () => {
  it("show under All children only: the initial in the child's colour, with the name for screen readers", async () => {
    localStorage.setItem("hh.child", "all");
    const user = userEvent.setup();
    renderAt(WEEK + "&layout=days");
    await screen.findByRole("region", { name: "Mon, Nov 2" });
    const dots = [...document.querySelectorAll<HTMLElement>(".day-dot")];
    expect(dots.length).toBeGreaterThan(5);
    const frank = dots.find((d) => d.textContent === "F")!;
    expect(frank.style.background).toMatch(/rgb\(59, 111, 176\)|#3b6fb0/i);
    expect(frank).toHaveAttribute("aria-hidden", "true");
    await user.click(screen.getByRole("button", { name: "Margaret" }));
    await waitFor(() => expect(document.querySelectorAll(".day-dot")).toHaveLength(0));
    await user.click(screen.getByRole("button", { name: "All children" }));
    await waitFor(() => expect(document.querySelectorAll(".day-dot").length).toBeGreaterThan(5));
  });
  it("a family with one child never sees markers", async () => {
    fakeApi.on("GET /api/children", 200, [KIDS[0]!]);
    renderAt(WEEK + "&layout=days");
    await screen.findByRole("region", { name: "Mon, Nov 2" });
    expect(document.querySelectorAll(".day-dot")).toHaveLength(0);
  });
});

describe("Days as a viewer (S16-02)", () => {
  const COOP = "00000000-0000-4000-8000-0000000000c0";
  const VIEWER = { ...DEMO_ME, familyId: COOP, name: "Maple Co-op", role: "viewer" as const, parentName: "Vera",
    accounts: [{ familyId: COOP, familyName: "Maple Co-op", role: "viewer" as const, current: true }] };
  const ALLOWED = ["/api/me", "/api/family", "/api/children", "/api/subjects", "/api/assignments", "/api/events", "/api/blocked-ranges", "/api/week-overrides",
    "/api/check-ins", "/api/plan", "/api/log-entries", "/api/log-entries/run-days", "/api/records/totals", "/api/health"];
  beforeEach(() => { fakeApi.on("GET /api/me", 200, VIEWER); });

  it("gets the toggle and the Days view, with no briefing and nothing to edit", async () => {
    localStorage.setItem("hh.child", "all");
    const user = userEvent.setup();
    renderAt(WEEK);
    await screen.findByRole("group", { name: "Week layout" });
    await user.click(screen.getByRole("button", { name: "Days" }));
    await screen.findByRole("region", { name: "Mon, Nov 2" });
    expect(screen.queryByRole("region", { name: "Weekly briefing" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^(Update status|Copy|More|Move end.*)$/ })).toBeNull();
    expect(document.querySelectorAll(".day-line").length).toBeGreaterThan(5);
    expect(localStorage.getItem("hh.week.layout")).toBe("days");
  });

  it("a line opens the read-only detail (only Close), and the screen makes reads only", async () => {
    localStorage.setItem("hh.child", "c1");
    const user = userEvent.setup();
    renderAt(WEEK + "&layout=days");
    const mon = await screen.findByRole("region", { name: "Mon, Nov 2" });
    await user.click(within(mon).getByRole("button", { name: /Treasure Island/ }));
    const detail = await screen.findByRole("dialog");
    expect(within(detail).getByText("Dates")).toBeInTheDocument();
    expect(within(detail).getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent)).toEqual(["Close"]);
    expect(fakeApi.calls.filter((c) => c.method !== "GET")).toEqual([]);
    for (const c of fakeApi.calls) expect(ALLOWED, `${c.method} ${c.path}`).toContain(c.path.split("?")[0]!);
  });

  it("a viewer's Days view for a finished week is read-only too", async () => {
    localStorage.setItem("hh.child", "c1");
    fakeApi.on("GET /api/check-ins/2026-10-19", 200, { weekStart: "2026-10-19", weekEnd: "2026-10-25", checkIn: null, items: [] });
    renderAt("/schedule?view=week&week=2026-10-19&layout=days");
    await screen.findByRole("region", { name: "Mon, Oct 19" });
    expect(fakeApi.calls.filter((c) => c.method !== "GET")).toEqual([]);
  });
});
