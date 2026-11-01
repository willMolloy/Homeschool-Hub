// S8-11: every subject has an icon or its letter badge, and the form can change it.
import { readFileSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SUBJECT_ICONS, defaultIconFor as apiDefault } from "../../api/src/http/subjectIcons";
import { SUBJECT_ICON_KEYS, SUBJECT_ICON_LABELS, defaultIconFor } from "../src/features/subjects/icons";
import { SubjectBadge, SubjectGlyph, firstLetter } from "../src/features/subjects/SubjectIcon";
import { COMMON_SUBJECTS } from "../src/features/roster/commonSubjects";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

describe("the icon list", () => {
  it("is the API's list, key for key, with a label for each", () => {
    expect([...SUBJECT_ICON_KEYS].sort()).toEqual([...SUBJECT_ICONS].sort());
    for (const k of SUBJECT_ICON_KEYS) expect(SUBJECT_ICON_LABELS[k].length).toBeGreaterThan(2);
  });

  it("picks the same default as the API for every starter subject and many other names", () => {
    const names = [...COMMON_SUBJECTS, "Latin for Children", "Nature notebook", "Biology 101", "Piano practice", "math 5", "Chess club", "Smart", "Handwriting", "History spine", ""];
    for (const n of names) expect(defaultIconFor(n), n).toBe(apiDefault(n));
  });

  it("gives every starter subject a sensible icon (Math a calculator, Science a flask, Music a note, Literature a book, History a scroll)", () => {
    for (const n of COMMON_SUBJECTS) expect(defaultIconFor(n), n).not.toBeNull();
    expect([defaultIconFor("Math"), defaultIconFor("Science"), defaultIconFor("Music"), defaultIconFor("Literature"), defaultIconFor("History")]).toEqual(["calculator", "flask", "music", "book", "scroll"]);
  });
});

describe("the mark", () => {
  it("draws the icon when there is one", () => {
    const { container } = render(<SubjectGlyph subject={{ name: "Math", icon: "calculator" }} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
  it("draws the first letter (by CSS, so it adds no text) for no icon, an unknown key or no subject", () => {
    for (const subject of [{ name: "chess club", icon: null }, { name: "Chess", icon: "dragon" }, { name: "Chess" }]) {
      const { container, unmount } = render(<SubjectGlyph subject={subject} />);
      const letter = container.querySelector(".subject-letter")!;
      expect(letter.getAttribute("data-letter")).toBe("C");
      expect(letter.textContent).toBe("");
      expect(container.querySelector("svg")).toBeNull();
      unmount();
    }
    expect(firstLetter("  ñandú")).toBe("Ñ");
    expect(firstLetter("")).toBe("?");
  });
  it("the badge is decorative, or an image named for the subject when given a label; it uses the subject's pastel and strong ring", () => {
    const { container, rerender } = render(<SubjectBadge subject={{ name: "Math", icon: "calculator" }} slot={2} />);
    expect(container.querySelector(".subject-badge")).toHaveAttribute("aria-hidden", "true");
    rerender(<SubjectBadge subject={{ name: "Math", icon: "calculator" }} slot={2} label="Math" />);
    expect(screen.getByRole("img", { name: "Math" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Math" }).getAttribute("style")).toMatch(/--c: var\(--tl-subject-2\).*--cs: var\(--tl-subject-2-strong\)/);
  });
});

const SUBJECTS = [
  { id: "s1", name: "Math", color: "#2f6fb0", sortOrder: 0, archived: false, icon: "calculator", defaultWeight: null, defaultWeekdays: null },
  { id: "s2", name: "Chess club", color: "#b0482f", sortOrder: 1, archived: false, icon: null, defaultWeight: null, defaultWeekdays: null },
];

describe("the subject form's picker", () => {
  async function openAdd() {
    const user = userEvent.setup();
    renderAt("/setup/subjects");
    await user.click(await screen.findByRole("button", { name: "Add subject" }));
    return user;
  }
  const picker = () => screen.getByRole("group", { name: "Icon" });

  it("offers the icons as 44 px chips, with Letter as the fallback instead of none", async () => {
    fakeApi.on("GET /api/subjects", 200, []);
    await openAdd();
    const radios = within(picker()).getAllByRole("radio");
    expect(radios).toHaveLength(SUBJECT_ICON_KEYS.length + 1);
    expect(radios[0]).toBe(within(picker()).getByRole("radio", { name: "Letter" }));
    expect(readFileSync("src/features/subjects/subject-icon.css", "utf8")).toMatch(/\.icon-chip-face \{[^}]*width: 44px; height: 44px/);
  });

  it("follows the name while adding, and sends no icon when untouched (the API picks the same one)", async () => {
    fakeApi.on("GET /api/subjects", 200, []);
    fakeApi.on("POST /api/subjects", (body) => [201, { id: "c9", sortOrder: 0, archived: false, ...(body as object) }]);
    const user = await openAdd();
    await user.type(screen.getByLabelText("Name"), "Science");
    expect(within(picker()).getByRole("radio", { name: "Flask" })).toBeChecked();
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Chess club");
    expect(within(picker()).getByRole("radio", { name: "Letter" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Add" }));
    await within(await screen.findByRole("list", { name: "Subjects" })).findByText("Chess club");
    expect(fakeApi.calls.at(-1)?.body).not.toHaveProperty("icon");
  });

  it("a chosen icon is sent, and Letter is sent as null", async () => {
    fakeApi.on("GET /api/subjects", 200, []);
    fakeApi.on("POST /api/subjects", (body) => [201, { id: "c9", sortOrder: 0, archived: false, ...(body as object) }]);
    const user = await openAdd();
    await user.type(screen.getByLabelText("Name"), "Math");
    await user.click(within(picker()).getByRole("radio", { name: "Star" }));
    await user.click(screen.getByRole("button", { name: "Add" }));
    await within(await screen.findByRole("list", { name: "Subjects" })).findByText("Math");
    expect(fakeApi.calls.at(-1)?.body).toMatchObject({ name: "Math", icon: "star" });
    await user.click(screen.getByRole("button", { name: "Add subject" }));
    await user.type(screen.getByLabelText("Name"), "Science");
    await user.click(within(picker()).getByRole("radio", { name: "Letter" }));
    await user.click(screen.getByRole("button", { name: "Add" }));
    await within(await screen.findByRole("list", { name: "Subjects" })).findByText("Science");
    expect(fakeApi.calls.at(-1)?.body).toMatchObject({ name: "Science", icon: null });
  });

  it("editing starts from the subject's icon and sends only what changed", async () => {
    fakeApi.on("GET /api/subjects", 200, SUBJECTS);
    fakeApi.on("PATCH /api/subjects/s2", (body) => [200, { ...SUBJECTS[1], ...(body as object) }]);
    const user = userEvent.setup();
    renderAt("/setup/subjects");
    await user.click(await screen.findByRole("button", { name: /Chess club/ }));
    expect(within(picker()).getByRole("radio", { name: "Letter" })).toBeChecked();
    await user.click(within(picker()).getByRole("radio", { name: "Puzzle" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByRole("list", { name: "Subjects" });
    const patch = fakeApi.calls.filter((c) => c.method === "PATCH");
    expect(patch).toHaveLength(1);
    expect(patch[0]!.body).toEqual({ icon: "puzzle" });
  });
});

describe("where the mark shows", () => {
  it("Set up's Subjects list: an icon badge or the letter beside each name", async () => {
    fakeApi.on("GET /api/subjects", 200, SUBJECTS);
    renderAt("/setup/subjects");
    const list = await screen.findByRole("list", { name: "Subjects" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows[0]!.querySelector(".subject-badge svg")).not.toBeNull();
    expect(rows[1]!.querySelector(".subject-badge .subject-letter")?.getAttribute("data-letter")).toBe("C");
    expect(rows.map((r) => r.textContent)).toEqual(["Math", "Chess club"]);
  });

  it("the assignment form's subject select shows the chosen subject's badge", async () => {
    fakeApi.on("GET /api/subjects", 200, SUBJECTS);
    fakeApi.on("GET /api/children", 200, [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }]);
    fakeApi.on("GET /api/assignments", 200, []);
    const user = userEvent.setup();
    renderAt("/setup/assignments");
    await user.click(await screen.findByRole("button", { name: "Add assignment" }));
    const select = await screen.findByLabelText("Subject");
    expect(select.parentElement!.querySelector(".subject-badge")).toBeNull();
    await user.selectOptions(select, "s1");
    expect(select.parentElement!.querySelector(".subject-badge svg")).not.toBeNull();
    await user.selectOptions(select, "s2");
    expect(select.parentElement!.querySelector(".subject-badge .subject-letter")).not.toBeNull();
  });
});
