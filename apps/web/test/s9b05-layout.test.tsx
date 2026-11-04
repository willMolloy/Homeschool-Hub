// S9b-05 (N9, N11, N15): small-phone layout, the scrolling zoom row, and the themed link and switches.
import { readFileSync } from "node:fs";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { DateField, EDGE, NARROW } from "../src/ui/DateField";
import { ZoomPresets, moreEdges } from "../src/features/timeline/ZoomPresets";

const css = (f: string) => readFileSync(f, "utf8");
const rule = (text: string, sel: string) => {
  const at = text.indexOf(`${sel} {`);
  return at < 0 ? "" : text.slice(at, text.indexOf("}", at));
};

function Field() {
  const [v, setV] = useState("2026-11-03");
  return <DateField value={v} onChange={setV} aria-label="Start" />;
}

describe("N9: a 320 px phone", () => {
  const width = window.innerWidth;
  afterEach(() => { Object.defineProperty(window, "innerWidth", { configurable: true, value: width }); });

  it("the calendar spans the screen less 4 px a side, so each day cell is at least 44 px wide", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 });
    render(<Field />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Choose a date" }));
    const cal = screen.getByRole("group", { name: "Calendar" });
    // jsdom puts the field at x = 0, so the calendar starts EDGE px to its right.
    expect(cal.style.left).toBe(`${EDGE}px`);
    const narrow = css("src/ui/date-field.css").slice(css("src/ui/date-field.css").indexOf(`@media (max-width: ${NARROW - 1}px)`));
    expect(narrow).toMatch(new RegExp(`\\.date-cal \\{ width: calc\\(100vw - ${2 * EDGE}px\\); padding: 8px 0; \\}`));
    const border = 1;
    expect((320 - 2 * EDGE - 2 * border) / 7).toBeGreaterThanOrEqual(44);
    expect(narrow).toMatch(/\.field-row:has\(\.date-field\) \{ grid-template-columns: 1fr; \}/);
  });

  it("a wide screen keeps the calendar hanging from the field", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    render(<Field />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Choose a date" }));
    expect(screen.getByRole("group", { name: "Calendar" }).style.left).toBe("");
  });

  it("the placeholder ends in an ellipsis before the icon", () => {
    expect(css("src/ui/date-field.css")).toMatch(/input\[type="text"\]::placeholder \{ text-overflow: ellipsis; \}/);
  });

  it("hours and minutes boxes keep their units beside them; big numbers and 'All children' don't wrap", () => {
    const r = css("src/features/records/records.css");
    expect(rule(r, ".hm-boxes")).toMatch(/white-space: nowrap/);
    expect(rule(r, ".hm-boxes")).toMatch(/flex: none/);
    expect(rule(r, ".big-number strong")).toMatch(/white-space: nowrap/);
    expect(rule(r, ".big-number strong")).not.toMatch(/overflow-wrap: anywhere/);
    expect(rule(r, ".big-numbers")).toMatch(/minmax\(8\.5rem, 1fr\)/);
    expect(rule(r, ".log-chips .chip")).toMatch(/white-space: nowrap/);
    const form = css("src/features/records/LogEntryForm.tsx");
    expect(form).toMatch(/<span className="hm-boxes">\s*<input[^>]*hours[\s\S]*?<span aria-hidden="true">m<\/span>\s*<\/span>/);
  });
});

describe("N11: the zoom row", () => {
  it("knows which edges have more past them", () => {
    expect(moreEdges({ scrollLeft: 0, scrollWidth: 300, clientWidth: 300 })).toBeUndefined();
    expect(moreEdges({ scrollLeft: 0, scrollWidth: 400, clientWidth: 300 })).toBe("end");
    expect(moreEdges({ scrollLeft: 50, scrollWidth: 400, clientWidth: 300 })).toBe("both");
    expect(moreEdges({ scrollLeft: 100, scrollWidth: 400, clientWidth: 300 })).toBe("start");
  });

  it("fades the edge with more, and a long name ends in … with the full name kept", () => {
    const t = css("src/features/timeline/timeline.css");
    for (const m of ["end", "start", "both"]) expect(t).toMatch(new RegExp(`\\.tl-zoom\\[data-more="${m}"\\] \\{ mask-image: linear-gradient`));
    expect(t).toMatch(/\.tl-zoom button \{ max-width: 10rem; overflow: hidden; text-overflow: ellipsis; \}/);
    const long = "Spring term with the cousins";
    render(<ZoomPresets zooms={["year", "month"]} value="year" onChange={() => {}} labelOf={(z) => (z === "year" ? long : "This month")} />);
    const b = screen.getByRole("button", { name: long });
    expect(b).toHaveAttribute("title", long);
    // jsdom has no layout: nothing overflows, so no fade.
    expect(screen.getByRole("group", { name: "Zoom" })).not.toHaveAttribute("data-more");
  });
});

describe("N15: themed link and switches", () => {
  it("the state-laws link uses the theme's link style", () => {
    expect(css("src/features/records/LogSetupForm.tsx")).toMatch(/<a className="btn-link" href=\{STATE_LAWS_URL\}/);
    expect(css("src/ui/forms.css")).toMatch(/a\.btn-link:visited \{ color: var\(--tl-primary\); \}/);
  });

  it("a role=switch checkbox is drawn as a switch on theme tokens, native in high-contrast mode", () => {
    const f = css("src/ui/forms.css");
    const base = rule(f, 'input[type="checkbox"][role="switch"]');
    expect(base).toMatch(/appearance: none/);
    expect(base).toMatch(/width: 44px; height: 26px/);
    expect(base).toMatch(/border-radius: 999px/);
    expect(rule(f, 'input[type="checkbox"][role="switch"]:checked')).toMatch(/background: var\(--tl-primary\)/);
    expect(f).toMatch(/input\[type="checkbox"\]\[role="switch"\]:focus-visible \{ outline: 3px solid var\(--tl-ring\)/);
    expect(f).toMatch(/@media \(forced-colors: active\) \{ input\[type="checkbox"\]\[role="switch"\] \{ appearance: auto/);
    expect(f).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ input\[type="checkbox"\]\[role="switch"\] \{ transition: none; \} \}/);
    // The older 20-22 px checkbox sizes don't beat it.
    expect(css("src/features/timeline/timeline.css")).toMatch(/\.zoom-edit-row \.choice input:not\(\[role="switch"\]\)/);
  });
});
