/**
 * S15-03: the viewer's Schedule and Records. A viewer sees Schedule (Week and Year) and Records, can change the week, zoom, range and
 * child, can print and export, and finds NOTHING to edit: no control is rendered (not merely disabled). Every request a viewer's
 * screens make is a read the server's allow-list lets through.
 */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ENGINE_VERSION, plannedRangeForWeek } from "@hh/engine";
import type { FamilySettings, LogFields, RecordEntry, RecordTotals, Subject } from "../src/api/types";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { withCovered } from "./helpers/recordEntry";
import { SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_EVENTS, SAMPLE_SUBJECTS, samplePlans } from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

void plannedRangeForWeek;
/** Keep in step with VIEWER_READ_ROUTES (apps/api/src/auth/viewerAccess.ts). The Playwright smoke checks the same list against the real server. */
const ALLOWED_GETS = ["/api/me", "/api/family", "/api/children", "/api/subjects", "/api/assignments", "/api/events", "/api/blocked-ranges", "/api/week-overrides",
  "/api/check-ins", "/api/plan", "/api/log-entries", "/api/log-entries/run-days", "/api/records/totals", "/api/health"];

const COOP_ID = "00000000-0000-4000-8000-0000000000c0";
const VIEWER_ME = { ...DEMO_ME, familyId: COOP_ID, name: "Maple Co-op", role: "viewer" as const, parentName: "Vera",
  accounts: [{ familyId: COOP_ID, familyName: "Maple Co-op", role: "viewer" as const, current: true }, { familyId: DEMO_ME.familyId, familyName: "Demo family", role: "parent" as const, current: false }] };
const FAMILY: FamilySettings = { name: "Maple Co-op", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false, zoomViews: { hidden: [], custom: [] },
  logSetup: { template: "custom", fields: { subjectHours: true, coreSplit: false, totalHours: false, schoolDays: true, homeAway: false, notes: false, books: true } as LogFields } } as FamilySettings;
const entry = (): RecordEntry => withCovered({ id: "e1", childId: "frank", startDate: "2026-10-12", endDate: "2026-10-16", countsSchoolDay: true, schoolDays: 5, subjectMinutes: { math: 210 }, totalMinutes: null, homeMinutes: null, awayMinutes: null, notes: null, books: [] });
const totals: RecordTotals = { from: null, to: null, childId: null, entries: 1, schoolDays: 5, totalMinutes: 210, coreMinutes: 0, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0, books: ["Heidi"], bySubject: [{ subjectId: "math", minutes: 210 }] };

function stub(opts: { logSetup?: boolean } = {}) {
  fakeApi.on("GET /api/me", 200, VIEWER_ME);
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
  fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
  fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS as Subject[]);
  fakeApi.on("GET /api/assignments", 200, SAMPLE_ASSIGNMENTS);
  fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
  fakeApi.on("GET /api/events", 200, SAMPLE_EVENTS);
  fakeApi.on("GET /api/week-overrides", 200, { overrides: [] });
  fakeApi.on("GET /api/family", 200, opts.logSetup === false ? { ...FAMILY, logSetup: null } : FAMILY);
  fakeApi.on("GET /api/log-entries", 200, [entry()]);
  fakeApi.on("GET /api/records/totals", (_b, _p, q) => [200, { ...totals, from: q.get("from"), to: q.get("to"), childId: q.get("childId") }]);
}
const noWrites = () => expect(fakeApi.calls.filter((c) => c.method !== "GET")).toEqual([]);
const onlyAllowedReads = () => {
  for (const c of fakeApi.calls) expect(ALLOWED_GETS, `${c.method} ${c.path}`).toContain(c.path.split("?")[0]!);
};
const EDIT_WORDS = /^(Add assignment|Edit views|Copy|More|Update status|Update time estimate|Reset|Log|Change log setup|Make an adjustment|Save|Delete|Edit .*|Delete .*|Move end.*|Keep .*|.*completed)$/;
const editButtons = (root: HTMLElement | Document = document.body) =>
  [...root.querySelectorAll("button, a")].map((b) => (b.getAttribute("aria-label") ?? b.textContent ?? "").trim()).filter((n) => EDIT_WORDS.test(n));

beforeEach(() => { localStorage.clear(); stub(); });

describe("the viewer's shell", () => {
  it("offers Schedule and Records only, with View only and the account's name; no Home, Set up or family menu", async () => {
    renderAt("/schedule?view=week");
    const nav = await screen.findByRole("navigation", { name: "Main" });
    expect(within(nav).getAllByRole("link").map((l) => l.textContent)).toEqual(["Schedule", "Records"]);
    const bar = screen.getByRole("banner");
    expect(within(bar).getByText("View only")).toBeInTheDocument();
    expect(within(bar).getByText("Maple Co-op")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Family and settings" })).toBeNull();
    expect(screen.queryByRole("link", { name: /Home|Set up/ })).toBeNull();
  });

  it("the Account menu says who is signed in, offers Switch to the family and Leave, and Sign out", async () => {
    renderAt("/schedule?view=week");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Account" }));
    const menu = await screen.findByRole("dialog");
    expect(within(menu).getByText("Signed in as Vera")).toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: "Switch to Demo family" })).toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: "Leave Maple Co-op" })).toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(within(menu).queryByRole("link")).toBeNull();
  });

  it("Home, Set up and the setup flow's addresses all go to Schedule", async () => {
    for (const path of ["/", "/setup", "/setup/children", "/setup/settings", "/welcome", "/kids", "/schedule/settings"]) {
      const { router, unmount } = renderAt(path);
      await waitFor(() => expect(router.state.location.pathname).toBe("/schedule"), { timeout: 3000 });
      unmount();
    }
    noWrites();
  });

  it("tells search engines nothing and sends no referrer while a viewer is signed in", async () => {
    const { unmount } = renderAt("/schedule?view=week");
    await screen.findByRole("navigation", { name: "Main" });
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    expect(document.head.querySelector('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
    unmount();
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });
});

describe("Schedule, Week, as a viewer", () => {
  it("shows the week and lets you change week and child, with Print sheets, and nothing to edit", async () => {
    renderAt("/schedule?view=week");
    await screen.findByRole("region", { name: "Frank's work" });
    expect(screen.queryByRole("region", { name: "Weekly briefing" })).toBeNull();
    const steps = screen.getByRole("group", { name: "Week" });
    expect(within(steps).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Previous week", "Next week"]);
    expect(screen.getByRole("button", { name: "Print sheets" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Child|Children/i })).toBeInTheDocument();
    expect(editButtons()).toEqual([]);
    const user = userEvent.setup();
    await user.click(within(steps).getByRole("button", { name: "Next week" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Coming week" })).toBeInTheDocument();
    noWrites();
    onlyAllowedReads();
  });

  it("a bar opens a read-only detail: title, dates, amount, pace; no Copy, More, Update status or adjustment", async () => {
    renderAt("/schedule?view=week");
    const frank = await screen.findByRole("region", { name: "Frank's work" });
    const first = within(frank).getAllByRole("button")[0]!;
    const user = userEvent.setup();
    await user.click(first);
    const detail = await screen.findByRole("dialog");
    expect(within(detail).getByText("Dates")).toBeInTheDocument();
    expect(within(detail).getByText("Amount")).toBeInTheDocument();
    expect(within(detail).getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent)).toEqual(["Close"]);
    expect(within(detail).queryByRole("textbox")).toBeNull();
    expect(within(detail).queryByRole("spinbutton")).toBeNull();
    expect(editButtons(detail)).toEqual([]);
    expect(screen.queryByRole("button", { name: /Update status/ })).toBeNull();
    noWrites();
    onlyAllowedReads();
  });

  it("with no children or nothing planned there is nothing to add, only the plain words", async () => {
    fakeApi.on("GET /api/children", 200, []);
    renderAt("/schedule?view=week");
    expect(await screen.findByText("No children yet.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Add your children/ })).toBeNull();
  });
});

describe("Schedule, Year, as a viewer", () => {
  it("keeps the zoom and the child switch, but has no plus and no pencil", async () => {
    renderAt("/schedule?view=year");
    await screen.findByRole("img", { name: "Year timeline" });
    expect(screen.getByRole("group", { name: "Zoom" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add assignment" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit views" })).toBeNull();
    expect(editButtons()).toEqual([]);
    noWrites();
  });

  it("picking a bar opens the read-only detail, never the edit bar", async () => {
    renderAt("/schedule?view=year");
    const svg = await screen.findByRole("img", { name: "Year timeline" });
    const band = svg.querySelectorAll("path.tl-band")[0]!;
    const [x, y] = band.getAttribute("d")!.slice(1).split(/[ ,LCQVHZ]+/).filter(Boolean).map(Number);
    fireEvent.click(svg, { clientX: x! + 1, clientY: y! + 1 });
    const detail = await screen.findByRole("dialog");
    expect(within(detail).getByText("Dates")).toBeInTheDocument();
    expect(within(detail).getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent)).toEqual(["Close"]);
    expect(screen.queryByRole("region", { name: /^Edit / })).toBeNull();
    expect(editButtons()).toEqual([]);
    noWrites();
    onlyAllowedReads();
  });
});

describe("Records, as a viewer", () => {
  it("shows the totals and entries, with Export and Term in review and the range and child, but no Log, Edit, Delete or Change log setup", async () => {
    renderAt("/records");
    await screen.findByRole("list", { name: "Log entries" });
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Term in review" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Range" })).toBeInTheDocument();
    expect(editButtons()).toEqual([]);
    expect(screen.queryByText("Change log setup")).toBeNull();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Export" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    noWrites();
    onlyAllowedReads();
  });

  it("changing the range asks for that range's totals, as a read", async () => {
    renderAt("/records");
    await screen.findByRole("list", { name: "Log entries" });
    const user = userEvent.setup();
    const before = fakeApi.calls.filter((c) => c.path.startsWith("/api/records/totals")).length;
    await user.click(within(screen.getByRole("group", { name: "Range" })).getByRole("button", { name: "This week" }));
    await waitFor(() => expect(fakeApi.calls.filter((c) => c.path.startsWith("/api/records/totals")).length).toBeGreaterThan(before));
    noWrites();
  });

  it("a record with nothing set up to track says so, without the setup form", async () => {
    stub({ logSetup: false });
    renderAt("/records");
    expect(await screen.findByText("Nothing has been set up to track yet.")).toBeInTheDocument();
    expect(screen.queryByRole("form")).toBeNull();
    expect(screen.queryByRole("button", { name: /Save|Choose|Continue/ })).toBeNull();
  });

  it("Term in review opens for a viewer, with no link to add a child", async () => {
    renderAt("/records/review");
    expect(await screen.findByRole("heading", { name: "Term in review" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Add a child" })).toBeNull();
    noWrites();
  });
});

describe("a parent still gets everything (nothing here changed for them)", () => {
  it("has Home, Set up, the family menu and the edit controls", async () => {
    fakeApi.on("GET /api/me", 200, DEMO_ME);
    renderAt("/records");
    await screen.findByRole("list", { name: "Log entries" });
    expect(screen.getByRole("button", { name: "Log" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Set up/ })).toBeInTheDocument();
    expect(screen.queryByText("View only")).toBeNull();
  });
});
