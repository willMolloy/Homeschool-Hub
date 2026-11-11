/** S19-01: the date calendar stays fully on screen, including beside the right-hand panel and on a phone. */
import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { DateField, placeCalendar } from "../src/ui/DateField";

function Harness() {
  const [v, setV] = useState("2026-11-01");
  return (
    <div data-sheet="side" style={{ overflow: "auto", width: 360 }}>
      <label htmlFor="start">Start</label>
      <DateField id="start" value={v} onChange={setV} />
      <output data-testid="out">{v}</output>
    </div>
  );
}

describe("placeCalendar (S19-01)", () => {
  it("keeps a wide calendar inside a 1280 px screen when the field is in the right-hand panel", () => {
    const placed = placeCalendar(
      { left: 1080, right: 1240, top: 160, bottom: 204 },
      { width: 336, height: 320 },
      { width: 1280, height: 800 },
    );
    expect(placed.left).toBeGreaterThanOrEqual(0);
    expect(placed.left + 336).toBeLessThanOrEqual(1280);
    expect(placed.top).toBeGreaterThanOrEqual(0);
    expect(placed.top + 320).toBeLessThanOrEqual(800);
  });

  it("keeps the grid inside a 320 px phone and a 390 px phone", () => {
    for (const vw of [320, 390]) {
      const width = Math.min(336, vw - (vw < 360 ? 8 : 32));
      const placed = placeCalendar(
        { left: 12, right: vw - 16, top: 220, bottom: 264 },
        { width, height: 300 },
        { width: vw, height: 700 },
      );
      expect(placed.left).toBeGreaterThanOrEqual(0);
      expect(placed.left + width).toBeLessThanOrEqual(vw);
      expect(placed.top + 300).toBeLessThanOrEqual(700);
    }
  });

  it("opens upward when there is no room below the field", () => {
    const placed = placeCalendar(
      { left: 24, right: 200, top: 640, bottom: 684 },
      { width: 300, height: 320 },
      { width: 390, height: 800 },
    );
    expect(placed.up).toBe(true);
    expect(placed.top).toBeGreaterThanOrEqual(0);
    expect(placed.top + 320).toBeLessThanOrEqual(800);
  });
});

describe("the calendar on the page (S19-01)", () => {
  afterEach(() => { document.documentElement.removeAttribute("data-theme"); });

  it.each(["light", "dark"])("is portaled onto the page and a picked date still saves (%s)", async (theme) => {
    document.documentElement.dataset.theme = theme;
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Choose a date" }));
    const cal = screen.getByRole("group", { name: "Calendar" });
    expect(cal.parentElement).toBe(document.body);
    expect(cal).toHaveClass("date-cal-fixed");
    await user.click(within(cal).getByRole("button", { name: "Next month" }));
    await user.click(within(cal).getByRole("button", { name: "Dec 18, 2026" }));
    expect(screen.queryByRole("group", { name: "Calendar" })).toBeNull();
    expect(screen.getByTestId("out")).toHaveTextContent("2026-12-18");
  });
});
