/** S9b-07: the parent ticks which days of a run of dates count, pre-selected from the school calendar. */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { RunDayChips } from "../src/features/records/RunDayChips";
import { chipMode, dateChipLabel, daysFromWeekdays, daysSummary, runDaysPath, tickedDays, ticksFrom, weekdayWords } from "../src/features/records/runDays";
import { fakeApi, runDaysFor } from "./helpers/fake-api";

describe("run days (pure)", () => {
  it("names weekdays Monday first, three or more in a row as a range", () => {
    expect(weekdayWords([1, 2, 3, 4, 5, 6])).toBe("Mon–Sat");
    expect(weekdayWords([1, 3, 5])).toBe("Mon, Wed, Fri");
    expect(weekdayWords([1, 2, 3, 5])).toBe("Mon–Wed, Fri");
    expect(weekdayWords([6, 0])).toBe("Sat, Sun");
    expect(weekdayWords([2, 3, 4, 5, 6])).toBe("Tue–Sat");
  });
  it("sums up the ticked dates", () => {
    expect(daysSummary(["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"])).toBe("Mon–Sat, 6 days");
    expect(daysSummary(["2026-11-04"])).toBe("Wed, 1 day");
    expect(daysSummary([])).toBe("No days ticked");
  });
  it("two weeks or less: a chip per date; longer: a chip per weekday, days off left out", () => {
    expect(chipMode("2026-11-02", "2026-11-15")).toBe("dates");
    expect(chipMode("2026-11-02", "2026-11-16")).toBe("weekdays");
    expect(dateChipLabel("2026-11-02")).toBe("Mon 2");
    expect(daysFromWeekdays("2026-11-02", "2026-11-15", [1, 3], ["2026-11-11"])).toEqual(["2026-11-02", "2026-11-04", "2026-11-09"]);
    expect(runDaysPath("2026-11-02", "2026-11-08", ["c1", "c2"])).toBe("/api/log-entries/run-days?from=2026-11-02&to=2026-11-08&childIds=c1%2Cc2");
  });
  it("S10-10b M2: a tick wins over the calendar; without one, the calendar decides (unknown until it answers)", () => {
    const run = ["2026-11-09", "2026-11-10", "2026-11-11"];
    const ticks = ticksFrom("2026-11-09", "2026-11-10", ["2026-11-10"]);
    expect(tickedDays(run, ticks, undefined)).toBeNull();
    expect(tickedDays(run, ticks, new Set(["2026-11-09", "2026-11-11"]))).toEqual(["2026-11-10", "2026-11-11"]);
    expect(tickedDays(run.slice(0, 2), ticks, undefined)).toEqual(["2026-11-10"]);
  });
});

/** The form keeps the ticks (S10-10b M2); this stands in for it. */
function Chips({ start, end, childIds, initial, onChange }: { start: string; end: string; childIds: string[]; initial: string[] | null; onChange: (d: string[] | null) => void }) {
  const [ticks, setTicks] = useState(() => (initial ? ticksFrom(start, end, initial) : new Map<string, boolean>()));
  return <RunDayChips start={start} end={end} childIds={childIds} ticks={ticks} onTicks={setTicks} onChange={onChange} />;
}

const chips = () => within(screen.getByRole("group", { name: /School days/ }));

describe("the day chips", () => {
  it("a Mon–Sun run: Mon–Fri pre-selected from the calendar; ticking Saturday makes it Mon–Sat, 6 days", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Chips start="2026-11-02" end="2026-11-08" childIds={["c1"]} initial={null} onChange={onChange} />);
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"]));
    expect(screen.getByText(/Counts Mon–Fri, 5 days/)).toBeInTheDocument();
    expect(chips().getByRole("button", { name: "Sat 7, Saturday, November 7" })).toHaveAttribute("aria-pressed", "false");
    await user.click(chips().getByRole("button", { name: "Sat 7, Saturday, November 7" }));
    expect(onChange).toHaveBeenLastCalledWith(["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"]);
    expect(screen.getByText(/Counts Mon–Sat, 6 days/)).toBeInTheDocument();
    expect(fakeApi.calls.some((c) => c.path === "/api/log-entries/run-days?from=2026-11-02&to=2026-11-08&childIds=c1")).toBe(true);
  });

  it("a Tue–Sat family and a day off: the day off starts unticked", async () => {
    fakeApi.on("GET /api/log-entries/run-days", 200, runDaysFor("2026-11-02", "2026-11-08", [2, 3, 4, 5, 6], ["2026-11-05"]));
    const onChange = vi.fn();
    render(<Chips start="2026-11-02" end="2026-11-08" childIds={["c1"]} initial={null} onChange={onChange} />);
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(["2026-11-03", "2026-11-04", "2026-11-06", "2026-11-07"]));
    expect(chips().getByRole("button", { name: "Thu 5, Thursday, November 5" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/Days off start unticked/)).toBeInTheDocument();
  });

  it("editing: the entry's ticked days are shown, not the calendar's", async () => {
    const onChange = vi.fn();
    render(<Chips start="2026-11-02" end="2026-11-08" childIds={["c1"]} initial={["2026-11-07", "2026-11-08"]} onChange={onChange} />);
    expect(chips().getByRole("button", { name: "Sat 7, Saturday, November 7" })).toHaveAttribute("aria-pressed", "true");
    expect(chips().getByRole("button", { name: "Mon 2, Monday, November 2" })).toHaveAttribute("aria-pressed", "false");
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(["2026-11-07", "2026-11-08"]));
  });

  it("a long run: weekday chips; unticking Friday drops every Friday, and days off stay out", async () => {
    fakeApi.on("GET /api/log-entries/run-days", 200, runDaysFor("2026-11-02", "2026-11-22", [1, 2, 3, 4, 5], ["2026-11-11"]));
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Chips start="2026-11-02" end="2026-11-22" childIds={["c1"]} initial={null} onChange={onChange} />);
    expect(screen.getByRole("group", { name: "School days each week" })).toBeInTheDocument();
    await waitFor(() => expect(chips().getByRole("button", { name: "Mondays" })).toHaveAttribute("aria-pressed", "true"));
    await user.click(chips().getByRole("button", { name: "Fridays" }));
    const last = onChange.mock.lastCall![0] as string[];
    expect(last).toHaveLength(11); // 3 weeks x Mon-Thu = 12, less the day off
    expect(last).not.toContain("2026-11-06");
    expect(last).not.toContain("2026-11-11");
    expect(screen.getByText(/Counts Mon–Thu, 11 days. Days off are left out./)).toBeInTheDocument();
  });
});
