// S10-12: the Subjects screen cleanup: twelve small swatches with a tick and "used by" names, no colour dot, a switch.
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PALETTE, usedByNames } from "../src/features/roster/palette";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const MATH = { id: "s1", name: "Math", color: "#2f8f6f", sortOrder: 0, archived: false };
const ART = { id: "s2", name: "Art", color: "#5c8a2f", sortOrder: 1, archived: false }; // an older green: drawn (and counted) as mint
const READING = { id: "s3", name: "Reading", color: "#7a5cc2", sortOrder: 2, archived: false };
const OLD_LATIN = { id: "s4", name: "Old Latin", color: "#b0482f", sortOrder: 3, archived: true };

async function setup(rows: unknown[] = [MATH, ART, READING]) {
  fakeApi.on("GET /api/subjects", 200, rows);
  fakeApi.on("GET /api/subjects?includeArchived=true", 200, [...rows, OLD_LATIN]);
  fakeApi.on("PATCH /api/subjects/s2", (body: unknown) => [200, { ...ART, ...(body as object) }] as [number, unknown]);
  const user = userEvent.setup();
  renderAt("/subjects");
  await screen.findByRole("list", { name: "Subjects" });
  return user;
}

describe("S10-12: the subject's swatch row", () => {
  it("shows all twelve swatches as radios, the chosen one ticked", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /^Reading/ }));
    const form = screen.getByRole("form", { name: "Edit Reading" });
    const radios = within(within(form).getByRole("group", { name: "Color" })).getAllByRole("radio");
    expect(radios).toHaveLength(12);
    expect(radios.map((r) => (r as HTMLInputElement).value)).toEqual([...PALETTE]);
    const chosen = radios.filter((r) => (r as HTMLInputElement).checked);
    expect(chosen).toHaveLength(1);
    expect(chosen[0]).toHaveAccessibleName("Lilac");
    // The tick is drawn only in the chosen chip.
    const ticks = form.querySelectorAll(".swatch-chip svg");
    expect(ticks).toHaveLength(1);
    expect(ticks[0]!.closest("label")!.querySelector("input")).toBe(chosen[0]);
  });

  it("names a colour another active subject uses ('Mint, used by Math and Art'), never the subject's own or an archived one's", async () => {
    const user = await setup();
    await user.click(screen.getByLabelText("Show archived"));
    await screen.findByText("Old Latin");
    await user.click(screen.getByRole("button", { name: /^Reading/ }));
    const form = screen.getByRole("form", { name: "Edit Reading" });
    expect(within(form).getByRole("radio", { name: "Mint, used by Math and Art" })).toBeInTheDocument();
    expect(within(form).getByRole("radio", { name: "Lilac" })).toBeChecked(); // its own colour isn't "used"
    expect(within(form).getByRole("radio", { name: "Coral" })).toBeInTheDocument(); // archived Old Latin doesn't count
    expect(within(form).getByRole("radio", { name: "Mint, used by Math and Art" }).nextElementSibling).toHaveClass("is-used");
  });

  it("the Add form names every active subject's colour", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Add subject" }));
    const form = screen.getByRole("form", { name: "Add subject" });
    expect(within(form).getByRole("radio", { name: "Lilac, used by Reading" })).toBeInTheDocument();
    // A new subject starts on a colour nobody uses.
    const checked = within(form).getAllByRole("radio").find((r) => (r as HTMLInputElement).checked)!;
    expect(checked.getAttribute("aria-label")).not.toMatch(/used by/);
  });

  it("saving a new colour sends it", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /^Art/ }));
    await user.click(screen.getByRole("radio", { name: "Coral" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByRole("button", { name: /^Art/ });
    expect(fakeApi.calls.at(-1)).toMatchObject({ method: "PATCH", path: "/api/subjects/s2", body: { color: "#b0482f" } });
  });

  it("each swatch is a 44 px target", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const css = readFileSync(join(process.cwd(), "src/features/roster/roster.css"), "utf8");
    expect(css).toMatch(/\.swatch \{[^}]*width: 44px;[^}]*height: 44px;/);
  });
});

describe("S10-12: the Subjects list", () => {
  it("shows no colour dot (the icon badge carries the colour)", async () => {
    await setup();
    const list = screen.getByRole("list", { name: "Subjects" });
    expect(list.querySelectorAll(".color-dot")).toHaveLength(0);
    expect(list.querySelectorAll(".subject-badge")).toHaveLength(3);
  });

  it("children keep their dot (they have no badge)", async () => {
    fakeApi.on("GET /api/children", 200, [{ id: "c1", name: "Frank", color: "#2f6fb0", sortOrder: 0, archived: false }]);
    renderAt("/kids");
    const list = await screen.findByRole("list", { name: "Children" });
    expect(list.querySelectorAll(".color-dot")).toHaveLength(1);
  });

  it("'Show archived' is a switch that toggles archived rows", async () => {
    const user = await setup();
    const sw = screen.getByRole("switch", { name: "Show archived" });
    expect(sw).not.toBeChecked();
    await user.click(sw);
    expect(await screen.findByText("Old Latin")).toBeInTheDocument();
    expect(sw).toBeChecked();
    await user.click(sw);
    await screen.findByRole("list", { name: "Subjects" });
    expect(screen.queryByText("Old Latin")).toBeNull();
  });
});

describe("S10-12: usedByNames", () => {
  it("groups active items by the swatch they're drawn as, leaving out one id", () => {
    expect(usedByNames([MATH, ART, READING, OLD_LATIN])).toEqual({ "#2f8f6f": "Math and Art", "#7a5cc2": "Reading" });
    expect(usedByNames([MATH, ART, READING], "s1")).toEqual({ "#2f8f6f": "Art", "#7a5cc2": "Reading" });
    expect(usedByNames([{ id: "x", name: "X", color: null }])).toEqual({});
  });
});
