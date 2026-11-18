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

  it("a week that only starts its last chapter opens on that chapter, and the one before is not as planned (H1)", () => {
    const words = "chapters 14–17 (starts 17)";
    const item = { unitType: "chapters" as const, plannedFrom: 13, plannedTo: 16.3, totalUnits: 24 };
    // The finished units alone stop at 16. The words the parent reads include the chapter the week starts.
    expect(scheduledPosition(item)).toBe(16);
    expect(lastNamedUnit(words)).toBe(17);
    expect(scheduledPosition(item, words)).toBe(17);
    expect(isScheduledEnd(item, 17, words)).toBe(true);
    expect(isScheduledEnd(item, 16, words)).toBe(false);
    expect(isScheduledEnd(item, 16.3, words)).toBe(true);
  });
});
