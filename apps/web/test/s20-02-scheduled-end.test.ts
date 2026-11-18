/** S20-02: the got-through box opens on the last unit the week names. */
import { describe, expect, it } from "vitest";
import { isScheduledEnd, lastNamedUnit, scheduledPosition } from "../src/features/status/scheduledEnd";

describe("scheduled end (S20-02)", () => {
  it("chapters 16–18 end at 18 even when the position rounds to 19", () => {
    expect(lastNamedUnit("chapters 16–18")).toBe(18);
    expect(lastNamedUnit("pages 120-150")).toBe(150);
    const item = { unitType: "chapters" as const, plannedFrom: 15, plannedTo: 18.6, totalUnits: 24 };
    expect(scheduledPosition(item)).toBe(18);
    expect(isScheduledEnd(item, 18)).toBe(true);
    expect(isScheduledEnd(item, 16)).toBe(false);
    expect(isScheduledEnd(item, 20)).toBe(false);
  });

  it("a pages week opens on its last page", () => {
    expect(scheduledPosition({ unitType: "pages", plannedFrom: 0, plannedTo: 80, totalUnits: 270 })).toBe(80);
    expect(scheduledPosition({ unitType: "lessons", plannedFrom: 10, plannedTo: 15, totalUnits: 120 })).toBe(15);
  });
});
