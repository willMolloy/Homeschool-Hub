import { describe, expect, it } from "vitest";
import { addDays, CALENDAR_SHAPES, EngineInputError, HOLIDAY_KEYS, HOLIDAY_LABELS, onOffBreaks, usHolidays, weekdayOf } from "../src";

const byKey = (start: string, end: string) => Object.fromEntries(usHolidays(start, end).map((h) => [h.key, h]));

describe("usHolidays (S5-03)", () => {
  it("2026-27 matches the known dates", () => {
    const h = byKey("2026-08-17", "2027-05-28");
    expect(h["labor-day"]).toMatchObject({ start: "2026-09-07", end: "2026-09-07", label: "Labor Day" });
    expect(h.thanksgiving).toMatchObject({ start: "2026-11-26", end: "2026-11-27", label: "Thanksgiving" });
    expect(h["winter-break"]).toMatchObject({ start: "2026-12-24", end: "2027-01-01" });
    expect(h["mlk-day"]).toMatchObject({ start: "2027-01-18", end: "2027-01-18" });
    expect(h["presidents-day"]).toMatchObject({ start: "2027-02-15", end: "2027-02-15" });
    expect(h["good-friday"]).toMatchObject({ start: "2027-03-26", end: "2027-03-26" });
    expect(Object.keys(h)).toHaveLength(6); // Memorial Day (May 31) is after the range
  });

  it("Memorial Day 2027 is 2027-05-31 when the range reaches it", () => {
    expect(byKey("2027-05-01", "2027-06-30")["memorial-day"]).toMatchObject({ start: "2027-05-31", end: "2027-05-31" });
  });

  it("is in date order, with a stable key on every holiday", () => {
    const list = usHolidays("2026-08-17", "2027-06-30");
    expect(list.map((h) => h.start)).toEqual([...list.map((h) => h.start)].sort());
    expect(list.map((h) => h.key)).toEqual(["labor-day", "thanksgiving", "winter-break", "mlk-day", "presidents-day", "good-friday", "memorial-day"]);
  });

  it("leaves out holidays outside the range, and cuts one that runs past an end", () => {
    expect(usHolidays("2026-09-08", "2026-11-25")).toEqual([]);
    expect(usHolidays("2026-12-28", "2027-01-10").map((h) => [h.key, h.start, h.end])).toEqual([["winter-break", "2026-12-28", "2027-01-01"]]);
    expect(usHolidays("2026-12-01", "2026-12-26").map((h) => [h.key, h.start, h.end])).toEqual([["winter-break", "2026-12-24", "2026-12-26"]]);
    // A range that starts inside last year's winter break still sees it.
    expect(usHolidays("2027-01-01", "2027-01-01")).toEqual([{ key: "winter-break", start: "2027-01-01", end: "2027-01-01", label: "Winter break" }]);
    expect(usHolidays("2026-10-01", "2026-09-01")).toEqual([]);
  });

  it("HOLIDAY_LABELS names every key, and usHolidays uses those names", () => {
    expect(Object.keys(HOLIDAY_LABELS).sort()).toEqual([...HOLIDAY_KEYS].sort());
    for (const h of usHolidays("2026-08-17", "2027-06-30")) expect(h.label).toBe(HOLIDAY_LABELS[h.key]);
  });

  it("finds the right Mondays and Easters in other years", () => {
    const y = (a: string, b: string, key: string) => byKey(a, b)[key]!.start;
    expect(y("2025-09-01", "2025-09-30", "labor-day")).toBe("2025-09-01"); // the 1st itself
    expect(y("2024-11-01", "2024-11-30", "thanksgiving")).toBe("2024-11-28");
    expect(y("2026-05-01", "2026-05-31", "memorial-day")).toBe("2026-05-25");
    expect(y("2026-03-01", "2026-04-30", "good-friday")).toBe("2026-04-03");
    expect(y("2025-03-01", "2025-04-30", "good-friday")).toBe("2025-04-18");
    expect(y("2024-03-01", "2024-04-30", "good-friday")).toBe("2024-03-29");
    expect(y("2028-02-01", "2028-02-29", "presidents-day")).toBe("2028-02-21");
    for (const h of usHolidays("2026-01-01", "2030-12-31")) {
      if (["labor-day", "mlk-day", "presidents-day", "memorial-day"].includes(h.key)) expect(weekdayOf(h.start)).toBe(1);
      if (h.key === "good-friday") expect(weekdayOf(h.start)).toBe(5);
      if (h.key === "thanksgiving") expect([weekdayOf(h.start), weekdayOf(h.end)]).toEqual([4, 5]);
    }
  });
});

describe("onOffBreaks (S5-03)", () => {
  it("6 on / 1 off from 2026-08-17 to 2027-05-28: a break every 7th week", () => {
    const b = onOffBreaks("2026-08-17", "2027-05-28", 6, 1, "mon");
    expect(b[0]).toEqual({ start: "2026-09-28", end: "2026-10-04" });
    expect(b.map((r) => r.start)).toEqual(["2026-09-28", "2026-11-16", "2027-01-04", "2027-02-22", "2027-04-12", "2027-05-31"].slice(0, b.length));
    expect(b).toHaveLength(5); // the next would start 2027-05-31, after the end
    b.forEach((r, i) => i > 0 && expect(Date.parse(r.start) - Date.parse(b[i - 1]!.start)).toBe(49 * 86_400_000));
  });

  it("starts at the first week start on or after the start; sun and mon weeks differ", () => {
    expect(onOffBreaks("2026-08-19", "2026-12-31", 2, 1, "mon")[0]).toEqual({ start: "2026-09-07", end: "2026-09-13" }); // first Monday 08-24, + 2 weeks
    expect(onOffBreaks("2026-08-19", "2026-12-31", 2, 1, "sun")[0]).toEqual({ start: "2026-09-06", end: "2026-09-12" }); // first Sunday 08-23, + 2 weeks
    expect(onOffBreaks("2026-08-23", "2026-12-31", 2, 1, "sun")[0]).toEqual({ start: "2026-09-06", end: "2026-09-12" }); // 08-23 is already a week start
  });

  it("a run of several break weeks is one range; the last is cut at the end", () => {
    const b = onOffBreaks("2026-08-17", "2027-05-28", 12, 2, "mon");
    expect(b[0]).toEqual({ start: "2026-11-09", end: "2026-11-22" });
    expect(b[1]).toEqual({ start: "2027-02-15", end: "2027-02-28" }); // 12 school weeks after 11-23
    expect(onOffBreaks("2026-08-17", "2026-11-12", 12, 2, "mon")).toEqual([{ start: "2026-11-09", end: "2026-11-12" }]);
  });

  it("weeksOff 0, a range too short, or an inverted range gives none", () => {
    expect(onOffBreaks("2026-08-17", "2027-05-28", 6, 0, "mon")).toEqual([]);
    expect(onOffBreaks("2026-08-17", "2026-09-27", 6, 1, "mon")).toEqual([]);
    expect(onOffBreaks("2026-08-17", "2026-08-01", 6, 1, "mon")).toEqual([]);
  });

  it("rejects counts that aren't whole numbers", () => {
    expect(() => onOffBreaks("2026-08-17", "2027-05-28", 0, 1, "mon")).toThrow(EngineInputError);
    expect(() => onOffBreaks("2026-08-17", "2027-05-28", 1.5, 1, "mon")).toThrow(EngineInputError);
    expect(() => onOffBreaks("2026-08-17", "2027-05-28", 6, -1, "mon")).toThrow(EngineInputError);
  });

  it("every break starts on a week start and is whole weeks", () => {
    for (const ws of ["sun", "mon"] as const) {
      for (const r of onOffBreaks("2026-08-19", "2027-06-30", 4, 1, ws)) {
        expect(weekdayOf(r.start)).toBe(ws === "sun" ? 0 : 1);
        expect(r.end).toBe(addDays(r.start, 6) < "2027-06-30" ? addDays(r.start, 6) : "2027-06-30"); // whole weeks, the last cut at the end
      }
    }
  });
});

describe("CALENDAR_SHAPES (S5-03)", () => {
  it("lists 36 weeks (holidays only), Sabbath (6 on, 1 off) and three terms (12 on, 2 off)", () => {
    expect(CALENDAR_SHAPES.map((s) => [s.id, s.pattern])).toEqual([
      ["36-weeks", null], ["sabbath", { weeksOn: 6, weeksOff: 1 }], ["three-terms", { weeksOn: 12, weeksOff: 2 }],
    ]);
  });
});
