/** T-05c: This month, and detail that follows the visible span (zoom.ts, smooth.ts, paths.ts, layout.ts, MonthNav). */
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import { layoutTimeline, smoothColumns } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import { smoothBandPath } from "../src/features/timeline/paths";
import { SMOOTH_WINDOW_DAYS, smoothSeries } from "../src/features/timeline/smooth";
import { makeXScale } from "../src/features/timeline/xscale";
import {
  DETAIL_HYSTERESIS_WEEKS, DETAIL_SPAN_WEEKS, defaultMonth, detailForSpan, gridMonths, spanWeeks, zoomRange, ZOOMS,
} from "../src/features/timeline/zoom";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import {
  SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_EVENTS, SAMPLE_SUBJECTS, sampleInput, samplePlans,
} from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

const model = buildTimelineModel(sampleInput({ today: DEMO_ME.today, events: SAMPLE_EVENTS }));

describe("detail follows the visible span, with one threshold", () => {
  it("is daily at DETAIL_SPAN_WEEKS or less and smooth above, with hysteresis on the way out", () => {
    expect(DETAIL_SPAN_WEEKS).toBe(8);
    expect(detailForSpan(4)).toBe("daily");
    expect(detailForSpan(8)).toBe("daily");
    expect(detailForSpan(8.5)).toBe("smooth");
    expect(detailForSpan(8.5, "daily")).toBe("daily");
    expect(detailForSpan(DETAIL_SPAN_WEEKS + DETAIL_HYSTERESIS_WEEKS, "daily")).toBe("daily");
    expect(detailForSpan(DETAIL_SPAN_WEEKS + DETAIL_HYSTERESIS_WEEKS + 0.2, "daily")).toBe("smooth");
    expect(detailForSpan(8.5, "smooth")).toBe("smooth");
  });

  it("follows the span, not the preset: This month is daily, Year, Fall and Spring are smooth", () => {
    const by = Object.fromEntries(ZOOMS.map((zoom) => [zoom, layoutTimeline(model, { zoom, width: 390 })]));
    expect(by.month!.detail).toBe("daily");
    expect(by.month!.spanWeeks).toBeLessThanOrEqual(DETAIL_SPAN_WEEKS);
    for (const z of ["year", "fall", "spring"] as const) {
      expect(by[z]!.spanWeeks).toBeGreaterThan(DETAIL_SPAN_WEEKS);
      expect(by[z]!.detail).toBe("smooth");
    }
    expect(layoutTimeline(model, { zoom: "fall", width: 390, previousDetail: "daily" }).detail).toBe("smooth");
  });

  it("measures the span in calendar weeks", () => {
    expect(spanWeeks({ dates: ["2026-10-01", "2026-10-02", "2026-10-14"] }, [0, 2])).toBe(2);
    expect(spanWeeks({ dates: [] }, null)).toBe(0);
  });
});

describe("This month", () => {
  it("is the calendar month holding today, clamped to the grid", () => {
    expect(defaultMonth(model)).toBe("2026-10");
    const months = gridMonths(model);
    expect(defaultMonth({ dates: model.dates, today: "2020-01-01" })).toBe(months[0]);
    expect(defaultMonth({ dates: model.dates, today: "2099-01-01" })).toBe(months.at(-1));
    expect(defaultMonth({ dates: [], today: "2026-10-28" })).toBeNull();
  });

  it("covers exactly that month's days", () => {
    const [a, b] = zoomRange(model, "month", "2026-11")!;
    expect(model.dates[a]).toBe("2026-11-01");
    expect(model.dates[b]).toBe("2026-11-30");
    expect(model.dates[a - 1]).toBe("2026-10-31");
  });

  it("draws events, hatched breaks and dated week lines; zoomed out has none of them", () => {
    const month = layoutTimeline(model, { zoom: "month", width: 390, month: "2026-11" });
    expect(month.events.length).toBe(SAMPLE_EVENTS.length);
    expect(month.ticks.some((t) => t.kind === "week" && t.label)).toBe(true);
    const year = layoutTimeline(model, { zoom: "year", width: 390 });
    expect(year.events).toHaveLength(0);
    expect(year.ticks.every((t) => t.kind === "month")).toBe(true);
    expect(year.lanesTop).toBeLessThan(month.lanesTop);
  });
});

describe("smooth mode", () => {
  const cols = Array.from({ length: 40 }, (_, i) => i);

  it("averages over about three weeks and keeps each assignment's start and end", () => {
    expect(SMOOTH_WINDOW_DAYS).toBeGreaterThanOrEqual(15);
    expect(SMOOTH_WINDOW_DAYS).toBeLessThanOrEqual(20);
    const s = [...Array(5).fill(0), ...Array.from({ length: 20 }, (_, i) => (i % 2 ? 10 : 2)), ...Array(15).fill(0)];
    const out = smoothSeries(s, cols);
    expect(out.findIndex((v) => v > 0)).toBe(5);
    expect(out.length - 1 - [...out].reverse().findIndex((v) => v > 0)).toBe(24);
    for (let i = 8; i < 22; i++) expect(Math.abs(out[i]! - 6)).toBeLessThan(1);
  });

  it("bridges short gaps but keeps a week off as a gap", () => {
    const short = smoothSeries([4, 4, 0, 0, 4, 4], cols.slice(0, 6));
    expect(short.every((v) => v > 0)).toBe(true);
    const long = smoothSeries([4, 4, 0, 0, 0, 0, 0, 4, 4], cols.slice(0, 9));
    expect(long.slice(2, 7)).toEqual([0, 0, 0, 0, 0]);
  });

  it("rounds to even pixels, ignores changes under the dead band, and eases real changes without overshoot", () => {
    const xs = makeXScale(model, 0, 39, 0, 400);
    const wobble = model.dates.map((_, i) => (i < 40 && model.schoolDay[i] ? 3 + (i % 3) * 0.13 : 0));
    const flat = smoothColumns(wobble, xs, 50, 2.8, 40).filter((c) => c);
    expect(new Set(flat.map((c) => c!.bottom - c!.top)).size).toBe(1);
    expect(smoothBandPath(flat)).not.toMatch(/C/);
    const series = model.dates.map((_, i) => (i < 40 && model.schoolDay[i] ? (i < 20 ? 3 : 7) : 0));
    const columns = smoothColumns(series, xs, 50, 2.8, 40).filter((c) => c);
    for (const c of columns) expect((c!.bottom - c!.top) % 2).toBe(0);
    const d = smoothBandPath(smoothColumns(series, xs, 50, 2.8, 40));
    expect(d).toMatch(/C/);
    const y = [...d.matchAll(/,(-?[\d.]+)/g)].map((m) => Number(m[1]));
    const tops = columns.map((c) => c!.top);
    const bottoms = columns.map((c) => c!.bottom);
    expect(Math.min(...y)).toBeGreaterThanOrEqual(Math.min(...tops) - 0.01);
    expect(Math.max(...y)).toBeLessThanOrEqual(Math.max(...bottoms) + 0.01);
  });

  it("the All subjects bar follows the same rule", () => {
    expect(layoutTimeline(model, { zoom: "year", width: 390 }).totals.d).toMatch(/C/);
    expect(layoutTimeline(model, { zoom: "month", width: 390 }).totals.d).not.toMatch(/C/);
  });

  it("phones show fewer month labels, never closer than 48 px", () => {
    const phone = layoutTimeline(model, { zoom: "year", width: 390 }).ticks.filter((t) => t.label);
    const desk = layoutTimeline(model, { zoom: "year", width: 1280 }).ticks.filter((t) => t.label);
    expect(phone.length).toBeLessThan(desk.length);
    phone.slice(1).forEach((t, i) => expect(t.x - phone[i]!.x).toBeGreaterThanOrEqual(48));
  });
});

describe("This month on the page", () => {
  function stub() {
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
    fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
    fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
    fakeApi.on("GET /api/assignments", 200, SAMPLE_ASSIGNMENTS);
    fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
    fakeApi.on("GET /api/events", 200, SAMPLE_EVENTS);
  }
  const zoom = () => screen.getByRole("group", { name: "Zoom" });

  it("jumps to today's month, flips with ‹ ›, and shows the month row only with This month", async () => {
    stub();
    renderAt("/timeline");
    await screen.findByRole("img", { name: "Year timeline" });
    expect(screen.queryByRole("button", { name: "Next month" })).toBeNull();
    await userEvent.click(within(zoom()).getByRole("button", { name: "This month" }));
    const svg = await screen.findByRole("img", { name: "October 2026 timeline" });
    expect(svg.querySelectorAll("path.tl-event").length).toBeGreaterThan(0);
    expect(screen.getByText("October 2026")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(await screen.findByRole("img", { name: "November 2026 timeline" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Previous month" }));
    await userEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(await screen.findByRole("img", { name: "September 2026 timeline" })).toBeInTheDocument();
    await userEvent.click(within(zoom()).getByRole("button", { name: "Year" }));
    await screen.findByRole("img", { name: "Year timeline" });
    expect(screen.queryByRole("button", { name: "Previous month" })).toBeNull();
  });

  it("disables ‹ at the first month of the grid", async () => {
    stub();
    renderAt("/timeline");
    await screen.findByRole("img", { name: "Year timeline" });
    await userEvent.click(within(zoom()).getByRole("button", { name: "This month" }));
    const first = gridMonths(model)[0]!;
    const steps = gridMonths(model).indexOf("2026-10") - gridMonths(model).indexOf(first);
    for (let i = 0; i < steps; i++) await userEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next month" })).toBeEnabled();
  });
});
