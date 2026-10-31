/** S6-10: Heavier / Lighter on the timeline's edit bar. */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, MAX_WEIGHT_PER_UNIT, MIN_WEIGHT_PER_UNIT } from "@hh/engine";
import type { Assignment, Subject } from "../src/api/types";
import { nudgedWeight } from "../src/features/timeline/nudge";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_EVENTS, SAMPLE_SUBJECTS, samplePlans } from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

const TI = SAMPLE_ASSIGNMENTS.find((a) => a.id === "ti")!;
const patches = () => fakeApi.calls.filter((c) => c.method === "PATCH");
const planGets = () => fakeApi.calls.filter((c) => c.method === "GET" && c.path.startsWith("/api/plan")).length;

function stub(over: Partial<Assignment>, subjects: Subject[] = SAMPLE_SUBJECTS) {
  const ti = { ...TI, ...over };
  const all = SAMPLE_ASSIGNMENTS.map((a) => (a.id === "ti" ? ti : a));
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
  fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
  fakeApi.on("GET /api/subjects", 200, subjects);
  fakeApi.on("GET /api/assignments", 200, all);
  fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
  fakeApi.on("GET /api/events", 200, SAMPLE_EVENTS);
  fakeApi.on("PATCH /api/assignments/ti", (body) => [200, { ...ti, ...(body as Partial<Assignment>) }]);
  return ti;
}
async function selectTi() {
  renderAt("/timeline");
  const svg = await screen.findByRole("img", { name: "Year timeline" });
  const band = svg.querySelector('path.tl-band[data-assignment="ti"]')!;
  const [x, y] = band.getAttribute("d")!.slice(1).split(/[ ,LCQVHZ]+/).filter(Boolean).map(Number);
  fireEvent.click(svg, { clientX: x! + 1, clientY: y! + 1 });
  const edit = await screen.findByRole("region", { name: /^Edit / });
  // S6b-05: Heavier and Lighter live behind More (the menu stays open between nudges).
  await userEvent.click(within(edit).getByRole("button", { name: "More" }));
  return edit;
}

describe("nudgedWeight", () => {
  it("is × 1.25 or × 0.8, rounded to two decimals", () => {
    expect(nudgedWeight(2, "heavier")).toBe(2.5);
    expect(nudgedWeight(2, "lighter")).toBe(1.6);
    expect(nudgedWeight(2.5, "heavier")).toBe(3.13);
    expect(nudgedWeight(1, "lighter")).toBe(0.8);
  });
  it("twice heavier is about 1.56 times", () => {
    expect(nudgedWeight(nudgedWeight(8, "heavier"), "heavier") / 8).toBeCloseTo(1.5625, 2);
  });
  it("stays inside the limits", () => {
    expect(nudgedWeight(90, "heavier")).toBe(MAX_WEIGHT_PER_UNIT);
    expect(nudgedWeight(MAX_WEIGHT_PER_UNIT, "heavier")).toBe(MAX_WEIGHT_PER_UNIT);
    expect(nudgedWeight(MIN_WEIGHT_PER_UNIT, "lighter")).toBe(MIN_WEIGHT_PER_UNIT);
  });
  it("a very light weight still moves", () => {
    expect(nudgedWeight(0.01, "heavier")).toBe(0.02);
    expect(nudgedWeight(0.02, "lighter")).toBe(0.01);
    expect(nudgedWeight(99.99, "lighter")).toBe(79.99);
  });
});

describe("Heavier and Lighter on the edit bar", () => {
  it("only show with a bar selected", async () => {
    stub({ weightPerUnit: 2 });
    renderAt("/timeline");
    await screen.findByRole("img", { name: "Year timeline" });
    expect(screen.queryByRole("button", { name: "Heavier" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Lighter" })).toBeNull();
  });

  it("Heavier PATCHes just weightPerUnit × 1.25 and the plan reloads; again compounds to about 1.56 times", async () => {
    stub({ weightPerUnit: 8 });
    const user = userEvent.setup();
    const bar = await selectTi();
    const before = planGets();
    await user.click(within(bar).getByRole("button", { name: "Heavier" }));
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]).toMatchObject({ path: "/api/assignments/ti", body: { weightPerUnit: 10 } });
    await waitFor(() => expect(planGets()).toBeGreaterThan(before));
    await user.click(within(bar).getByRole("button", { name: "Heavier" }));
    await waitFor(() => expect(patches()).toHaveLength(2));
    expect(patches()[1]!.body).toEqual({ weightPerUnit: 12.5 });
  });

  it("Lighter sends × 0.8", async () => {
    stub({ weightPerUnit: 5 });
    const user = userEvent.setup();
    const bar = await selectTi();
    await user.click(within(bar).getByRole("button", { name: "Lighter" }));
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]!.body).toEqual({ weightPerUnit: 4 });
  });

  it("starts from the subject's default when the assignment has no weight of its own", async () => {
    const subjects = SAMPLE_SUBJECTS.map((s) => (s.id === TI.subjectId ? { ...s, defaultWeight: { unitType: TI.unitType, weightPerUnit: 4 } } : s));
    stub({ weightPerUnit: null }, subjects);
    const user = userEvent.setup();
    const bar = await selectTi();
    await user.click(within(bar).getByRole("button", { name: "Heavier" }));
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]!.body).toEqual({ weightPerUnit: 5 });
  });

  it("starts from the built-in when nothing else sets a weight", async () => {
    stub({ weightPerUnit: null, unitType: "pages" });
    const user = userEvent.setup();
    const bar = await selectTi();
    await user.click(within(bar).getByRole("button", { name: "Heavier" }));
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]!.body).toEqual({ weightPerUnit: 1.25 });
  });

  it("clamps at 100 and disables Heavier there; Lighter likewise at 0.01", async () => {
    stub({ weightPerUnit: 90 });
    const user = userEvent.setup();
    const bar = await selectTi();
    await user.click(within(bar).getByRole("button", { name: "Heavier" }));
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]!.body).toEqual({ weightPerUnit: 100 });
    await waitFor(() => expect(within(bar).getByRole("button", { name: "Heavier" })).toBeDisabled());
    expect(within(bar).getByRole("button", { name: "Lighter" })).toBeEnabled();
  });

  it("Lighter is disabled at the minimum weight", async () => {
    stub({ weightPerUnit: 0.01 });
    const bar = await selectTi();
    expect(within(bar).getByRole("button", { name: "Lighter" })).toBeDisabled();
    expect(within(bar).getByRole("button", { name: "Heavier" })).toBeEnabled();
  });

  it("a refused save shows its message in the bar", async () => {
    stub({ weightPerUnit: 2 });
    fakeApi.on("PATCH /api/assignments/ti", 400, { error: "invalid_request", message: "Nope." });
    const user = userEvent.setup();
    const bar = await selectTi();
    await user.click(within(bar).getByRole("button", { name: "Heavier" }));
    expect(await within(bar).findByRole("alert")).toHaveTextContent("Nope.");
  });

  it("the nudge can be undone from the undo bar", async () => {
    stub({ weightPerUnit: 2 });
    fakeApi.on("GET /api/undo", 200, { label: "Changed the weight of Treasure Island", createdAt: "2026-10-28T15:00:00.000Z" });
    fakeApi.on("POST /api/undo", 200, { label: "x" });
    const user = userEvent.setup();
    const bar = await selectTi();
    await user.click(within(bar).getByRole("button", { name: "Lighter" }));
    expect(await screen.findByText("Changed the weight of Treasure Island.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(fakeApi.calls.filter((c) => c.method === "POST" && c.path === "/api/undo")).toHaveLength(1));
  });
});
