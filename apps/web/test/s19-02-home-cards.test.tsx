/** S19-02: on a wide Home, the Records card is as tall as the Schedule card. On a phone, each stays as tall as its content. */
import { readFileSync } from "node:fs";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HOME_PANES_QUERY } from "../src/features/home/HomePage";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

function width(wide: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === HOME_PANES_QUERY ? wide : false, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  }));
}

function stub(assignments: object[]) {
  fakeApi.on("GET /api/me", 200, { ...DEMO_ME, setupDeferred: [] });
  fakeApi.on("GET /api/children", 200, [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }]);
  fakeApi.on("GET /api/subjects", 200, [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false }]);
  fakeApi.on("GET /api/assignments", 200, assignments);
  fakeApi.on("GET /api/plan", 200, { engineVersion: "0", asOf: "2026-11-05", from: "2026-08-01", to: "2027-06-30", plans: [] });
}

describe("Home card heights (S19-02)", () => {
  const css = readFileSync("src/features/home/home.css", "utf8");
  const wide = css.slice(css.indexOf("@media (min-width: 840px)"));

  it("from 840 px the two cards share one stretched row, and under that each is only its content", () => {
    expect(wide).toMatch(/grid-template-rows: subgrid/);
    expect(wide).toMatch(/align-items: stretch/);
    expect(wide).toMatch(/\.home-pane > \.home-card \{[^}]*align-self: stretch/);
    expect(css.slice(0, css.indexOf("@media (min-width: 840px)"))).not.toMatch(/\.home-card \{[^}]*height:/);
  });

  it.each(["light", "dark"])("at a wide Home both cards are in that row, with or without assignments (%s)", async (theme) => {
    document.documentElement.dataset.theme = theme;
    width(true);
    stub([{ id: "ti", subjectId: "lit", title: "Treasure Island", startDate: "2026-09-07", endDate: "2026-12-18", childIds: ["c1"], archived: false }]);
    const widePage = renderAt("/");
    expect((await screen.findAllByRole("link", { name: "Schedule" })).length).toBeGreaterThan(0);
    const schedule = screen.getAllByRole("link", { name: "Schedule" }).map((el) => el.closest(".home-card")).find(Boolean);
    const records = screen.getAllByRole("link", { name: "Records" }).map((el) => el.closest(".home-card")).find(Boolean);
    expect(schedule?.parentElement).toHaveClass("home-pane-wide");
    expect(records?.parentElement).toHaveClass("home-pane-narrow");
    widePage.unmount();

    stub([]);
    renderAt("/");
    expect((await screen.findAllByRole("link", { name: "Schedule" })).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Records" }).length).toBeGreaterThan(0);
    document.documentElement.removeAttribute("data-theme");
  });

  it("at 390 px the cards stack and are not forced onto one row", async () => {
    width(false);
    stub([]);
    renderAt("/");
    expect((await screen.findAllByRole("link", { name: "Schedule" })).length).toBeGreaterThan(0);
    expect(document.querySelector(".home-panes")).toBeNull();
  });
});
