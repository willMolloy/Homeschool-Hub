/** S7b-14 (F-04): the undo bar steps aside while a menu or sheet is open, so it never covers one, and comes back after. */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_EVENTS, SAMPLE_SUBJECTS, samplePlans } from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

const TI = SAMPLE_ASSIGNMENTS.find((a) => a.id === "ti")!;

async function selectTiWithUndoOffered() {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
  fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
  fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, SAMPLE_ASSIGNMENTS);
  fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
  fakeApi.on("GET /api/events", 200, SAMPLE_EVENTS);
  fakeApi.on("GET /api/undo", 200, { label: "Moved Treasure Island", createdAt: "2026-10-28T15:00:00.000Z" });
  fakeApi.on("PATCH /api/assignments/ti", (body) => [200, { ...TI, ...(body as object) }]);
  renderAt("/timeline");
  const svg = await screen.findByRole("img", { name: "Year timeline" });
  const [x, y] = svg.querySelector('path.tl-band[data-assignment="ti"]')!.getAttribute("d")!.slice(1).split(/[ ,LCQVHZ]+/).filter(Boolean).map(Number);
  fireEvent.click(svg, { clientX: x! + 1, clientY: y! + 1 });
  const edit = await screen.findByRole("region", { name: /^Edit / });
  // A change makes the API offer an undo.
  fireEvent.change(within(edit).getByLabelText("End"), { target: { value: "2026-11-30" } });
  expect(await screen.findByText("Moved Treasure Island.")).toBeInTheDocument();
  return edit;
}

describe("the undo bar and open menus (S7b-14)", () => {
  it("hides while the More menu is open and is back once it is closed", async () => {
    const edit = await selectTiWithUndoOffered();
    await userEvent.click(within(edit).getByRole("button", { name: "More" }));
    await waitFor(() => expect(screen.queryByText("Moved Treasure Island.")).toBeNull());
    expect(within(edit).getByRole("button", { name: "Update time estimate" })).toBeEnabled(); // nothing covers it
    await userEvent.keyboard("{Escape}");
    expect(await screen.findByText("Moved Treasure Island.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  });

  it("hides while a sheet is open and is back after it closes", async () => {
    const edit = await selectTiWithUndoOffered();
    await userEvent.click(within(edit).getByRole("button", { name: "More" }));
    await userEvent.click(within(edit).getByRole("button", { name: "Update time estimate" }));
    const sheet = await screen.findByRole("dialog");
    expect(screen.queryByText("Moved Treasure Island.")).toBeNull();
    await userEvent.click(within(sheet).getByRole("button", { name: "Cancel" }));
    expect(await screen.findByText("Moved Treasure Island.")).toBeInTheDocument();
  });
});
