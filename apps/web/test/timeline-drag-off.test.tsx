/** S7-20: bar dragging is switched off (BAR_DRAG_ENABLED in drag.ts is false): no drag by mouse or touch, no grips, tapping still selects. */
import { fireEvent, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import { BAR_DRAG_ENABLED } from "../src/features/timeline/drag";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import {
  SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_EVENTS, SAMPLE_SUBJECTS, samplePlans,
} from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

function stub() {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
  fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
  fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, SAMPLE_ASSIGNMENTS);
  fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
  fakeApi.on("GET /api/events", 200, SAMPLE_EVENTS);
  for (const a of SAMPLE_ASSIGNMENTS) fakeApi.on(`PATCH /api/assignments/${a.id}`, (body) => [200, { ...a, ...(body as object) }]);
}
const patches = () => fakeApi.calls.filter((c) => c.method === "PATCH");

/** Just inside the left end of the widest bar, in the picture's coordinates. */
function leftEnd(svg: Element) {
  const bands = [...svg.querySelectorAll("path.tl-band")].map((band) => {
    const nums = band.getAttribute("d")!.slice(1).split(/[ ,LCQVHZ]+/).filter(Boolean).map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0);
    return { band, x: nums[0]!, y: nums[1]!, width: Math.max(...xs) - Math.min(...xs) };
  });
  const widest = bands.reduce((a, b) => (b.width > a.width ? b : a));
  return { x: widest.x + 1, y: widest.y + 1, id: widest.band.getAttribute("data-assignment")! };
}

beforeAll(() => {
  if (typeof window.PointerEvent !== "undefined") return;
  class FakePointerEvent extends MouseEvent {
    pointerId: number; pointerType: string; isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? "mouse";
      this.isPrimary = init.isPrimary ?? true;
    }
  }
  window.PointerEvent = FakePointerEvent as unknown as typeof PointerEvent;
});
const pointer = (type: "mouse" | "touch") => ({ pointerId: 1, pointerType: type, isPrimary: true, button: 0 });

describe("bar dragging switched off (S7-20)", () => {
  it("the switch is off", () => {
    expect(BAR_DRAG_ENABLED).toBe(false);
  });

  it("a mouse or finger moving on a bar sends no PATCH and changes no dates; a tap selects; no grips, cursor or drag-ready scroll rule", async () => {
    stub();
    renderAt("/timeline");
    const svg = await screen.findByRole("img", { name: "Year timeline" });
    const stage = svg.closest(".tl-stage") as HTMLElement;
    const { x, y, id } = leftEnd(svg);
    const a = SAMPLE_ASSIGNMENTS.find((s) => s.id === id)!;
    for (const type of ["mouse", "touch"] as const) {
      fireEvent.pointerDown(svg, { ...pointer(type), clientX: x, clientY: y });
      fireEvent.pointerMove(stage, { ...pointer(type), clientX: x - 60, clientY: y });
      fireEvent.pointerUp(stage, { ...pointer(type), clientX: x - 60, clientY: y });
    }
    expect(patches()).toHaveLength(0);
    expect(stage.style.cursor).toBe("");
    expect(screen.queryByRole("region", { name: /^Edit / })).toBeNull(); // moving is not selecting
    fireEvent.click(svg, { clientX: x, clientY: y });
    expect(await screen.findByRole("region", { name: `Edit ${a.title}` })).toBeInTheDocument();
    expect(stage.hasAttribute("data-drag-ready")).toBe(false);
    expect(svg.querySelector(".tl-handle")).toBeNull();
    // Once selected, moving still does nothing (the dates change in the edit bar).
    fireEvent.pointerDown(svg, { ...pointer("touch"), clientX: x, clientY: y });
    fireEvent.pointerMove(stage, { ...pointer("touch"), clientX: x - 60, clientY: y });
    fireEvent.pointerUp(stage, { ...pointer("touch"), clientX: x - 60, clientY: y });
    expect(patches()).toHaveLength(0);
  });
});
