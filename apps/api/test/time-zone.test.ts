import { describe, expect, it } from "vitest";
import { DEFAULT_TIME_ZONE, isIanaTimeZone, safeTimeZone, TimeZone } from "../src/http/timeZone";
import { localToday } from "../src/http/today";

describe("isIanaTimeZone", () => {
  it.each(["America/Chicago", "Europe/London", "Asia/Kolkata", "Pacific/Auckland", "UTC", "US/Central", "Etc/GMT+5", "America/Argentina/Buenos_Aires"])("accepts %s", (z) => {
    expect(isIanaTimeZone(z)).toBe(true);
  });
  // Any letter case is accepted since S2a-17 (the stored spelling is canonicalized; see timezones.test.ts).
  it("accepts other casings", () => {
    expect(isIanaTimeZone("america/chicago")).toBe(true);
  });
  it.each(["Mars/Olympus_Mons", "", "+05:00", "Chicago", "GMT+5", "America/Chicago\u0000", " UTC", 5, null])("rejects %j", (z) => {
    expect(isIanaTimeZone(z)).toBe(false);
  });
  it("zod schema gives a readable message", () => {
    const r = TimeZone.safeParse("Nope/Nowhere");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(/IANA/);
  });
});

describe("safeTimeZone", () => {
  it("keeps a valid zone and reports nothing", () => {
    const bad: string[] = [];
    expect(safeTimeZone("Europe/Paris", (b) => bad.push(b))).toBe("Europe/Paris");
    expect(bad).toEqual([]);
  });
  it("falls back to the default and reports the bad value", () => {
    const bad: string[] = [];
    expect(safeTimeZone("Mars/Olympus_Mons", (b) => bad.push(b))).toBe(DEFAULT_TIME_ZONE);
    expect(bad).toEqual(["Mars/Olympus_Mons"]);
  });
  it("the fallback is usable by localToday", () => {
    expect(localToday(safeTimeZone("bad"), new Date("2026-10-28T04:30:00Z"))).toBe("2026-10-27");
  });
});
