/** S2b-34: the usual-effort picker (S7-17: was the bar-width picker; minutes per unit). */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { UNIT_TYPES, type UnitType } from "@hh/engine";
import { ThicknessPicker } from "../src/components/ThicknessPicker";
import { MAX_BAR_PX, PX_PER_THICKNESS, softCapPx, thicknessToPx } from "../src/features/plan/scale";

/** A controlled host, like a real form. */
function Host({ unitType = "lessons" as UnitType, initial = null as number | null, spy = (_: number | null) => {} }) {
  const [v, setV] = useState<number | null>(initial);
  return <ThicknessPicker unitType={unitType} value={v} onChange={(n) => { spy(n); setV(n); }} />;
}
const height = (id: string) => parseFloat((screen.getByTestId(id) as HTMLElement).style.height);

const EXPECTED: Record<UnitType, number[]> = {
  pages: [0.5, 1, 1.5, 2],
  chapters: [5, 10, 15, 20],
  lessons: [7.5, 15, 22.5, 30],
  minutes: [0.25, 0.5, 0.75, 1],
};

describe("ThicknessPicker", () => {
  it("S2c-03: onValidityChange reports an invalid Custom entry, and the caption asks for the minutes (S6b-13)", async () => {
    const valid = vi.fn();
    function V() {
      const [v, setV] = useState<number | null>(20);
      return <ThicknessPicker unitType="lessons" value={v} onChange={setV} onValidityChange={valid} />;
    }
    render(<V />);
    const user = userEvent.setup();
    expect(valid.mock.calls).toEqual([[true]]);
    const custom = screen.getByLabelText(/^Custom minutes/);
    await user.clear(custom);
    expect(valid).toHaveBeenLastCalledWith(false);
    expect(screen.getByText("Enter the minutes to see the preview")).toBeInTheDocument();
    await user.type(custom, "0");
    expect(valid).toHaveBeenLastCalledWith(false);
    await user.clear(custom);
    await user.type(custom, "12");
    expect(valid).toHaveBeenLastCalledWith(true);
    expect(screen.queryByText("Enter the minutes to see the preview")).not.toBeInTheDocument();
    await user.clear(custom);
    await user.click(screen.getByRole("radio", { name: "None" }));
    expect(valid).toHaveBeenLastCalledWith(true);
    // Only changes are reported ("0" stays invalid, so typing it adds nothing).
    expect(valid.mock.calls.map((c) => c[0])).toEqual([true, false, true, false, true]);
  });

  it.each(UNIT_TYPES)("each preset emits built-in × multiplier for %s", async (unit) => {
    const spy = vi.fn();
    render(<Host unitType={unit} spy={spy} />);
    const user = userEvent.setup();
    for (const name of ["Light", "Normal", "Heavy", "Very heavy"]) await user.click(screen.getByRole("radio", { name: new RegExp(`^${name}`) }));
    expect(spy.mock.calls.map((c) => c[0])).toEqual(EXPECTED[unit]);
  });

  it("None emits null and is selected for a null value", async () => {
    const spy = vi.fn();
    render(<Host initial={22.5} spy={spy} />);
    expect(screen.getByRole("radio", { name: /^Heavy/ })).toBeChecked();
    await userEvent.setup().click(screen.getByRole("radio", { name: "None" }));
    expect(spy).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole("radio", { name: "None" })).toBeChecked();
  });

  it("a non-preset stored value opens Custom with that number", () => {
    render(<Host initial={18} />);
    expect(screen.getByRole("radio", { name: "Custom…" })).toBeChecked();
    // 18 per lesson is 36 minutes a lesson (S6b-13: the parent sees minutes; S7-17: per unit).
    expect(screen.getByLabelText("Custom minutes a lesson")).toHaveValue(36);
  });

  it.each([["0"], ["1441"], ["-1"]])("Custom rejects %s without emitting", async (raw) => {
    const spy = vi.fn();
    render(<Host spy={spy} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: "Custom…" }));
    spy.mockClear();
    const input = screen.getByLabelText(/^Custom minutes/);
    await user.clear(input);
    await user.type(input, raw);
    expect(screen.getByRole("alert")).toHaveTextContent(/Minutes must be more than 0 and at most 200/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(spy.mock.calls.map((c) => c[0]).filter((v) => v === Number(raw))).toEqual([]);
  });

  it("Custom takes the minutes one unit takes (S7-17): 15 minutes a lesson is a weight of 7.5; 1 minute a page is 0.5", async () => {
    const spy = vi.fn();
    render(<Host spy={spy} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: "Custom…" }));
    const input = screen.getByLabelText(/^Custom minutes/);
    await user.clear(input);
    await user.type(input, "15");
    expect(spy).toHaveBeenLastCalledWith(7.5);
    expect(screen.queryByRole("alert")).toBeNull();
    // S6b-13: the picker never shows a weight.
    expect(document.body.textContent).not.toMatch(/weight/i);
  });

  it("S7-17: for pages, Custom is the minutes a page takes", async () => {
    const spy = vi.fn();
    render(<Host unitType="pages" spy={spy} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: "Custom…" }));
    const input = screen.getByLabelText("Custom minutes a page");
    await user.clear(input);
    await user.type(input, "1");
    expect(spy).toHaveBeenLastCalledWith(0.5);
  });

  it("preview follows the value, the reference stays at 20 pages, and both clamp", async () => {
    render(<Host unitType="lessons" initial={15} />);
    expect(height("preview-bar")).toBe(15 * PX_PER_THICKNESS);
    expect(height("reference-bar")).toBe(20 * PX_PER_THICKNESS);
    await userEvent.setup().click(screen.getByRole("radio", { name: /^Very heavy/ }));
    expect(height("preview-bar")).toBe(softCapPx(30 * PX_PER_THICKNESS)); // S6b-06: 84 px raw is above the knee, so softly capped
    expect(screen.getByRole("img", { name: "1 lesson a day, about 60 min a lesson" })).toBeInTheDocument();
    expect(thicknessToPx(100_000)).toBe(MAX_BAR_PX); // S6b-06: the soft cap approaches the maximum
    expect(thicknessToPx(-5)).toBe(0);
    expect(thicknessToPx(Number.NaN)).toBe(0);
  });

  it("a 100-per-page custom weight is clamped to the max bar", () => {
    render(<Host unitType="pages" initial={100} />);
    expect(height("preview-bar")).toBe(MAX_BAR_PX); // S6b-06: the cap is now 96 px and soft, but this is far above it
  });

  it("caption (S7-17): 'About 30 min a lesson. The bar shows 1 lesson a day.' at Normal; null uses the built-in", async () => {
    render(<Host unitType="lessons" />);
    expect(screen.getByText("About 30 min a lesson. The bar shows 1 lesson a day.")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("radio", { name: /^Heavy/ }));
    expect(screen.getByText("About 45 min a lesson. The bar shows 1 lesson a day.")).toBeInTheDocument();
  });

  it("captions for the other units", () => {
    const { unmount } = render(<Host unitType="pages" />);
    expect(screen.getByText("About 2 min a page. The bar shows 20 pages a day.")).toBeInTheDocument();
    unmount();
    render(<Host unitType="minutes" />);
    expect(screen.getByText("About 1 min a minute. The bar shows 30 minutes a day.")).toBeInTheDocument();
  });

  it("each preset label gives its minutes a unit (\"Light · 15 min a lesson\"; S6b-13, S7-17)", () => {
    render(<Host unitType="lessons" />);
    const group = screen.getByRole("group", { name: "Usual effort" });
    expect(within(group).getByRole("radio", { name: "Light · 15 min a lesson" })).toBeInTheDocument();
    expect(within(group).getByRole("radio", { name: "Very heavy · 60 min a lesson" }).closest("label")).toHaveTextContent(/^Very heavy · 60 min a lesson$/);
  });

  it("keyboard: arrow keys move through the presets and emit", async () => {
    const spy = vi.fn();
    render(<Host spy={spy} />);
    const user = userEvent.setup();
    const group = screen.getByRole("group", { name: "Usual effort" });
    await user.click(within(group).getByRole("radio", { name: "None" }));
    await user.keyboard("{ArrowRight}");
    expect(within(group).getByRole("radio", { name: /^Light/ })).toBeChecked();
    await user.keyboard("{ArrowRight}");
    expect(spy).toHaveBeenLastCalledWith(15);
  });
});
