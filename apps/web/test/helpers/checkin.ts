/** T-03b / T-09: check-in rows start collapsed; tests that work the controls open them first. */
import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/** Open every collapsed check-in row inside `scope`. */
export async function openRows(scope: HTMLElement) {
  for (const toggle of scope.querySelectorAll<HTMLButtonElement>(".checkin-row-toggle[aria-expanded='false']")) {
    await userEvent.click(toggle);
  }
}

/** The row (li) whose controls are named for `name` ("Treasure Island for Frank"); opens it if needed. */
export async function rowFor(scope: HTMLElement, title: string) {
  const toggle = within(scope).queryAllByRole("button", { expanded: false }).concat(within(scope).queryAllByRole("button", { expanded: true }))
    .find((b) => b.classList.contains("checkin-row-toggle") && b.querySelector(".checkin-row-title")?.textContent === title);
  if (!toggle) throw new Error(`no row ${title}`);
  if (toggle.getAttribute("aria-expanded") === "false") await userEvent.click(toggle);
  return toggle.closest("li")!;
}

/** Choose As planned / Less / More on a row. */
export async function choose(row: HTMLElement, label: "As planned" | "Less" | "More") {
  await userEvent.click(within(within(row).getByRole("group", { name: /^How / })).getByRole("button", { name: label }));
}

/** Tap − or + `times` times. */
export async function step(row: HTMLElement, dir: "One less" | "One more", times = 1) {
  for (let i = 0; i < times; i++) await userEvent.click(within(row).getByRole("button", { name: dir }));
}
