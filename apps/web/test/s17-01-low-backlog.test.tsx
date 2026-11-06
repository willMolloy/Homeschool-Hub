/** S17-01: the Low backlog (web side). One block per item; the API side is in apps/api/test/s17-01-viewer-json-and-long-token.test.ts. */
import { readFileSync } from "node:fs";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { differenceCiede2000 } from "culori";
import { ENGINE_VERSION, planAll, type Assignment as EngineAssignment, type ChildPlan, type ProgressCheckIn } from "@hh/engine";
import type { Assignment, BlockedRange, Child, Subject } from "../src/api/types";
import { daySpanLabels } from "../src/features/week/weekBars";
import { JoinPage } from "../src/features/join/JoinPage";
import { KIND_NAMES, dayOffTitle } from "../src/lib/kindNames";
import { breakNames } from "../src/features/print/sheetModel";
import { layoutTimeline, metricsFor } from "../src/features/timeline/layout";
import { ABOVE_NAME_PX } from "../src/features/timeline/names";
import { buildTimelineModel } from "../src/features/timeline/model";
import { fakeApi } from "./helpers/fake-api";
import { familyPatches, newFamily } from "./helpers/setup-flow";
import { renderAt } from "./render";
import { sampleInput } from "./helpers/timeline-fixtures";
import { rowId, withRoster } from "./helpers/schedule-fixtures";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router-dom";
import { AuthProvider } from "../src/auth/AuthProvider";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

// ------------------------------------------------------------------------------------------------ 1. Week filter and the briefing
describe("1. Schedule · Week: the briefing follows the child switch", () => {
  const CAL = { weekStart: "mon" as const, schoolDays: [1, 2, 3, 4, 5] as ChildPlan["weekdays"] & number[] };
  const TODAY = "2026-10-28";
  const KIDS: Child[] = [
    { id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false },
    { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false },
  ];
  const book = (id: string, child: string): EngineAssignment => ({ id, subjectId: "lit", childIds: [child], unitType: "pages", totalUnits: 100, start: "2026-09-07", end: "2026-12-18" });
  const slow = (id: string, child: string): ChildPlan => {
    const checkIns: ProgressCheckIn[] = [
      { assignmentId: id, childId: child, weekStart: "2026-09-14", position: 5, mode: "keepEndDate" },
      { assignmentId: id, childId: child, weekStart: "2026-09-21", position: 10, mode: "keepEndDate" },
    ];
    return planAll([book(id, child)], { calendar: CAL, asOf: TODAY, checkIns })[0]!;
  };
  const ASSIGNMENTS = [
    { id: "ti", subjectId: "lit", title: "Treasure Island", startDate: "2026-09-07", endDate: "2026-12-18", childIds: ["c1"], archived: false },
    { id: "heidi", subjectId: "lit", title: "Heidi", startDate: "2026-09-07", endDate: "2026-12-18", childIds: ["c2"], archived: false },
  ];
  function stub() {
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: TODAY, from: "2026-08-01", to: "2027-06-30", plans: [slow("ti", "c1"), slow("heidi", "c2")] });
    fakeApi.on("GET /api/children", 200, KIDS);
    fakeApi.on("GET /api/subjects", 200, [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false }]);
    fakeApi.on("GET /api/assignments", 200, ASSIGNMENTS);
  }
  const lines = () => within(screen.getByRole("region", { name: "Weekly briefing" })).getAllByRole("listitem").map((l) => l.textContent);

  it("All children shows both children's late lines; one child shows only theirs", async () => {
    stub();
    localStorage.setItem("hh.child", "all");
    const user = userEvent.setup();
    renderAt("/schedule?view=week");
    await screen.findByRole("region", { name: "Weekly briefing" });
    expect(lines().join(" | ")).toMatch(/Treasure Island.*\| Heidi/);
    await user.click(screen.getByRole("button", { name: "Frank" }));
    expect(lines().join(" | ")).toContain("Treasure Island");
    expect(lines().join(" | ")).not.toContain("Heidi");
    await user.click(screen.getByRole("button", { name: "Margaret" }));
    await waitFor(() => expect(lines().join(" | ")).toContain("Heidi"));
    expect(lines().join(" | ")).not.toContain("Treasure Island");
  });

  it("a child with nothing late leaves no briefing at all while filtered to them", async () => {
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: TODAY, from: "x", to: "y", plans: [slow("ti", "c1")] });
    fakeApi.on("GET /api/children", 200, KIDS);
    fakeApi.on("GET /api/subjects", 200, [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false }]);
    fakeApi.on("GET /api/assignments", 200, ASSIGNMENTS);
    localStorage.setItem("hh.child", "c2");
    renderAt("/schedule?view=week");
    await screen.findByRole("group", { name: "Week" });
    await waitFor(() => expect(fakeApi.calls.some((c) => c.path.startsWith("/api/plan?from=2026-09-07"))).toBe(true));
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByRole("region", { name: "Weekly briefing" })).toBeNull();
  });
});

// ------------------------------------------------------------------------------------------------ 2. Home checklist
describe("2. Family settings offers the getting-started checklist again", () => {
  it("is offered only while the checklist is hidden, and bringing it back clears the flag", async () => {
    const f = newFamily({ setupDone: true, checklistHidden: true });
    const user = userEvent.setup();
    renderAt("/setup/settings");
    await user.click(await screen.findByRole("button", { name: "Show the getting-started checklist again" }));
    expect(await screen.findByText("The getting-started list will show on Home again.")).toBeInTheDocument();
    expect(familyPatches()).toEqual([{ checklistHidden: false }]);
    expect(f.me.checklistHidden).toBe(false);
    expect(screen.queryByRole("button", { name: "Show the getting-started checklist again" })).toBeNull();
  });
  it("is not offered when the checklist was never hidden", async () => {
    newFamily({ setupDone: true, checklistHidden: false });
    renderAt("/setup/settings");
    await screen.findByRole("button", { name: "Show tips again" });
    expect(screen.queryByRole("button", { name: "Show the getting-started checklist again" })).toBeNull();
  });
});

// ------------------------------------------------------------------------------------------------ 3. Rose and Lilac, the used-by cue
describe("3. Rose and Lilac, and the used-by cue (L5)", () => {
  const css = read("../src/styles/tokens.css");
  const tokens = (block: string, n: number) => ({
    fill: new RegExp(`--tl-subject-${n}: (#[0-9A-Fa-f]{6});`).exec(block)![1]!,
  });
  it.each([["light", css.slice(0, css.indexOf("[data-theme=\"dark\"]"))], ["dark", css.slice(css.indexOf("[data-theme=\"dark\"]"))]])("%s: Rose is at least 10 CIEDE2000 from Lilac and Plum and 7 from every other hue", (_theme, block) => {
    const d = differenceCiede2000();
    const rose = tokens(block, 9).fill;
    expect(d(rose, tokens(block, 7).fill), "lilac").toBeGreaterThanOrEqual(10); // was 7.0 (light) and 5.7 (dark)
    expect(d(rose, tokens(block, 12).fill), "plum").toBeGreaterThanOrEqual(10);
    for (let slot = 1; slot <= 12; slot++) if (slot !== 9) expect(d(rose, tokens(block, slot).fill), `slot ${slot}`).toBeGreaterThanOrEqual(7); // the palette's own rule
  });
  it("says in words which subject uses the swatch you are on", async () => {
    fakeApi.on("GET /api/subjects", 200, [
      { id: "s1", name: "Reading", color: "#7a5cc2", sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null, icon: null },
      { id: "s2", name: "Latin", color: "#2f6fb0", sortOrder: 1, archived: false, defaultWeight: null, defaultWeekdays: null, icon: null },
    ] satisfies Partial<Subject>[]);
    const user = userEvent.setup();
    renderAt("/setup/subjects");
    await user.click(await screen.findByRole("button", { name: /^Add subject/ }));
    const form = await screen.findByRole("form", { name: /Add subject/i });
    await user.click(within(form).getByRole("radio", { name: "Lilac, used by Reading" }));
    expect(await within(form).findByText("Lilac is also used by Reading.")).toBeInTheDocument();
    await user.click(within(form).getByRole("radio", { name: "Honey" }));
    expect(within(form).queryByText(/is also used by/)).toBeNull();
  });
});

// ------------------------------------------------------------------------------------------------ 4. Day-off wording
describe("4. A day off reads the same everywhere", () => {
  const range = (over: Partial<BlockedRange>): BlockedRange => ({ id: "b", label: null, kind: "vacation", startDate: "2026-11-03", endDate: "2026-11-03", childIds: [], ...over });
  it("one name per kind, and the parent's label wins", () => {
    expect(KIND_NAMES).toEqual({ vacation: "Break", holiday: "Holiday", sick: "Sick day", other: "Day off", missed: "Missed day" });
    for (const [kind, word] of Object.entries(KIND_NAMES)) expect(dayOffTitle({ label: null, kind })).toBe(word);
    expect(dayOffTitle({ label: "  Dentist ", kind: "other" })).toBe("Dentist");
    expect(dayOffTitle({ label: "", kind: "sick" })).toBe("Sick day");
  });
  it("the sheets use the same words as the Days off screen", () => {
    for (const [kind, word] of Object.entries(KIND_NAMES)) {
      if (kind === "missed") continue;
      expect(breakNames([range({ kind: kind as BlockedRange["kind"] })], "c1", "2026-11-03", "2026-11-03", [2])).toEqual([word]);
    }
    expect(breakNames([range({ label: "Dentist", kind: "other" })], "c1", "2026-11-03", "2026-11-03", [2])).toEqual(["Dentist"]);
  });
  it("the Days off screen lists a label-less break as 'Break', and its Kind list uses the same words", async () => {
    withRoster();
    fakeApi.on("GET /api/blocked-ranges", 200, [range({ id: rowId(1) }), range({ id: rowId(2), kind: "other", startDate: "2026-11-10", endDate: "2026-11-10" }), range({ id: rowId(3), label: "Thanksgiving", kind: "holiday", startDate: "2026-11-26", endDate: "2026-11-27" })]);
    const user = userEvent.setup();
    renderAt("/schedule/days-off");
    const list = await screen.findByRole("list", { name: "Days off" });
    const titles = within(list).getAllByRole("listitem").map((li) => li.querySelector(".card-title")!.textContent);
    expect(titles).toEqual(["Break", "Day off", "Thanksgiving"]);
    await user.click(screen.getByRole("button", { name: "Add days off" }));
    const form = screen.getByRole("form", { name: "Add days off" });
    expect(within(within(form).getByLabelText("Kind")).getAllByRole("option").map((o) => o.textContent)).toEqual(["Break", "Holiday", "Sick day", "Day off"]);
  });
});

// ------------------------------------------------------------------------------------------------ 5. Throttled invite and join
describe("5. A throttled invite or join says to wait", () => {
  const WAIT = "Too many tries. Please wait a minute and try again.";
  it("an invite for another parent", async () => {
    fakeApi.on("GET /api/family/parents", 200, { parents: [{ id: "p1", name: "Dana", email: "dana@example.com", you: true }], invites: [] });
    fakeApi.on("POST /api/family/invites", 429, { error: "rate_limited", message: "Too many attempts. Wait a minute and try again." });
    fakeApi.on("GET /api/family", 200, { name: "Demo family", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false, zoomViews: { hidden: [], custom: [] }, logSetup: null });
    const user = userEvent.setup();
    renderAt("/schedule/settings");
    await user.click(await screen.findByRole("button", { name: /Invite another parent/ }));
    expect(await screen.findByText(WAIT)).toBeInTheDocument();
    expect(screen.queryByText("Couldn't save. Please try again.")).toBeNull();
  });
  it("a view link", async () => {
    fakeApi.on("GET /api/family", 200, { name: "Demo family", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false, zoomViews: { hidden: [], custom: [] }, logSetup: null });
    fakeApi.on("GET /api/family/viewers", 200, { links: [], viewers: [] });
    fakeApi.on("POST /api/family/view-links", 429, { error: "rate_limited", message: "Too many attempts. Wait a minute and try again." });
    const user = userEvent.setup();
    renderAt("/schedule/settings");
    await user.click(await screen.findByRole("button", { name: "Create a sign-up link" }));
    expect(await screen.findByText(WAIT)).toBeInTheDocument();
  });
  it("joining a link", () => {
    expect(read("../src/features/join/JoinPage.tsx")).toContain("THROTTLED");
    expect(read("../src/features/schedule/formBits.tsx")).toContain(`"${WAIT}"`);
  });
});

// ------------------------------------------------------------------------------------------------ 7. Sprint 15 Lows (web side)
describe("7. N2: a thin row's name sits just above it at This month", () => {
  const CAL = { weekStart: "mon" as const, schoolDays: [1, 2, 3, 4, 5] as ChildPlan["weekdays"] & number[] };
  const subjects: Subject[] = [{ id: "s1", name: "Literature", color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null }];
  const frank: Child = { id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false };
  const mk = (id: string, title: string, weekdays: number[] | null): [EngineAssignment, Assignment] => [
    { id, subjectId: "s1", childIds: ["c1"], unitType: "pages", totalUnits: 200, start: "2026-11-02", end: "2026-12-18", ...(weekdays ? { weekdays: weekdays as never } : {}) },
    { id, subjectId: "s1", title, unitType: "pages", totalUnits: 200, weightPerUnit: null, startDate: "2026-11-02", endDate: "2026-12-18", childIds: ["c1"], archived: false, weekdays } as Assignment,
  ];
  const [pe, pa] = mk("poetry", "Poetry Mon/Wed", [1, 3]);
  const [me, ma] = mk("math", "Math Mon-Fri", null);
  const model = buildTimelineModel({
    from: "2026-11-02", to: "2026-12-18", today: "2026-11-05", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5],
    plans: planAll([pe, me], { calendar: CAL, asOf: "2026-11-05" }), assignments: [pa, ma], children: [frank], subjects, blocked: [], events: [],
  });
  // A phone width: the Mon/Wed blocks are about 15 px wide, with nothing near enough room to the right for the name either.
  const layout = layoutTimeline(model, { zoom: "month", width: 390, month: "2026-11" });

  it("the Mon/Wed row names itself on a muted line above, left-aligned with its first block; Mon-Fri keeps its name inside", () => {
    const poetry = layout.names.filter((n) => n.assignmentId === "poetry");
    expect(poetry).toHaveLength(1);
    const row = layout.rows.find((r) => r.key === layout.bands.find((b) => b.assignmentId === "poetry")!.rowKey)!;
    const first = layout.bands.find((b) => b.assignmentId === "poetry")!.runs[0]!;
    expect(poetry[0]!.outside).toBe(true);
    expect(poetry[0]!.text).toBe("Poetry Mon/Wed");
    expect(poetry[0]!.textY).toBeLessThan(row.y);
    expect(poetry[0]!.textX).toBeGreaterThanOrEqual(first.x0 - 0.5);
    expect(poetry[0]!.textX).toBeLessThanOrEqual(first.x0 + 1);
    expect(row.labelLane).toBeGreaterThan(0);
    const math = layout.names.filter((n) => n.assignmentId === "math");
    expect(math.length).toBeGreaterThan(0);
    expect(math.every((n) => !n.outside)).toBe(true);
    const mathRow = layout.rows.find((r) => r.key === layout.bands.find((b) => b.assignmentId === "math")!.rowKey)!;
    expect(mathRow.labelLane).toBe(0);
  });

  it("costs ABOVE_NAME_PX (14), only on the row that needs it, and the rows below move down by it", () => {
    const m = metricsFor(390);
    const g = layout.groups[0]!;
    const lane = layout.rows.length;
    expect(lane).toBe(2);
    expect(g.bottom - (g.top + m.header + m.pitch + (lane - 1) * m.sub)).toBe(ABOVE_NAME_PX);
    expect(ABOVE_NAME_PX).toBe(14);
    expect(layout.rows.filter((r) => r.labelLane > 0)).toHaveLength(1);
    // the badge stays on the centre of the lane's first row
    expect(layout.badges[0]!.cy).toBeCloseTo(layout.rows[0]!.cy, 5);
  });

  it("a row wide enough to hold the name inside gains nothing (Math alone at the same width)", () => {
    const alone = layoutTimeline(buildTimelineModel({
      from: "2026-11-02", to: "2026-12-18", today: "2026-11-05", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5],
      plans: planAll([me], { calendar: CAL, asOf: "2026-11-05" }), assignments: [ma], children: [frank], subjects, blocked: [], events: [],
    }), { zoom: "month", width: 390, month: "2026-11" });
    expect(alone.rows.every((r) => r.labelLane === 0)).toBe(true);
    expect(alone.names.every((n) => !n.outside)).toBe(true);
  });

  it("rows are not pushed down by a Year or Fall layout (the line is only for daily detail)", () => {
    const full = buildTimelineModel(sampleInput());
    for (const zoom of ["year", "fall"] as const) {
      const wide = layoutTimeline(full, { zoom, width: 390 });
      expect(wide.detail).not.toBe("daily");
      expect(wide.rows.every((r) => r.labelLane === 0), zoom).toBe(true);
    }
  });
});

describe("7. N3: the last day of a very slow book", () => {
  it("an 8-chapter book at 0.4 a day finishes on 'chapter 8 · finish', and nothing says 'Keep going'", () => {
    const days = Array.from({ length: 20 }, (_, i) => ({ date: new Date(Date.UTC(2026, 10, 2 + i)).toISOString().slice(0, 10), units: 0.4, position: 0.4 * (i + 1), capacity: 1, schoolDay: true, thickness: 1, kind: "planned" }));
    const labels = daySpanLabels({ days, unitType: "chapters", totalUnits: 8, endedOn: undefined } as never);
    const last = [...labels.values()].at(-1)!;
    expect(last).toBe("chapter 8 · finish");
    expect([...labels.values()].join(" ")).not.toMatch(/Keep going/i);
    expect(read("../src/features/week/weekBars.ts")).not.toMatch(/Keep going/);
  });
});

describe("7. N5 and N6: the join page", () => {
  const open = (token: string) => {
    fakeApi.on("GET /api/me", 401, { error: "unauthenticated" });
    const router = createMemoryRouter([{ element: <AuthProvider><Outlet /></AuthProvider>, children: [{ path: "/join/:token", element: <JoinPage /> }] }], { initialEntries: [`/join/${token}`] });
    return render(<RouterProvider router={router} />);
  };
  it("sends noindex and no referrer while it is open, and removes both on leaving", async () => {
    const token = "v".repeat(43);
    fakeApi.on(`GET /api/join/${token}`, 200, { kind: "viewer", familyName: "Maple Co-op" });
    const { unmount } = open(token);
    await screen.findByRole("heading", { name: "View Maple Co-op" });
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    expect(document.head.querySelector('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
    unmount();
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
    expect(document.head.querySelector('meta[name="referrer"]')).toBeNull();
  });
  it("a token over 100 characters is the plain bad-link page (the API answers 404, and the page shows the one message)", async () => {
    const token = "t".repeat(300);
    fakeApi.on(`GET /api/join/${token}`, 404, { error: "invite_unavailable", message: "x" });
    open(token);
    expect(await screen.findByRole("alert")).toHaveTextContent("This invite link has expired or was already used. Ask the person who sent it for a new one.");
  });
});

// ------------------------------------------------------------------------------------------------ 8. Smoke screenshots
describe("8. the sheets smoke scenario writes no screenshots into the repo", () => {
  it("is marked scratch, and flow.mjs sends a scratch scenario's screens to the temp folder unless SCREENS_DIR is set", () => {
    expect(read("../../../scripts/smoke/scenarios/sheets.mjs")).toMatch(/export const scratchScreens = true/);
    const flow = read("../../../scripts/smoke/flow.mjs");
    expect(flow).toMatch(/scenarioModule\.scratchScreens && !process\.env\.SCREENS_DIR \? path\.join\(os\.tmpdir\(\), "hh-smoke-screens"\)/);
  });
});

describe("9. ROADMAP's open backlog", () => {
  it("lists none of the fixed items", () => {
    const section = (read("../../../docs/ROADMAP.md").split("## Open backlog (Low)")[1] ?? "").split("## Done")[0]!;
    expect(section).not.toMatch(/^- /m);
    expect(section).toMatch(/None (open|ticketed)/);
  });
});

// ------------------------------------------------------------------------------------------------ 6. Term in review on short desktops
describe("6. Term in review on a short desktop", () => {
  const css = read("../src/features/review/review.css");
  it("from 900 px wide (and up to 960 px high) the card and pager are one column and the controls and buttons another", () => {
    const block = css.slice(css.indexOf("@media (min-width: 900px) and (max-height: 960px)"));
    expect(block).toMatch(/grid-template-columns: minmax\(0, 1fr\) 300px/);
    expect(block).toMatch(/\.review-body\.has-card \{ display: contents; \}/);
    // the card is as tall as the page allows: the viewport less the header, the pager and the gaps, not the old 360 px reserve
    expect(block).toMatch(/width: min\(100%, calc\(\(100dvh - 60px - 70px - 24px\) \* 0\.8\)\)/);
    expect(block).toMatch(/\.review-foot \{ grid-column: 2; grid-row: 2; align-self: end; position: static/);
    // a page without a card keeps the single column
    expect(block).toMatch(/\.review-page:has\(\.review-body\.has-card\)/);
  });
  it("the page marks a card, and keeps the controls together for the wide layout", async () => {
    const f = newFamily({ setupDone: true });
    f.children.push({ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false });
    fakeApi.on("GET /api/assignments", 200, []);
    fakeApi.on("GET /api/log-entries", 200, []);
    fakeApi.on("GET /api/records/totals", 200, { from: null, to: null, childId: null, entries: 0, schoolDays: 0, totalMinutes: 0, coreMinutes: 0, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0, books: [], bySubject: [] });
    renderAt("/records/review");
    const controls = await screen.findByRole("group", { name: "Range" });
    expect(controls.parentElement).toHaveClass("review-controls");
  });
});
