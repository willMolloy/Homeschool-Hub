// Shared settings for the smoke scripts. Override with CHROME_PATH, BASE_URL, PREVIEW_URL, SCREENS_DIR.
import { fileURLToPath } from "node:url";

export const CHROME_PATH = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
export const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";
export const PREVIEW_URL = process.env.PREVIEW_URL ?? "http://localhost:4173";
/** Screens go to docs/progress/screens in this repo. */
export const SCREENS_DIR = process.env.SCREENS_DIR ?? fileURLToPath(new URL("../../docs/progress/screens", import.meta.url));
export const launchOptions = { executablePath: CHROME_PATH, headless: "new", args: ["--no-sandbox"] };

/** The date fields in a form, in order (S9-04's DateField: a text box plus a calendar button). */
export const DATE_INPUTS = ".date-field input";
/** A form's own text and number boxes, leaving out the date fields. */
export const PLAIN_INPUTS = "input:is([type=text], [type=number]):not(.date-field input)";

/**
 * S9b-04: fill a form's date fields the way a parent does: type US-style text ("Nov 2, 2026"), then leave the field (blur),
 * which is when the DateField reads it. `texts[i]` null leaves that field alone.
 */
export async function fillDates(page, form, texts) {
  const inputs = await page.$$(`${form} ${DATE_INPUTS}`);
  if (inputs.length < texts.filter((t) => t != null).length) throw new Error(`expected ${texts.length} date fields in ${form}, found ${inputs.length}`);
  for (const [i, text] of texts.entries()) {
    if (text == null) continue;
    const el = inputs[i];
    await el.evaluate((e) => e.scrollIntoView({ block: "center" }));
    await el.focus();
    await el.evaluate((e) => e.select());
    await page.keyboard.press("Backspace");
    await el.type(text);
    await el.evaluate((e) => e.blur());
  }
  // The fields show what they understood, written out ("Nov 2, 2026"): a typo would stay as typed.
  const shown = await page.$$eval(`${form} ${DATE_INPUTS}`, (els) => els.map((e) => e.value));
  texts.forEach((t, i) => { if (t != null && shown[i] !== t) throw new Error(`date field ${i + 1} shows "${shown[i]}", not "${t}"`); });
}
