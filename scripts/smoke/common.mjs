// Shared settings for the smoke scripts. Override with CHROME_PATH, BASE_URL, PREVIEW_URL, SCREENS_DIR.
import { fileURLToPath } from "node:url";

export const CHROME_PATH = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
export const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";
export const PREVIEW_URL = process.env.PREVIEW_URL ?? "http://localhost:4173";
/** Screens go to docs/progress/screens in this repo. */
export const SCREENS_DIR = process.env.SCREENS_DIR ?? fileURLToPath(new URL("../../docs/progress/screens", import.meta.url));
export const launchOptions = { executablePath: CHROME_PATH, headless: "new", args: ["--no-sandbox"] };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-11-02" -> "Nov 2, 2026" (the way a parent types it into the shared date field, S9-04). */
export const usDate = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;

/** S9b-04: fill the form's DateFields in order (null leaves one alone): select what is there, type the US date, leave the box. */
export async function typeDates(page, form, isoValues) {
  const boxes = await page.$$(`${form} .date-field input[type=text]`);
  for (const [i, iso] of isoValues.entries()) {
    if (iso == null || !boxes[i]) continue;
    await boxes[i].click({ clickCount: 3 });
    await boxes[i].type(usDate(iso));
    await page.keyboard.press("Tab");
  }
}
