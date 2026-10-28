/** S2b-36: one check-in row's progress control. */
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { UnitType } from "@hh/engine";
import { formatUnits } from "../src/components/unitLabels";
import { ProgressAdjuster } from "../src/features/checkin/ProgressAdjuster";
import { chipsFor, progressLabel, sliderMax } from "../src/features/checkin/progress";

interface Setup { plannedFrom?: number; plannedTo?: number; totalUnits?: number; unitType?: UnitType; start?: number }

/** A controlled harness, as the card uses it. */
function setup({ plannedFrom = 0, plannedTo = 80, totalUnits = 270, unitType = "pages", start }: Setup = {}) {
  const onChange = vi.fn();
  function Harness() {
    const [pos, setPos] = useState(start ?? plannedTo);
    return (
      <ProgressAdjuster plannedFrom={plannedFrom} plannedTo={plannedTo} totalUnits={totalUnits} unitType={unitType}
        position={pos} name="Treasure Island for Frank" onChange={(n) => { onChange(n); setPos(n); }} />
    );
  }
  render(<Harness />);
  const slider = screen.getByRole("slider", { name: "Where Treasure Island for Frank got to" });
  const field = screen.getByRole("spinbutton") as HTMLInputElement;
  const label = () => document.querySelector(".progress-label")!.textContent;
  return { onChange, slider: slider as HTMLInputElement, field, label };
}

describe("formatUnits and labels", () => {
  it("formats positions with the unit word", () => {
    expect(formatUnits("pages", 65)).toBe("p. 65");
    expect(formatUnits("pages", 22.5)).toBe("p. 22.5");
    expect(formatUnits("chapters", 4)).toBe("chapter 4");
    expect(formatUnits("lessons", 9)).toBe("lesson 9");
    expect(formatUnits("minutes", 650)).toBe("650 minutes");
    expect(formatUnits("minutes", 1)).toBe("1 minute");
  });
  it("behind, ahead and on plan", () => {
    expect(progressLabel("pages", 65, 80)).toBe("Got to p. 65 of 80 planned (15 behind)");
    expect(progressLabel("pages", 100, 80)).toBe("Got to p. 100 of 80 planned (20 ahead)");
    expect(progressLabel("pages", 80.4, 80)).toBe("Got to p. 80.4 of 80 planned (on plan)");
    expect(progressLabel("chapters", 4, 5)).toBe("Got to chapter 4 of 5 planned (1 behind)");
    expect(progressLabel("lessons", 12, 10)).toBe("Got to lesson 12 of 10 planned (2 ahead)");
    expect(progressLabel("minutes", 650, 750)).toBe("Got to 650 minutes of 750 planned (100 behind)");
  });
  it("slider max is max(1.5×, +10) capped at the total", () => {
    expect(sliderMax({ plannedFrom: 0, plannedTo: 80, totalUnits: 270 })).toBe(120);
    expect(sliderMax({ plannedFrom: 3, plannedTo: 5, totalUnits: 30 })).toBe(15);
    expect(sliderMax({ plannedFrom: 180, plannedTo: 240, totalUnits: 270 })).toBe(270);
  });
  it("About half rounds to a whole unit", () => {
    expect(chipsFor({ plannedFrom: 0, plannedTo: 22.5, totalUnits: 270 })[1]).toEqual({ label: "About half", position: 11 });
  });
});

describe("ProgressAdjuster", () => {
  it("starts done as planned", () => {
    const { label, slider, field } = setup();
    expect(label()).toBe("✓ Done as planned");
    expect(slider.value).toBe("80");
    expect(field.value).toBe("80");
    expect(screen.getByRole("button", { name: "Done" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Reset" })).toBeNull();
  });

  it.each([
    ["About half", 40],
    ["Didn't start", 0],
    ["Finished it", 120],
  ])("%s sets the position to %s", async (chip, pos) => {
    const { onChange, label } = setup({ plannedTo: 80, totalUnits: 120 });
    await userEvent.click(screen.getByRole("button", { name: chip }));
    expect(onChange).toHaveBeenLastCalledWith(pos);
    expect(screen.getByRole("button", { name: chip })).toHaveAttribute("aria-pressed", "true");
    expect(label()).toMatch(/^Got to p\. /);
  });

  it("Done sets plannedTo", async () => {
    const { onChange } = setup({ start: 10 });
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onChange).toHaveBeenLastCalledWith(80);
  });

  it("Finished it shows only when the total is within two weeks", () => {
    setup({ plannedFrom: 90, plannedTo: 180, totalUnits: 270 });
    expect(screen.getByRole("button", { name: "Finished it" })).toBeInTheDocument();
  });
  it.each([
    ["far", { plannedFrom: 0, plannedTo: 80, totalUnits: 270 }],
    ["already the end", { plannedFrom: 180, plannedTo: 270, totalUnits: 270 }],
  ])("Finished it is hidden when the total is %s", (_n, s) => {
    setup(s);
    expect(screen.queryByRole("button", { name: "Finished it" })).toBeNull();
  });

  it("slider and field stay in sync", () => {
    const { slider, field, label, onChange } = setup();
    fireEvent.change(slider, { target: { value: "65" } });
    expect(onChange).toHaveBeenLastCalledWith(65);
    expect(field.value).toBe("65");
    expect(label()).toBe("Got to p. 65 of 80 planned (15 behind)");
    fireEvent.change(field, { target: { value: "100" } });
    expect(slider.value).toBe("100");
    expect(label()).toBe("Got to p. 100 of 80 planned (20 ahead)");
  });

  it("the field takes 0 to the total, beyond the slider's range", () => {
    const { field, slider, onChange } = setup();
    fireEvent.change(field, { target: { value: "250" } });
    expect(onChange).toHaveBeenLastCalledWith(250);
    expect(slider.value).toBe("120"); // the slider pins at its end
    fireEvent.change(field, { target: { value: "0" } });
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it.each(["-1", "271", "", "abc"])("the field rejects %j with an inline error", (v) => {
    const { field, onChange } = setup();
    fireEvent.change(field, { target: { value: v } });
    expect(onChange).not.toHaveBeenCalled();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("Enter a number from 0 to 270.");
  });

  it("S2c-02: the field's minimum is the slider's (where the week started); below it is an inline error", () => {
    const { field, slider, onChange } = setup({ plannedFrom: 63.85, plannedTo: 80 });
    expect(field).toHaveAttribute("min", "63.85");
    expect(slider).toHaveAttribute("min", "63.85");
    fireEvent.change(field, { target: { value: "5" } });
    expect(onChange).not.toHaveBeenCalled();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("Enter a number from 63.85 to 270.");
    fireEvent.change(field, { target: { value: "63.85" } });
    expect(onChange).toHaveBeenLastCalledWith(63.85);
    expect(field).not.toHaveAttribute("aria-invalid");
  });

  it("a chip clears a field error", async () => {
    const { field } = setup();
    fireEvent.change(field, { target: { value: "999" } });
    await userEvent.click(screen.getByRole("button", { name: "About half" }));
    expect(field).not.toHaveAttribute("aria-invalid");
    expect(field.value).toBe("40");
  });

  it("on plan within half a unit", () => {
    const { field, label } = setup();
    fireEvent.change(field, { target: { value: "80.5" } });
    expect(label()).toBe("Got to p. 80.5 of 80 planned (on plan)");
  });

  it("Reset restores done as planned", async () => {
    const { onChange, label } = setup({ start: 65 });
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onChange).toHaveBeenLastCalledWith(80);
    expect(label()).toBe("✓ Done as planned");
    expect(screen.queryByRole("button", { name: "Reset" })).toBeNull();
  });

  it("arrow keys step one unit, clamped to the slider", async () => {
    const { slider, onChange } = setup({ start: 119 });
    slider.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith(120);
    await userEvent.keyboard("{ArrowUp}");
    expect(onChange).toHaveBeenLastCalledWith(120);
    await userEvent.keyboard("{ArrowLeft}{ArrowDown}");
    expect(onChange).toHaveBeenLastCalledWith(118);
  });

  it("names: group, slider value text and the unit word on the field", () => {
    const { slider } = setup({ unitType: "chapters", plannedFrom: 3, plannedTo: 5, totalUnits: 30, start: 4 });
    expect(screen.getByRole("group", { name: "Progress on Treasure Island for Frank" })).toBeInTheDocument();
    expect(slider).toHaveAttribute("aria-valuetext", "Got to chapter 4 of 5 planned (1 behind)");
    expect(screen.getByRole("spinbutton", { name: "Got to chapter" })).toBeInTheDocument();
  });
  it("minutes field label", () => {
    setup({ unitType: "minutes", plannedFrom: 600, plannedTo: 750, totalUnits: 3000 });
    expect(screen.getByRole("spinbutton", { name: "Minutes done in total" })).toBeInTheDocument();
  });
  it("pages field label", () => {
    setup();
    expect(screen.getByRole("spinbutton", { name: "Got to page" })).toBeInTheDocument();
  });
});
