/**
 * Tester round 3 (S2b-16), web half of case 1: the assignment form's weight field and the picker's Custom field
 * reject the same bad values the API and DB do. (Case 8's reset-on-unit-change is covered in assignments-screen.)
 */
import { MAX_WEIGHT_PER_UNIT } from "@hh/engine";
import { describe, expect, it } from "vitest";
import { parseCustomWeight } from "../src/components/weightPresets";
import { parsePositive } from "../src/features/schedule/formBits";

const form = (raw: string) => parsePositive(raw, "Weight", MAX_WEIGHT_PER_UNIT);

describe("tester3: weight inputs on the web", () => {
  it.each(["0", "-1", "-0", "0.001", "100.01", "1e308", "1.234", "Infinity", "NaN", "abc", "1,5"])("%j is rejected by both fields", (raw) => {
    expect(typeof form(raw)).toBe("string");
    expect(typeof parseCustomWeight(raw)).toBe("string");
  });
  it.each([["0.01", 0.01], ["100", 100], [" 1.4 ", 1.4], ["2.50", 2.5]])("%j → %s in both fields", (raw, v) => {
    expect(form(raw)).toBe(v);
    expect(parseCustomWeight(raw)).toBe(v);
  });
  it("the messages name the bound and the decimals", () => {
    expect(form("0")).toBe("Weight must be more than 0 and at most 100.");
    expect(form("1.234")).toBe("Weight can have at most 2 decimal places.");
    expect(parseCustomWeight("100.01")).toBe("Weight must be more than 0 and at most 100.");
    expect(parseCustomWeight("")).toBe("Enter a weight.");
  });
});
