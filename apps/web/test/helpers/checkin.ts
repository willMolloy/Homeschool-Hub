/** T-03b: check-in rows start collapsed; tests that work the controls open them first. */
import userEvent from "@testing-library/user-event";

/** Open every collapsed check-in row inside `scope`. */
export async function openRows(scope: HTMLElement) {
  for (const toggle of scope.querySelectorAll<HTMLButtonElement>(".checkin-row-toggle[aria-expanded='false']")) {
    await userEvent.click(toggle);
  }
}
