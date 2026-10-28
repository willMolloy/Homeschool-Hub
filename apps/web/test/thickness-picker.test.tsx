/** S2b-34: the bar-width picker. */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { UNIT_TYPES, type UnitType } from "@hh/engine";
import { ThicknessPicker } from "../src/components/ThicknessPicker";
import { MAX_BAR_PX, PX_PER_THICKNESS, thicknessToPx } from "../src/features/plan/scale";

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
    expect(screen.getByLabelText("Custom weight")).toHaveValue(18);
  });

  it.each([["0"], ["101"], ["1.234"], ["-1"]])("Custom rejects %s without emitting", async (raw) => {
    const spy = vi.fn();
    render(<Host spy={spy} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: "Custom…" }));
    spy.mockClear();
    const input = screen.getByLabelText("Custom weight");
    await user.clear(input);
    await user.type(input, raw);
    expect(screen.getByRole("alert")).toHaveTextContent(/Weight (must be more than 0 and at most 100|can have at most 2 decimal places)/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(spy.mock.calls.map((c) => c[0]).filter((v) => v === Number(raw))).toEqual([]);
  });

  it("Custom accepts 12.25", async () => {
    const spy = vi.fn();
    render(<Host spy={spy} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: "Custom…" }));
    const input = screen.getByLabelText("Custom weight");
    await user.clear(input);
    await user.type(input, "12.25");
    expect(spy).toHaveBeenLastCalledWith(12.25);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("preview follows the value, the reference stays at 20 pages, and both clamp", async () => {
    render(<Host unitType="lessons" initial={15} />);
    expect(height("preview-bar")).toBe(15 * PX_PER_THICKNESS);
    expect(height("reference-bar")).toBe(20 * PX_PER_THICKNESS);
    await userEvent.setup().click(screen.getByRole("radio", { name: /^Very heavy/ }));
    expect(height("preview-bar")).toBe(30 * PX_PER_THICKNESS);
    expect(screen.getByRole("img", { name: "1 lesson a day: thickness 30" })).toBeInTheDocument();
    expect(thicknessToPx(100_000)).toBe(MAX_BAR_PX);
    expect(thicknessToPx(-5)).toBe(0);
    expect(thicknessToPx(Number.NaN)).toBe(0);
  });

  it("a 100-per-page custom weight is clamped to the max bar", () => {
    render(<Host unitType="pages" initial={100} />);
    expect(height("preview-bar")).toBe(MAX_BAR_PX);
  });

  it("caption: '1 lesson a day ≈ 30 min of work' at Normal; null uses the built-in", async () => {
    render(<Host unitType="lessons" />);
    expect(screen.getByText("1 lesson a day ≈ 30 min of work")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("radio", { name: /^Heavy/ }));
    expect(screen.getByText("1 lesson a day ≈ 45 min of work")).toBeInTheDocument();
  });

  it("captions for the other units", () => {
    const { unmount } = render(<Host unitType="pages" />);
    expect(screen.getByText("20 pages a day ≈ 40 min of work")).toBeInTheDocument();
    unmount();
    render(<Host unitType="minutes" />);
    expect(screen.getByText("30 minutes a day ≈ 30 min of work")).toBeInTheDocument();
  });

  it("keyboard: arrow keys move through the presets and emit", async () => {
    const spy = vi.fn();
    render(<Host spy={spy} />);
    const user = userEvent.setup();
    const group = screen.getByRole("group", { name: "Bar width" });
    await user.click(within(group).getByRole("radio", { name: "None" }));
    await user.keyboard("{ArrowRight}");
    expect(within(group).getByRole("radio", { name: /^Light/ })).toBeChecked();
    await user.keyboard("{ArrowRight}");
    expect(spy).toHaveBeenLastCalledWith(15);
  });
});
