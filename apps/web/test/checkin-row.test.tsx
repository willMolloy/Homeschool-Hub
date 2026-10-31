/** T-09: one check-in row as amounts within the week, and the shared CheckInRow. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CheckInItem } from "../src/api/types";
import { choiceOf, compactText, shortRangeText, startAmount, stepDown, stepUp } from "../src/features/checkin/amount";
import { CheckInRow } from "../src/features/checkin/CheckInRow";

const item = (over: Partial<CheckInItem> = {}): CheckInItem => ({
  assignmentId: "sotw", childId: "c1", childName: "Frank", title: "Story of the World", unitType: "chapters",
  plannedFrom: 3, plannedTo: 6, totalUnits: 42, actual: null, mode: null, ...over,
});

describe("amounts", () => {
  it("short plan text", () => {
    expect(shortRangeText("chapters", 3, 6)).toBe("Ch. 4–6");
    expect(shortRangeText("pages", 0, 80)).toBe("pp. 1–80");
    expect(shortRangeText("pages", 80, 81)).toBe("p. 81");
    expect(shortRangeText("pages", 22.5, 45)).toBe("pp. 23–45");
    expect(shortRangeText("lessons", 9, 10)).toBe("Lesson 10");
    expect(shortRangeText("lessons", 9, 14)).toBe("Lessons 10–14");
    expect(shortRangeText("minutes", 600, 750)).toBe("150 min");
  });

  it("compact state: 2 of 3 ch., Missed, +2 on an unplanned row", () => {
    const r = item();
    expect(compactText(r, 5)).toBe("2 of 3 ch.");
    expect(compactText(r, 3)).toBe("Missed");
    expect(compactText(r, 8)).toBe("5 chapters (2 more than planned)"); // S7b-03: was "5 of 3 ch."
    expect(compactText(item({ unitType: "minutes", plannedFrom: 600, plannedTo: 750, totalUnits: 3000 }), 700)).toBe("100 of 150 min");
    expect(compactText(item({ unitType: "lessons", plannedFrom: 12, plannedTo: 12 }), 14)).toBe("+2 lessons");
  });

  it("S7b-03: ahead, behind, on plan and finished read plainly for every unit; never 'N of M' beyond the plan", () => {
    const lessons = item({ unitType: "lessons", plannedFrom: 12, plannedTo: 15, totalUnits: 30 });
    const pages = item({ unitType: "pages", plannedFrom: 0, plannedTo: 20, totalUnits: 300 });
    const chapters = item({ plannedFrom: 3, plannedTo: 5, totalUnits: 42 }); // plans 2
    const minutes = item({ unitType: "minutes", plannedFrom: 600, plannedTo: 650, totalUnits: 3000 });
    expect(compactText(chapters, 7)).toBe("4 chapters (2 more than planned)");
    expect(compactText(chapters, 6)).toBe("3 chapters (1 more than planned)");
    expect(compactText(chapters, 4)).toBe("1 of 2 ch.");
    expect(compactText(chapters, 5)).toBe("2 of 2 ch.");
    expect(compactText(lessons, 18)).toBe("6 lessons (3 more than planned)");
    expect(compactText(lessons, 13)).toBe("1 of 3 lessons");
    expect(compactText(pages, 35)).toBe("35 pages (15 more than planned)");
    expect(compactText(pages, 5)).toBe("5 of 20 pp.");
    expect(compactText(minutes, 700)).toBe("100 minutes (50 more than planned)");
    expect(compactText(minutes, 620)).toBe("20 of 50 min");
    expect(compactText(item({ unitType: "lessons", plannedFrom: 12, plannedTo: 14, totalUnits: 14 }), 14)).toBe("Finished");
    expect(compactText(item({ unitType: "pages", plannedFrom: 280, plannedTo: 290, totalUnits: 300 }), 300)).toBe("Finished");
    for (const [r, p] of [[chapters, 8], [lessons, 20], [pages, 90], [minutes, 800]] as const) expect(compactText(r, p)).not.toMatch(/\d+ of \d+/);
  });

  it("choice within the API's 0.5 tolerance", () => {
    const r = item();
    expect(choiceOf(r, 6)).toBe("asPlanned");
    expect(choiceOf(r, 5.6)).toBe("asPlanned");
    expect(choiceOf(r, 5)).toBe("less");
    expect(choiceOf(r, 7)).toBe("more");
  });

  it("steps land on whole units (minutes by 5) and stay between 0 and what's left", () => {
    const r = item();
    expect(stepDown(r, 3)).toBe(2);
    expect(stepDown(r, 0)).toBe(0);
    expect(stepUp(r, 39)).toBe(39);
    const pages = item({ unitType: "pages", plannedFrom: 22.5, plannedTo: 45, totalUnits: 300 });
    expect(stepDown(pages, 22.5)).toBe(22);
    expect(stepUp(pages, 22.5)).toBe(23);
    const mins = item({ unitType: "minutes", plannedFrom: 600, plannedTo: 750, totalUnits: 3000 });
    expect(stepDown(mins, 150)).toBe(145);
  });

  it("Less and More start one step off the plan; More is impossible at the total", () => {
    expect(startAmount(item(), "less")).toBe(2);
    expect(startAmount(item(), "more")).toBe(4);
    expect(startAmount(item({ totalUnits: 6 }), "more")).toBeNull();
    // Less than half a unit planned: even nothing done is within the tolerance, so Less can't be chosen.
    expect(startAmount(item({ plannedFrom: 5.8, plannedTo: 6 }), "less")).toBeNull();
  });
});

function setup(over: Partial<CheckInItem> = {}, start?: number) {
  const onChange = vi.fn();
  const r = item(over);
  function Harness() {
    const [pos, setPos] = useState(start ?? r.plannedTo);
    return <ul><CheckInRow item={r} position={pos} disabled={false} onChange={(n) => { onChange(n); setPos(n); }} /></ul>;
  }
  render(<Harness />);
  return { onChange, li: screen.getByRole("listitem") };
}

describe("CheckInRow", () => {
  it("collapsed: the title, the plan and a quiet check; no controls", () => {
    const { li } = setup();
    const toggle = within(li).getByRole("button", { expanded: false });
    expect(toggle).toHaveTextContent("Story of the WorldCh. 4–6✓As planned");
    expect(within(li).getAllByRole("button")).toHaveLength(1);
  });

  it("tapping opens only the three-way choice; As planned is pressed and there's no stepper", async () => {
    const { li } = setup();
    await userEvent.click(within(li).getByRole("button", { expanded: false }));
    const choice = within(li).getByRole("group", { name: "How Story of the World for Frank went" });
    expect(within(choice).getAllByRole("button").map((b) => [b.textContent, b.getAttribute("aria-pressed")]))
      .toEqual([["As planned", "true"], ["Less", "false"], ["More", "false"]]);
    expect(within(li).queryByRole("group", { name: /Amount done/ })).toBeNull();
  });

  it("Less → one fewer, then the stepper; the row reads 2 of 3 ch. with Undo", async () => {
    const { li, onChange } = setup();
    await userEvent.click(within(li).getByRole("button", { expanded: false }));
    await userEvent.click(within(li).getByRole("button", { name: "Less" }));
    expect(onChange).toHaveBeenLastCalledWith(5);
    const stepper = within(li).getByRole("group", { name: "Amount done on Story of the World for Frank" });
    expect(within(stepper).getByRole("status")).toHaveTextContent("2 of 3 ch.");
    expect(li.querySelector(".checkin-row-state")).toHaveTextContent("2 of 3 ch.");
    await userEvent.click(within(stepper).getByRole("button", { name: "One less" }));
    await userEvent.click(within(stepper).getByRole("button", { name: "One less" }));
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(li.querySelector(".checkin-row-state")).toHaveTextContent("Missed");
    expect(within(stepper).getByRole("button", { name: "One less" })).toBeDisabled();
    await userEvent.click(within(li).getByRole("button", { name: "Undo Story of the World for Frank" }));
    expect(onChange).toHaveBeenLastCalledWith(6);
    expect(within(li).queryByRole("button", { name: /Undo/ })).toBeNull();
  });

  it("More → one extra; stepping back to the plan is As planned again", async () => {
    const { li, onChange } = setup();
    await userEvent.click(within(li).getByRole("button", { expanded: false }));
    await userEvent.click(within(li).getByRole("button", { name: "More" }));
    expect(onChange).toHaveBeenLastCalledWith(7);
    expect(li.querySelector(".checkin-row-state")).toHaveTextContent("4 chapters (1 more than planned)"); // S7b-03: was "4 of 3 ch."
    await userEvent.click(within(li).getByRole("button", { name: "One less" }));
    expect(within(li).getByRole("button", { name: "As planned" })).toHaveAttribute("aria-pressed", "true");
  });

  it("every control is at least a 44px target in CSS", () => {
    const css = readFileSync(resolve(__dirname, "../src/features/checkin/checkin.css"), "utf8");
    for (const sel of [".checkin-row-toggle", ".checkin-undo", ".checkin-choice button", ".checkin-skip", ".checkin-kids button"]) {
      const rule = css.match(new RegExp(`${sel.replace(/[.]/g, "\\.")} \\{[^}]*\\}`))?.[0] ?? "";
      expect(rule, sel).toMatch(/min-height: (4[4-9]|5\d)px/);
    }
    expect(css).toMatch(/\.checkin-stepper button \{[^}]*width: 44px; height: 44px/);
    expect(css).toMatch(/\.checkin-card \{[^}]*max-width: 560px; margin: 0 auto/);
  });

  it("S7b-15: only the long states are marked to wrap", () => {
    const ahead = setup({}, 7).li.querySelector(".checkin-row-state")!;
    expect(ahead).toHaveTextContent("4 chapters (1 more than planned)");
    expect(ahead).toHaveAttribute("data-long");
    cleanup();
    expect(setup({}, 5).li.querySelector(".checkin-row-state")).not.toHaveAttribute("data-long");
  });

  it("S7b-15: a long 'ahead' state sits on its own line under the title, which keeps its room (CSS and a marker on the row)", () => {
    const css = readFileSync(resolve(__dirname, "../src/features/checkin/checkin.css"), "utf8");
    expect(css.match(/\.checkin-row-toggle \{[^}]*\}/)?.[0]).toMatch(/flex-wrap: wrap/);
    expect(css.match(/\.checkin-row-title \{[^}]*\}/)?.[0]).toMatch(/flex: 1 1 9rem/);
    expect(css.match(/\.checkin-row-state\[data-long\] \{[^}]*\}/)?.[0]).toMatch(/flex: 1 1 100%/);
  });
});
