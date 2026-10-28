import { describe, expect, it } from "vitest";
import { BLOCKED_KINDS, humanList, OVERRIDE_MODES, SUBJECT_RULES, UNIT_TYPES, WEEK_STARTS } from "../src";

const LISTS = { WEEK_STARTS, UNIT_TYPES, SUBJECT_RULES, OVERRIDE_MODES, BLOCKED_KINDS };

describe("enum constants (RF-08)", () => {
  it.each(Object.entries(LISTS))("%s is frozen, non-empty and has no duplicates", (_name, values) => {
    expect(Object.isFrozen(values)).toBe(true);
    expect(values.length).toBeGreaterThan(0);
    expect(new Set(values).size).toBe(values.length);
    expect(() => (values as unknown as string[]).push("x")).toThrow(TypeError);
  });

  it("humanList reads like the old hand-written messages", () => {
    expect(humanList(UNIT_TYPES)).toBe("pages, chapters, lessons or minutes");
    expect(humanList(SUBJECT_RULES)).toBe("skip, lighter or normal");
    expect(humanList(["a", "b"])).toBe("a or b");
    expect(humanList(["a"])).toBe("a");
    expect(humanList([])).toBe("");
  });
});
