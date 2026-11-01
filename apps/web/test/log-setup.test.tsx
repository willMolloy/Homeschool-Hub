/** S9-03: Records asks a new family to set up its log (template styles, never a state), and the setup drives what is tracked. */
import { readFileSync } from "node:fs";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import type { FamilySettings, LogSetup, Subject } from "../src/api/types";
import { NO_FIELDS, TEMPLATES, setupOf, templateFor, toggleField, trackedWords } from "../src/features/records/logSetup";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const FAMILY: FamilySettings = { name: "Demo family", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false, zoomViews: { hidden: [], custom: [] }, logSetup: null };
const sub = (id: string, name: string, core = false): Subject => ({ id, name, color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null, core });
const SUBJECTS = [sub("math", "Math"), sub("art", "Art"), sub("hist", "History")];
const patches = (path: string) => fakeApi.calls.filter((c) => c.method === "PATCH" && c.path === path);

function stub(logSetup: LogSetup | null = null, subjects: Subject[] = SUBJECTS) {
  let family = { ...FAMILY, logSetup };
  fakeApi.on("GET /api/family", () => [200, family]);
  fakeApi.on("PATCH /api/family", (b) => { family = { ...family, ...(b as object) }; return [200, family]; });
  fakeApi.on("GET /api/subjects", 200, subjects);
  fakeApi.on("GET /api/children", 200, []);
  fakeApi.on("GET /api/log-entries", 200, []);
  fakeApi.on("GET /api/assignments", 200, []);
  fakeApi.on("GET /api/records/totals", 200, { from: null, to: null, childId: null, entries: 0, partialEntries: 0, schoolDays: 0, perChild: [], totalMinutes: 0, coreMinutes: 0, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0, books: [], bySubject: [] });
  for (const s of subjects) fakeApi.on(`PATCH /api/subjects/${s.id}`, (b) => [200, { ...s, ...(b as object) }]);
}
const open = async () => {
  const user = userEvent.setup();
  renderAt("/records");
  return user;
};
const switches = () => screen.getAllByRole("switch").map((s) => [s.closest("label")!.textContent!.replace(/Needs.*|One total.*/, ""), (s as HTMLInputElement).checked]);

beforeEach(() => stub());

describe("the helpers (pure)", () => {
  it("every template is a start: its switches round-trip to its own name", () => {
    expect(TEMPLATES.map((t) => t.title)).toEqual(["Hours by subject", "Core and non-core hours", "Days attended", "Days and hours", "Detailed log"]);
    for (const t of TEMPLATES) expect(templateFor(t.fields)).toBe(t.id);
    expect(templateFor({ ...NO_FIELDS, notes: true })).toBe("custom");
  });
  it("switches keep the rules: core needs subject hours; total hours replace subject hours", () => {
    const core = toggleField(NO_FIELDS, "coreSplit");
    expect(core).toMatchObject({ coreSplit: true, subjectHours: true });
    expect(toggleField(core, "subjectHours")).toMatchObject({ subjectHours: false, coreSplit: false });
    const total = toggleField(core, "totalHours");
    expect(total).toMatchObject({ totalHours: true, subjectHours: false, coreSplit: false });
    expect(toggleField(total, "subjectHours")).toMatchObject({ subjectHours: true, totalHours: false });
  });
  it("says what is tracked in the parent's words", () => {
    expect(trackedWords({ ...NO_FIELDS, subjectHours: true, schoolDays: true, notes: true })).toBe("Hours by subject, school days and notes");
    expect(trackedWords({ ...NO_FIELDS, subjectHours: true, coreSplit: true })).toBe("Core and non-core hours");
    expect(setupOf({ ...NO_FIELDS, schoolDays: true })).toEqual({ template: "daysAttended", fields: { ...NO_FIELDS, schoolDays: true } });
  });
});

describe("Log setup for a new family", () => {
  it("Records opens on 'Set up your log' with template styles, a help line and a link, and never names a state", async () => {
    await open();
    expect(await screen.findByRole("heading", { level: 1, name: "Set up your log" })).toBeInTheDocument();
    const styles = within(screen.getByRole("group", { name: "Start from a style" }));
    expect(styles.getAllByRole("radio").map((r) => r.closest("label")!.textContent!.split(/(?<=[a-z])(?=[A-Z])/)[0])).toHaveLength(5);
    for (const name of ["Hours by subject", "Core and non-core hours", "Days attended", "Days and hours", "Detailed log"]) expect(styles.getByRole("radio", { name: new RegExp(`^${name}`) })).not.toBeChecked();
    expect(screen.getByText(/Not sure which fits\? Your state's rules decide what to keep\./)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /state's homeschool laws/ });
    expect(link).toHaveAttribute("href", "https://hslda.org/legal");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
    const states = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"];
    for (const s of states) expect(document.body.textContent).not.toContain(s);
    expect(screen.queryByRole("switch")).toBeNull(); // nothing to adjust until a style is picked
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("each template sets the right switches, and a switch changes them", async () => {
    const user = await open();
    const want: Record<string, string[]> = {
      "Hours by subject": ["Hours by subject"],
      "Core and non-core hours": ["Hours by subject", "Core and non-core hours"],
      "Days attended": ["School days"],
      "Days and hours": ["Total hours", "School days"],
      "Detailed log": ["Hours by subject", "Notes", "Books read"],
    };
    for (const [name, on] of Object.entries(want)) {
      await user.click(await screen.findByRole("radio", { name: new RegExp(`^${name}`) }));
      expect(switches().filter(([, c]) => c).map(([l]) => l).sort()).toEqual([...on].sort());
    }
    await user.click(screen.getByRole("switch", { name: /Notes/ }));
    expect(screen.getByRole("radio", { name: /Detailed log/ })).not.toBeChecked(); // now its own mix
    expect(screen.getByRole("switch", { name: /Notes/ })).not.toBeChecked();
  });

  it("a new family picks Core and non-core hours, marks Math core and Art non-core, and saves exactly that", async () => {
    const user = await open();
    await user.click(await screen.findByRole("radio", { name: /Core and non-core hours/ }));
    const core = screen.getByRole("group", { name: "Which subjects are core?" });
    expect(within(core).getAllByRole("group").map((g) => g.getAttribute("aria-label"))).toEqual(["Math is", "Art is", "History is"]);
    await user.click(within(within(core).getByRole("group", { name: "Math is" })).getByRole("button", { name: "Core" }));
    await user.click(within(within(core).getByRole("group", { name: "Art is" })).getByRole("button", { name: "Non-core" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(patches("/api/family")).toHaveLength(1));
    expect(patches("/api/family")[0]!.body).toEqual({ logSetup: { template: "coreNonCore", fields: { ...NO_FIELDS, subjectHours: true, coreSplit: true } } });
    // Only Math changed (Art was already non-core), and nothing else was written.
    await waitFor(() => expect(patches("/api/subjects/math")).toHaveLength(1));
    expect(patches("/api/subjects/math")[0]!.body).toEqual({ core: true });
    expect(patches("/api/subjects/art")).toHaveLength(0);
    expect(patches("/api/subjects/hist")).toHaveLength(0);
    expect(await screen.findByRole("heading", { level: 1, name: "Records" })).toBeInTheDocument();
    expect(screen.getByText("Core and non-core hours")).toBeInTheDocument();
  });

  it("without core and non-core hours, no subject is written", async () => {
    const user = await open();
    await user.click(await screen.findByRole("radio", { name: /Days attended/ }));
    expect(screen.queryByRole("group", { name: "Which subjects are core?" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(patches("/api/family")).toHaveLength(1));
    expect(fakeApi.calls.some((c) => c.path.startsWith("/api/subjects/"))).toBe(false);
  });

  it("turning everything off cannot be saved, and says why", async () => {
    const user = await open();
    await user.click(await screen.findByRole("radio", { name: /Days attended/ }));
    await user.click(screen.getByRole("switch", { name: /School days/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("Pick at least one thing to track.");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("shows the API's message and keeps the form when Save fails", async () => {
    const user = await open();
    fakeApi.on("PATCH /api/family", 400, { error: "invalid_request", message: "logSetup.fields: Pick at least one thing to track." });
    await user.click(await screen.findByRole("radio", { name: /^Hours by subject/ }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Pick at least one thing to track.")).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Log setup" })).toBeInTheDocument();
  });
});

describe("changing the setup later", () => {
  const SETUP: LogSetup = { template: "coreNonCore", fields: { ...NO_FIELDS, subjectHours: true, coreSplit: true } };

  it("a family with a setup sees what it tracks, and Change log setup opens the form on it", async () => {
    stub(SETUP, [sub("math", "Math", true), sub("art", "Art")]);
    const user = await open();
    expect(await screen.findByText("Core and non-core hours")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Set up your log" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Change log setup" }));
    expect(screen.getByRole("radio", { name: /Core and non-core hours/ })).toBeChecked();
    const core = screen.getByRole("group", { name: "Which subjects are core?" });
    expect(within(within(core).getByRole("group", { name: "Math is" })).getByRole("button", { name: "Core" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Change log setup" })).toBeInTheDocument();
    expect(fakeApi.calls.some((c) => c.method === "PATCH")).toBe(false);
  });

  it("turning core and non-core hours off and on again keeps the subjects' marks (nothing is lost)", async () => {
    stub(SETUP, [sub("math", "Math", true), sub("art", "Art")]);
    const user = await open();
    await user.click(await screen.findByRole("button", { name: "Change log setup" }));
    await user.click(screen.getByRole("switch", { name: /Core and non-core hours/ }));
    expect(screen.queryByRole("group", { name: "Which subjects are core?" })).toBeNull();
    await user.click(screen.getByRole("switch", { name: /Core and non-core hours/ }));
    const core = screen.getByRole("group", { name: "Which subjects are core?" });
    expect(within(within(core).getByRole("group", { name: "Math is" })).getByRole("button", { name: "Core" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("the subject form", () => {
  it("has a Core subject switch that is sent only when it is changed", async () => {
    fakeApi.on("GET /api/subjects", 200, [sub("math", "Math", false)]);
    fakeApi.on("GET /api/assignments", 200, []);
    fakeApi.on("PATCH /api/subjects/math", (b) => [200, { ...sub("math", "Math"), ...(b as object) }]);
    const user = userEvent.setup();
    renderAt("/setup/subjects");
    await user.click(await screen.findByRole("button", { name: /Edit Math|Math/ }));
    const form = await screen.findByRole("form", { name: /Math/ });
    const core = within(form).getByRole("switch", { name: /Core subject/ });
    expect(core).not.toBeChecked();
    await user.click(core);
    await user.click(within(form).getByRole("button", { name: /Save/ }));
    await waitFor(() => expect(patches("/api/subjects/math")).toHaveLength(1));
    expect(patches("/api/subjects/math")[0]!.body).toEqual({ core: true });
  });
});

describe("a phone at 360 px", () => {
  it("every choice and switch is a 44 px target", () => {
    const css = readFileSync("src/features/records/records.css", "utf8");
    expect(css).toMatch(/\.choice-card \{[^}]*min-height: 44px/);
    expect(css).toMatch(/\.choice-row \{[^}]*min-height: 44px/);
    expect(css).toMatch(/\.log-core-row \.segmented/);
    expect(DEMO_ME.name).toBeTruthy();
  });
});
