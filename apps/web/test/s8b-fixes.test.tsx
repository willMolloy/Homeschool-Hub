// S8b-07: small fixes from the Sprint 8 tester (N7, N9 to N14).
import { readFileSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ENGINE_VERSION, type ChildPlan } from "@hh/engine";
import { ALL_LABEL, ChildSwitch, chipsWidth } from "../src/features/week/ChildSwitch";
import { ALL } from "../src/features/week/useChildChoice";
import { fakeApi, EMPTY_WEEK } from "./helpers/fake-api";
import { renderAt } from "./render";

const KIDS = [
  { id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false },
  { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false },
];
const css = (f: string) => readFileSync(f, "utf8");

describe("N7: a Week bar's name is its visible text", () => {
  it("the body button has no aria-label, and its name reads title then range", async () => {
    const plan = { engineVersion: ENGINE_VERSION, assignmentId: "ti", childId: "c1", subjectId: "lit", unitType: "pages", weightPerUnit: 1, weightSource: "assignment", weekdays: null, weekdaysSource: "default",
      totalUnits: 270, doneUnits: 0, remainingUnits: 270, baseRate: 10, rate: 10, plannedEnd: "2026-12-01", end: "2026-12-01", mode: null, unplacedUnits: 0, noCapacity: false, complete: false,
      checkInWeeks: [], adjustedWeeks: [], weekdaysFrom: null, previousWeekdays: null, warnings: [],
      days: [{ date: "2026-10-26", capacity: 1, schoolDay: true, units: 30, thickness: 30, kind: "planned", position: 150 }] } as unknown as ChildPlan;
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "x", to: "y", plans: [plan] });
    fakeApi.on("GET /api/children", 200, KIDS.slice(0, 1));
    fakeApi.on("GET /api/subjects", 200, [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false }]);
    fakeApi.on("GET /api/assignments", 200, [{ id: "ti", subjectId: "lit", title: "Treasure Island" }]);
    fakeApi.on("GET /api/events", 200, []);
    renderAt("/schedule?view=week");
    const bar = await screen.findByRole("button", { name: "Treasure Island pages 121–150" });
    expect(bar).not.toHaveAttribute("aria-label");
    const visible = bar.textContent!.replace(/\s+/g, " ").trim();
    expect(visible).toBe("Treasure Island pages 121–150");
  });
});

describe("N9: Home says Nothing planned, not All done, for a child with nothing this week", () => {
  it("shows it for every child of a family with children and no assignments", async () => {
    fakeApi.on("GET /api/children", 200, KIDS);
    fakeApi.on("GET /api/subjects", 200, []);
    fakeApi.on("GET /api/assignments", 200, []);
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "x", to: "y", plans: [] });
    renderAt("/");
    expect(await screen.findAllByText("Nothing planned")).toHaveLength(2);
    expect(screen.queryByText("All done")).toBeNull();
  });
});

describe("N10: after Not quite one line says what to do", () => {
  it("is shown above the bars", async () => {
    const week = { ...EMPTY_WEEK, items: [{ assignmentId: "ti", childId: "c1", childName: "Frank", title: "Treasure Island", unitType: "pages", plannedFrom: 0, plannedTo: 80, totalUnits: 270, actual: null, mode: null }] };
    fakeApi.on("GET /api/children", 200, KIDS.slice(0, 1));
    fakeApi.on("GET /api/subjects", 200, []);
    fakeApi.on("GET /api/assignments", 200, [{ id: "ti", subjectId: "x", title: "Treasure Island" }]);
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "x", from: "x", to: "y", plans: [] });
    fakeApi.on("GET /api/check-ins", 200, week);
    const user = userEvent.setup();
    renderAt("/track");
    expect(screen.queryByText(/Untick what didn't get done/)).toBeNull();
    await user.click(await screen.findByRole("button", { name: "Not quite" }));
    expect(await screen.findByText("Untick what didn't get done, or tap a bar to update it.")).toBeInTheDocument();
  });
});

describe("N11: the native bits of the set-up forms take the theme", () => {
  const forms = css("src/ui/forms.css");
  it("radios and checkboxes use the accent, the roster forms' fieldsets have no default border, dates and selects keep their text", () => {
    expect(forms).toMatch(/input\[type="radio"\], input\[type="checkbox"\] \{ accent-color: var\(--tl-primary\); \}/);
    expect(forms).toMatch(/\.roster-form fieldset[^{]*\{ border: 0;/);
    expect(forms).toMatch(/\.schedule-form input\[type="date"\] \{[^}]*padding-right: 6px/);
    expect(forms).toMatch(/\.schedule-form select \{[^}]*text-overflow: ellipsis/);
    expect(forms).toMatch(/\.field-row:has\(select\) \{ grid-template-columns: 1fr; \}/);
  });
  it("the subject form says 'Usual time', not 'Usual effort'", async () => {
    fakeApi.on("GET /api/subjects", 200, []);
    const user = userEvent.setup();
    renderAt("/setup/subjects");
    await user.click(await screen.findByRole("button", { name: "Add subject" }));
    expect(screen.getByText("Usual time (optional)")).toBeInTheDocument();
    expect(screen.queryByText(/effort/i)).toBeNull();
  });
});

describe("N12: old links", () => {
  it("/timeline?view=x stays on Year, with the rest of the query kept", async () => {
    const { router } = renderAt("/timeline?view=x&zoom=fall");
    await screen.findByRole("navigation", { name: "Main" });
    expect(router.state.location.pathname).toBe("/schedule");
    const q = new URLSearchParams(router.state.location.search);
    expect(q.get("view")).toBe("year");
    expect(q.get("zoom")).toBe("fall");
  });
  it("any other old /schedule/… address (the old hub) goes Home, while /schedule is the Schedule", async () => {
    const hub = renderAt("/schedule/hub");
    await screen.findByRole("button", { name: "Family and settings" });
    expect(hub.router.state.location.pathname).toBe("/");
    hub.unmount();
    const sched = renderAt("/schedule");
    await screen.findByRole("heading", { level: 1, name: "Schedule" });
    expect(sched.router.state.location.pathname).toBe("/schedule");
  });
});

describe("N14: the child switch", () => {
  afterEach(() => vi.restoreAllMocks());

  it("lists All children first, as chips, when everything fits one line", async () => {
    const onChange = vi.fn();
    render(<ChildSwitch kids={KIDS} value="c1" onChange={onChange} />);
    const group = screen.getByRole("group", { name: "Child" });
    expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual([ALL_LABEL, "Frank", "Margaret"]);
    await userEvent.click(within(group).getByRole("button", { name: ALL_LABEL }));
    expect(onChange).toHaveBeenCalledWith(ALL);
  });

  it("is not offered with fewer than two children", () => {
    const { container } = render(<ChildSwitch kids={KIDS.slice(0, 1)} value="c1" onChange={() => {}} />);
    expect(container.querySelector(".child-switch")).toBeNull();
  });

  it("when the names do not fit one line it is one pill with the current choice that opens a list; no sideways row", async () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(180);
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ChildSwitch kids={KIDS} value={ALL} onChange={onChange} />);
    expect(screen.queryByRole("group", { name: "Child" })).toBeNull();
    const pill = screen.getByRole("button", { name: "Child: All children" });
    expect(pill).toHaveTextContent("All children");
    await user.click(pill);
    const list = await screen.findByRole("group", { name: "Child" });
    const options = within(list).getAllByRole("button");
    expect(options.map((o) => o.textContent)).toEqual([ALL_LABEL, "Frank", "Margaret"]);
    expect(options[0]).toHaveAttribute("aria-pressed", "true");
    await user.click(within(list).getByRole("button", { name: "Margaret" }));
    expect(onChange).toHaveBeenCalledWith("c2");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("the fit test counts the chips' text plus their padding", () => {
    const w = (t: string) => t.length * 7;
    expect(chipsWidth(["A", "B"], w)).toBeGreaterThan(2 * 44);
    expect(chipsWidth([ALL_LABEL, "Frank", "Margaret"], w)).toBeGreaterThan(chipsWidth(["Frank", "Margaret"], w));
  });

  it("the pill and the list rows are 44 px or more", () => {
    const week = css("src/features/week/week.css");
    expect(week).toMatch(/\.child-pill \{[^}]*min-height: 44px/);
    expect(week).toMatch(/\.child-option \{[^}]*min-height: 52px/);
  });
});
