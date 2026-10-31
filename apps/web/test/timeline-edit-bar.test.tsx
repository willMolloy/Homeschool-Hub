/** T-07/T-07e: selection and the edit bar (select.ts, EditBar, Timeline's dimming, the page). */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { addDays, ENGINE_VERSION, type LocalDate } from "@hh/engine";
import type { Assignment } from "../src/api/types";
import { changedDates, datesError } from "../src/features/timeline/select";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import {
  SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_EVENTS, SAMPLE_SUBJECTS, samplePlans,
} from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

const EDIT = ["Copy", "More", "Close"];

function stub(assignments: Assignment[] = SAMPLE_ASSIGNMENTS) {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
  fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
  fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, assignments);
  fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
  fakeApi.on("GET /api/events", 200, SAMPLE_EVENTS);
  for (const a of assignments) {
    fakeApi.on(`PATCH /api/assignments/${a.id}`, (body) => [200, { ...a, ...(body as Partial<Assignment>) }]);
  }
}

async function open() {
  renderAt("/timeline");
  return screen.findByRole("img", { name: "Year timeline" });
}

/** Taps the first band of the picture just inside its outline's first point. */
function tapBand(svg: Element, nth = 0): string {
  const band = svg.querySelectorAll("path.tl-band")[nth]!;
  const [x, y] = band.getAttribute("d")!.slice(1).split(/[ ,LCQVHZ]+/).filter(Boolean).map(Number);
  fireEvent.click(svg, { clientX: x! + 1, clientY: y! + 1 });
  return band.getAttribute("data-assignment")!;
}

const sheet = () => screen.findByRole("region", { name: /^Edit / });
const bar = () => screen.queryByRole("region", { name: /^Edit / });
const patches = () => fakeApi.calls.filter((c) => c.method === "PATCH");
const planGets = () => fakeApi.calls.filter((c) => c.method === "GET" && c.path.startsWith("/api/plan")).length;

describe("date helpers", () => {
  it("keeps only changed fields and checks the order", () => {
    expect(changedDates({ startDate: "a", endDate: "b" }, { startDate: "a", endDate: "c" })).toEqual({ endDate: "c" });
    expect(changedDates({ startDate: "a", endDate: "b" }, { startDate: "a", endDate: "b" })).toBeNull();
    expect(datesError({ startDate: "2026-10-20", endDate: "2026-10-19" })).toBe("The start must be on or before the end.");
    expect(datesError({ startDate: "2026-10-19", endDate: "2026-10-19" })).toBeNull();
  });
});

describe("the edit bar", () => {
  it("has no edit controls anywhere until something is selected (hidden, not disabled)", async () => {
    stub();
    await open();
    for (const name of EDIT) expect(screen.queryByRole("button", { name })).toBeNull();
    expect(screen.queryByLabelText("Start")).toBeNull();
    expect(bar()).toBeNull();
  });

  it("shows the tapped bar's title, subject · child and dates without a dialog, and dims the other bars", async () => {
    stub();
    const svg = await open();
    const id = tapBand(svg);
    const a = SAMPLE_ASSIGNMENTS.find((x) => x.id === id)!;
    const panel = await sheet();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(within(panel).getByText(a.title)).toBeInTheDocument();
    expect(within(panel).getByText(/ · /)).toBeInTheDocument();
    expect(within(panel).getByLabelText("Start")).toHaveValue(a.startDate);
    expect(within(panel).getByLabelText("End")).toHaveValue(a.endDate);
    for (const name of ["Copy", "More", "Close"]) expect(within(panel).getByRole("button", { name })).toBeEnabled();
    expect(within(panel).queryByRole("button", { name: "Reset" })).toBeNull();
    const bands = [...svg.querySelectorAll("path.tl-band")];
    expect(bands.filter((b) => b.getAttribute("data-assignment") === id).every((b) => !b.classList.contains("tl-dim"))).toBe(true);
    expect(bands.filter((b) => b.getAttribute("data-assignment") !== id).every((b) => b.classList.contains("tl-dim"))).toBe(true);
  });

  it("selects nothing on empty space", async () => {
    stub();
    const svg = await open();
    fireEvent.click(svg, { clientX: 1, clientY: 1 });
    expect(bar()).toBeNull();
    expect(svg.querySelector(".tl-dim")).toBeNull();
  });

  it("has Start, End, Copy and More only: no week steps and no date-only Reset (S6b-05)", async () => {
    stub();
    const svg = await open();
    const id = tapBand(svg);
    const a = SAMPLE_ASSIGNMENTS.find((x) => x.id === id)!;
    const panel = await sheet();
    for (const name of ["Move back a week", "Move forward a week", "End a week earlier", "End a week later", "Reset", "Heavier", "Lighter", "Reset to original"]) {
      expect(within(panel).queryByRole("button", { name })).toBeNull();
    }
    // A date change redraws from a fresh plan and still doesn't offer a date-only Reset.
    const before = planGets();
    fireEvent.change(within(panel).getByLabelText("End"), { target: { value: addDays(a.endDate as LocalDate, 7) } });
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]).toMatchObject({ path: `/api/assignments/${id}`, body: { endDate: addDays(a.endDate as LocalDate, 7) } });
    await waitFor(() => expect(planGets()).toBeGreaterThan(before));
    expect(within(bar()!).queryByRole("button", { name: "Reset" })).toBeNull();
  });

  it("More opens Heavier, Lighter and Reset to original; Esc closes the menu first, then the bar; a tap outside closes it", async () => {
    stub();
    const user = userEvent.setup();
    const svg = await open();
    tapBand(svg);
    const panel = await sheet();
    const more = within(panel).getByRole("button", { name: "More" });
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(within(panel).queryByRole("button", { name: "Heavier" })).toBeNull();
    await user.click(more);
    expect(more).toHaveAttribute("aria-expanded", "true");
    expect(within(panel).getAllByRole("button").map((b) => b.textContent)).toEqual(expect.arrayContaining(["Heavier", "Lighter", "Reset to original"]));
    await user.keyboard("{Escape}");
    expect(within(panel).queryByRole("button", { name: "Heavier" })).toBeNull();
    expect(bar()).not.toBeNull();
    await user.click(more);
    await user.click(document.body);
    expect(within(panel).queryByRole("button", { name: "Heavier" })).toBeNull();
    await user.click(more);
    await user.keyboard("{Escape}{Escape}");
    await waitFor(() => expect(bar()).toBeNull());
  });

  it("the date pickers save a changed End, keeping the start", async () => {
    stub();
    const svg = await open();
    const id = tapBand(svg);
    const a = SAMPLE_ASSIGNMENTS.find((x) => x.id === id)!;
    fireEvent.change(within(await sheet()).getByLabelText("End"), { target: { value: addDays(a.endDate as LocalDate, 7) } });
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]!.body).toEqual({ endDate: addDays(a.endDate as LocalDate, 7) });
  });

  it("saves a date picked in a field, and refuses a start after the end without calling the API", async () => {
    stub();
    const svg = await open();
    const id = tapBand(svg);
    const a = SAMPLE_ASSIGNMENTS.find((x) => x.id === id)!;
    const panel = await sheet();
    fireEvent.change(within(panel).getByLabelText("Start"), { target: { value: addDays(a.endDate as LocalDate, 1) } });
    expect(within(panel).getByRole("alert")).toHaveTextContent("The start must be on or before the end.");
    expect(patches()).toHaveLength(0);
    fireEvent.change(within(panel).getByLabelText("Start"), { target: { value: addDays(a.startDate as LocalDate, -3) } });
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]!.body).toEqual({ startDate: addDays(a.startDate as LocalDate, -3) });
  });

  it("shows the API's message inline when a save fails", async () => {
    stub();
    const svg = await open();
    const id = tapBand(svg);
    fakeApi.on(`PATCH /api/assignments/${id}`, 409, { error: "check_in_outside", message: "The week of Oct 19 has a check-in, so the start can't move past it." });
    fireEvent.change(within(await sheet()).getByLabelText("End"), { target: { value: "2027-06-30" } });
    expect(await within(bar()!).findByRole("alert")).toHaveTextContent("The week of Oct 19 has a check-in");
  });

  it("× and Esc both clear the selection", async () => {
    stub();
    const svg = await open();
    tapBand(svg);
    await userEvent.click(within(await sheet()).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(bar()).toBeNull());
    expect(svg.querySelector(".tl-dim")).toBeNull();
    tapBand(svg);
    await sheet();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(bar()).toBeNull());
    expect(svg.querySelector(".tl-dim")).toBeNull();
  });

  it("selects from the lanes list with the keyboard", async () => {
    stub();
    await open();
    const a = SAMPLE_ASSIGNMENTS[1]!;
    const pick = screen.getAllByRole("button", { name: new RegExp(`^${a.title},`) })[0]!;
    pick.focus();
    await userEvent.keyboard("{Enter}");
    expect(within(await sheet()).getByText(a.title)).toBeInTheDocument();
  });
});

describe("Copy in the edit bar (S3a-02)", () => {
  it("opens the Add sheet prefilled; saving sends one POST, closes and clears the selection", async () => {
    stub();
    fakeApi.on("POST /api/assignments", (body) => [201, { ...(body as object), id: "copy1", archived: false }]);
    const svg = await open();
    const id = tapBand(svg);
    const a = SAMPLE_ASSIGNMENTS.find((x) => x.id === id)!;
    await userEvent.click(within(await sheet()).getByRole("button", { name: "Copy" }));
    const dialog = await screen.findByRole("dialog", { name: "Add assignment" });
    expect(within(dialog).getByLabelText("Title")).toHaveValue(`${a.title} (copy)`);
    expect(within(dialog).getByLabelText("Start")).toHaveValue(a.startDate);
    expect(within(dialog).getByLabelText("End")).toHaveValue(a.endDate);
    await userEvent.click(within(dialog).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const posts = fakeApi.calls.filter((c) => c.method === "POST");
    expect(posts).toHaveLength(1);
    expect(posts[0]!.body).toMatchObject({ subjectId: a.subjectId, title: `${a.title} (copy)`, childIds: a.childIds, startDate: a.startDate, endDate: a.endDate });
    expect(patches()).toHaveLength(0);
    // Like "+ Add assignment": the old selection clears (the new bar is flashed once the plan has it; see timeline-add.test.tsx).
    expect(bar()).toBeNull();
  });

  it("an archived subject or child is left out of the prefill (S3b-02)", async () => {
    stub();
    // Every subject and the first child are archived, so whatever bar is tapped has an archived subject.
    fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS.map((s) => ({ ...s, archived: true })));
    fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN.map((c, i) => ({ ...c, archived: i === 0 })));
    const svg = await open();
    const a = SAMPLE_ASSIGNMENTS.find((x) => x.id === tapBand(svg))!;
    await userEvent.click(within(await sheet()).getByRole("button", { name: "Copy" }));
    const dialog = await screen.findByRole("dialog", { name: "Add assignment" });
    expect(within(dialog).getByLabelText("Subject")).toHaveValue("");
    // The archived first child is not ticked (nor listed); any other child on the original stays ticked.
    expect(within(dialog).queryByRole("checkbox", { name: SAMPLE_CHILDREN[0]!.name })).toBeNull();
    for (const child of SAMPLE_CHILDREN.slice(1)) {
      if (a.childIds.includes(child.id)) expect(within(dialog).getByRole("checkbox", { name: child.name })).toBeChecked();
    }
  });

  it("Cancel closes the sheet and leaves the original selected and unchanged", async () => {
    stub();
    const svg = await open();
    const id = tapBand(svg);
    const a = SAMPLE_ASSIGNMENTS.find((x) => x.id === id)!;
    await userEvent.click(within(await sheet()).getByRole("button", { name: "Copy" }));
    const dialog = await screen.findByRole("dialog", { name: "Add assignment" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(within(await sheet()).getByText(a.title)).toBeInTheDocument();
    expect(fakeApi.calls.filter((c) => c.method !== "GET")).toEqual([]);
  });

  it("the header's + Add assignment after a cancelled copy opens an empty form", async () => {
    stub();
    const svg = await open();
    tapBand(svg);
    await userEvent.click(within(await sheet()).getByRole("button", { name: "Copy" }));
    await userEvent.click(within(await screen.findByRole("dialog", { name: "Add assignment" })).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await userEvent.click(screen.getByRole("button", { name: "+ Add assignment" }));
    expect(within(await screen.findByRole("dialog", { name: "Add assignment" })).getByLabelText("Title")).toHaveValue("");
  });
});

describe("the edit bar's order on phones (S5-08, S6b-05)", () => {
  it("lists the close button, Copy and More, with the date fields before them, each by name", async () => {
    stub();
    const svg = await open();
    tapBand(svg);
    const region = await sheet();
    expect(within(region).getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent)).toEqual(["Close", "Copy", "More"]);
    const order = [...region.querySelectorAll("button, input")].map((e) => (e.matches("input") ? (e as HTMLInputElement).labels?.[0]?.textContent?.trim() : e.getAttribute("aria-label") ?? e.textContent));
    expect(order.indexOf("Start")).toBeLessThan(order.indexOf("End"));
    expect(order.indexOf("End")).toBeLessThan(order.indexOf("Copy"));
    expect(order.indexOf("Copy")).toBeLessThan(order.indexOf("More"));
  });
});
