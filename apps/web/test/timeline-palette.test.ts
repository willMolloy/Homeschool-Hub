// T-01b: the helper that switches the subject palette attribute.
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_TIMELINE_PALETTE, applyTimelinePalette, currentTimelinePalette } from "@/lib/timelinePalette";
import { DEFAULT_PALETTE } from "../scripts/palette";

afterEach(() => applyTimelinePalette("safe"));

describe("timeline palette helper", () => {
  it("defaults to the colour-blind-safe palette with no attribute", () => {
    expect(DEFAULT_TIMELINE_PALETTE).toBe("safe");
    expect(DEFAULT_TIMELINE_PALETTE).toBe(DEFAULT_PALETTE);
    expect(document.documentElement.hasAttribute("data-palette")).toBe(false);
    expect(currentTimelinePalette()).toBe("safe");
  });

  it("sets and clears data-palette=\"vivid\" on the root", () => {
    applyTimelinePalette("vivid");
    expect(document.documentElement.getAttribute("data-palette")).toBe("vivid");
    expect(currentTimelinePalette()).toBe("vivid");
    applyTimelinePalette("safe");
    expect(document.documentElement.hasAttribute("data-palette")).toBe(false);
  });

  it("can target another element", () => {
    const el = document.createElement("div");
    applyTimelinePalette("vivid", el);
    expect(el.dataset.palette).toBe("vivid");
    expect(currentTimelinePalette(el)).toBe("vivid");
    expect(currentTimelinePalette()).toBe("safe");
  });
});
