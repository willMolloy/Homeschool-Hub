/** S20-01: minutes are a daily amount. Moving the dates keeps it; a break does not thicken the other days. Pages still thicken. */
import { describe, expect, it } from "vitest";
import { minutesPerDayFromWeight, planChild, totalForSameDaily, type BlockedPeriod } from "../src";
import { book, MON_FRI, unitsOn } from "./helpers";

const start = "2026-09-07"; // Monday
const endLong = "2026-09-18"; // Friday, 10 school days
const endShort = "2026-09-11"; // Friday, 5 school days
const weekOff: BlockedPeriod = { id: "off", start: "2026-09-14", end: "2026-09-18", kind: "vacation" };

describe("minutes a day (S20-01)", () => {
  it("keeps the daily amount when the end date moves and the total is rescaled; pages get thicker", () => {
    const long = planChild(book({ unitType: "minutes", totalUnits: 300, weightPerUnit: 0.5, start, end: endLong }), "frank", { calendar: MON_FRI });
    const short = planChild(
      book({ unitType: "minutes", totalUnits: totalForSameDaily(300, 10, 5), weightPerUnit: 0.5, start, end: endShort }),
      "frank",
      { calendar: MON_FRI },
    );
    expect(minutesPerDayFromWeight(long.weightPerUnit, long.baseRate)).toBeCloseTo(30);
    expect(minutesPerDayFromWeight(short.weightPerUnit, short.baseRate)).toBeCloseTo(30);
    expect(unitsOn(short, "2026-09-07")).toBeCloseTo(unitsOn(long, "2026-09-07"));

    const pagesLong = planChild(book({ totalUnits: 100, weightPerUnit: 1, start, end: endLong }), "frank", { calendar: MON_FRI });
    const pagesShort = planChild(book({ totalUnits: 100, weightPerUnit: 1, start, end: endShort }), "frank", { calendar: MON_FRI });
    expect(pagesShort.baseRate).toBeGreaterThan(pagesLong.baseRate);
    expect(unitsOn(pagesShort, "2026-09-07")).toBeGreaterThan(unitsOn(pagesLong, "2026-09-07"));
  });

  it("a week off does not thicken the minutes days that remain, and it does thicken pages", () => {
    const piano = planChild(book({ unitType: "minutes", totalUnits: 300, weightPerUnit: 0.5, start, end: endLong }), "frank", { calendar: MON_FRI, blocked: [weekOff] });
    expect(unitsOn(piano, "2026-09-07")).toBeCloseTo(30);
    expect(piano.days.find((d) => d.date === "2026-09-07")!.thickness).toBeCloseTo(15);
    expect(unitsOn(piano, "2026-09-14")).toBe(0);
    expect(minutesPerDayFromWeight(piano.weightPerUnit, piano.baseRate)).toBeCloseTo(30);

    const open = planChild(book({ totalUnits: 100, weightPerUnit: 1, start, end: endLong }), "frank", { calendar: MON_FRI });
    const broken = planChild(book({ totalUnits: 100, weightPerUnit: 1, start, end: endLong }), "frank", { calendar: MON_FRI, blocked: [weekOff] });
    expect(unitsOn(broken, "2026-09-07")).toBeGreaterThan(unitsOn(open, "2026-09-07"));
  });
});
