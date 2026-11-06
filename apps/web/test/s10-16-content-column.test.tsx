/** S10-16: a centred content column (640 px) with 480 px forms; the Year timeline uncapped; forms in one column (only
 *  start / end date pairs side by side); L5: the Add sheet's Unit chips and its preselected subject; R3: a chip name never wraps. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import type { Assignment } from "../src/api/types";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_SUBJECTS, samplePlans } from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

const css = (p: string) => readFileSync(join(process.cwd(), "src", p), "utf8");
const rule = (text: string, selector: string) => {
  const at = text.indexOf(`${selector} {`);
  return at < 0 ? "" : text.slice(at, text.indexOf("}", at));
};

function stub() {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
  fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
  fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, SAMPLE_ASSIGNMENTS);
  fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
  fakeApi.on("GET /api/events", 200, []);
  fakeApi.on("POST /api/assignments", (body) => [201, { ...(body as Assignment), id: "new1", archived: false }]);
}

describe("S10-16: width tokens", () => {
  const shell = css("layout/app-shell.css");
  it("pages are capped at --content-max (640 px) and centred, with 24 px margins from 600 px", () => {
    expect(shell).toMatch(/--content-max: 640px;/);
    expect(shell).toMatch(/--form-max: 480px;/);
    const main = rule(shell, ".shell-main");
    expect(main).toMatch(/max-width: calc\(var\(--content-max\) \+ 2 \* var\(--page-pad\)\);/);
    expect(main).toMatch(/margin: 0 auto;/);
    expect(shell).toMatch(/@media \(min-width: 600px\) \{\s*:root \{[^}]*--page-pad: 24px;/);
    // At 390 nothing changes: 20 px margins, and 640 + 40 is wider than any phone.
    expect(shell).toMatch(/--page-pad: 20px;/);
    expect(shell).not.toMatch(/max-width: 960px/);
  });

  it("Schedule · Year is not capped; Week is", () => {
    expect(rule(shell, '.shell-main:has(.schedule-page[data-view="year"])')).toMatch(/max-width: none;/);
    expect(shell).not.toMatch(/data-view="week"/);
  });

  it("forms, stand-alone button rows and segmented controls are at most --form-max", () => {
    const forms = css("ui/forms.css");
    const cap = rule(forms, "form, .btn-row, .schedule-actions, .segmented");
    expect(cap).toMatch(/max-width: var\(--form-max, 480px\);/);
    expect(cap).toMatch(/box-sizing: border-box;/);
  });

  it("the Schedule page says which view it shows, so the shell can drop the cap for Year", async () => {
    stub();
    const { router } = renderAt("/schedule?view=year");
    await screen.findByRole("img", { name: "Year timeline" });
    expect(document.querySelector(".schedule-page")).toHaveAttribute("data-view", "year");
    await router.navigate("/schedule?view=week");
    await waitFor(() => expect(document.querySelector(".schedule-page")).toHaveAttribute("data-view", "week"));
  });
});

describe("S10-16: forms are one column, labels above; only start / end dates sit side by side", () => {
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? files(p) : p.endsWith(".tsx") ? [p] : [];
    });
  }

  it("every .field-row in the app holds a pair of date fields", () => {
    const rows: string[] = [];
    for (const f of files(join(process.cwd(), "src"))) {
      const text = readFileSync(f, "utf8");
      let at = text.indexOf('className="field-row');
      while (at >= 0) {
        rows.push(`${f}\n${text.slice(at, at + 700)}`);
        at = text.indexOf('className="field-row', at + 1);
      }
    }
    expect(rows.length).toBeGreaterThan(8);
    for (const r of rows) {
      const dates = r.match(/<DateField\b|type="date"/g) ?? [];
      expect(dates.length, r).toBeGreaterThanOrEqual(2);
    }
  });

  it("the Assignments form stacks Unit and Total; Start and End share a row", async () => {
    stub();
    const user = userEvent.setup();
    renderAt("/setup/assignments");
    await user.click(await screen.findByRole("button", { name: "Add assignment" }));
    const form = screen.getByRole("form", { name: "Add assignment" });
    expect(within(form).getByLabelText("Unit").closest(".field-row")).toBeNull();
    expect(within(form).getByLabelText("Total").closest(".field-row")).toBeNull();
    const pair = within(form).getByLabelText("Start").closest(".field-row") as HTMLElement;
    expect(within(pair).getByLabelText("End")).toBeInTheDocument();
    // The page form still asks for the subject (several subjects).
    expect((within(form).getByLabelText("Subject") as HTMLSelectElement).value).toBe("");
  });
});

describe("S10-16 (L5): the Year Add sheet", () => {
  it("opens with no subject and no unit (S18-04, E8) and picks the unit with chips, not a native select; it saves the chosen unit", async () => {
    stub();
    const user = userEvent.setup();
    renderAt("/timeline");
    await screen.findByRole("img", { name: "Year timeline" });
    await user.click(screen.getByRole("button", { name: "Add assignment" }));
    const sheet = await screen.findByRole("dialog", { name: "Add assignment" });
    const first = SAMPLE_SUBJECTS.find((s) => !s.archived)!;
    expect(within(sheet).getByRole("button", { name: /^Subject/ })).toHaveTextContent("Choose a subject…");
    await user.click(within(sheet).getByRole("button", { name: /^Subject/ }));
    await user.click(within(await screen.findByRole("dialog", { name: "Subject" })).getByRole("button", { name: first.name }));
    expect(within(sheet).getByRole("button", { name: `Subject: ${first.name}` })).toBeInTheDocument();
    expect(sheet.querySelector("select")).toBeNull();
    const units = within(sheet).getByRole("radiogroup", { name: "Unit" });
    expect(within(units).getAllByRole("radio").map((r) => r.closest("label")?.textContent)).toEqual(["Pages", "Chapters", "Lessons", "Minutes"]);
    for (const r of within(units).getAllByRole("radio")) expect(r).not.toBeChecked();
    await user.click(within(units).getByRole("radio", { name: "Pages" }));
    expect(within(units).getByRole("radio", { name: "Pages" })).toBeChecked();
    expect(within(units).getByRole("radio", { name: "Pages" }).closest("label")).toHaveClass("is-on");

    await user.type(within(sheet).getByLabelText("Title"), "Ancient Egypt");
    await user.click(within(sheet).getByLabelText("Margaret"));
    fireEvent.change(within(sheet).getByLabelText("Start"), { target: { value: "2026-11-02" } });
    fireEvent.change(within(sheet).getByLabelText("End"), { target: { value: "2026-12-18" } });
    await user.type(within(sheet).getByLabelText("Total"), "120");
    await waitFor(() => expect(within(sheet).getByRole("button", { name: "Add" })).toBeEnabled());
    await user.click(within(sheet).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(fakeApi.calls.some((c) => c.method === "POST" && c.path === "/api/assignments")).toBe(true));
    const body = fakeApi.calls.find((c) => c.method === "POST" && c.path === "/api/assignments")!.body;
    expect(body).toMatchObject({ subjectId: first.id, unitType: "pages", totalUnits: 120 });
  });
});

describe("S10-16 (R3): the child switch", () => {
  it("never wraps a name inside its chip", () => {
    expect(rule(css("features/week/week.css"), ".child-switch .segmented button")).toMatch(/white-space: nowrap;/);
  });
});
