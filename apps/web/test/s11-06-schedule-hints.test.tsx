// S11-06: three one-time hints on Schedule, one at a time, each with "Got it", stored on the family; "Show tips again" in Family settings.
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import type { TipId } from "../src/api/types";
import { EDIT_PANEL_QUERY } from "../src/features/timeline/EditBar";
import { TIP_TEXT, activeTip } from "../src/features/tips/tips";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { familyPatches, newFamily } from "./helpers/setup-flow";
import { SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_EVENTS, SAMPLE_SUBJECTS, samplePlans } from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

const BARS = TIP_TEXT.bars;
const EDIT = TIP_TEXT.edit;
const ICONS = TIP_TEXT.icons;

function stub(seen: TipId[] = []) {
  const f = newFamily({ setupDone: true, tipsSeen: seen });
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
  fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
  fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, SAMPLE_ASSIGNMENTS);
  fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
  fakeApi.on("GET /api/events", 200, SAMPLE_EVENTS);
  fakeApi.on("POST /api/plan/pace", (body) => [200, {
    paces: (body as { drafts: { childIds: string[] }[] }).drafts.map((d) => ({ capacityDays: 7, perChild: d.childIds.map((childId) => ({ childId, capacityDays: 7 })) })),
  }]);
  return f;
}
function width(wide: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === EDIT_PANEL_QUERY ? wide : false, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  }));
}
const tips = () => [...document.querySelectorAll("[data-tip]")].map((t) => t.querySelector(".tip-text")!.textContent);
const startOf = (band: Element) => band.getAttribute("d")!.slice(1).split(/[ ,LCQVHZ]+/).filter(Boolean).map(Number) as [number, number];
async function openYear() {
  renderAt("/schedule?view=year");
  const svg = await screen.findByRole("img", { name: "Year timeline" });
  const band = svg.querySelector("path.tl-band")!;
  const pick = () => { const [x, y] = startOf(band); fireEvent.click(svg, { clientX: x + 1, clientY: y + 1 }); };
  return { svg, pick };
}

describe("which hint, when (pure)", () => {
  const here = { bars: true, edit: false, icons: true };
  it("the bars come first, then the icons; an open bar is the edit hint's moment; seen hints never show", () => {
    expect(activeTip([], here)).toBe("bars");
    expect(activeTip(["bars"], here)).toBe("icons");
    expect(activeTip(["bars", "icons"], here)).toBeNull();
    expect(activeTip([], { ...here, edit: true })).toBe("edit");
    expect(activeTip(["edit"], { ...here, edit: true })).toBeNull();
    expect(activeTip([], { bars: false, edit: false, icons: false })).toBeNull();
  });
  it("the icons wait while the bars hint is still to come", () => {
    expect(activeTip([], { bars: false, edit: false, icons: true })).toBe("icons");
    expect(activeTip([], { bars: true, edit: false, icons: true })).toBe("bars");
  });
});

describe("the first time Year has bars", () => {
  it("shows the bars hint alone, as a status with a focusable Got it, and no overlay", async () => {
    stub();
    await openYear();
    await screen.findByText(BARS);
    expect(tips()).toEqual([BARS]);
    const bubble = document.querySelector("[data-tip]") as HTMLElement;
    expect(bubble).toHaveAttribute("role", "status");
    const gotIt = within(bubble).getByRole("button", { name: "Got it" });
    expect(gotIt).not.toHaveAttribute("tabindex", "-1");
    gotIt.focus();
    expect(gotIt).toHaveFocus();
    expect(document.querySelector("[role=dialog], .sheet-backdrop, dialog[open]")).toBeNull();
    // The bubble sits inside the timeline, under a bar, and does not take the picture's place.
    expect(bubble.closest(".tl-wrap")).not.toBeNull();
  });

  it("Got it saves it on the family; the icons hint follows, alone, then nothing; a reload shows none", async () => {
    const f = stub();
    const user = userEvent.setup();
    const first = await openYear();
    await screen.findByText(BARS);
    await user.click(screen.getByRole("button", { name: "Got it" }));
    expect(await screen.findByText(ICONS)).toBeInTheDocument();
    expect(tips()).toEqual([ICONS]);
    await user.click(screen.getByRole("button", { name: "Got it" }));
    await waitFor(() => expect(tips()).toEqual([]));
    expect(familyPatches()).toEqual([{ tipsSeen: ["bars"] }, { tipsSeen: ["bars", "icons"] }]);
    expect(f.me.tipsSeen).toEqual(["bars", "icons"]);
    first.svg.ownerDocument.body.innerHTML = "";
    await openYear();
    await new Promise((r) => setTimeout(r, 50));
    expect(tips()).toEqual([]);
  });

  it("never stacks: at every moment there is at most one hint on screen", async () => {
    stub();
    const user = userEvent.setup();
    const { pick } = await openYear();
    await screen.findByText(BARS);
    expect(tips()).toHaveLength(1);
    pick();
    await screen.findByText(EDIT);
    expect(tips()).toEqual([EDIT]);
    await user.click(screen.getByRole("button", { name: "Got it" }));
    await waitFor(() => expect(tips().length).toBeLessThanOrEqual(1));
    expect(document.querySelectorAll("[data-tip]").length).toBeLessThanOrEqual(1);
  });
});

describe("the first bar opened", () => {
  it("opening a bar shows the edit hint in the sheet, in place of the bars hint (which counts as seen)", async () => {
    const f = stub();
    width(false);
    const { pick } = await openYear();
    await screen.findByText(BARS);
    pick();
    const sheet = await screen.findByRole("region", { name: /^Edit / });
    expect(await within(sheet).findByText(EDIT)).toBeInTheDocument();
    expect(tips()).toEqual([EDIT]);
    expect(screen.queryByText(BARS)).toBeNull();
    await waitFor(() => expect(f.me.tipsSeen).toEqual(["bars"]));
  });

  it("Got it in the sheet keeps it from coming back; closing the bar then brings the icons hint, once", async () => {
    const f = stub();
    width(false);
    const user = userEvent.setup();
    const { pick } = await openYear();
    await screen.findByText(BARS);
    pick();
    const sheet = await screen.findByRole("region", { name: /^Edit / });
    await user.click(within(sheet).getByRole("button", { name: "Got it" }));
    await waitFor(() => expect(f.me.tipsSeen).toEqual(["bars", "edit"]));
    expect(screen.queryByText(EDIT)).toBeNull();
    await user.click(within(sheet).getByRole("button", { name: "Close" }));
    expect(await screen.findByText(ICONS)).toBeInTheDocument();
    pick();
    await screen.findByRole("region", { name: /^Edit / });
    expect(screen.queryByText(EDIT)).toBeNull();
  });

  it("from 840 px the hint is in the side panel", async () => {
    stub(["bars", "icons"]);
    width(true);
    const { pick } = await openYear();
    await new Promise((r) => setTimeout(r, 50));
    expect(tips()).toEqual([]);
    pick();
    const panel = await screen.findByRole("region", { name: /^Edit / });
    expect(panel).toHaveAttribute("data-panel");
    expect(await within(panel).findByText(EDIT)).toBeInTheDocument();
  });
});

describe("seen hints and other screens", () => {
  it("a family that has seen them all gets none", async () => {
    stub(["bars", "edit", "icons"]);
    const { pick } = await openYear();
    pick();
    await screen.findByRole("region", { name: /^Edit / });
    expect(tips()).toEqual([]);
  });

  it("Week shows no hint", async () => {
    stub();
    renderAt("/schedule?view=week");
    await screen.findByRole("heading", { name: "Schedule" });
    await new Promise((r) => setTimeout(r, 100));
    expect(tips()).toEqual([]);
  });
});

describe("Show tips again", () => {
  it("is in Family settings, clears what was seen, and the hints come back on Schedule", async () => {
    const f = stub(["bars", "edit", "icons"]);
    const user = userEvent.setup();
    const { router } = renderAt("/setup/settings");
    await user.click(await screen.findByRole("button", { name: "Show tips again" }));
    expect(await screen.findByText("The tips will show again on Schedule.")).toBeInTheDocument();
    expect(familyPatches()).toEqual([{ tipsSeen: [] }]);
    expect(f.me.tipsSeen).toEqual([]);
    await router.navigate("/schedule?view=year");
    expect(await screen.findByText(BARS)).toBeInTheDocument();
  });
});
