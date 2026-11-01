// S9-04: US-style dates in one helper, and one date field that picks, types and clears.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { formatDate, formatRangeYears, formatShort, formatSpan, formatWeekday, monthGrid, parseDateInput, shiftMonth } from "../src/lib/dates";
import { DateField } from "../src/ui/DateField";

describe("date helpers", () => {
  it("write dates the US way", () => {
    expect(formatDate("2026-11-01")).toBe("Nov 1, 2026");
    expect(formatShort("2026-11-01")).toBe("Nov 1");
    expect(formatWeekday("2026-11-01")).toBe("Sunday, Nov 1");
    expect(formatSpan("2026-10-26", "2026-11-01")).toBe("Oct 26 – Nov 1");
    expect(formatSpan("2026-11-01", "2026-11-01")).toBe("Nov 1");
    expect(formatRangeYears("2026-08-17", "2026-12-18")).toBe("Aug 17 – Dec 18, 2026");
    expect(formatRangeYears("2026-08-17", "2027-05-28")).toBe("Aug 17, 2026 – May 28, 2027");
  });
  it("read what a parent types, needing a four-digit year and a real day", () => {
    for (const t of ["Nov 1, 2026", "november 1 2026", "Nov. 1, 2026", "11/1/2026", "11-1-2026", "2026-11-01", " Nov  1, 2026 "]) expect(parseDateInput(t)).toBe("2026-11-01");
    for (const t of ["", "Nov 1", "11/1/26", "Nov 1, 202", "Feb 30, 2026", "13/1/2026", "Foo 1, 2026"]) expect(parseDateInput(t)).toBeNull();
    expect(parseDateInput("Sept 5, 2026")).toBe("2026-09-05");
  });
  it("lay out a month from Sunday and step between months", () => {
    const g = monthGrid(2026, 11);
    expect(g[0]!.indexOf("2026-11-01")).toBe(0);
    expect(g.flat().filter(Boolean)).toHaveLength(30);
    expect(g.every((r) => r.length === 7)).toBe(true);
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});

function Harness({ start = "2026-11-01", clearable = false }: { start?: string; clearable?: boolean }) {
  const [v, setV] = useState(start);
  return <><label htmlFor="d">Start</label><DateField id="d" value={v} onChange={setV} clearable={clearable} /><output data-testid="out">{v}</output></>;
}

describe("DateField", () => {
  it("shows the date as Nov 1, 2026, in a text box (no mm/dd/yyyy)", () => {
    render(<Harness />);
    const box = screen.getByLabelText("Start");
    expect(box).toHaveValue("Nov 1, 2026");
    expect(box).toHaveAttribute("type", "text");
  });

  it("types: a finished date is taken, a half-typed one is not, and leaving tidies it", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const box = screen.getByLabelText("Start");
    await user.clear(box);
    expect(screen.getByTestId("out")).toHaveTextContent("");
    await user.type(box, "12/5/2026");
    expect(screen.getByTestId("out")).toHaveTextContent("2026-12-05");
    await user.tab();
    expect(box).toHaveValue("Dec 5, 2026");
    await user.clear(box);
    await user.type(box, "Jan 3, 20");
    await user.tab();
    expect(box).toHaveValue(""); // clearing emptied the date, and half a date never sets one
    expect(screen.getByTestId("out")).toHaveTextContent("");
  });

  it("picks from the calendar: month steps, a day sets the date and closes it", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Choose a date" }));
    const cal = screen.getByRole("group", { name: "Calendar" });
    expect(within(cal).getByText("November 2026")).toBeInTheDocument();
    expect(within(cal).getByRole("button", { name: "Nov 1, 2026" })).toHaveAttribute("aria-pressed", "true");
    await user.click(within(cal).getByRole("button", { name: "Next month" }));
    await user.click(within(cal).getByRole("button", { name: "Dec 18, 2026" }));
    expect(screen.queryByRole("group", { name: "Calendar" })).toBeNull();
    expect(screen.getByLabelText("Start")).toHaveValue("Dec 18, 2026");
    expect(screen.getByTestId("out")).toHaveTextContent("2026-12-18");
  });

  it("Escape closes the calendar; Clear empties an optional date", async () => {
    const user = userEvent.setup();
    render(<Harness clearable />);
    await user.click(screen.getByRole("button", { name: "Choose a date" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("group", { name: "Calendar" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Choose a date" }));
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByLabelText("Start")).toHaveValue("");
    expect(screen.getByTestId("out")).toHaveTextContent("");
  });

  it("targets are 44 px high and the calendar fits a phone", () => {
    const css = readFileSync("src/ui/date-field.css", "utf8");
    for (const sel of [/\.date-field-open \{[^}]*height: 44px/, /\.date-cal-day \{[^}]*min-height: 44px/, /\.date-cal-nav \{[^}]*height: 44px/, /\.date-field-box input\[type="text"\] \{[^}]*min-height: 44px/]) expect(css).toMatch(sel);
    expect(css).toMatch(/\.date-cal \{[^}]*width: min\(21rem, calc\(100vw - 32px\)\)/);
  });
});

describe("every screen uses the shared field", () => {
  const walk = (d: string): string[] => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : n.endsWith(".tsx") ? [join(d, n)] : []));
  it("no parent-facing screen has a native date input (only the debug view's 'Plan as of')", () => {
    const hits = walk("src").filter((f) => /type="date"/.test(readFileSync(f, "utf8")));
    expect(hits.map((f) => f.split("/").pop())).toEqual(["PlanDebugView.tsx"]);
  });
  it("Add assignment, the Year edit bar, days off, events and zoom views import DateField", () => {
    for (const f of ["schedule/AssignmentsPage.tsx", "timeline/EditBar.tsx", "schedule/DaysOffPage.tsx", "schedule/EventsPage.tsx", "timeline/EditZoomViews.tsx"]) {
      expect(readFileSync(join("src/features", f), "utf8")).toMatch(/import \{ DateField \} from/);
    }
  });
});
