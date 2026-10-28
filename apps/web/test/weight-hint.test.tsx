/** S2b-11: every suggestion source's hint, the override text and the Use button. */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { WeightSuggestion } from "../src/api/types";
import { joinNames, overrideText, suggestionText, WeightHint } from "../src/features/schedule/WeightHint";

const kid = (name: string, usual: number | null) => ({ childId: name.toLowerCase(), name, usual, choices: usual == null ? 0 : 3 });
const base = (over: Partial<WeightSuggestion>): WeightSuggestion => ({
  unitType: "pages", weightPerUnit: 1, source: "builtin", builtInDefault: 1, subjectDefault: null, learned: true, children: [], ...over,
});

const CHILD = base({ weightPerUnit: 1.4, source: "child", children: [kid("Margaret", 1.4)] });
const CHILDREN = base({ weightPerUnit: 1.7, source: "children", children: [kid("Margaret", 1.4), kid("Frank", 2)] });
const MIXED = base({ weightPerUnit: 1.4, source: "child", children: [kid("Margaret", 1.4), kid("Frank", null)] });
const MIXED_MANY = base({ weightPerUnit: 1.7, source: "children", children: [kid("Margaret", 1.4), kid("Frank", 2), kid("Ada", null), kid("Bo", null)] });
const SUBJECT = base({ unitType: "lessons", weightPerUnit: 20, source: "subject", builtInDefault: 15, learned: false,
  subjectDefault: { unitType: "lessons", weightPerUnit: 20 }, children: [kid("Margaret", null)] });
const BUILTIN = base({ children: [kid("Margaret", null)] });

describe("suggestionText", () => {
  it.each([
    ["child", CHILD, "Using Margaret's usual weight for pages (1.4)."],
    ["children", CHILDREN, "Using Margaret and Frank's usual weight (1.7)."],
    ["mixed", MIXED, "Using Margaret's usual weight (1.4). Frank has no history yet."],
    ["mixed, several without", MIXED_MANY, "Using Margaret and Frank's usual weight (1.7). Ada and Bo have no history yet."],
    ["subject", SUBJECT, "Using the Math default (20 per lesson)."],
    ["builtin", BUILTIN, "Using the default weight for pages (1)."],
    ["builtin minutes, no trailing zeros", base({ unitType: "minutes", weightPerUnit: 0.5, learned: false }), "Using the default weight for minutes (0.5)."],
  ])("%s", (_n, s, text) => {
    expect(suggestionText(s, "Math")).toBe(text);
  });
});

describe("overrideText", () => {
  it.each([
    ["learned", CHILD, 2, "Your weight (2). Margaret's usual is 1.4."],
    ["learned, two children", CHILDREN, 2.5, "Your weight (2.5). Margaret and Frank's usual is 1.7."],
    ["subject", SUBJECT, 25, "Your weight (25). The Math default is 20."],
    ["builtin", BUILTIN, 2, "Your weight (2). The default for pages is 1."],
  ])("%s", (_n, s, typed, text) => {
    expect(overrideText(s, typed, "Math")).toBe(text);
  });
});

it("joinNames", () => {
  expect(joinNames([])).toBe("");
  expect(joinNames(["A"])).toBe("A");
  expect(joinNames(["A", "B"])).toBe("A and B");
  expect(joinNames(["A", "B", "C"])).toBe("A, B and C");
});

describe("WeightHint", () => {
  it("untouched: the source text, no button", () => {
    render(<WeightHint id="h" suggestion={CHILD} subjectName="Reading" typed={undefined} onUse={() => {}} />);
    expect(screen.getByText("Using Margaret's usual weight for pages (1.4).")).toHaveAttribute("id", "h");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("override: the text and a Use button that calls back", async () => {
    const onUse = vi.fn();
    render(<WeightHint id="h" suggestion={CHILD} subjectName="Reading" typed={2} onUse={onUse} />);
    expect(screen.getByText(/Your weight \(2\)\. Margaret's usual is 1\.4\./)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Use 1.4" }));
    expect(onUse).toHaveBeenCalledOnce();
  });

  it("cleared: the blank-means-default text and Use", () => {
    render(<WeightHint id="h" suggestion={SUBJECT} subjectName="Math" typed={null} onUse={() => {}} />);
    expect(screen.getByText(/Blank = the subject's default or the built-in \(15\)\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use 20" })).toBeInTheDocument();
  });
});
